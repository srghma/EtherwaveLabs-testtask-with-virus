const fs = require("fs");

async function main() {
  console.log("=== POLINRIDER STAGE 2 & C2 RESOLUTION ===");

  const targetFile = "unpacked_malware.js";
  if (!fs.existsSync(targetFile)) {
    console.error(`Error: ${targetFile} not found. Run stage 1 unpacker first.`);
    process.exit(1);
  }

  const code = fs.readFileSync(targetFile, "utf-8");

  // 1. Extract Ethereum addresses
  const ethAddresses = [...new Set(code.match(/0x[a-fA-F0-9]{40}/g) || [])];
  console.log("=== Extracted Ethereum Wallet(s) ===");
  if (ethAddresses.length === 0) {
    console.log(" -> None found.");
  } else {
    ethAddresses.forEach((a) => console.log(" -> " + a));
  }

  // 2. Extract potential XOR keys
  const xorMatches = [...code.matchAll(/["']([^"']{10,32})["']/g)]
    .map((m) => m[1])
    .filter(
      (s) =>
        /[A-Za-z0-9!@#%^&*_-]{12,24}/.test(s) &&
        !s.includes("http") &&
        !s.includes("process")
    );

  console.log("\n=== Candidate XOR Keys Found ===");
  xorMatches.slice(0, 8).forEach((k) => console.log(" -> " + k));

  if (ethAddresses.length === 0) {
    console.log("\nNo Ethereum address found in payload.");
    return;
  }

  const wallet = ethAddresses[0];
  console.log(
    `\n=== Querying Ethereum Blockchain for Dead-Drop Wallet (${wallet}) ===`
  );

  try {
    const blockscoutUrl = `https://eth.blockscout.com/api/v2/addresses/${wallet}/transactions`;
    const resp = await fetch(blockscoutUrl, {
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(10000),
    })
      .then((r) => r.json())
      .catch((err) => {
        console.error("Blockscout fetch failed:", err.message);
        return null;
      });

    let toAddr = null;
    if (resp && resp.items && resp.items.length > 0) {
      toAddr = resp.items[0].to?.hash;
    }

    if (!toAddr) {
      console.log("No recent transactions found on Blockscout or rate limited.");
      return;
    }

    console.log("Latest transaction to address: " + toAddr);
    const hex = toAddr.replace(/^0x/, "");

    // Parse first 4 bytes as IP1, next 4 bytes as IP2
    const ip1 = [
      parseInt(hex.slice(0, 2), 16),
      parseInt(hex.slice(2, 4), 16),
      parseInt(hex.slice(4, 6), 16),
      parseInt(hex.slice(6, 8), 16),
    ].join(".");

    const ip2 = [
      parseInt(hex.slice(8, 10), 16),
      parseInt(hex.slice(10, 12), 16),
      parseInt(hex.slice(12, 14), 16),
      parseInt(hex.slice(14, 16), 16),
    ].join(".");

    console.log(`\n>>> RESOLVED LIVE C2 IPs <<<`);
    console.log(` -> Primary C2 (ip1):   ${ip1}`);
    console.log(` -> Secondary C2 (ip2): ${ip2}`);

    // Probe the endpoints safely
    for (const ep of ["/0x/cls", "/0x/ls"]) {
      const probeUrl = `http://${ip1}:443${ep}`;
      console.log(`\nProbing C2 endpoint ${probeUrl} ...`);
      try {
        const c2Res = await fetch(probeUrl, {
          signal: AbortSignal.timeout(5000),
          headers: { "User-Agent": "Mozilla/5.0" },
        });

        const buf = Buffer.from(await c2Res.arrayBuffer());
        console.log(
          ` -> Response status: ${c2Res.status}, size: ${buf.length} bytes`
        );

        const outName = `raw_stage3_${ep.replace(/[^a-z]/g, "")}.bin`;
        fs.writeFileSync(outName, buf);
        console.log(` -> Saved to ${outName}`);
      } catch (e) {
        console.log(` -> Failed to connect to ${ip1}:443${ep}: ${e.message}`);
      }
    }
  } catch (err) {
    console.error("Error during blockchain resolution:", err.message);
  }
}

main();
