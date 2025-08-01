/**
 * Sistema de encriptación AES-256-GCM para contraseñas de certificados VERI*FACTU
 * 
 * Características de seguridad:
 * - AES-256-GCM: Encriptación autenticada de grado industrial
 * - IV único por operación: Previene ataques de repetición
 * - Salt por negocio: Protección adicional por tenant
 * - Tag de autenticación: Verificación de integridad
 */

import crypto from 'crypto'

// Configuración de encriptación
const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16 // 128 bits
const SALT_LENGTH = 32 // 256 bits
const TAG_LENGTH = 16 // 128 bits

/**
 * Interfaz para datos encriptados
 */
interface EncryptedData {
  encrypted: string    // Datos encriptados en hex
  iv: string          // Vector de inicialización en hex
  salt: string        // Salt único en hex
  tag: string         // Tag de autenticación en hex
}

/**
 * Obtener clave maestra de encriptación desde variables de entorno
 */
function getMasterKey(): Buffer {
  const masterKey = process.env.ENCRYPTION_MASTER_KEY
  
  if (!masterKey) {
    throw new Error('ENCRYPTION_MASTER_KEY no está configurada en variables de entorno')
  }
  
  if (masterKey.length !== 64) { // 32 bytes en hex = 64 caracteres
    throw new Error('ENCRYPTION_MASTER_KEY debe ser exactamente 64 caracteres (32 bytes en hex)')
  }
  
  return Buffer.from(masterKey, 'hex')
}

/**
 * Derivar clave específica para un negocio usando PBKDF2
 */
function deriveBusinessKey(businessId: string, salt: Buffer): Buffer {
  const masterKey = getMasterKey()
  
  // Combinar clave maestra con businessId para crear clave única por negocio
  const businessSeed = Buffer.concat([
    masterKey,
    Buffer.from(businessId, 'utf8')
  ])
  
  // PBKDF2 con 100,000 iteraciones para derivar clave segura
  return crypto.pbkdf2Sync(businessSeed, salt, 100000, 32, 'sha256')
}

/**
 * Encriptar contraseña de certificado
 */
export function encryptCertificatePassword(password: string, businessId: string): EncryptedData {
  try {
    // Generar IV y salt únicos
    const iv = crypto.randomBytes(IV_LENGTH)
    const salt = crypto.randomBytes(SALT_LENGTH)
    
    // Derivar clave específica para este negocio
    const businessKey = deriveBusinessKey(businessId, salt)
    
    // Crear cipher
    const cipher = crypto.createCipherGCM(ALGORITHM, businessKey, iv)
    
    // Encriptar contraseña
    let encrypted = cipher.update(password, 'utf8', 'hex')
    encrypted += cipher.final('hex')
    
    // Obtener tag de autenticación
    const tag = cipher.getAuthTag()
    
    return {
      encrypted: encrypted,
      iv: iv.toString('hex'),
      salt: salt.toString('hex'),
      tag: tag.toString('hex')
    }
  } catch (error) {
    console.error('Error encriptando contraseña:', error)
    throw new Error('Fallo en encriptación de contraseña de certificado')
  }
}

/**
 * Desencriptar contraseña de certificado
 */
export function decryptCertificatePassword(encryptedData: EncryptedData, businessId: string): string {
  try {
    // Convertir datos hex de vuelta a buffers
    const iv = Buffer.from(encryptedData.iv, 'hex')
    const salt = Buffer.from(encryptedData.salt, 'hex')
    const tag = Buffer.from(encryptedData.tag, 'hex')
    const encrypted = encryptedData.encrypted
    
    // Derivar la misma clave que se usó para encriptar
    const businessKey = deriveBusinessKey(businessId, salt)
    
    // Crear decipher
    const decipher = crypto.createDecipherGCM(ALGORITHM, businessKey, iv)
    decipher.setAuthTag(tag)
    
    // Desencriptar contraseña
    let decrypted = decipher.update(encrypted, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    
    return decrypted
  } catch (error) {
    console.error('Error desencriptando contraseña:', error)
    throw new Error('Fallo en desencriptación de contraseña de certificado')
  }
}

/**
 * Validar que la encriptación funciona correctamente
 */
export function validateEncryption(password: string, businessId: string): boolean {
  try {
    const encrypted = encryptCertificatePassword(password, businessId)
    const decrypted = decryptCertificatePassword(encrypted, businessId)
    return password === decrypted
  } catch (error) {
    console.error('Error validando encriptación:', error)
    return false
  }
}

/**
 * Serializar datos encriptados para almacenamiento en base de datos
 */
export function serializeEncryptedData(encryptedData: EncryptedData): string {
  return JSON.stringify(encryptedData)
}

/**
 * Deserializar datos encriptados desde base de datos
 */
export function deserializeEncryptedData(serializedData: string): EncryptedData {
  try {
    const data = JSON.parse(serializedData)
    
    // Validar estructura
    if (!data.encrypted || !data.iv || !data.salt || !data.tag) {
      throw new Error('Datos encriptados malformados')
    }
    
    return data as EncryptedData
  } catch (error) {
    console.error('Error deserializando datos encriptados:', error)
    throw new Error('Formato de datos encriptados inválido')
  }
}

/**
 * Generar clave maestra aleatoria para configuración inicial
 * SOLO usar para setup inicial del servidor
 */
export function generateMasterKey(): string {
  const key = crypto.randomBytes(32)
  return key.toString('hex')
}

/**
 * Utilitario para testing - NO usar en producción
 */
export function createTestEncryption() {
  // Generar clave temporal para testing
  process.env.ENCRYPTION_MASTER_KEY = generateMasterKey()
  
  console.warn('⚠️  ADVERTENCIA: Usando clave de encriptación temporal para testing')
  console.warn('⚠️  NO usar en producción - configurar ENCRYPTION_MASTER_KEY real')
  
  return process.env.ENCRYPTION_MASTER_KEY
}