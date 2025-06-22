/**
 * Función de utilidad para simular la subida de archivos
 * @param file Archivo a "subir"
 * @param projectId ID del proyecto
 * @returns URL simulada del archivo
 */
export async function mockUploadContract(file: File, projectId: string): Promise<string> {
  console.log(`[MOCK] Simulando subida de archivo: ${file.name} (${file.size} bytes) para el proyecto ${projectId}`)

  // Simular un retraso de red (entre 1 y 2 segundos)
  const delay = Math.floor(Math.random() * 1000) + 1000
  await new Promise((resolve) => setTimeout(resolve, delay))

  // Generar una URL simulada
  const mockUrl = `https://mock-storage.example.com/proyectos/${projectId}/contrato.pdf`

  console.log(`[MOCK] Archivo subido exitosamente. URL: ${mockUrl}`)

  return mockUrl
}

// Exportar la función de mock como la función principal
export const uploadContract = mockUploadContract
