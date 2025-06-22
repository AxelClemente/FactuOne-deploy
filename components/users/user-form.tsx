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

// Esquema de validación
const userFormSchema = z.object({
  name: z.string().min(1, { message: "El nombre es obligatorio" }),
  role: z.enum(["admin", "accountant"], {
    required_error: "El rol es obligatorio",
  }),
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
}

export function UserForm({ user, businessId, currentUserIsAdmin }: UserFormProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      name: user.name,
      role: user.role,
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
