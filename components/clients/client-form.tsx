"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { createClient, updateClient } from "@/app/(dashboard)/clients/actions"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { CriticalChangeNotice } from "@/components/ui/critical-change-notice"

// Esquema de validación
const clientFormSchema = z.object({
  name: z.string().min(1, { message: "El nombre es obligatorio" }),
  nif: z.string().min(1, { message: "El NIF/CIF es obligatorio" }),
  address: z.string().min(1, { message: "La dirección es obligatoria" }),
  email: z.string().email({ message: "El email debe tener un formato válido" }).optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
})

type ClientFormValues = z.infer<typeof clientFormSchema>

type ClientFormProps = {
  businessId: string
  client?: {
    id: string
    name: string
    nif: string
    address: string
    email: string
    phone: string
  }
}

export function ClientForm({ businessId, client }: ClientFormProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showCriticalNotice, setShowCriticalNotice] = useState(false)
  const [pendingFormData, setPendingFormData] = useState<ClientFormValues | null>(null)
  const isEditing = !!client

  // Guardar los valores originales para comparación
  const [originalValues, setOriginalValues] = useState({
    nif: client?.nif || "",
    name: client?.name || "",
  })

  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: {
      name: client?.name || "",
      nif: client?.nif || "",
      address: client?.address || "",
      email: client?.email || "",
      phone: client?.phone || "",
    },
  })

  // Detectar cambios en campos críticos
  const watchNif = form.watch("nif")
  const watchName = form.watch("name")

  async function onSubmit(data: ClientFormValues) {
    // Verificar si hay cambios en campos críticos
    if (isEditing && (data.nif !== originalValues.nif || data.name !== originalValues.name)) {
      setPendingFormData(data)
      setShowCriticalNotice(true)
      return
    }

    // Si no hay cambios críticos o es una creación nueva, proceder normalmente
    await submitForm(data)
  }

  async function submitForm(data: ClientFormValues) {
    setIsSubmitting(true)

    try {
      if (isEditing && client) {
        // Actualizar cliente existente
        const result = await updateClient(client.id, data)

        if (result.success) {
          toast({
            title: "Cliente actualizado",
            description: "La información del cliente ha sido actualizada correctamente",
          })
          router.push("/clients")
          router.refresh()
        } else {
          toast({
            variant: "destructive",
            title: "Error",
            description: result.error || "No se pudo actualizar el cliente",
          })
        }
      } else {
        // Crear nuevo cliente
        const result = await createClient(businessId, data)

        if (result.success) {
          toast({
            title: "Cliente creado",
            description: "El nuevo cliente ha sido creado correctamente",
          })
          if (typeof window !== "undefined" && window.refreshNotifications) {
            window.refreshNotifications()
          }
          setTimeout(() => {
            router.push("/clients")
            router.refresh()
          }, 200)
        } else {
          toast({
            variant: "destructive",
            title: "Error",
            description: result.error || "No se pudo crear el cliente",
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
                <FormLabel>Nombre o Razón Social</FormLabel>
                <FormControl>
                  <Input placeholder="Empresa S.L. / Nombre Apellidos" {...field} />
                </FormControl>
                <FormDescription>Nombre completo del cliente o empresa</FormDescription>
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
            name="address"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Dirección</FormLabel>
                <FormControl>
                  <Textarea placeholder="Calle, número, código postal, ciudad, provincia" {...field} />
                </FormControl>
                <FormDescription>Dirección completa para documentos fiscales</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid gap-6 md:grid-cols-2">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input placeholder="contacto@empresa.com" type="email" {...field} />
                  </FormControl>
                  <FormDescription>Email de contacto (opcional)</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Teléfono</FormLabel>
                  <FormControl>
                    <Input placeholder="912345678" {...field} />
                  </FormControl>
                  <FormDescription>Teléfono de contacto (opcional)</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" onClick={() => router.push("/clients")} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? isEditing
                  ? "Actualizando..."
                  : "Creando..."
                : isEditing
                  ? "Actualizar cliente"
                  : "Crear cliente"}
            </Button>
          </div>
        </form>
      </Form>

      <CriticalChangeNotice
        isOpen={showCriticalNotice}
        onClose={() => setShowCriticalNotice(false)}
        onConfirm={handleConfirmCriticalChange}
        entityType="client"
        fieldName={watchNif !== originalValues.nif ? "nif" : "fiscalName"}
      />
    </>
  )
}
