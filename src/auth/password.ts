import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

const HASH_LENGTH = 64;

function deriveKey(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, HASH_LENGTH, (error, derivedKey) => {
      if (error) reject(error);
      else resolve(derivedKey);
    });
  });
}

export async function hashPassword(password: string): Promise<string> {
  if (password.length < 12) {
    throw new Error("Passwords must contain at least 12 characters.");
  }
  const salt = randomBytes(16);
  const key = await deriveKey(password, salt);
  return `scrypt$${salt.toString("base64url")}$${key.toString("base64url")}`;
}

export async function verifyPassword(
  password: string,
  storedHash: string,
): Promise<boolean> {
  const [algorithm, encodedSalt, encodedHash] = storedHash.split("$");
  if (algorithm !== "scrypt" || !encodedSalt || !encodedHash) return false;

  const expected = Buffer.from(encodedHash, "base64url");
  if (expected.length !== HASH_LENGTH) return false;
  const actual = await deriveKey(password, Buffer.from(encodedSalt, "base64url"));
  return timingSafeEqual(actual, expected);
}
