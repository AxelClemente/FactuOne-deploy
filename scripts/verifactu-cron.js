#!/usr/bin/env node

/**
 * Script de cron para ejecutar automáticamente el worker VERI*FACTU
 * 
 * Este script debe ejecutarse periódicamente (recomendado cada 5-10 minutos)
 * para procesar automáticamente los registros pendientes de VERI*FACTU.
 * 
 * Uso:
 * - Desarrollo: node scripts/verifactu-cron.js
 * - Producción: Configurar como cron job
 * 
 * Ejemplo de crontab:
 * */5 * * * * /usr/bin/node /path/to/project/scripts/verifactu-cron.js >> /var/log/verifactu-cron.log 2>&1
 */

const path = require('path')
const fs = require('fs')

// Asegurar que estamos en el directorio del proyecto
process.chdir(path.dirname(__dirname))

// Cargar variables de entorno
if (fs.existsSync('.env.local')) {
  require('dotenv').config({ path: '.env.local' })
} else if (fs.existsSync('.env')) {
  require('dotenv').config()
}

async function runVerifactuCron() {
  const startTime = new Date()
  console.log(`[${startTime.toISOString()}] Iniciando cron job VERI*FACTU`)

  try {
    // Importar dinámicamente para manejar ES modules
    const { VerifactuWorker } = await import('../lib/verifactu-worker.js')
    
    // Procesar todos los negocios con VERI*FACTU habilitado
    const results = await VerifactuWorker.processAllBusinesses({
      batchSize: 10,
      flowControlDelay: 60,
      maxRetries: 3,
      retryDelay: 300
    })

    // Reportar resultados
    let totalProcessed = 0
    let totalSuccessful = 0
    let totalFailed = 0
    const allErrors = []

    for (const [businessId, result] of results.entries()) {
      totalProcessed += result.processed
      totalSuccessful += result.successful
      totalFailed += result.failed
      
      if (result.errors.length > 0) {
        allErrors.push(`Business ${businessId}: ${result.errors.join(', ')}`)
      }
      
      console.log(`[${new Date().toISOString()}] Business ${businessId}: ${result.processed} procesados, ${result.successful} exitosos, ${result.failed} fallidos`)
    }

    const endTime = new Date()
    const duration = endTime.getTime() - startTime.getTime()

    console.log(`[${endTime.toISOString()}] Cron job completado en ${duration}ms`)
    console.log(`Total: ${totalProcessed} procesados, ${totalSuccessful} exitosos, ${totalFailed} fallidos`)

    if (allErrors.length > 0) {
      console.error('Errores encontrados:')
      allErrors.forEach(error => console.error(`  ${error}`))
    }

    // Código de salida
    process.exit(totalFailed > 0 ? 1 : 0)

  } catch (error) {
    const endTime = new Date()
    console.error(`[${endTime.toISOString()}] Error fatal en cron job:`, error)
    
    // Intentar notificar del error (log adicional)
    try {
      const errorLog = {
        timestamp: endTime.toISOString(),
        error: error.message,
        stack: error.stack,
        type: 'VERIFACTU_CRON_ERROR'
      }
      
      // Escribir error a archivo de log específico si existe directorio logs
      if (fs.existsSync('logs')) {
        fs.appendFileSync(
          'logs/verifactu-cron-errors.log',
          JSON.stringify(errorLog) + '\n'
        )
      }
    } catch (logError) {
      console.error('Error adicional escribiendo log de error:', logError)
    }
    
    process.exit(2)
  }
}

// Ejecutar solo si se llama directamente
if (require.main === module) {
  runVerifactuCron()
}

module.exports = { runVerifactuCron }