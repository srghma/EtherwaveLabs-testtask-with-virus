
const fs = require("fs");

let functionCallIndex = 0;
const NativeFunction = Function;

function trap(...args) {
    functionCallIndex++;
    if (functionCallIndex === 1) {
        // Call 1: internal decompressor function compilation
        return NativeFunction(...args);
    }

    // Call 2: second-stage raw malware payload!
    const malwareSource = args[args.length - 1];
    fs.writeFileSync("unpacked_malware.js", malwareSource, "utf-8");

    console.log(">>> SUCCESS: Trapped unencrypted stage-2 payload!");
    console.log(">>> Payload size: " + malwareSource.length + " bytes\n");

    const urlMatches = malwareSource.match(/https?:\/\/[^\s"`;)]+/g) || [];
    const uniqueUrls = [...new Set(urlMatches)];

    const extensionIds = [
        ["MetaMask", "nkbihfbeogaeaoehlefnkodbefgpgknn"],
        ["Phantom", "bfnaelmomeimhlpmgjnjophhpkkoljpa"],
        ["Coinbase", "hnfanknocfeofbddgcijnmhnfnkdnaad"],
        ["TronLink", "ibnejdfjmmkpcnlpebklmnkoeoihofec"],
        ["Binance", "fhbohimaelbohpjbbldcngcnapndodjp"],
        ["Exodus", "aholpfdialjgjfhomihkjbmgjidlcdno"]
    ];

    console.log("=== Targeted Crypto Wallet Extensions ===");
    for (const [name, id] of extensionIds) {
        if (malwareSource.includes(id)) {
            console.log(" [!] TARGET DETECTED: " + name + " (" + id + ")");
        }
    }

    console.log("\n=== Discovered C2 URLs / Endpoints ===");
    if (uniqueUrls.length === 0) {
        console.log(" (None found in plain string format)");
    } else {
        uniqueUrls.forEach(u => console.log(" -> " + u));
    }

    const pathMatches = malwareSource.match(/[\/~][a-zA-Z0-9_\-\.\/]+/g) || [];
    const sensitive = [...new Set(pathMatches.filter(p =>
        p.includes("ssh") || p.includes("wallet") || p.includes("solana") ||
        p.includes("config") || p.includes("key") || p.includes(".env") ||
        p.includes("chrome") || p.includes("brave") || p.includes("AppData")
    ))];

    console.log("\n=== Targeted Sensitive Paths ===");
    sensitive.slice(0, 30).forEach(p => console.log(" -> " + p));

    // Abort execution immediately before running any payload
    process.exit(0);
}

Function.prototype.constructor = trap;
global.Function = trap;

try {
    require("./raw_stage1.js");
} catch (err) {
    console.error("Unpacker finished:", err.message);
}
