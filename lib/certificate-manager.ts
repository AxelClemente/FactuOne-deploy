import crypto from 'crypto'
import fs from 'fs/promises'
import path from 'path'
import { getDb } from '@/lib/db'
import { verifactuConfig } from '@/app/db/schema'
import { eq } from 'drizzle-orm'

interface CertificateInfo {
  subject: string
  issuer: string
  validFrom: Date
  validTo: Date
  uploadedAt?: Date
}

interface StoredCertificate {
  path: string
  password: string
}

export class CertificateManager {
  // Directorio seguro para certificados (fuera del código fuente)
  private static CERT_DIR = process.env.CERT_STORAGE_PATH || '/app/certificates'
  
  // Clave de encriptación (debe estar en variables de entorno)
  private static getEncryptionKey(): Buffer {
    const key = process.env.ENCRYPTION_KEY
    if (!key) {
      throw new Error('ENCRYPTION_KEY no configurada en variables de entorno')
    }
    return Buffer.from(key, 'hex')
  }

  /**
   * Guardar certificado de forma segura
   */
  static async storeCertificate(
    businessId: string,
    certificateBuffer: Buffer,
    password: string
  ): Promise<string> {
    const db = await getDb()
    
    try {
      // Asegurar que el directorio existe
      await fs.mkdir(this.CERT_DIR, { recursive: true, mode: 0o700 })
      
      // Crear subdirectorio para el negocio
      const businessDir = path.join(this.CERT_DIR, businessId)
      await fs.mkdir(businessDir, { recursive: true, mode: 0o700 })
      
      // Generar nombre único para el certificado
      const timestamp = Date.now()
      const filename = `cert_${timestamp}.p12`
      const filepath = path.join(businessDir, filename)
      
      // Guardar archivo con permisos restrictivos
      await fs.writeFile(filepath, certificateBuffer, { mode: 0o600 })
      
      // Encriptar contraseña antes de guardar en DB
      const encryptedPassword = this.encryptPassword(password)
      
      // Actualizar configuración en base de datos
      await db.update(verifactuConfig)
        .set({
          certificatePath: filepath,
          certificatePasswordEncrypted: encryptedPassword,
          certificateUploadedAt: new Date(),
          // validUntil se actualizará después de verificar el certificado
        })
        .where(eq(verifactuConfig.businessId, businessId))
      
      console.log(`✅ Certificado guardado para negocio ${businessId}: ${filepath}`)
      
      return filepath
      
    } catch (error) {
      console.error('Error guardando certificado:', error)
      throw new Error('No se pudo guardar el certificado de forma segura')
    }
  }

  /**
   * Obtener certificado para usar
   */
  static async getCertificate(businessId: string): Promise<StoredCertificate> {
    const db = await getDb()
    
    try {
      const config = await db.query.verifactuConfig.findFirst({
        where: eq(verifactuConfig.businessId, businessId)
      })
      
      if (!config?.certificatePath || !config?.certificatePasswordEncrypted) {
        throw new Error('No hay certificado configurado para este negocio')
      }
      
      // Verificar que el archivo existe
      try {
        await fs.access(config.certificatePath)
      } catch {
        throw new Error('El archivo de certificado no existe o no es accesible')
      }
      
      // Desencriptar contraseña
      const password = this.decryptPassword(config.certificatePasswordEncrypted)
      
      return {
        path: config.certificatePath,
        password
      }
      
    } catch (error) {
      console.error('Error obteniendo certificado:', error)
      throw error
    }
  }

  /**
   * Obtener información del certificado actual
   */
  static async getCertificateInfo(businessId: string): Promise<CertificateInfo | null> {
    const db = await getDb()
    
    try {
      const config = await db.query.verifactuConfig.findFirst({
        where: eq(verifactuConfig.businessId, businessId)
      })
      
      if (!config?.certificatePath) {
        return null
      }
      
      // Por ahora retornamos info básica desde la DB
      // En producción, deberíamos leer el certificado y extraer la info real
      return {
        subject: 'Certificado configurado', // TODO: Extraer del certificado real
        issuer: 'FNMT-RCM', // TODO: Extraer del certificado real
        validFrom: config.certificateUploadedAt || new Date(),
        validTo: config.certificateValidUntil || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        uploadedAt: config.certificateUploadedAt || undefined
      }
      
    } catch (error) {
      console.error('Error obteniendo info del certificado:', error)
      return null
    }
  }

