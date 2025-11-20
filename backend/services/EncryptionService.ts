"use server";
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";
import getConfig from "next/config";

/**
 * EncryptionService - A singleton service for handling encryption and decryption
 * using AES-256-GCM algorithm with proper error handling and type safety.
 */
export class EncryptionService {
  private static instance: EncryptionService;
  private static keyBuffer: Buffer | null = null;
  private readonly algorithm = "aes-256-gcm";
  private readonly encoding = "hex";
  private readonly ivLength = 16;

  /**
   * Get the singleton instance of EncryptionService
   * This also initializes the encryption key (but only once)
   */
  public static getInstance(): EncryptionService {
    // Initialize the instance if it doesn't exist
    if (!EncryptionService.instance) {
      EncryptionService.instance = new EncryptionService();
    }

    // Initialize the key if it hasn't been loaded yet
    if (!EncryptionService.keyBuffer) {
      EncryptionService.keyBuffer = EncryptionService.loadEncryptionKey();
    }

    return EncryptionService.instance;
  }

  /**
   * Static method to load the encryption key
   * This is only called once per server instance
   */
  private static loadEncryptionKey(): Buffer {
    console.log(
      "Loading encryption key - this should happen only once per server instance"
    );
    const { serverRuntimeConfig } = getConfig();
    const key = serverRuntimeConfig?.ENCRYPTION_KEY;

    if (!key || key.trim() === "") {
      throw new Error("ENCRYPTION_KEY must be set in environment variables");
    }

    if (!/^[0-9A-Fa-f]+$/.test(key)) {
      throw new Error("ENCRYPTION_KEY must be a valid hex string");
    }

    try {
      return Buffer.from(key, "hex");
    } catch (error) {
      console.error("Error creating buffer:", error);
      throw new Error(
        `Invalid ENCRYPTION_KEY format: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Gets the initialized encryption key buffer
   * @throws Error if key hasn't been initialized
   */
  private getKeyBuffer(): Buffer {
    if (!EncryptionService.keyBuffer) {
      throw new Error("Encryption key not initialized");
    }
    return EncryptionService.keyBuffer;
  }

  /**
   * Encrypts a string using AES-256-GCM
   * @param text - The plain text to encrypt
   * @returns The encrypted text in format: iv.encrypted.authTag
   */
  public encrypt(text: string): string {
    if (!text) {
      throw new Error("Text to encrypt must not be empty");
    }

    try {
      const iv = randomBytes(this.ivLength);
      const cipher = createCipheriv(this.algorithm, this.getKeyBuffer(), iv);

      let encrypted = cipher.update(text, "utf8", this.encoding);
      encrypted += cipher.final(this.encoding);

      const authTag = cipher.getAuthTag();

      return `${iv.toString(this.encoding)}.${encrypted}.${authTag.toString(
        this.encoding
      )}`;
    } catch (error) {
      console.error("Encryption error:", error);
      throw new Error(
        `Encryption failed: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Decrypts a string that was encrypted using encrypt()
   * @param text - The encrypted text in format: iv.encrypted.authTag
   * @returns The decrypted plain text
   */
  public decrypt(text: string | string[]): string {
    if (!text) {
      throw new Error("Text to decrypt must not be empty");
    }

    try {
      const inputText = Array.isArray(text) ? text[0] : text;
      const parts = inputText.split(".");

      if (parts.length !== 3) {
        throw new Error("Invalid encrypted text format");
      }

      const [ivHex, encryptedHex, authTagHex] = parts;

      const iv = Buffer.from(ivHex, this.encoding);
      const encrypted = Buffer.from(encryptedHex, this.encoding);
      const authTag = Buffer.from(authTagHex, this.encoding);

      const decipher = createDecipheriv(
        this.algorithm,
        this.getKeyBuffer(),
        iv
      );
      decipher.setAuthTag(authTag);

      const decryptedBuffer = Buffer.concat([
        decipher.update(encrypted),
        decipher.final(),
      ]);

      return decryptedBuffer.toString("utf8");
    } catch (error) {
      console.error("Decryption error:", error);
      throw new Error(
        `Decryption failed: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }
}

// Create a default export for easier imports
const encryptionService = EncryptionService.getInstance();
export default encryptionService;
