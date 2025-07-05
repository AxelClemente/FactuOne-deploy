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
import { registerUser } from "@/app/(dashboard)/users/actions"

// Módulos y acciones disponibles para permisos granulares
const MODULES = [
  { key: "clients", label: "Clientes" },
  { key: "invoices", label: "Facturas emitidas" },
  { key: "received_invoices", label: "Facturas recibidas" },
  { key: "projects", label: "Proyectos" },
  { key: "providers", label: "Proveedores" },
];
const ACTIONS = [
  { key: "canView", label: "Ver" },
  { key: "canCreate", label: "Crear" },
  { key: "canEdit", label: "Editar" },
  { key: "canDelete", label: "Eliminar" },
];

// Esquema de validación
const userRegistrationSchema = z
  .object({
    name: z.string().optional(),
    email: z.string().email({ message: "Email inválido" }),
    password: z.string().min(6, { message: "La contraseña debe tener al menos 6 caracteres" }),
    confirmPassword: z.string(),
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
  .refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  })

type UserRegistrationFormValues = z.infer<typeof userRegistrationSchema>

interface UserRegistrationFormProps {
  businessId: string
}

export function UserRegistrationForm({ businessId }: UserRegistrationFormProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Default permissions: todos en false
  const defaultPermissions = MODULES.reduce((acc, mod) => {
    acc[mod.key] = { canView: false, canCreate: false, canEdit: false, canDelete: false };
    return acc;
  }, {} as Record<string, { canView: boolean; canCreate: boolean; canEdit: boolean; canDelete: boolean }>);

  const form = useForm<UserRegistrationFormValues>({
    resolver: zodResolver(userRegistrationSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      role: "accountant",
      permissions: defaultPermissions,
    },
  })

  async function onSubmit(data: UserRegistrationFormValues) {
    setIsSubmitting(true)

    try {
      const result = await registerUser({
        name: data.name || "",
        email: data.email,
        password: data.password,
        businessId,
        role: data.role,
        permissions: data.permissions,
      })

      if (result.success) {
        toast({
          title: "Usuario registrado",
          description: result.userExists
            ? "El usuario existente ha sido asociado al negocio"
            : "El nuevo usuario ha sido creado y asociado al negocio",
        })
        router.push("/users")
        router.refresh()
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: result.error || "No se pudo registrar el usuario",
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
                <Input placeholder="Nombre completo (opcional)" {...field} />
              </FormControl>
              <FormDescription>Nombre completo del usuario</FormDescription>
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
                <Input placeholder="correo@ejemplo.com" type="email" required {...field} />
              </FormControl>
              <FormDescription>Si el usuario ya existe, solo se asociará al negocio actual</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid gap-6 md:grid-cols-2">
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Contraseña</FormLabel>
                <FormControl>
                  <Input placeholder="Contraseña" type="password" required {...field} />
                </FormControl>
                <FormDescription>Mínimo 6 caracteres</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Confirmar contraseña</FormLabel>
                <FormControl>
                  <Input placeholder="Confirmar contraseña" type="password" required {...field} />
                </FormControl>
                <FormDescription>Repite la contraseña</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="role"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Rol en el negocio</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value} disabled={true}>
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
              <FormDescription>Define los permisos del usuario en este negocio</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

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
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Registrando..." : "Registrar usuario"}
          </Button>
        </div>
      </form>
    </Form>
  )
}
