"use client"
import ProviderForm from "./provider-form"
import { createProvider } from "@/app/(dashboard)/proveedores/actions"
import { useRouter } from "next/navigation"

export default function NewProviderForm({ businessId }: { businessId: string }) {
  const router = useRouter()
  async function handleSubmit(values: any) {
    const result = await createProvider(values, businessId)
    return result
  }
  return <ProviderForm businessId={businessId} onSubmit={handleSubmit} submitText="Crear proveedor" />
} 