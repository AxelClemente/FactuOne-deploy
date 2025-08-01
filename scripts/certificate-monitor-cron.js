#!/usr/bin/env node

/**
 * Script de monitoreo de certificados VERI*FACTU
 * 
 * Puede ejecutarse como cron job para verificar periódicamente
 * el estado de los certificados y crear notificaciones automáticamente.
 * 
 * Uso:
 * node scripts/certificate-monitor-cron.js
 * 
 * Configuración en crontab (ejecutar cada 6 horas):
 * 0 */6 * * * /usr/bin/node /path/to/app/scripts/certificate-monitor-cron.js
 * 
 * Configuración en crontab (ejecutar diariamente a las 09:00):
 * 0 9 * * * /usr/bin/node /path/to/app/scripts/certificate-monitor-cron.js
 */

const path = require('path')
const { spawn } = require('child_process')

// Configurar variables de entorno si es necesario
const PROJECT_ROOT = path.resolve(__dirname, '..')
process.chdir(PROJECT_ROOT)

// Función para ejecutar el monitor
async function runCertificateMonitor() {
  console.log(`[${new Date().toISOString()}] 🔍 Iniciando monitor de certificados VERI*FACTU`)
  
  try {
    // Importar y ejecutar el monitor
    const { runCertificateMonitor } = require('../lib/certificate-monitor')
    await runCertificateMonitor()
    
    console.log(`[${new Date().toISOString()}] ✅ Monitor ejecutado correctamente`)
    process.exit(0)
    
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ❌ Error ejecutando monitor:`, error)
    process.exit(1)
  }
}

// Función para ejecutar usando Next.js (alternativa)
function runWithNextJS() {
  console.log(`[${new Date().toISOString()}] 🔄 Ejecutando monitor vía Next.js API`)
  
  const curl = spawn('curl', [
    '-X', 'POST',
    '-H', 'Content-Type: application/json',
    '-d', '{"action":"run-monitor"}',
    'http://localhost:3000/api/verifactu/certificate-monitor'
  ])
  
  curl.stdout.on('data', (data) => {
    console.log(`Respuesta: ${data}`)
  })
  
  curl.stderr.on('data', (data) => {
    console.error(`Error: ${data}`)
  })
  
  curl.on('close', (code) => {
    if (code === 0) {
      console.log(`[${new Date().toISOString()}] ✅ Monitor ejecutado vía API`)
    } else {
      console.error(`[${new Date().toISOString()}] ❌ Error ejecutando vía API (código: ${code})`)
    }
    process.exit(code)
  })
}

// Determinar método de ejecución
const useAPI = process.argv.includes('--api')

if (useAPI) {
  runWithNextJS()
} else {
  runCertificateMonitor().catch(error => {
    console.error(`[${new Date().toISOString()}] ❌ Error crítico:`, error)
    process.exit(1)
  })
}