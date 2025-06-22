"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { createBusiness, updateBusiness } from "@/app/(dashboard)/businesses/actions"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { CriticalChangeNotice } from "@/components/ui/critical-change-notice"

// Esquema de validación
const businessFormSchema = z.object({
  name: z.string().min(1, { message: "El nombre es obligatorio" }),
  nif: z.string().min(1, { message: "El NIF/CIF es obligatorio" }),
  fiscalAddress: z.string().min(1, { message: "La dirección fiscal es obligatoria" }),
})

type BusinessFormValues = z.infer<typeof businessFormSchema>

type BusinessFormProps = {
  userId: string
  business?: {
    id: string
    name: string
    nif: string
    fiscalAddress: string
  }
}

export function BusinessForm({ userId, business }: BusinessFormProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showCriticalNotice, setShowCriticalNotice] = useState(false)
  const [pendingFormData, setPendingFormData] = useState<BusinessFormValues | null>(null)
  const isEditing = !!business

  // Guardar los valores originales para comparación
  const [originalValues, setOriginalValues] = useState({
    nif: business?.nif || "",
    name: business?.name || "",
  })

  const form = useForm<BusinessFormValues>({
    resolver: zodResolver(businessFormSchema),
    defaultValues: {
      name: business?.name || "",
      nif: business?.nif || "",
      fiscalAddress: business?.fiscalAddress || "",
    },
  })

  // Detectar cambios en campos críticos
  const watchNif = form.watch("nif")
  const watchName = form.watch("name")

  useEffect(() => {
    // Solo mostrar la alerta si estamos editando y los valores han cambiado
    if (isEditing && (watchNif !== originalValues.nif || watchName !== originalValues.name)) {
      // No mostrar la alerta inmediatamente, solo cuando se intente enviar el formulario
    }
  }, [watchNif, watchName, isEditing, originalValues])

  async function onSubmit(data: BusinessFormValues) {
    // Verificar si hay cambios en campos críticos
    if (isEditing && (data.nif !== originalValues.nif || data.name !== originalValues.name)) {
      setPendingFormData(data)
      setShowCriticalNotice(true)
      return
    }

    // Si no hay cambios críticos o es una creación nueva, proceder normalmente
    await submitForm(data)
  }

  async function submitForm(data: BusinessFormValues) {
    setIsSubmitting(true)

    try {
      if (isEditing && business) {
        // Actualizar negocio existente
        const result = await updateBusiness(business.id, data, userId)

        if (result.success) {
          toast({
            title: "Negocio actualizado",
            description: "La información del negocio ha sido actualizada correctamente",
          })
          router.push("/businesses")
        } else {
          toast({
            variant: "destructive",
            title: "Error",
            description: result.error || "No se pudo actualizar el negocio",
          })
        }
      } else {
        // Crear nuevo negocio
        const result = await createBusiness(data, userId)

        if (result.success) {
          toast({
            title: "Negocio creado",
            description: "El nuevo negocio ha sido creado correctamente",
          })
          router.push("/dashboard")
        } else {
          toast({
            variant: "destructive",
            title: "Error",
            description: result.error || "No se pudo crear el negocio",
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
                <FormLabel>Nombre de la empresa o autónomo</FormLabel>
                <FormControl>
                  <Input placeholder="Empresa S.L. / Nombre Apellidos" {...field} />
                </FormControl>
                <FormDescription>Nombre comercial o razón social de la empresa o autónomo</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="nif"
            render={({ field }) => (
              <FormItem>
                <FormLabel>NIF/CIF</FormLabel>
                <FormControl>
                  <Input placeholder="B12345678 / 12345678A" {...field} />
                </FormControl>
                <FormDescription>NIF (personas físicas) o CIF (empresas) para la facturación</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="fiscalAddress"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Dirección fiscal</FormLabel>
                <FormControl>
                  <Input placeholder="Calle, número, código postal, ciudad, provincia" {...field} />
                </FormControl>
                <FormDescription>Dirección completa para documentos fiscales</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" onClick={() => router.push("/businesses")} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? isEditing
                  ? "Actualizando..."
                  : "Creando..."
                : isEditing
                  ? "Actualizar negocio"
                  : "Crear negocio"}
            </Button>
          </div>
        </form>
      </Form>

      <CriticalChangeNotice
        isOpen={showCriticalNotice}
        onClose={() => setShowCriticalNotice(false)}
        onConfirm={handleConfirmCriticalChange}
        entityType="business"
        fieldName={watchNif !== originalValues.nif ? "nif" : "fiscalName"}
      />
    </>
  )
}
