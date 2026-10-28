import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { existsSync, mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const FUNCTION_NAME = "leonly-image-worker-local";
const LOCAL_ENDPOINT = "http://localhost:4566";
const WORKER_TARGETS = [
  "aws_s3_bucket_cors_configuration.memory_uploads",
  "aws_s3_bucket_public_access_block.memory_uploads",
  "aws_lambda_function.image_worker",
  "aws_lambda_event_source_mapping.images",
];

type Plan = { resource_changes?: { address: string; change: { actions: string[] } }[] };

export function deployFlociWorker(rootDirectory: string): void {
  const environment = {
    ...process.env,
    AWS_ACCESS_KEY_ID: "test",
    AWS_SECRET_ACCESS_KEY: "test",
    AWS_SESSION_TOKEN: "",
    AWS_REGION: "us-east-1",
    AWS_DEFAULT_REGION: "us-east-1",
  };
  const run = (command: string, args: string[], inherit = false): string =>
    execFileSync(command, args, {
      cwd: rootDirectory,
      env: environment,
      encoding: "utf8",
      stdio: inherit ? "inherit" : "pipe",
      timeout: 600_000,
    }) ?? "";
  const aws = ["--region", "us-east-1", "--endpoint-url", LOCAL_ENDPOINT];
  run("docker", ["info"]);
  run("terraform", ["version"]);
  run("aws", [...aws, "lambda", "list-functions"]);

  const imageUri = `000000000000.dkr.ecr.us-east-1.amazonaws.com/${FUNCTION_NAME}:dev-${Date.now()}-${randomUUID().slice(0, 8)}`;
  process.stdout.write(`Building local worker image: ${imageUri}\n`);
  run(
    "docker",
    [
      "build",
      "--platform",
      "linux/amd64",
      "--provenance=false",
      "-f",
      "apps/workers/Dockerfile",
      "-t",
      imageUri,
      ".",
    ],
    true,
  );
  run("docker", ["image", "inspect", imageUri]);

  const terraformDirectory = "-chdir=infra/environments/floci-local";
  run("terraform", [terraformDirectory, "init", "-input=false"], true);
  const temporaryDirectory = mkdtempSync(join(tmpdir(), "leonly-worker-deploy-"));
  try {
    const planPath = join(temporaryDirectory, "worker.tfplan");
    run(
      "terraform",
      [
        terraformDirectory,
        "plan",
        "-input=false",
        `-out=${planPath}`,
        `-var=image_worker_local_image_uri=${imageUri}`,
        ...WORKER_TARGETS.map((target) => `-target=${target}`),
      ],
      true,
    );
    const plan = JSON.parse(
      run("terraform", [terraformDirectory, "show", "-json", planPath]),
    ) as Plan;
    for (const resource of plan.resource_changes ?? []) {
      if (
        resource.address.startsWith("module.api.") ||
        resource.change.actions.includes("delete")
      ) {
        throw new Error(`Refusing API or destructive change: ${resource.address}`);
      }
    }
    run("terraform", [terraformDirectory, "apply", "-input=false", planPath], true);

    const variablePath = join(rootDirectory, "infra/environments/floci-local/local.auto.tfvars");
    const previous = existsSync(variablePath) ? readFileSync(variablePath, "utf8") : "";
    const assignment = `image_worker_local_image_uri = ${JSON.stringify(imageUri)}`;
    const pattern = /^image_worker_local_image_uri[ \t]*=.*$/m;
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
    run("aws", [...aws, "lambda", "wait", "function-updated-v2", "--function-name", FUNCTION_NAME]);
    process.stdout.write(`Worker deployed: ${FUNCTION_NAME}\nImage: ${imageUri}\n`);
    process.stdout.write(
      `Logs: aws ${aws.join(" ")} logs tail /aws/lambda/${FUNCTION_NAME} --follow\n`,
    );
  } finally {
    rmSync(temporaryDirectory, { recursive: true, force: true });
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    deployFlociWorker(resolve(dirname(fileURLToPath(import.meta.url)), "../.."));
  } catch (error) {
    process.stderr.write(
      `${error instanceof Error ? error.message : "Local worker deployment failed."}\n`,
    );
    process.exitCode = 1;
  }
}
