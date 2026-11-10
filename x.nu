# 1. Verify response file exists
let raw_file = "malware_probe_response.txt"
if not ($raw_file | path exists) {
    print $"Error: ($raw_file) not found in current directory."
    exit 1
}

# 2. Extract raw JavaScript from HTTP response
let content = (open $raw_file)
let js_lines = ($content | lines | skip until {|l| ($l | str starts-with "function IWbu") or ($l | str starts-with "function ")})
let js_code = ($js_lines | str join "\n")

if ($js_code | is-empty) {
    print "Error: Could not find JavaScript body in malware_probe_response.txt."
    exit 1
}

$js_code | save -f "raw_stage1.js"

# 3. Create sandboxed Node unpacker (contains zero single quotes to avoid Nushell syntax collision)
let harness = '
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
'

$harness | save -f "unpack.cjs"

# 4. Run the unpacker
let res = (do { ^bun unpack.cjs } | complete)

# 5. Build log report
let first_lines = (if ("unpacked_malware.js" | path exists) {
    open "unpacked_malware.js" | lines | take 50 | str join "\n"
} else {
    "No unpacked_malware.js created."
})

let log_report = [
    "=== DEOBFUSCATION REPORT ==="
    $res.stdout
    (if ($res.stderr | str length) > 0 { $"STDERR: ($res.stderr)" } else { "" })
    "\n=== FIRST 50 LINES OF UNPACKED PAYLOAD ==="
    $first_lines
] | str join "\n"

# 6. Print to terminal and pipe to CopyQ
print $log_report
$log_report | copyq add -; copyq select 0
