import puppeteer from 'puppeteer'

export async function generatePDFFromHTML(html: string): Promise<Buffer> {
  let browser
  
  try {
    // Configuración de Puppeteer optimizada para Vercel
    const launchOptions: any = {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-extensions',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding'
      ]
    }

    // Intentar diferentes rutas de Chrome
    const possibleChromePaths = [
      process.env.PUPPETEER_EXECUTABLE_PATH,
      '/usr/bin/google-chrome-stable',
      '/usr/bin/chromium-browser',
      '/usr/bin/chromium',
      '/snap/bin/chromium',
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', // macOS
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', // Windows
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe' // Windows 32-bit
    ]

    // Encontrar la primera ruta válida
    for (const path of possibleChromePaths) {
      if (path) {
        try {
          browser = await puppeteer.launch({
            ...launchOptions,
            executablePath: path
          })
          console.log(`Chrome encontrado en: ${path}`)
          break
        } catch (error) {
          console.log(`Chrome no encontrado en: ${path}`)
          continue
        }
      }
    }

    // Si no se encontró Chrome en rutas específicas, usar el instalado por Puppeteer
    if (!browser) {
      console.log('Usando Chrome instalado por Puppeteer')
      browser = await puppeteer.launch(launchOptions)
    }

    const page = await browser.newPage()
    
    // Configurar la página para mejor rendimiento
    await page.setViewport({ width: 1200, height: 800 })
    await page.setContent(html, { waitUntil: 'networkidle0' })
    
    // Generar PDF con configuración optimizada
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20px',
        right: '20px',
        bottom: '20px',
        left: '20px'
      },
      preferCSSPageSize: true
    })

    await browser.close()
    return pdfBuffer

  } catch (error) {
    console.error('Error generando PDF:', error)
    
    if (browser) {
      try {
        await browser.close()
      } catch (closeError) {
        console.error('Error cerrando browser:', closeError)
      }
    }
    
    throw new Error(`Error generando PDF: ${error instanceof Error ? error.message : 'Error desconocido'}`)
  }
} 