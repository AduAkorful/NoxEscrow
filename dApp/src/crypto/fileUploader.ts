/**
 * Helper to convert ArrayBuffer bytes to hex string.
 */
function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Helper to convert a general hex string back to Uint8Array.
 */
function hexToUint8Array(hex: string): Uint8Array {
  const cleanHex = hex.startsWith("0x") ? hex.slice(2) : hex;
  if (cleanHex.length % 2 !== 0 || !/^[0-9a-fA-F]+$/.test(cleanHex)) {
    throw new Error("Invalid hex string.");
  }
  const bytes = new Uint8Array(cleanHex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(cleanHex.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

/**
 * Helper to convert hex string back to Uint8Array.
 */
function hexToBytes(hex: string): Uint8Array {
  const cleanHex = hex.startsWith("0x") ? hex.slice(2) : hex;
  if (cleanHex.length !== 64) {
    throw new Error("Expected a 32-byte hex-encoded AES key.");
  }
  return hexToUint8Array(cleanHex);
}

/**
 * Encrypts plain text using browser-native WebCrypto AES-GCM (256-bit).
 * Returns the hex-encoded ciphertext (with appended 16-byte auth tag) and the hex-encoded IV.
 * @param plaintext The plain-text requirements or deliverable string to encrypt.
 * @param hexKey The 256-bit symmetric key hex string derived from signature.
 */
export async function encryptText(plaintext: string, hexKey: string): Promise<{ ciphertext: string, iv: string }> {
  if (!globalThis.crypto?.subtle) {
    throw new Error("WebCrypto is unavailable. Open NoxEscrow from a secure browser context.");
  }

  const encoder = new TextEncoder();
  const plaintextBytes = encoder.encode(plaintext);
  const keyBytes = hexToBytes(hexKey);

  // Import the hex key as a CryptoKey object for AES-GCM
  const cryptoKey = await window.crypto.subtle.importKey(
    "raw",
    keyBytes as any,
    { name: "AES-GCM" },
    false,
    ["encrypt"]
  );

  // Generate a cryptographically secure random 12-byte (96-bit) IV for GCM
  const ivBytes = window.crypto.getRandomValues(new Uint8Array(12));

  // Encrypt the bytes. WebCrypto automatically appends the 16-byte auth tag at the end!
  const encryptedBuffer = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv: ivBytes },
    cryptoKey,
    plaintextBytes
  );

  return {
    ciphertext: bufferToHex(encryptedBuffer),
    iv: bufferToHex(ivBytes.buffer)
  };
}

/**
 * Decrypts AES-256-GCM encrypted ciphertext using browser-native WebCrypto.
 * @param ciphertextHex The hex-encoded ciphertext.
 * @param hexKey The 256-bit symmetric key hex string.
 * @param ivHex The hex-encoded IV.
 */
export async function decryptText(ciphertextHex: string, hexKey: string, ivHex: string): Promise<string> {
  if (!globalThis.crypto?.subtle) {
    throw new Error("WebCrypto is unavailable.");
  }

  const keyBytes = hexToBytes(hexKey);
  const ciphertextBytes = hexToUint8Array(ciphertextHex);
  const ivBytes = hexToUint8Array(ivHex);

  const cryptoKey = await window.crypto.subtle.importKey(
    "raw",
    keyBytes as any,
    { name: "AES-GCM" },
    false,
    ["decrypt"]
  );

  const decryptedBuffer = await window.crypto.subtle.decrypt(
    { name: "AES-GCM", iv: ivBytes as any },
    cryptoKey,
    ciphertextBytes as any
  );

  return new TextDecoder().decode(decryptedBuffer);
}

/**
 * Uploads a JSON payload to Pinata IPFS using the REST API pinning/pinJSONToIPFS.
 * @param jsonPayload The JSON object containing { ciphertext, iv }.
 * @param pinataJWT The Pinata JWT API Token.
 * @returns The IPFS Content Identifier (CID).
 */
export async function uploadToPinata(jsonPayload: { ciphertext: string, iv: string }, pinataJWT: string): Promise<string> {
  const response = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${pinataJWT}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      pinataContent: jsonPayload,
      pinataMetadata: {
        name: `nox-escrow-${Date.now()}.json`
      }
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Pinata upload failed: ${response.status} ${errText}`);
  }

  const result = await response.json();
  return result.IpfsHash; // This is the CID
}

/**
 * Encrypts a File object and uploads it to Pinata.
 * Returns the file name, mime type, and the uploaded IPFS CID.
 */
export async function encryptAndUploadFile(
  file: File,
  hexKey: string,
  pinataJWT: string
): Promise<{ name: string; type: string; cid: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const arrayBuffer = reader.result as ArrayBuffer;
        const fileHex = bufferToHex(arrayBuffer);
        const encrypted = await encryptText(fileHex, hexKey);
        const cid = await uploadToPinata(encrypted, pinataJWT);
        resolve({
          name: file.name,
          type: file.type,
          cid
        });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error("Failed to read file."));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Fetches and decrypts a file from IPFS.
 * Returns a Blob URL that can be downloaded or previewed in the browser.
 */
export async function fetchAndDecryptFile(
  cid: string,
  hexKey: string,
  _name: string,
  type: string
): Promise<string> {
  const url = `https://gateway.pinata.cloud/ipfs/${cid}`;
  const resp = await fetch(url);
  if (!resp.ok) {
    throw new Error(`Failed to fetch file from IPFS: ${resp.statusText}`);
  }
  const payload = await resp.json();
  const fileHex = await decryptText(payload.ciphertext, hexKey, payload.iv);
  const bytes = hexToUint8Array(fileHex);
  const blob = new Blob([bytes.buffer as ArrayBuffer], { type });
  return URL.createObjectURL(blob);
}

