import CryptoJS from 'crypto-js'

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-key-change-in-production'

export function encryptCredentials(credentials: { login: string; password: string; server: string }): string {
  const data = JSON.stringify(credentials)
  const encrypted = CryptoJS.AES.encrypt(data, ENCRYPTION_KEY).toString()
  return encrypted
}

export function decryptCredentials(encryptedData: string): { login: string; password: string; server: string } {
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedData, ENCRYPTION_KEY)
    const decryptedData = bytes.toString(CryptoJS.enc.Utf8)
    return JSON.parse(decryptedData)
  } catch {
    throw new Error('Failed to decrypt credentials')
  }
}

export function hashPassword(password: string): string {
  return CryptoJS.SHA256(password).toString()
}

export function generateApiKey(): string {
  return CryptoJS.lib.WordArray.random(32).toString()
}

