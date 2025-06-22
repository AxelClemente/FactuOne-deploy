"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/hooks/use-toast"
import { createInvoiceType, updateInvoiceType } from "@/app/(dashboard)/settings/invoice-types/actions"
import { CriticalChangeNotice } from "@/components/ui/critical-change-notice"

// Esquema de validación
const invoiceTypeFormSchema = z.object({
  name: z.string().min(1, { message: "El nombre es obligatorio" }),
  code: z.string().min(1, { message: "El código es obligatorio" }),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
  isDefault: z.boolean().default(false),
})

type InvoiceTypeFormValues = z.infer<typeof invoiceTypeFormSchema>

interface InvoiceTypeFormProps {
  businessId: string
  invoiceType?: {
    id: string
    name: string
    code: string
    description?: string
    isActive: boolean
    isDefault: boolean
  }
}

export function InvoiceTypeForm({ businessId, invoiceType }: InvoiceTypeFormProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showCriticalNotice, setShowCriticalNotice] = useState(false)
  const [pendingFormData, setPendingFormData] = useState<InvoiceTypeFormValues | null>(null)
  const isEditing = !!invoiceType

  // Guardar los valores originales para comparación
  const [originalValues, setOriginalValues] = useState({
    code: invoiceType?.code || "",
  })

  const form = useForm<InvoiceTypeFormValues>({
    resolver: zodResolver(invoiceTypeFormSchema),
    defaultValues: {
      name: invoiceType?.name || "",
      code: invoiceType?.code || "",
      description: invoiceType?.description || "",
      isActive: invoiceType?.isActive ?? true,
      isDefault: invoiceType?.isDefault ?? false,
    },
  })

  // Detectar cambios en campos críticos
  const watchCode = form.watch("code")

  async function onSubmit(data: InvoiceTypeFormValues) {
    // Verificar si hay cambios en campos críticos
    if (isEditing && data.code !== originalValues.code) {
      setPendingFormData(data)
      setShowCriticalNotice(true)
      return
    }

    // Si no hay cambios críticos o es una creación nueva, proceder normalmente
    await submitForm(data)
  }

  async function submitForm(data: InvoiceTypeFormValues) {
    setIsSubmitting(true)

    try {
      if (isEditing && invoiceType) {
        // Actualizar tipo de factura existente
        const result = await updateInvoiceType(invoiceType.id, businessId, data)

        if (result.success) {
          toast({
            title: "Tipo de factura actualizado",
            description: "La información del tipo de factura ha sido actualizada correctamente",
          })
          router.push("/settings/invoice-types")
          router.refresh()
        } else {
          toast({
            variant: "destructive",
            title: "Error",
            description: result.error || "No se pudo actualizar el tipo de factura",
          })
        }
      } else {
        // Crear nuevo tipo de factura
        const result = await createInvoiceType(businessId, data)

        if (result.success) {
          toast({
            title: "Tipo de factura creado",
            description: "El nuevo tipo de factura ha sido creado correctamente",
          })
          router.push("/settings/invoice-types")
          router.refresh()
        } else {
          toast({
            variant: "destructive",
            title: "Error",
            description: result.error || "No se pudo crear el tipo de factura",
          })
        }
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Ocurrió un error inesperado",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleConfirmCriticalChange() {
    if (pendingFormData) {
      submitForm(pendingFormData)
    }
    setShowCriticalNotice(false)
  }

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nombre</FormLabel>
                <FormControl>
                  <Input placeholder="Factura Ordinaria" {...field} />
                </FormControl>
                <FormDescription>Nombre descriptivo del tipo de factura</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="code"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Código</FormLabel>
                <FormControl>
                  <Input placeholder="F1" {...field} />
                </FormControl>
                <FormDescription>Código único para identificar este tipo de factura</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Descripción</FormLabel>
                <FormControl>
                  <Textarea placeholder="Descripción detallada del tipo de factura" {...field} />
                </FormControl>
                <FormDescription>Descripción opcional para uso interno</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid gap-6 md:grid-cols-2">
            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Activo</FormLabel>
                    <FormDescription>Este tipo de factura está disponible para su uso</FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isDefault"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Predeterminado</FormLabel>
                    <FormDescription>Usar como tipo de factura predeterminado</FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>

          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/settings/invoice-types")}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? isEditing
                  ? "Actualizando..."
                  : "Creando..."
                : isEditing
                  ? "Actualizar tipo"
                  : "Crear tipo"}
            </Button>
          </div>
        </form>
      </Form>

      <CriticalChangeNotice
        isOpen={showCriticalNotice}
        onClose={() => setShowCriticalNotice(false)}
        onConfirm={handleConfirmCriticalChange}
        entityType="invoiceType"
        fieldName="other"
      />
    </>
  )
}
