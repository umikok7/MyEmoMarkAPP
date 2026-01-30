import crypto from "crypto"

const ALGORITHM = "aes-256-gcm"
const IV_LENGTH = 12
const TAG_LENGTH = 16

function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY
  if (!key) {
    throw new Error("ENCRYPTION_KEY environment variable is not set")
  }
  // Derive a 32-byte key using SHA-256
  return crypto.createHash("sha256").update(key).digest()
}

export function encrypt(text: string): string {
  if (!text) return text

  const key = getEncryptionKey()
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)

  let encrypted = cipher.update(text, "utf8", "hex")
  encrypted += cipher.final("hex")
  const tag = cipher.getAuthTag()

  return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted}`
}

export function decrypt(encryptedText: string): string {
  if (!encryptedText) return encryptedText

  try {
    const key = getEncryptionKey()
    const parts = encryptedText.split(":")

    // 如果不是加密格式（没有3部分），直接返回原文（兼容存量明文数据）
    if (parts.length !== 3) {
      return encryptedText
    }

    const [ivHex, tagHex, encrypted] = parts

    if (!ivHex || !tagHex || !encrypted) {
      return encryptedText
    }

    const iv = Buffer.from(ivHex, "hex")
    const tag = Buffer.from(tagHex, "hex")
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
    decipher.setAuthTag(tag)

    let decrypted = decipher.update(encrypted, "hex", "utf8")
    decrypted += decipher.final("utf8")

    return decrypted
  } catch (error) {
    // 解密失败时返回原文（兼容存量数据）
    return encryptedText
  }
}

export function encryptObject<T extends Record<string, unknown>>(
  obj: T,
  fieldsToEncrypt: (keyof T)[]
): T {
  const result = { ...obj }
  for (const field of fieldsToEncrypt) {
    if (result[field] && typeof result[field] === "string") {
      result[field] = encrypt(result[field] as string) as T[typeof field]
    }
  }
  return result
}

export function decryptObject<T extends Record<string, unknown>>(
  obj: T,
  fieldsToDecrypt: (keyof T)[]
): T {
  const result = { ...obj }
  for (const field of fieldsToDecrypt) {
    if (result[field] && typeof result[field] === "string") {
      result[field] = decrypt(result[field] as string) as T[typeof field]
    }
  }
  return result
}
