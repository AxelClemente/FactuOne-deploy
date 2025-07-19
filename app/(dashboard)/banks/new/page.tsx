import { redirect } from "next/navigation"
import { BankForm } from "@/components/banks/bank-form"
import { getCurrentUser, hasPermission } from "@/lib/auth"
import { getActiveBusiness } from "@/app/(dashboard)/businesses/actions"

export const dynamic = 'force-dynamic'

export default async function NewBankPage() {
  // Obtener el usuario actual
  const user = await getCurrentUser()
  if (!user) {
    redirect("/login")
  }

  // Obtener el negocio activo
  const activeBusiness = await getActiveBusiness()
  if (!activeBusiness) {
    redirect("/businesses")
  }

  const canCreate = await hasPermission(user.id, activeBusiness.id.toString(), "banks", "create");
  if (!canCreate) {
    redirect("/banks");
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Nuevo Banco</h1>
        <p className="text-muted-foreground">Añade la información bancaria para tus facturas</p>
      </div>

      <div className="mx-auto max-w-2xl">
        <BankForm businessId={activeBusiness.id.toString()} />
      </div>
    </div>
  )
} 