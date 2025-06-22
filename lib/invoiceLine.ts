// Tipo para líneas de factura
export type InvoiceLine = {
  id: string
  invoiceId: string
  description: string
  quantity: number
  unitPrice: number
  taxRate: number
}

// Datos mock para líneas de factura
const mockInvoiceLines: InvoiceLine[] = []

// Generar líneas de factura para cada factura mock
export function generateMockInvoiceLines(invoiceIds: string[]) {
  invoiceIds.forEach((invoiceId) => {
    // Generar entre 1-5 líneas por factura
    const lineCount = Math.floor(Math.random() * 5) + 1

    for (let i = 0; i < lineCount; i++) {
      mockInvoiceLines.push({
        id: `line${Math.random().toString(36).substring(2, 10)}`,
        invoiceId,
        description: `Producto o servicio ${i + 1}`,
        quantity: Math.floor(Math.random() * 10) + 1,
        unitPrice: Math.floor(Math.random() * 1000) + 50,
        taxRate: [0, 4, 10, 21][Math.floor(Math.random() * 4)], // Tipos de IVA en España
      })
    }
  })

  return mockInvoiceLines
}

// Implementación mock para líneas de factura
export const invoiceLineDb = {
  findMany: async ({ where }: { where: { invoiceId?: string } }) => {
    let result = [...mockInvoiceLines]

    if (where?.invoiceId) {
      result = result.filter((line) => line.invoiceId === where.invoiceId)
    }

    return result
  },
  create: async ({ data }: { data: Omit<InvoiceLine, "id"> }) => {
    const newLine: InvoiceLine = {
      id: `line${Math.random().toString(36).substring(2, 10)}`,
      ...data,
    }
    mockInvoiceLines.push(newLine)
    return newLine
  },
  deleteMany: async ({ where }: { where: { invoiceId?: string } }) => {
    const initialLength = mockInvoiceLines.length

    if (where?.invoiceId) {
      const index = mockInvoiceLines.findIndex((line) => line.invoiceId === where.invoiceId)
      if (index !== -1) {
        mockInvoiceLines.splice(index, 1)
      }
    }

    return { count: initialLength - mockInvoiceLines.length }
  },
}
