import React from "react"
import { getProviders } from "../actions"
import { getActiveBusiness } from "@/lib/getActiveBusiness"
import ProviderInvoiceList from "@/components/providers/provider-invoice-list"
import { getDb } from "@/lib/db"

export default async function ProviderDetailPage({ params }: { params: { id: string } }) {
  const businessId = await getActiveBusiness()
  const providers = businessId ? await getProviders(businessId) : []
  const provider = providers.find((p) => p.id === params.id)
  if (!provider) {
    return <div className="p-8 text-center text-red-500">Proveedor no encontrado</div>
  }

  // Obtener facturas recibidas asociadas a este proveedor
  const db = await getDb()
  const invoices = await db.query.receivedInvoices.findMany({
    where: (ri, { eq }) => eq(ri.providerId, provider.id),
  })

  return (
    <div className="w-full max-w-3xl mx-auto py-8 space-y-6">
      <div className="bg-white rounded-lg border p-4">
        <h2 className="text-xl font-bold mb-2">{provider.name}</h2>
        <div className="text-sm text-muted-foreground mb-2">NIF: {provider.nif}</div>
        <div className="text-sm">Dirección: {provider.address}</div>
        <div className="text-sm">Teléfono: {provider.phone}</div>
        <div className="text-sm">Email: {provider.email}</div>
      </div>
      <div>
        <h3 className="text-lg font-semibold mb-2">Facturas recibidas de este proveedor</h3>
        <ProviderInvoiceList invoices={invoices} />
      </div>
    </div>
  )
} 