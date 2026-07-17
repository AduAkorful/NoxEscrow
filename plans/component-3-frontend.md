# Component 3: Frontend dApp & Client-side Encryption
**Detailed Implementation Plan & Client-Side SDK Specifications**

This document details the frontend architecture, wallet-derived key management, local client-side cryptographic functions, and IPFS storage integrations for **NoxEscrow**.

---

## 1. Technical Decisions Summary
*   **Key Derivation:** Option A — Deterministic Web3 Wallet Key Derivation. Users sign a static message using their connected wallet, and the signature is hashed via PBKDF2 / SHA-256 to derive the symmetric encryption key, providing a passwordless, fully self-custodial experience.
*   **File Storage:** Option A — Decentralized IPFS. Files (milestone definitions, requirements, code deliverables) are encrypted locally using the derived key and then uploaded directly to IPFS (pinned via Pinata or Web3.Storage). Only the resulting CID is registered on-chain.
*   **UI/UX Aesthetic:** Space Black, Carbon Gray, and Nox Teal with pulsing Hyper Purple glows for encrypted components.

---

## 2. Wallet-Derived Cryptographic Onboarding

When a user connects their wallet, the React app derives a persistent, secure local encryption key without asking for passwords.

```javascript
// src/crypto/keyDerivation.js
import { ethers } from "ethers";
import crypto from "crypto-browserify"; // Browser-safe Node crypto polyfill

const SIGN_MESSAGE = "Initialize your NoxEscrow Secure Environment. Signing this does not cost gas and creates your local private vault key.";

export async function deriveEncryptionKey(provider) {
  const signer = await provider.getSigner();
  const signature = await signer.signMessage(SIGN_MESSAGE);
  
  // Convert signature into a stable 256-bit symmetric key using PBKDF2
  const salt = ethers.id("noxescrow-protocol-salt");
  const iterations = 100000;
  const keyLength = 32; // 256 bits for AES-GCM
  
  return new Promise((resolve, reject) => {
    crypto.pbkdf2(signature, salt, iterations, keyLength, "sha256", (err, derivedKey) => {
      if (err) reject(err);
      else resolve(derivedKey.toString("hex"));
    });
  });
}
```

---

## 3. Client-side Local Encryption & IPFS Upload

Before any file hits the network, it is encrypted in the client's memory.

```javascript
// src/crypto/fileUploader.js
import { deriveEncryptionKey } from "./keyDerivation";
import { PinataSDK } from "@pinata/sdk"; // or standard fetch to Pinata API

const pinata = new PinataSDK({ pinataJWTKey: process.env.REACT_APP_PINATA_JWT });

export async function encryptAndUploadToIPFS(file, encryptionKey) {
  const fileBytes = await file.arrayBuffer();
  const iv = window.crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV for AES-GCM
  
  // Import derived key for WebCrypto AES-GCM
  const rawKey = Buffer.from(encryptionKey, "hex");
  const cryptoKey = await window.crypto.subtle.importKey(
    "raw",
    rawKey,
    { name: "AES-GCM" },
    false,
    ["encrypt"]
  );
  
  // Encrypt file bytes
  const encryptedBytes = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv },
    cryptoKey,
    fileBytes
  );
  
  // Package into a JSON payload with hex strings for TEE-Arbiter compatibility
  const ciphertextHex = Buffer.from(encryptedBytes).toString("hex");
  const ivHex = Buffer.from(iv).toString("hex");
  
  const payload = JSON.stringify({
    ciphertext: ciphertextHex,
    iv: ivHex
  });
  
  // Upload to IPFS
  const response = await pinata.upload.json(JSON.parse(payload));
  return response.IpfsHash; // Return CID to store on-chain
}
```

---

## 4. Frontend Workspace Layout & Navigation Map

```
+──────────────────────────────────────────────────────────────────────────────+
|  🛡️ NoxEscrow                      [ 0x8f...e10 ]  [ 🔒 Derived Key: ACTIVE ]  |
+──────────────────────────────────────────────────────────────────────────────+
|  +---------------------------+  +------------------------------------------+  |
|  | MY PORTFOLIO              |  | ACTIVES WORKSPACE                        |  |
|  |                           |  |                                          |  |
|  | - Gig #102: Uniswap V4     |  | • Milestone 2: Write Assembly optims     |  |
|  |   Status: DISPUTED ⚠️      |  | • Budget: [ ██████ ] cUSDC               |  |
|  | - Gig #101: Gnosis Safe   |  |   (Pulsing glow indicating encryption)   |  |
|  |   Status: ACTIVE ✅       |  |                                          |  |
|  | - Gig #100: Aave V3 Core  |  | [ View Decrypted Requirements ]           |  |
|  |   Status: COMPLETED 🎉    |  | [ Submit Code Patch ]                     |  |
|  |                           |  | [ Initiate TEE Dispute Assessment ]      |  |
|  +---------------------------+  +------------------------------------------+  |
+──────────────────────────────────────────────────────────────────────────────+
```

---

## 5. UI Quality & Validation Checklist
*   [ ] **Zero Plaintext Logs:** Verify the developer console prints zero raw signature results, passwords, or decrypted text.
*   [ ] **AES-GCM Proofs Validation:** Verify the IV prefix matches the exact 12-byte length during local decryption trials.
*   [ ] **Responsive View Gating:** Verify card displays and JetBrains Mono address boxes wrap correctly down to a 360px mobile view with a 48px thumb trigger padding.
