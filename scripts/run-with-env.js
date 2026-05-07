#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

function parseEnvFile(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  const parsed = {};

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const equalsIndex = line.indexOf("=");
    if (equalsIndex === -1) continue;

    const key = line.slice(0, equalsIndex).trim();
    let value = line.slice(equalsIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    parsed[key] = value;
  }

  return parsed;
}

function main() {
  const args = process.argv.slice(2);
  const separatorIndex = args.indexOf("--");

  if (separatorIndex === -1) {
    console.error(
      "Usage: node scripts/run-with-env.js --env-file <path> -- <command> [args...]",
    );
    process.exit(1);
  }

  const optionArgs = args.slice(0, separatorIndex);
  const commandArgs = args.slice(separatorIndex + 1);

  if (commandArgs.length === 0) {
    console.error("Missing command after --");
    process.exit(1);
  }

  let envFile = null;
  for (let i = 0; i < optionArgs.length; i += 1) {
    if (optionArgs[i] === "--env-file") {
      envFile = optionArgs[i + 1];
      i += 1;
    }
  }

  if (!envFile) {
    console.error("Missing required --env-file option");
    process.exit(1);
  }

  const resolvedEnvFile = path.resolve(process.cwd(), envFile);
  if (!fs.existsSync(resolvedEnvFile)) {
    console.error(`Env file not found: ${resolvedEnvFile}`);
    process.exit(1);
  }

  const injectedEnv = parseEnvFile(resolvedEnvFile);
  const [command, ...rest] = commandArgs;

  const child = spawn(command, rest, {
    cwd: process.cwd(),
    env: {
      ...process.env,
      ...injectedEnv,
    },
    stdio: "inherit",
    shell: false,
  });

  child.on("exit", (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }

    process.exit(code ?? 0);
  });
}

main();