  /**
   * Verificar si el certificado está próximo a expirar
   */
  static async checkCertificateExpiration(businessId: string): Promise<{
    isExpired: boolean
    isExpiringSoon: boolean
    daysUntilExpiration: number
  }> {
    const db = await getDb()
    
    try {
      const config = await db.query.verifactuConfig.findFirst({
        where: eq(verifactuConfig.businessId, businessId)
      })
      
      if (!config?.certificateValidUntil) {
        return {
          isExpired: true,
          isExpiringSoon: false,
          daysUntilExpiration: -1
        }
      }
      
      const now = new Date()
      const validUntil = new Date(config.certificateValidUntil)
      const daysUntilExpiration = Math.floor((validUntil.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      
      return {
        isExpired: daysUntilExpiration < 0,
        isExpiringSoon: daysUntilExpiration < 30 && daysUntilExpiration >= 0,
        daysUntilExpiration
      }
      
    } catch (error) {
      console.error('Error verificando expiración:', error)
      return {
        isExpired: true,
        isExpiringSoon: false,
        daysUntilExpiration: -1
      }
    }
  }

  /**
   * Eliminar certificado antiguo al cargar uno nuevo
   */
  static async deleteCertificate(businessId: string): Promise<void> {
    const db = await getDb()
    
    try {
      const config = await db.query.verifactuConfig.findFirst({
        where: eq(verifactuConfig.businessId, businessId)
      })
      
      if (config?.certificatePath) {
        // Intentar eliminar el archivo
        try {
          await fs.unlink(config.certificatePath)
          console.log(`🗑️ Certificado anterior eliminado: ${config.certificatePath}`)
        } catch (error) {
          console.error('Error eliminando certificado anterior:', error)
        }
      }
      
      // Limpiar configuración de DB
      await db.update(verifactuConfig)
        .set({
          certificatePath: null,
          certificatePasswordEncrypted: null,
          certificateUploadedAt: null,
          certificateValidUntil: null
        })
        .where(eq(verifactuConfig.businessId, businessId))
        
    } catch (error) {
      console.error('Error eliminando certificado:', error)
    }
  }

  /**
   * Encriptar contraseña usando AES-256-GCM
   */
  private static encryptPassword(password: string): string {
    const algorithm = 'aes-256-gcm'
    const key = this.getEncryptionKey()
    const iv = crypto.randomBytes(16)
    const cipher = crypto.createCipheriv(algorithm, key, iv)
    
    let encrypted = cipher.update(password, 'utf8', 'hex')
    encrypted += cipher.final('hex')
    
    const authTag = cipher.getAuthTag()
    
    // Formato: iv:authTag:encrypted
    return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted
  }

  /**
   * Desencriptar contraseña
   */
  private static decryptPassword(encryptedData: string): string {
    const parts = encryptedData.split(':')
    if (parts.length !== 3) {
      throw new Error('Formato de contraseña encriptada inválido')
    }
    
    const iv = Buffer.from(parts[0], 'hex')
    const authTag = Buffer.from(parts[1], 'hex')
    const encrypted = parts[2]
    
    const algorithm = 'aes-256-gcm'
    const key = this.getEncryptionKey()
    const decipher = crypto.createDecipheriv(algorithm, key, iv)
    decipher.setAuthTag(authTag)
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    
    return decrypted
  }

  /**
   * Limpiar certificados antiguos (mantenimiento)
   */
  static async cleanupOldCertificates(businessId: string): Promise<void> {
    try {
      const businessDir = path.join(this.CERT_DIR, businessId)
      const files = await fs.readdir(businessDir)
      
      // Mantener solo el certificado más reciente
      const sortedFiles = files
        .filter(f => f.startsWith('cert_') && f.endsWith('.p12'))
        .sort((a, b) => {
          const timestampA = parseInt(a.replace('cert_', '').replace('.p12', ''))
          const timestampB = parseInt(b.replace('cert_', '').replace('.p12', ''))
          return timestampB - timestampA
        })
      
      // Eliminar todos excepto el más reciente
      for (let i = 1; i < sortedFiles.length; i++) {
        const filepath = path.join(businessDir, sortedFiles[i])
        await fs.unlink(filepath)
        console.log(`🗑️ Certificado antiguo eliminado: ${filepath}`)
      }
      
    } catch (error) {
      console.error('Error limpiando certificados antiguos:', error)
    }
  }
}