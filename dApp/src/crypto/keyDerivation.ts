export const SIGN_MESSAGE = "Initialize your NoxEscrow Secure Environment. Signing this does not cost gas and creates your local private vault key.";

/**
 * Derives a stable 256-bit symmetric key from a wallet signature using browser-native WebCrypto PBKDF2.
 * @param signature The EIP-191 signature string from the connected wallet.
 * @returns A promise resolving to a 256-bit (32-byte) hex-encoded key string.
 */
export async function deriveEncryptionKey(signature: string): Promise<string> {
  if (!globalThis.crypto?.subtle) {
    throw new Error("WebCrypto is unavailable. Open NoxEscrow from a secure browser context.");
  }

  const encoder = new TextEncoder();
  const signatureBuffer = encoder.encode(signature);

  // Import the signature as a base cryptographic key material for PBKDF2 derivation
  const baseKey = await window.crypto.subtle.importKey(
    "raw",
    signatureBuffer,
    "PBKDF2",
    false,
    ["deriveBits", "deriveKey"]
  );

  const saltBuffer = encoder.encode("noxescrow-protocol-salt");

  // Derive a stable symmetric AES-GCM key
  const derivedKey = await window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: saltBuffer,
      iterations: 100000,
      hash: "SHA-256"
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    true, // Extractable so we can read its raw bytes
    ["encrypt", "decrypt"]
  );

  // Export the key to retrieve raw bytes and convert to hex format
  const rawKeyBytes = await window.crypto.subtle.exportKey("raw", derivedKey);
  const hexKey = Array.from(new Uint8Array(rawKeyBytes))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");

  return hexKey;
}
