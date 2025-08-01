#!/usr/bin/env node

/**
 * Script de migración para campos de certificados VERI*FACTU
 * 
 * Este script actualiza la tabla verifactu_config para incluir
 * los nuevos campos necesarios para el manejo seguro de certificados.
 * 
 * Uso:
 * node scripts/migrate-certificate-fields.js
 * 
 * IMPORTANTE: Ejecutar después de actualizar el código y antes de usar
 * la funcionalidad de certificados.
 */

const mysql = require('mysql2/promise')
require('dotenv').config()

async function runMigration() {
  let connection
  
  try {
    console.log('🔄 Iniciando migración de campos de certificados...')
    
    // Conectar a la base de datos
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
    })
    
    console.log('✅ Conectado a la base de datos')
    
    // 1. Verificar si la tabla existe
    const [tableExists] = await connection.execute(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = ? AND table_name = 'verifactu_config'
    `, [process.env.DB_NAME])
    
    if (tableExists[0].count === 0) {
      console.log('⚠️ La tabla verifactu_config no existe. Ejecute primero las migraciones de Drizzle.')
      process.exit(1)
    }
    
    // 2. Verificar qué columnas ya existen
    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME 
      FROM information_schema.columns 
      WHERE table_schema = ? AND table_name = 'verifactu_config'
    `, [process.env.DB_NAME])
    
    const existingColumns = columns.map(row => row.COLUMN_NAME)
    console.log('📋 Columnas existentes:', existingColumns.join(', '))
    
    // 3. Añadir columnas faltantes
    const columnsToAdd = [
      {
        name: 'certificate_password_encrypted',
        definition: 'TEXT NULL COMMENT "Contraseña del certificado encriptada con AES-256"'
      },
      {
        name: 'certificate_uploaded_at',
        definition: 'TIMESTAMP NULL COMMENT "Fecha y hora de carga del certificado"'
      },
      {
        name: 'certificate_valid_until',
        definition: 'DATE NULL COMMENT "Fecha de expiración del certificado"'
      }
    ]
    
    for (const column of columnsToAdd) {
      if (!existingColumns.includes(column.name)) {
        console.log(`➕ Añadiendo columna ${column.name}...`)
        await connection.execute(`
          ALTER TABLE verifactu_config 
          ADD COLUMN ${column.name} ${column.definition}
        `)
        console.log(`✅ Columna ${column.name} añadida`)
      } else {
        console.log(`⚪ Columna ${column.name} ya existe`)
      }
    }
    
    // 4. Modificar columna certificate_path si es necesario
    if (existingColumns.includes('certificate_path')) {
      console.log('🔧 Actualizando columna certificate_path...')
      await connection.execute(`
        ALTER TABLE verifactu_config 
        MODIFY COLUMN certificate_path VARCHAR(500) NULL COMMENT "Ruta completa al archivo de certificado"
      `)
      console.log('✅ Columna certificate_path actualizada')
    }
    
    // 5. Eliminar columna antigua de contraseña si existe
    if (existingColumns.includes('certificate_password')) {
      console.log('🗑️ Eliminando columna certificate_password antigua...')
      await connection.execute(`
        ALTER TABLE verifactu_config 
        DROP COLUMN certificate_password
      `)
      console.log('✅ Columna certificate_password eliminada')
    }
    
    // 6. Crear índice para expiración (opcional pero recomendado)
    try {
      console.log('📊 Creando índice para búsquedas por expiración...')
      await connection.execute(`
        CREATE INDEX idx_certificate_expiration 
        ON verifactu_config(certificate_valid_until)
      `)
      console.log('✅ Índice creado')
    } catch (error) {
      if (error.code === 'ER_DUP_KEYNAME') {
        console.log('⚪ Índice ya existe')
      } else {
        console.warn('⚠️ No se pudo crear el índice:', error.message)
      }
    }
    
    // 7. Verificar estructura final
    console.log('🔍 Verificando estructura final...')
    const [finalColumns] = await connection.execute(`
      DESCRIBE verifactu_config
    `)
    
    console.log('📋 Estructura final de verifactu_config:')
    finalColumns.forEach(col => {
      console.log(`   ${col.Field} - ${col.Type} - ${col.Null} - ${col.Key}`)
    })
    
    console.log('🎉 Migración completada exitosamente')
    
  } catch (error) {
    console.error('❌ Error durante la migración:', error)
    process.exit(1)
  } finally {
    if (connection) {
      await connection.end()
    }
  }
}

// Ejecutar migración
runMigration().catch(error => {
  console.error('❌ Error crítico:', error)
  process.exit(1)
})