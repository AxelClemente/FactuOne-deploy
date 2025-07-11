import React from "react"
import { getProviders } from "../actions"
import { getActiveBusiness } from "@/lib/getActiveBusiness"
import { getDb } from "@/lib/db"
import { Badge } from "@/components/ui/badge"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { ReceivedInvoiceList } from "@/components/received-invoices/received-invoice-list"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

export default async function ProviderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const businessId = await getActiveBusiness()
  const providers = businessId ? await getProviders(businessId) : []
  const provider = providers.find((p) => p.id === id)
  if (!provider) {
    return <div className="p-8 text-center text-red-500">Proveedor no encontrado</div>
  }

  // Obtener facturas recibidas asociadas a este proveedor
  const db = await getDb()
  const invoicesRaw = await db.query.receivedInvoices.findMany({
    where: (ri, { eq }) => eq(ri.providerId, provider.id),
  })

  // Adaptar facturas al formato esperado por ReceivedInvoiceList
  const invoices = invoicesRaw.map(inv => ({
    ...inv,
    providerName: provider.name,
    providerNIF: provider.nif,
    category: inv.category || "",
  }))

  // Determinar status
  let status: "current" | "overdue" = "current"
  if ((provider.totalPending ?? 0) > 0) status = "overdue"
  const badge = status === "overdue"
    ? <Badge variant="destructive">Con deuda</Badge>
    : <Badge variant="outline">Al día</Badge>

  // Simular categorías si no hay
  const categories = [{ id: "", name: "Sin categoría" }]

  return (
    <>
      <div className="w-full px-4 py-4 md:px-6 max-w-6xl">
        <div className="mb-6">
          <div className="mb-2">
            <Button variant="ghost" size="sm" asChild>
              <a href="/proveedores">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver a proveedores
              </a>
            </Button>
          </div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2 text-left">
            {provider.name}
            {badge}
          </h1>
          <p className="text-muted-foreground text-left">Detalle y facturas recibidas de este proveedor</p>
        </div>
        <div className="mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xl text-left">{provider.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <div className="text-sm text-muted-foreground">NIF: {provider.nif}</div>
              <div className="text-sm">Dirección: {provider.address}</div>
              <div className="text-sm">Teléfono: {provider.phone}</div>
              <div className="text-sm">Email: {provider.email}</div>
            </CardContent>
          </Card>
        </div>
      </div>
      <div className="w-full px-4 md:px-6">
        <h2 className="text-lg font-semibold mb-2 text-left">Facturas recibidas de este proveedor</h2>
        <ReceivedInvoiceList
          businessId={businessId}
          initialInvoices={invoices}
          categories={categories}
          canCreateReceivedInvoice={false}
          providerId={provider.id}
        />
      </div>
    </>
  )
} 