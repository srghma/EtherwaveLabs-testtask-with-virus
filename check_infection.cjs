const fs = require("fs");
const path = require("path");
const os = require("os");
const { execSync } = require("child_process");

console.log("=== 1. CHECKING HOST HOME DIRECTORY ===");
const hostMalwareDir = path.join(os.homedir(), ".node_modules");
if (fs.existsSync(hostMalwareDir)) {
  console.log(" [!] WARNING: Found ~/.node_modules on HOST:");
  console.log(fs.readdirSync(hostMalwareDir));
} else {
  console.log(" [OK] Host ~/.node_modules DOES NOT exist. (Host is clean)");
}

console.log("\n=== 2. CHECKING PROJECT CONTAINER CACHE (.cache/home) ===");
const cacheMalwareDir = path.resolve("./.cache/home/.node_modules");
if (fs.existsSync(cacheMalwareDir)) {
  console.log(" [!] The container executed and dropped files into .cache/home/.node_modules:");
  console.log(fs.readdirSync(cacheMalwareDir));
} else {
  console.log(" [OK] No dropped files found in ./.cache/home/.node_modules.");
}

console.log("\n=== 3. CHECKING ACTIVE PROCESSES ON HOST ===");
try {
  const ps = execSync("ps aux | grep -E 'npm-ws|95.135.181' | grep -v grep || true", { encoding: "utf-8" }).trim();
  if (ps) {
    console.log(" [!] Rogue processes found running on host:\n" + ps);
  } else {
    console.log(" [OK] No C2 connections or persistence daemons running on host.");
  }
} catch (e) {
  console.log("Process check failed:", e.message);
}

console.log("\n=== 4. WHAT DOES THE REST OF stage4_npm_migrate.js DO? ===");
if (fs.existsSync("stage4_npm_migrate.js")) {
  const migrateCode = fs.readFileSync("stage4_npm_migrate.js", "utf-8");

  // Search for how it tries to persist on Linux vs Windows
  console.log("Targeted OS mechanisms in npm_migrate:");
  if (migrateCode.includes("win32")) console.log(" - Windows: Injects into npm-cli.js / APPDATA");
  if (migrateCode.includes("linux")) console.log(" - Linux: Checks process.platform === 'linux'");
  if (migrateCode.includes("darwin")) console.log(" - macOS: Checks process.platform === 'darwin'");
  if (migrateCode.includes(".bashrc") || migrateCode.includes(".profile")) console.log(" - Shell RC files targeted");
  if (migrateCode.includes("cron")) console.log(" - Crontab targeted");
}
