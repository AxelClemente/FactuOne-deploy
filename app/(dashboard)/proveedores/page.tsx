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
    <div className="w-full py-4 space-y-5">
      <h1 className="text-2xl font-bold mb-4">Proveedores</h1>
      {/* Listado de proveedores */}
      <ProviderList providers={providers} />
    </div>
  )
} 