"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, Edit, Trash2, CreditCard } from "lucide-react"
import { BankWithStats } from "@/app/(dashboard)/banks/actions"
import { deleteBank } from "@/app/(dashboard)/banks/actions"
import { toast } from "sonner"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

interface BankListProps {
  businessId: string
  canCreateBank: boolean
  initialBanks: BankWithStats[]
}

export function BankList({ businessId, canCreateBank, initialBanks }: BankListProps) {
  const router = useRouter()
  const [banks, setBanks] = useState<BankWithStats[]>(initialBanks)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)

  const handleDelete = async (bankId: string) => {
    try {
      setIsDeleting(bankId)
      await deleteBank(bankId, businessId)
      
      // Actualizar la lista local
      setBanks(banks.filter(bank => bank.id !== bankId))
      toast.success("Banco eliminado correctamente")
    } catch (error) {
      console.error("Error eliminando banco:", error)
      toast.error("Error al eliminar el banco")
    } finally {
      setIsDeleting(null)
    }
  }

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("es-ES", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  if (banks.length === 0) {
    return (
      <div className="text-center py-12">
        <CreditCard className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">No hay bancos registrados</h3>
        <p className="text-muted-foreground mb-4">
          Añade la información bancaria para que aparezca en tus facturas
        </p>
        {canCreateBank && (
          <Button asChild>
            <Link href="/banks/new">
              <Plus className="mr-2 h-4 w-4" />
              Crear Banco
            </Link>
          </Button>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {banks.map((bank) => (
          <Card key={bank.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-lg">{bank.bankName}</CardTitle>
                  <CardDescription className="text-sm">
                    {bank.accountHolder}
                  </CardDescription>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push(`/banks/${bank.id}/edit`)}
                    className="h-8 w-8 p-0"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>¿Eliminar banco?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta acción no se puede deshacer. Se eliminará permanentemente el banco{" "}
                          <strong>{bank.bankName}</strong>.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(bank.id)}
                          disabled={isDeleting === bank.id}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          {isDeleting === bank.id ? "Eliminando..." : "Eliminar"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="font-medium text-muted-foreground">Tipo:</span>
                  <p>{bank.accountType}</p>
                </div>
                <div>
                  <span className="font-medium text-muted-foreground">NIF:</span>
                  <p>{bank.nif}</p>
                </div>
              </div>
              
              <div>
                <span className="font-medium text-muted-foreground text-sm">Cuenta:</span>
                <p className="text-sm font-mono bg-muted p-2 rounded mt-1 break-all">
                  {bank.accountNumber}
                </p>
              </div>

              <div className="flex items-center justify-between pt-2 border-t">
                <Badge variant="secondary" className="text-xs">
                  Creado: {formatDate(bank.createdAt)}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {bank._count.invoices} facturas
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
} 