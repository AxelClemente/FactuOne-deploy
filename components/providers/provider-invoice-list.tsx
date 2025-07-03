import React from "react"

interface ReceivedInvoice {
  id: string
  date: string
  concept: string
  status: string
  total: number
}

interface ProviderInvoiceListProps {
  invoices: ReceivedInvoice[]
}

export default function ProviderInvoiceList({ invoices }: ProviderInvoiceListProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(amount)
  }
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat("es-ES").format(date)
  }
  return (
    <div className="rounded-md border">
      <table className="w-full">
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Concepto</th>
            <th>Estado</th>
            <th className="text-right">Importe</th>
          </tr>
        </thead>
        <tbody>
          {invoices.length === 0 ? (
            <tr>
              <td colSpan={4} className="text-center py-6 text-muted-foreground">
                No hay facturas recibidas para este proveedor.
              </td>
            </tr>
          ) : (
            invoices.map((invoice) => (
              <tr key={invoice.id} className="border-b">
                <td>{formatDate(invoice.date)}</td>
                <td className="font-medium">{invoice.concept}</td>
                <td>{invoice.status}</td>
                <td className="text-right">{formatCurrency(invoice.total)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
} 