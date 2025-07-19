import { Suspense } from "react"
import Link from "next/link"
import { redirect } from "next/navigation"
import { BankList } from "@/components/banks/bank-list"
import { BankListSkeleton } from "@/components/banks/bank-list-skeleton"
import { Button } from "@/components/ui/button"
import { getCurrentUser, hasPermission } from "@/lib/auth"
import { getActiveBusiness } from "@/app/(dashboard)/businesses/actions"
import { PlusCircle } from "lucide-react"
import { getBanksWithStats } from "@/app/(dashboard)/banks/actions"

export default async function BanksPage() {
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

  // Obtener bancos visibles según exclusiones
  const banksWithStats = await getBanksWithStats(activeBusiness.id.toString(), user.id)

  // Comprobar permiso granular para crear bancos
  const canCreateBank = await hasPermission(user.id, activeBusiness.id.toString(), "banks", "create")

  return (
    <div className="w-full px-4 py-4 md:px-6">
      <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Bancos</h1>
          <p className="text-muted-foreground">Gestiona la información bancaria para tus facturas</p>
        </div>
        {canCreateBank && (
          <Button asChild>
            <Link href="/banks/new">
              <PlusCircle className="mr-2 h-4 w-4" />
              Nuevo Banco
            </Link>
          </Button>
        )}
      </div>

      <Suspense fallback={<BankListSkeleton />}>
        <BankList businessId={activeBusiness.id.toString()} canCreateBank={canCreateBank} initialBanks={banksWithStats} />
      </Suspense>
    </div>
  )
} 