import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "..");
const packageJsonPath = path.join(rootDir, "package.json");
const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));

const outDir = path.resolve(rootDir, process.env.VSIX_OUT_DIR ?? "dist");
const vsixPath = path.join(outDir, `${packageJson.name}-${packageJson.version}.vsix`);
const codeCommand = process.env.VSCODE_CLI ?? "code";
const skipInstall = process.argv.includes("--no-install");

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: rootDir,
    shell: process.platform === "win32",
    stdio: "inherit",
    ...options,
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

mkdirSync(outDir, { recursive: true });

console.log("Building extension...");
run("npm", ["run", "build"]);

console.log(`Packaging ${path.relative(rootDir, vsixPath)}...`);
run("npx", ["vsce", "package", "--no-dependencies", "--out", vsixPath]);

if (!existsSync(vsixPath)) {
  throw new Error(`VSIX was not created: ${vsixPath}`);
}

if (skipInstall) {
  console.log("Skipping installation because --no-install was passed.");
  process.exit(0);
}

console.log(`Installing with ${codeCommand}...`);
run(codeCommand, ["--install-extension", vsixPath, "--force"]);

console.log("Done. Reload VS Code to use the installed extension.");
