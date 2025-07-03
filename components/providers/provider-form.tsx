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
import { useToast } from "@/hooks/use-toast"
import { createProvider, updateProvider } from "@/app/(dashboard)/proveedores/actions"

// Esquema de validación para proveedor
const providerFormSchema = z.object({
  name: z.string().min(1, { message: "El nombre es obligatorio" }),
  nif: z.string().min(1, { message: "El NIF es obligatorio" }),
  address: z.string().min(1, { message: "La dirección es obligatoria" }),
  postalCode: z.string().optional().or(z.literal("")),
  city: z.string().optional().or(z.literal("")),
  country: z.string().optional().or(z.literal("")),
  phone: z.string().min(1, { message: "El teléfono es obligatorio" }),
  email: z.string().email({ message: "Email inválido" }),
})

type ProviderFormValues = z.infer<typeof providerFormSchema>

type ProviderFormProps = {
  businessId: string
  provider?: {
    id: string
    name: string
    nif: string
    address: string
    postalCode?: string
    city?: string
    country?: string
    phone: string
    email: string
  }
}

export default function ProviderForm({ businessId, provider }: ProviderFormProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const isEditing = !!provider

  const form = useForm<ProviderFormValues>({
    resolver: zodResolver(providerFormSchema),
    defaultValues: {
      name: provider?.name || "",
      nif: provider?.nif || "",
      address: provider?.address || "",
      postalCode: provider?.postalCode || "",
      city: provider?.city || "",
      country: provider?.country || "España",
      phone: provider?.phone || "",
      email: provider?.email || "",
    },
  })

  async function handleSubmit(data: ProviderFormValues) {
    setIsSubmitting(true)
    try {
      let result
      if (isEditing && provider) {
        // Actualizar proveedor existente
        result = await updateProvider(provider.id, data, businessId)
      } else {
        // Crear nuevo proveedor
        result = await createProvider(data, businessId)
      }
      if (result.success) {
        toast({
          title: isEditing ? "Proveedor actualizado" : "Proveedor creado",
          description: isEditing ? "El proveedor ha sido actualizado correctamente" : "El nuevo proveedor ha sido creado correctamente",
        })
        router.push("/proveedores")
        router.refresh()
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: result.error || (isEditing ? "No se pudo actualizar el proveedor" : "No se pudo crear el proveedor"),
        })
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

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre</FormLabel>
              <FormControl>
                <Input placeholder="Nombre del proveedor" {...field} />
              </FormControl>
              <FormDescription>Nombre completo del proveedor o empresa</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="nif"
          render={({ field }) => (
            <FormItem>
              <FormLabel>NIF</FormLabel>
              <FormControl>
                <Input placeholder="B12345678 / 12345678A" {...field} />
              </FormControl>
              <FormDescription>NIF o CIF para la facturación</FormDescription>
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
            name="postalCode"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Código Postal</FormLabel>
                <FormControl>
                  <Input placeholder="28001" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="city"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Ciudad</FormLabel>
                <FormControl>
                  <Input placeholder="Madrid" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <FormField
            control={form.control}
            name="country"
            render={({ field }) => (
              <FormItem>
                <FormLabel>País</FormLabel>
                <FormControl>
                  <Input placeholder="España" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input placeholder="contacto@proveedor.com" type="email" {...field} />
                </FormControl>
                <FormDescription>Email de contacto</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Teléfono</FormLabel>
              <FormControl>
                <Input placeholder="912345678" {...field} />
              </FormControl>
              <FormDescription>Teléfono de contacto</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => router.push("/proveedores") } disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting
              ? isEditing
                ? "Actualizando..."
                : "Creando..."
              : isEditing
                ? "Actualizar proveedor"
                : "Crear proveedor"}
          </Button>
        </div>
      </form>
    </Form>
  )
} 