import { redirect } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getCurrentUser, hasPermission } from "@/lib/auth"
import { getActiveBusiness } from "@/app/(dashboard)/businesses/actions"
import { getBankById } from "@/app/(dashboard)/banks/actions"
import { BankForm } from "@/components/banks/bank-form"

interface EditBankPageProps {
  params: Promise<{ id: string }>
}

export default async function EditBankPage({ params }: EditBankPageProps) {
  const resolvedParams = await params

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

  // Verificar permisos para editar bancos
  const canEdit = await hasPermission(user.id, activeBusiness.id.toString(), "banks", "edit");
  if (!canEdit) {
    redirect("/banks");
  }

  // Obtener el banco
  const bank = await getBankById(resolvedParams.id)
  if (!bank) {
    redirect("/banks")
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Button variant="ghost" size="sm" asChild className="mb-6">
        <Link href="/banks">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver a bancos
        </Link>
      </Button>

      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Editar Banco</h1>
        <p className="text-muted-foreground">Modifica la información bancaria</p>
      </div>

      <div className="mx-auto max-w-2xl">
        <BankForm businessId={activeBusiness.id.toString()} bank={bank} />
      </div>
    </div>
  )
} 