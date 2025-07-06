"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { updateUser } from "@/app/(dashboard)/users/actions"

// Módulos y acciones disponibles para permisos granulares
const MODULES = [
  { key: "clients", label: "Clientes" },
  { key: "invoices", label: "Facturas emitidas" },
  { key: "received_invoices", label: "Facturas recibidas" },
  { key: "projects", label: "Proyectos" },
  { key: "providers", label: "Proveedores" },
  { key: "audit", label: "Auditoría" },
  { key: "automations", label: "Automatizaciones" },
];
const ACTIONS = [
  { key: "canView", label: "Ver" },
  { key: "canCreate", label: "Crear" },
  { key: "canEdit", label: "Editar" },
  { key: "canDelete", label: "Eliminar" },
];

// Esquema de validación
const userFormSchema = z.object({
  name: z.string().min(1, { message: "El nombre es obligatorio" }),
  role: z.enum(["admin", "accountant"], {
    required_error: "El rol es obligatorio",
  }),
  permissions: z.record(
    z.object({
      canView: z.boolean(),
      canCreate: z.boolean(),
      canEdit: z.boolean(),
      canDelete: z.boolean(),
    })
  ),
})

type UserFormValues = z.infer<typeof userFormSchema>

interface UserFormProps {
  user: {
    id: string
    name: string
    email: string
    role: "admin" | "accountant"
  }
  businessId: string
  currentUserIsAdmin: boolean
  permissions?: Record<string, { canView: boolean; canCreate: boolean; canEdit: boolean; canDelete: boolean }>
}

export function UserForm({ user, businessId, currentUserIsAdmin, permissions }: UserFormProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)

  // TODO: Cargar permisos actuales del usuario (fetch granular permissions)
  // Por ahora, default: todos en false
  const defaultPermissions = permissions || MODULES.reduce((acc, mod) => {
    acc[mod.key] = { canView: false, canCreate: false, canEdit: false, canDelete: false };
    return acc;
  }, {} as Record<string, { canView: boolean; canCreate: boolean; canEdit: boolean; canDelete: boolean }>);

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      name: user.name,
      role: user.role,
      permissions: defaultPermissions,
    },
  })

  async function onSubmit(data: UserFormValues) {
    if (!currentUserIsAdmin) {
      toast({
        variant: "destructive",
        title: "Permiso denegado",
        description: "No tienes permisos para editar usuarios",
      })
      return
    }

    setIsSubmitting(true)

    try {
      // Enviar permisos junto con los datos
      const result = await updateUser(user.id, businessId, data)

      if (result.success) {
        toast({
          title: "Usuario actualizado",
          description: "La información del usuario ha sido actualizada correctamente",
        })
        router.push("/users")
        router.refresh()
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: result.error || "No se pudo actualizar el usuario",
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
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre</FormLabel>
              <FormControl>
                <Input placeholder="Nombre completo" {...field} />
              </FormControl>
              <FormDescription>Nombre completo del usuario</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <FormLabel>Email</FormLabel>
            <Input value={user.email} disabled className="bg-muted" />
            <p className="text-sm text-muted-foreground mt-1">El email no se puede modificar</p>
          </div>

          <FormField
            control={form.control}
            name="role"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Rol en el negocio</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!currentUserIsAdmin}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar rol" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="admin">Administrador</SelectItem>
                    <SelectItem value="accountant">Contable</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>
                  {currentUserIsAdmin
                    ? "Define los permisos del usuario en este negocio"
                    : "Solo los administradores pueden cambiar roles"}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div>
          <h3 className="font-semibold mb-2">Permisos granulares</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full border text-sm">
              <thead>
                <tr>
                  <th className="border px-2 py-1">Módulo</th>
                  {ACTIONS.map((action) => (
                    <th key={action.key} className="border px-2 py-1">{action.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {MODULES.map((mod) => (
                  <tr key={mod.key}>
                    <td className="border px-2 py-1 font-medium">{mod.label}</td>
                    {ACTIONS.map((action) => (
                      <td key={action.key} className="border px-2 py-1 text-center">
                        <input
                          type="checkbox"
                          {...form.register(`permissions.${mod.key}.${action.key}` as const)}
                          disabled={!currentUserIsAdmin}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => router.push("/users")} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting || !currentUserIsAdmin}>
            {isSubmitting ? "Actualizando..." : "Actualizar usuario"}
          </Button>
        </div>
      </form>
    </Form>
  )
}
