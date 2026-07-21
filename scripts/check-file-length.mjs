import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const MAX_LINES = 400;
const CODE_EXTENSIONS = new Set([
  ".cjs",
  ".css",
  ".js",
  ".jsx",
  ".mjs",
  ".sql",
  ".ts",
  ".tsx",
]);
const EXCLUDED_DIRECTORIES = new Set([
  ".next",
  ".turbo",
  "coverage",
  "dist",
  "node_modules",
]);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const violations = [];

async function checkDirectory(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      if (!EXCLUDED_DIRECTORIES.has(entry.name)) {
        await checkDirectory(entryPath);
      }
      continue;
    }

    if (!CODE_EXTENSIONS.has(path.extname(entry.name))) {
      continue;
    }

    const source = await readFile(entryPath, "utf8");
    const lineCount =
      source === "" ? 0 : source.split(/\r?\n/).length - Number(source.endsWith("\n"));

    if (lineCount > MAX_LINES) {
      violations.push(`${path.relative(root, entryPath)} (${lineCount} lines)`);
    }
  }
}

for (const directory of ["apps", "scripts", "supabase"]) {
  await checkDirectory(path.join(root, directory));
}

if (violations.length > 0) {
  process.stderr.write(`Files exceed the ${MAX_LINES}-line limit:\n${violations.join("\n")}\n`);
  process.exitCode = 1;
}
