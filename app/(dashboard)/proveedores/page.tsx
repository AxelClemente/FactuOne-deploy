import React from "react"
import { Suspense } from "react"
import Link from "next/link"
import { redirect } from "next/navigation"
import ProviderList from "@/components/providers/provider-list"
import { Button } from "@/components/ui/button"
import { getActiveBusiness } from "@/lib/getActiveBusiness"
import { PlusCircle } from "lucide-react"
import { getProviders } from "./actions"

export default async function ProveedoresPage() {
  const businessId = await getActiveBusiness()
  const providers = businessId ? await getProviders(businessId) : []

  return (
    <div className="w-full px-4 py-4 md:px-6">
      <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Proveedores</h1>
          <p className="text-muted-foreground">Gestiona los proveedores de tu negocio para la facturación electrónica</p>
        </div>
        <Button asChild>
          <Link href="/proveedores/new">
            <PlusCircle className="mr-2 h-4 w-4" />
            Nuevo Proveedor
          </Link>
        </Button>
      </div>
      {/* Listado de proveedores */}
      <ProviderList providers={providers} />
    </div>
  )
} 