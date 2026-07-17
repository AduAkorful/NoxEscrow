# NoxEscrow — Frontend Client Interface (dApp) 🛡️

This directory houses the frontend dApp for **NoxEscrow**, implemented in **Vite + React (v19) + TypeScript** and styled with **Tailwind CSS v4**.

It coordinates connected Web3 wallets via **Privy Auth**, performs local cryptographic key derivation, encrypts deliverables and requirements in-browser via **WebCrypto AES-GCM (256-bit)**, and interacts directly with the on-chain iExec Nox protocol factory and clones.

---

## 📂 Core Module Layout

```
dApp/
├── src/
│   ├── components/            # High-fidelity Bento layout panels
│   │   ├── KeyDerivationGate  # Welcome screen managing local signature key derivation
│   │   ├── DraftWizard        # Multi-step escrow creation and deployment wizard
│   │   ├── EscrowWorkspace    # Active milestone status board with download and decrypt options
│   │   ├── TEECourtroom       # Telemetry terminal showing secure TEE execution logs
│   │   └── ShortcutsHUD       # Keyboard HUD overlay showing navigation shortcuts
│   │
│   ├── crypto/                # Client-Side Encryption
│   │   ├── keyDerivation.ts   # PBKDF2 (SHA-256) signature-based symmetric key generation
│   │   └── fileUploader.ts    # AES-GCM (256-bit) browser-native encryption & Pinata IPFS integration
│   │
│   ├── services/              # Blockchain Services
│   │   ├── escrowService.ts   # Factory cloning, deposits, and transient KMS permission loops
│   │   └── metadataService.ts # Supabase storage integrations syncing encrypted file pointers
│   │
│   └── App.tsx                # Central workspace state and keyboard shortcut event listeners
```

---

## ⚡ Setup & Commands

Run these commands inside the `/dApp` folder or from the workspace root using the `--prefix dApp` flag.

### 1. Install Dependencies
```bash
npm install
```

### 2. Launch Development Server
```bash
npm run dev
```
*Launches local server at `http://localhost:3000`.*

### 3. Run Linter Audits
```bash
npm run lint
```
*Uses high-speed `oxlint` rules to verify codebase standards.*

### 4. Build Optimized Production Files
```bash
npm run build
```
*Performs Typechecking via `tsc` and packages minified assets in `dist/`.*

---

## 🛡️ Key Derivation & Encryption Protocol

1.  **Deterministic Key Derivation:** To deliver a passwordless, self-custodial experience, the app prompts the user to sign a static message upon connection. The resulting EIP-191 signature is parsed through **WebCrypto PBKDF2** with a standard salt and 100,000 iterations to derive a secure, stable 256-bit symmetric key in memory.
2.  **Symmetric GCM Encryption:** Requirements and file payloads are encrypted in-browser using **AES-256-GCM** with a cryptographically secure, random 12-byte initialization vector (IV). Ciphertexts are uploaded to IPFS (via Pinata) and symmetric keys are registered on-chain under the iExec Nox KMS.
