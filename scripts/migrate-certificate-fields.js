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

const { Pool } = require('pg')
require('dotenv').config()

async function runMigration() {
  let connection
  
  try {
    console.log('🔄 Iniciando migración de campos de certificados...')
    
    // Conectar a la base de datos
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL
    })
    connection = await pool.connect()
    
    console.log('✅ Conectado a la base de datos')
    
    // 1. Verificar si la tabla existe
    const tableExists = await connection.query(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_name = 'verifactu_config'
    `)
    
    if (tableExists.rows[0].count === '0') {
      console.log('⚠️ La tabla verifactu_config no existe. Ejecute primero las migraciones de Drizzle.')
      process.exit(1)
    }
    
    // 2. Verificar qué columnas ya existen
    const columns = await connection.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'verifactu_config'
    `)
    
    const existingColumns = columns.rows.map(row => row.column_name)
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
        await connection.query(`
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
      await connection.query(`
        ALTER TABLE verifactu_config 
        ALTER COLUMN certificate_path TYPE VARCHAR(500)
      `)
      console.log('✅ Columna certificate_path actualizada')
    }
    
    // 5. Eliminar columna antigua de contraseña si existe
    if (existingColumns.includes('certificate_password')) {
      console.log('🗑️ Eliminando columna certificate_password antigua...')
      await connection.query(`
        ALTER TABLE verifactu_config 
        DROP COLUMN certificate_password
      `)
      console.log('✅ Columna certificate_password eliminada')
    }
    
    // 6. Crear índice para expiración (opcional pero recomendado)
    try {
      console.log('📊 Creando índice para búsquedas por expiración...')
      await connection.query(`
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
    const finalColumns = await connection.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'verifactu_config'
    `)
    
    console.log('📋 Estructura final de verifactu_config:')
    finalColumns.rows.forEach(col => {
      console.log(`   ${col.column_name} - ${col.data_type} - ${col.is_nullable}`)
    })
    
    console.log('🎉 Migración completada exitosamente')
    
  } catch (error) {
    console.error('❌ Error durante la migración:', error)
    process.exit(1)
  } finally {
    if (connection) {
      await connection.release()
    }
  }
}

// Ejecutar migración
runMigration().catch(error => {
  console.error('❌ Error crítico:', error)
  process.exit(1)
})