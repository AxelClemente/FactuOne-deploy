import React from "react"
import { Suspense } from "react"
import Link from "next/link"
import { redirect } from "next/navigation"
import ProviderList from "@/components/providers/provider-list"
import { Button } from "@/components/ui/button"
import { getActiveBusiness } from "@/app/(dashboard)/businesses/actions"
import { getCurrentUser, hasPermission } from "@/lib/auth"
import { PlusCircle } from "lucide-react"
import { getProviders } from "./actions"

export default async function ProveedoresPage() {
  // Obtener el usuario actual
  const user = await getCurrentUser()
  if (!user) {
    redirect("/login")
  }

  const activeBusiness = await getActiveBusiness()
  if (!activeBusiness) {
    redirect("/businesses")
  }

  // Comprobar permiso granular para crear proveedores
  const canCreateProvider = await hasPermission(user.id, activeBusiness.id.toString(), "providers", "create")
  console.log("[PROVIDERS PAGE] user.id:", user.id)
  console.log("[PROVIDERS PAGE] activeBusiness.id:", activeBusiness.id)
  console.log("[PROVIDERS PAGE] canCreateProvider:", canCreateProvider)
  console.log("[PROVIDERS PAGE] user.id type:", typeof user.id)
  console.log("[PROVIDERS PAGE] activeBusiness.id type:", typeof activeBusiness.id)

  const providers = activeBusiness ? await getProviders(activeBusiness.id) : []

  return (
    <div className="w-full px-4 py-4 md:px-6">
      <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Proveedores</h1>
          <p className="text-muted-foreground">Gestiona los proveedores de tu negocio para la facturación electrónica</p>
        </div>
        {/* El botón de Nuevo Proveedor se gestiona en ProviderList según el permiso */}
      </div>
      {/* Listado de proveedores */}
      <ProviderList providers={providers} businessId={activeBusiness.id.toString()} canCreateProvider={canCreateProvider} />
    </div>
  )
} 