#!/usr/bin/env bash
set -euo pipefail
shopt -s inherit_errexit

infra_workflow=cd-deploy-infra-staging.yml
infra_paths=(infra/environments/staging infra/modules ".github/workflows/$infra_workflow")
shared_paths=(.github/workflows/cd-deploy-app-staging.yml infra/scripts/staging-release.sh
  packages/database packages/utils .dockerignore package.json pnpm-lock.yaml
  pnpm-workspace.yaml tsconfig.base.json)
api_paths=(apps/api apps/web-app/package.json)
worker_paths=(apps/workers .npmrc)

fail() {
  printf '%s\n' "$*" >&2
  exit 1
}

has_changes() {
  local status=0
  git diff --quiet --no-ext-diff "$@" || status=$?
  case "$status" in
    0) return 1 ;;
    1) return 0 ;;
    *) fail 'Cannot compare release inputs.' ;;
  esac
}

select_workloads() {
  local api=false worker=false release=false
  case "${WORKLOAD:-}" in
    both) api=true; worker=true ;;
    api) api=true ;;
    worker) worker=true ;;
    '')
      if [[ ! "${BEFORE_SHA:-}" =~ ^[a-f0-9]{40}$ || ${BEFORE_SHA:-} =~ ^0+$ ]]; then
        fail 'A staging push needs a valid base commit for workload selection.'
      fi
      if has_changes "$BEFORE_SHA" HEAD -- "${shared_paths[@]}"; then
        api=true
        worker=true
      else
        if has_changes "$BEFORE_SHA" HEAD -- "${api_paths[@]}"; then api=true; fi
        if has_changes "$BEFORE_SHA" HEAD -- "${worker_paths[@]}"; then worker=true; fi
      fi
      ;;
    *) fail 'Select api, worker, or both.' ;;
  esac

  local workloads=() matrix
  if [[ "$worker" == true ]]; then workloads+=(worker); fi
  if [[ "$api" == true ]]; then workloads+=(api); fi
  matrix=$(jq -cn --argjson api "$api" --argjson worker "$worker" '{include: [
    (if $api then {workload: "api", repository: "leonly-api-staging", dockerfile: "apps/api/Dockerfile"} else empty end),
    (if $worker then {workload: "worker", repository: "leonly-image-worker-staging", dockerfile: "apps/workers/Dockerfile"} else empty end)
  ]}')
  if (( ${#workloads[@]} )) && [[ "${RELEASE_ENABLED:-}" == true && "${PUBLISH_ONLY:-}" != true ]]; then
    release=true
  fi
  printf 'workloads=%s\nmatrix=%s\nrelease=%s\n' "${workloads[*]}" "$matrix" "$release" >> "$GITHUB_OUTPUT"
  if [[ "$release" == false && ${#workloads[@]} -gt 0 ]]; then
    printf 'Publish-only run: migrations and Lambda promotion are disabled.\n' >> "$GITHUB_STEP_SUMMARY"
  fi
}

wait_for_infra() {
  local filters=(-f branch=staging -F per_page=1) status conclusion sha url
  if [[ -n "${BEFORE_SHA:-}" ]] && has_changes "$BEFORE_SHA" HEAD -- "${infra_paths[@]}"; then
    filters+=(-f "head_sha=$GITHUB_SHA")
  fi

  # Poll outside the mutation queue so Terraform can acquire it.
  for ((attempt = 0; attempt < 60; attempt++)); do
    local run
    run=$(gh api --method GET "repos/$GITHUB_REPOSITORY/actions/workflows/$infra_workflow/runs" \
      "${filters[@]}" --jq '.workflow_runs[0] | select(. != null) | [.status, (.conclusion // "pending"), .head_sha, .html_url] | @tsv')
    if [[ -n "$run" ]]; then
      IFS=$'\t' read -r status conclusion sha url <<< "$run"
      if [[ "$status" == completed ]]; then
        [[ "$conclusion" == success ]] || fail "Staging infrastructure apply did not succeed: $url"
        [[ "$sha" =~ ^[a-f0-9]{40}$ ]] || fail 'Invalid infrastructure run commit.'
        if ! git cat-file -e "$sha^{commit}" 2>/dev/null; then git fetch --no-tags origin "$sha"; fi
        if has_changes "$sha" HEAD -- "${infra_paths[@]}"; then
          fail 'The latest successful infrastructure run used different Terraform inputs. Apply the matching configuration first.'
        fi
        return
      fi
    fi
    sleep 15
  done
  fail 'Timed out waiting for the staging infrastructure workflow.'
}

verify_current() {
  local paths=("${infra_paths[@]}" "${shared_paths[@]}")
  case " $WORKLOADS " in *' api '*) paths+=("${api_paths[@]}") ;; esac
  case " $WORKLOADS " in *' worker '*) paths+=("${worker_paths[@]}") ;; esac
  git fetch --no-tags origin refs/heads/staging
  if has_changes HEAD FETCH_HEAD -- "${paths[@]}"; then
    fail 'This release was superseded. Run the app deployment on current staging for the affected workloads.'
  fi
}

read_image() {
  local repository=$1 digest
  digest=$(aws ecr describe-images --repository-name "$repository" --image-ids "imageTag=$IMAGE_TAG" \
    --query 'imageDetails[0].imageDigest' --output text) || return
  [[ "$digest" =~ ^sha256:[a-f0-9]{64}$ ]] || fail "ECR returned an invalid digest for $repository:$IMAGE_TAG."
  printf '%s/%s@%s\n' "$ECR_REGISTRY" "$repository" "$digest"
}

publish_image() {
  local image_uri result tagged_image="$ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG"
  if result=$(read_image "$ECR_REPOSITORY" 2>&1); then
    image_uri=$result
  else
    [[ "$result" == *'(ImageNotFoundException)'* ]] || fail "$result"
    aws ecr get-login-password | docker login --username AWS --password-stdin "$ECR_REGISTRY"
    docker buildx build --platform linux/amd64 --provenance=false --sbom=false --push \
      --file "$DOCKERFILE" --tag "$tagged_image" .
    image_uri=$(read_image "$ECR_REPOSITORY")
  fi
  printf 'Image: `%s`\n' "$image_uri" >> "$GITHUB_STEP_SUMMARY"
}

load_release_targets() {
  local workload image revision repository function_name
  functions=() images=() revisions=()
  local workloads
  read -r -a workloads <<< "$WORKLOADS"
  for workload in "${workloads[@]}"; do
    case "$workload" in
      api) repository=leonly-api-staging; function_name=leonly-staging-api ;;
      worker) repository=leonly-image-worker-staging; function_name=leonly-staging-image-worker ;;
      *) fail 'Unknown staging workload.' ;;
    esac
    image=$(read_image "$repository")
    revision=$(aws lambda get-alias --function-name "$function_name" --name live --query RevisionId --output text)
    [[ -n "$revision" && "$revision" != None ]] || fail "Missing live alias revision for $function_name."
    functions+=("$function_name")
    images+=("$image")
    revisions+=("$revision")
  done
  (( ${#functions[@]} )) || fail 'No staging Lambda targets selected.'
}

prepare_version() {
  local function_name=$1 image=$2 current_image revision code_hash config_hash latest version

  current_image=$(aws lambda get-function --function-name "$function_name" --query 'Code.ResolvedImageUri' --output text)
  if [[ "$current_image" != "$image" ]]; then
    aws lambda update-function-code --function-name "$function_name" --image-uri "$image" >/dev/null
  fi
  aws lambda wait function-updated --function-name "$function_name"
  latest=$(aws lambda get-function-configuration --function-name "$function_name" \
    --query '[RevisionId, CodeSha256, ConfigSha256]' --output text)
  read -r revision code_hash config_hash <<< "$latest"

  # Reuse a matching version on reruns; an image match alone would miss configuration changes.
  version=None
  if [[ -n "$config_hash" && "$config_hash" != None ]]; then
    version=$(aws lambda list-versions-by-function --function-name "$function_name" --output json |
      jq -r --arg code "$code_hash" --arg config "$config_hash" \
        '[.Versions[] | select(.Version != "$LATEST" and .CodeSha256 == $code and .ConfigSha256 == $config) | .Version | tonumber] | max // "None"')
  fi
  if [[ "$version" == None ]]; then
    version=$(aws lambda publish-version --function-name "$function_name" --revision-id "$revision" \
      --code-sha256 "$code_hash" --query Version --output text)
  fi
  [[ "$version" =~ ^[1-9][0-9]*$ ]] || fail "Lambda did not return a numbered version for $function_name."
  aws lambda wait published-version-active --function-name "$function_name" --qualifier "$version"
  printf '%s\n' "$version"
}

promote_versions() {
  load_release_targets
  local index version versions=()
  for index in "${!functions[@]}"; do
    version=$(prepare_version "${functions[$index]}" "${images[$index]}")
    versions+=("$version")
  done
  for index in "${!functions[@]}"; do
    aws lambda update-alias --function-name "${functions[$index]}" --name live \
      --revision-id "${revisions[$index]}" --function-version "${versions[$index]}" >/dev/null
    printf 'Promoted `%s:live` to version `%s` (`%s`).\n' \
      "${functions[$index]}" "${versions[$index]}" "${images[$index]}" >> "$GITHUB_STEP_SUMMARY"
  done
}

case "${1:-}" in
  select) select_workloads ;;
  wait-infra) wait_for_infra ;;
  verify-current) verify_current ;;
  publish) publish_image ;;
  preflight) load_release_targets ;;
  promote) promote_versions ;;
  *) fail 'Expected select, wait-infra, verify-current, publish, preflight, or promote.' ;;
esac
