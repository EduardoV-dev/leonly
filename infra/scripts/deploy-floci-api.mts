import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { existsSync, mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const FUNCTION_NAME = "leonly-api-local";
const LOCAL_ENDPOINT = "http://localhost:4566";
const SOURCE_IMAGE = "leonly-api:latest";
const API_TARGETS = ["module.api", "aws_iam_role_policy.image_publication"];
const COMMAND_TIMEOUT_MS = 600_000;

type Plan = { resource_changes?: { address: string; change: { actions: string[] } }[] };
type RunParams = { command: string; args: string[]; shouldInherit?: boolean };

export function deployFlociApi(rootDirectory: string): void {
  const environment = {
    ...process.env,
    AWS_ACCESS_KEY_ID: "test",
    AWS_SECRET_ACCESS_KEY: "test",
    AWS_SESSION_TOKEN: "",
    AWS_REGION: "us-east-1",
    AWS_DEFAULT_REGION: "us-east-1",
    AWS_EC2_METADATA_DISABLED: "true",
    AWS_PAGER: "",
  };
  const run = ({ command, args, shouldInherit = false }: RunParams): string =>
    execFileSync(command, args, {
      cwd: rootDirectory,
      env: environment,
      encoding: "utf8",
      stdio: shouldInherit ? "inherit" : "pipe",
      timeout: COMMAND_TIMEOUT_MS,
    }) ?? "";
  const aws = ["--region", "us-east-1", "--endpoint-url", LOCAL_ENDPOINT];

  run({ command: "docker", args: ["info"] });
  run({ command: "docker", args: ["image", "inspect", SOURCE_IMAGE] });
  const repositoryUri = run({
    command: "aws",
    args: [
      ...aws,
      "ecr",
      "describe-repositories",
      "--repository-names",
      FUNCTION_NAME,
      "--query",
      "repositories[0].repositoryUri",
      "--output",
      "text",
    ],
  }).trim();

  if (repositoryUri !== "localhost:4566/000000000000/us-east-1/leonly-api-local") {
    throw new Error("The local Floci API repository is missing or has an unexpected URI.");
  }

  const imageTag = `dev-${Date.now()}-${randomUUID().slice(0, 8)}`;
  const imageUri = `${repositoryUri}:${imageTag}`;
  process.stdout.write(`Deploying existing API image: ${SOURCE_IMAGE}\n`);
  run({ command: "docker", args: ["tag", SOURCE_IMAGE, imageUri] });

  const terraformDirectory = "-chdir=infra/environments/floci-local";
  run({
    command: "terraform",
    args: [terraformDirectory, "init", "-input=false"],
    shouldInherit: true,
  });
  const temporaryDirectory = mkdtempSync(join(tmpdir(), "leonly-api-deploy-"));
  try {
    const planPath = join(temporaryDirectory, "api.tfplan");
    run({
      command: "terraform",
      args: [
        terraformDirectory,
        "plan",
        "-input=false",
        `-out=${planPath}`,
        `-var=api_image_tag=${imageTag}`,
        ...API_TARGETS.map((target) => `-target=${target}`),
      ],
      shouldInherit: true,
    });
    const plan: Plan = JSON.parse(
      run({ command: "terraform", args: [terraformDirectory, "show", "-json", planPath] }),
    );
    for (const resource of plan.resource_changes ?? []) {
      if (resource.change.actions.every((action) => action === "no-op")) continue;

      const isApiDependency =
        resource.address.startsWith("module.api.") ||
        resource.address.startsWith("module.image_queue.") ||
        resource.address === "aws_iam_role_policy.image_publication";
      const hasDeletion = resource.change.actions.includes("delete");
      if (!isApiDependency || hasDeletion) {
        throw new Error(`Refusing unrelated or destructive change: ${resource.address}`);
      }
    }

    run({
      command: "terraform",
      args: [terraformDirectory, "apply", "-input=false", planPath],
      shouldInherit: true,
    });

    const variablePath = join(rootDirectory, "infra/environments/floci-local/local.auto.tfvars");
    const previous = existsSync(variablePath) ? readFileSync(variablePath, "utf8") : "";
    const assignment = `api_image_tag = ${JSON.stringify(imageTag)}`;
    const pattern = /^api_image_tag[ \t]*=.*$/m;
    const next = pattern.test(previous)
      ? previous.replace(pattern, assignment)
      : `${previous}${previous.endsWith("\n") || !previous ? "" : "\n"}${assignment}\n`;
    const pendingPath = `${variablePath}.pending`;
    try {
      writeFileSync(pendingPath, next, { mode: 0o600 });
      renameSync(pendingPath, variablePath);
    } finally {
      rmSync(pendingPath, { force: true });
    }

    run({
      command: "aws",
      args: [...aws, "lambda", "wait", "function-updated-v2", "--function-name", FUNCTION_NAME],
    });
    process.stdout.write(`API deployed: ${FUNCTION_NAME}\nImage: ${imageUri}\n`);
    process.stdout.write(
      `Logs: aws ${aws.join(" ")} logs tail /aws/lambda/${FUNCTION_NAME} --follow\n`,
    );
  } finally {
    rmSync(temporaryDirectory, { recursive: true, force: true });
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    deployFlociApi(resolve(dirname(fileURLToPath(import.meta.url)), "../.."));
  } catch (error) {
    process.stderr.write(
      `${error instanceof Error ? error.message : "Local API deployment failed."}\n`,
    );
    process.exitCode = 1;
  }
}
