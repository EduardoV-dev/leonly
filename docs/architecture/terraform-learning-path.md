# Terraform Learning Path for the API

This guide records how we will learn Terraform while managing the NestJS API infrastructure. Start
with one local Floci environment. The later staging target is real AWS, not a second Floci instance.
Local Floci is an emulator for learning and integration checks; it does not prove that real AWS IAM,
ECR, Lambda, or API Gateway behavior is correct.

## Terraform in one minute

Terraform is an infrastructure-as-code tool. We describe the resources we want in HCL files, and the
AWS provider sends the corresponding API calls to either Floci or AWS. `terraform plan` compares the
configuration with Terraform's state and the current resources, then previews proposed changes.
`terraform apply` performs the reviewed changes. Terraform state records which real resources belong
to each configuration.

This differs from the AWS CLI workflow used for the first Floci deployment: those commands created
resources directly, without recording them in Terraform state.

## Target layout

```text
infra/
  modules/
    api/                         # Shared ECR, Lambda, IAM, and HTTP API resources
  environments/
    floci-local/                 # Provider endpoints and state for local Floci
    aws-staging/                 # Real AWS provider and separate staging state
```

Each environment root calls the shared API module and has independent Terraform state. The local root
configures the AWS provider for Floci, uses local test credentials, and overrides AWS service
endpoints. The AWS staging root will use real AWS credentials and service endpoints, with a separate
protected state backend. Never carry Floci endpoint overrides, dummy credentials, or Floci-specific
validation bypasses into the AWS configuration.

The module should accept an `image_uri` input. Build the Docker image separately and push it to each
environment's ECR registry; pass that environment's image URI into the module. Terraform will manage
the infrastructure that runs the image, not compile the NestJS source code.

## Learning sequence

1. **HCL, providers, and resources:** identify what configuration, an AWS provider, and a resource
   block represent. Start by understanding the configuration before creating resources.
2. **Start local Floci:** validate and run `apps/api/docker-compose.yml`; confirm the emulator is
   reachable before configuring Terraform.
3. **Local provider setup:** point only `floci-local` at the local Floci endpoint. Use local test
   credentials and any required validation bypasses only in this environment.
4. **State and imports:** inventory existing local resources. Import any CLI-created ECR repository,
   IAM role and policy attachment, Lambda function, Lambda permission, HTTP API, integration, route,
   and stage into local Terraform state before managing them. Review the import plan before proceeding.
5. **Resource references and dependencies:** connect ECR, Lambda, API Gateway, and permissions using
   resource attributes so Terraform can determine creation order.
6. **Catch-all routing:** replace the explicit `GET /health` gateway route with an HTTP API
   `$default` route. Express/Nest will then dispatch paths and methods. Update the Lambda invoke
   permission to cover that route.
7. **Review local plans:** use `terraform fmt`, `terraform validate`, and `terraform plan`. Explain
   every planned create, update, or delete. Apply only after confirming the plan affects the intended
   local resources.
8. **Real AWS staging, later:** add the separate AWS root after the local flow is understood. Confirm
   the AWS account, approved region, credentials, and protected state backend before planning changes.
   Review the plan for cost and resource impact before any AWS apply.

## First checkpoint: validate local Floci

Run these commands from the repository root:

```bash
docker compose -f apps/api/docker-compose.yml config
docker compose -f apps/api/docker-compose.yml up -d
docker compose -f apps/api/docker-compose.yml ps
docker compose -f apps/api/docker-compose.yml logs --tail=50 floci
```

The first command checks the Compose configuration; `up -d` starts Floci; the final commands show
whether the container is running and surface startup errors. Stop here if Floci does not start cleanly.
Do not remove `apps/api/data` while troubleshooting: Compose mounts it as persistent emulator data.
The current Compose file also mounts the Docker socket; verify that this is required for the Lambda
container emulation before changing it.

Once the container is healthy, confirm the local AWS-compatible endpoint at `http://localhost:4566`
is responding. If the AWS CLI is installed, this read-only ECR request checks that the endpoint accepts
an AWS API call; an empty repository list is a valid response:

```bash
AWS_ACCESS_KEY_ID=test AWS_SECRET_ACCESS_KEY=test AWS_DEFAULT_REGION=us-east-1 \
  aws --endpoint-url=http://localhost:4566 ecr describe-repositories
```

Then inventory any resources already created in Floci before the first Terraform import or plan. Do
not apply a Terraform plan until it is clear whether each resource is new or already exists outside
Terraform state.

## Floci-specific details to revisit

- The current Floci API endpoint is port `4566`. The previous CLI setup used an ECR registry sidecar
  on a separate host port range starting at `5100`, but the current `apps/api/docker-compose.yml` does
  not declare that sidecar. Confirm how it is started and which port it exposes before implementing
  Lambda image resources. The local Terraform configuration and image reference must distinguish
  the AWS API endpoint from the Docker registry endpoint.
- The current ECR `repositoryUri` response used port `4566`, but Lambda's first image lookup tried
  resolving that URI as a Docker registry hostname and timed out. The local invocation worked after
  Docker had the image tagged with the exact URI in the Lambda configuration. Resolve this Floci
  URI/image-reference behavior explicitly in the module rather than assuming the ECR API's returned
  URI is always directly pullable from a Lambda container.
- The existing Floci UI uses host port `4500`; confirm whether it is needed for the local workflow.
- Terraform only manages objects tracked in its state. Do not run `terraform apply` against the
  existing CLI-created resources until they have been imported or intentionally recreated.

## Later: real AWS staging

Use the approved AWS account and region, real AWS credentials or an assumed role, and a separate
protected state backend. Keep the AWS root independent from local Floci state. The shared API module
can consume an image URI from real ECR; build and publish the image separately from Terraform. Do not
configure or apply this environment as part of the first local Floci checkpoint.
