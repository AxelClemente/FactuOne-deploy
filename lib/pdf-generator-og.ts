import { ImageResponse } from '@vercel/og'

export async function generatePDFFromHTML(html: string): Promise<Buffer> {
  try {
    // Extraer el contenido del HTML para crear una imagen
    const content = extractContentFromHTML(html)
    
    // Generar una imagen usando @vercel/og
    const response = new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'white',
            padding: '40px',
            fontFamily: 'Arial, sans-serif',
          }}
        >
          <div style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '20px' }}>
            {content.title}
          </div>
          <div style={{ fontSize: '16px', lineHeight: '1.5', textAlign: 'center' }}>
            {content.content}
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    )

    const buffer = await response.arrayBuffer()
    return Buffer.from(buffer)
  } catch (error) {
    console.error('Error generando PDF con @vercel/og:', error)
    throw new Error(`Error generando PDF: ${error instanceof Error ? error.message : 'Error desconocido'}`)
  }
}

function extractContentFromHTML(html: string) {
  // Extraer información básica del HTML
  const titleMatch = html.match(/<title>(.*?)<\/title>/)
  const title = titleMatch ? titleMatch[1] : 'Documento'
  
  // Extraer contenido del body
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/)
  const bodyContent = bodyMatch ? bodyMatch[1] : ''
  
  // Limpiar HTML tags
  const cleanContent = bodyContent
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 500) // Limitar longitud
  
  return {
    title,
    content: cleanContent || 'Contenido del documento'
  }
} 