const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

function findFile(...candidates) {
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return null;
}

function getPreview(filePath, maxLines = 40) {
  if (!fs.existsSync(filePath)) {
    return `${filePath} not yet recovered.`;
  }
  const content = fs.readFileSync(filePath, "utf-8");
  return content.split(/\r?\n/).slice(0, maxLines).join("\n");
}

function tryDecrypt(buffer, name, stage2) {
  console.log(`\n--- Attempting Decryption for ${name} (${buffer.length} bytes) ---`);

  // 1. Direct gzip check (1f 8b)
  if (buffer.length > 2 && buffer[0] === 0x1f && buffer[1] === 0x8b) {
    try {
      const decomp = zlib.gunzipSync(buffer);
      console.log(" [!] Direct gzip payload detected!");
      return decomp.toString("utf-8");
    } catch {}
  }

  // 2. Search around the endpoint handler in stage 2
  const searchPattern = name.includes("cls") ? "/0x/cls" : "/0x/ls";
  const epIdx = stage2.indexOf(searchPattern);
  if (epIdx !== -1) {
    const handlerContext = stage2.substring(
      Math.max(0, epIdx - 200),
      Math.min(stage2.length, epIdx + 400)
    );
    console.log(`Context around ${searchPattern} handler:\n${handlerContext}\n`);

    // Extract XOR key if defined near the handler
    let key = null;
    const strKeyMatch = handlerContext.match(/Buffer\.from\(\s*["']([^"']+)["']/);
    if (strKeyMatch) {
      key = Buffer.from(strKeyMatch[1]);
    } else {
      const byteKeyMatch = handlerContext.match(/\[([0-9,\s]+)\]/);
      if (byteKeyMatch) {
        key = Buffer.from(byteKeyMatch[1].split(",").map(Number));
      }
    }

    if (key && key.length > 0) {
      console.log(`Using key: "${key.toString()}" (${key.length} bytes)`);
      const out = Buffer.alloc(buffer.length);
      for (let i = 0; i < buffer.length; i++) {
        out[i] = buffer[i] ^ key[i % key.length];
      }
      try {
        return zlib.inflateSync(out).toString("utf-8");
      } catch {
        try {
          return zlib.gunzipSync(out).toString("utf-8");
        } catch {
          return out.toString("utf-8");
        }
      }
    }
  }

  // 3. Fallback: test all string candidates from stage 2 as XOR keys
  const candidates = [...stage2.matchAll(/["']([^"']{4,64})["']/g)].map((m) => m[1]);
  for (const cand of candidates) {
    const k = Buffer.from(cand);
    const testLen = Math.min(buffer.length, 128);
    const testBuf = Buffer.alloc(testLen);
    for (let i = 0; i < testLen; i++) {
      testBuf[i] = buffer[i] ^ k[i % k.length];
    }
    const txt = testBuf.toString("utf-8");
    if (
      txt.includes("function") ||
      txt.includes("const ") ||
      txt.includes("var ") ||
      txt.includes("process") ||
      txt.includes("require")
    ) {
      console.log(`>>> Recovered XOR Key: "${cand}"`);
      const full = Buffer.alloc(buffer.length);
      for (let i = 0; i < buffer.length; i++) {
        full[i] = buffer[i] ^ k[i % k.length];
      }
      try {
        return zlib.inflateSync(full).toString("utf-8");
      } catch {
        try {
          return zlib.gunzipSync(full).toString("utf-8");
        } catch {
          return full.toString("utf-8");
        }
      }
    }
  }

  return null;
}

function main() {
  console.log("=== STAGE 3 DECRYPTION REPORT ===");

  // Failproof check for input files
  const clsFile = findFile("raw_stage3_xcls.bin", "raw_stage3_cls.bin");
  const lsFile = findFile("raw_stage3_xls.bin", "raw_stage3_ls.bin");
  const stage2File = findFile("unpacked_malware.js");

  if (!clsFile && !lsFile) {
    console.error("Error: Neither raw_stage3_xcls.bin nor raw_stage3_xls.bin found. Run x2 first.");
    process.exit(1);
  }

  if (!stage2File) {
    console.error("Error: unpacked_malware.js not found.");
    process.exit(1);
  }

  const stage2 = fs.readFileSync(stage2File, "utf-8");

  // Locate decryption code signatures
  console.log("=== Decryption Code in Loader ===");
  const decryptFuncMatch =
    stage2.match(/function\s+([a-zA-Z0-9_$]+)\s*\([^)]*\)\s*\{[^}]*\^[^}]*\}/g) ||
    stage2.match(/[a-zA-Z0-9_$]+\s*=\s*\([^)]*\)\s*=>\s*\{[^}]*\^[^}]*\}/g) ||
    [];

  if (decryptFuncMatch.length > 0) {
    decryptFuncMatch.forEach((f) => console.log(f + "\n"));
  } else {
    console.log("No explicit XOR functions matched via regex.");
  }

  // Key candidates
  const xorKeys = [...stage2.matchAll(/Buffer\.from\((?:\[([^\]]+)\]|["']([^"']+)["'])/g)]
    .map((m) => m[1] || m[2]);
  console.log("=== Key candidates found in loader ===");
  console.log(xorKeys);

  // Decrypt cls
  if (clsFile) {
    const clsBuf = fs.readFileSync(clsFile);
    const clsDecrypted = tryDecrypt(clsBuf, "0x/cls", stage2);
    if (clsDecrypted) {
      fs.writeFileSync("stage3_cls.js", clsDecrypted, "utf-8");
      console.log(">>> Successfully saved stage3_cls.js!");
    } else {
      console.log("[-] Failed to decrypt stage3_cls.js");
    }
  }

  // Decrypt ls
  if (lsFile) {
    const lsBuf = fs.readFileSync(lsFile);
    const lsDecrypted = tryDecrypt(lsBuf, "0x/ls", stage2);
    if (lsDecrypted) {
      fs.writeFileSync("stage3_ls.js", lsDecrypted, "utf-8");
      console.log(">>> Successfully saved stage3_ls.js!");
    } else {
      console.log("[-] Failed to decrypt stage3_ls.js");
    }
  }

  // Print previews
  console.log("\n=== PREVIEW: stage3_cls.js (First 40 lines) ===");
  console.log(getPreview("stage3_cls.js"));

  console.log("\n=== PREVIEW: stage3_ls.js (First 40 lines) ===");
  console.log(getPreview("stage3_ls.js"));
}

main();
