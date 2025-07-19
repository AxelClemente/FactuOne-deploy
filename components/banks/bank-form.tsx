"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useFormStatus } from "react-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { createBank, updateBank } from "@/app/(dashboard)/banks/actions"
import { BankWithStats } from "@/app/(dashboard)/banks/actions"
import { toast } from "sonner"

interface BankFormProps {
  businessId: string
  bank?: BankWithStats
}

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? "Guardando..." : "Guardar Banco"}
    </Button>
  )
}

export function BankForm({ businessId, bank }: BankFormProps) {
  const router = useRouter()
  const [error, setError] = useState<string>("")

  const handleSubmit = async (formData: FormData) => {
    try {
      setError("")

      if (bank) {
        // Actualizar banco existente
        formData.append("bankId", bank.id)
        await updateBank(formData)
        toast.success("Banco actualizado correctamente")
      } else {
        // Crear nuevo banco
        await createBank(formData)
        toast.success("Banco creado correctamente")
      }

      router.push("/banks")
    } catch (error) {
      console.error("Error en formulario:", error)
      setError(error instanceof Error ? error.message : "Error al guardar el banco")
      toast.error("Error al guardar el banco")
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{bank ? "Editar Banco" : "Nuevo Banco"}</CardTitle>
        <CardDescription>
          {bank ? "Modifica la información del banco" : "Añade la información bancaria para tus facturas"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={handleSubmit} className="space-y-4">
          <input type="hidden" name="businessId" value={businessId} />

          {error && (
            <div className="p-3 text-sm text-red-500 bg-red-50 border border-red-200 rounded-md">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="bankName">Nombre del Banco *</Label>
              <Input
                id="bankName"
                name="bankName"
                defaultValue={bank?.bankName || ""}
                placeholder="Ej: Banco Santander"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="accountHolder">Titular *</Label>
              <Input
                id="accountHolder"
                name="accountHolder"
                defaultValue={bank?.accountHolder || ""}
                placeholder="Ej: Mi Empresa SL"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="accountType">Tipo de Cuenta *</Label>
              <Input
                id="accountType"
                name="accountType"
                defaultValue={bank?.accountType || ""}
                placeholder="Ej: Cuenta Corriente"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="nif">NIF/CIF *</Label>
              <Input
                id="nif"
                name="nif"
                defaultValue={bank?.nif || ""}
                placeholder="Ej: B12345678"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="accountNumber">Número de Cuenta *</Label>
            <Input
              id="accountNumber"
              name="accountNumber"
              defaultValue={bank?.accountNumber || ""}
              placeholder="Ej: ES91 2100 0418 4502 0005 1332"
              required
            />
          </div>

          <div className="flex gap-2 pt-4">
            <SubmitButton />
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/banks")}
              className="w-full"
            >
              Cancelar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
} 