"use client"

import { useState, useEffect, useMemo } from "react"
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
import { getClientsForCurrentUser } from "@/app/(dashboard)/clients/actions";
import { getProvidersForCurrentUser } from "@/app/(dashboard)/proveedores/actions";
import { getProjectsForCurrentUser } from "@/app/(dashboard)/projects/actions";

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

// Solo módulos con exclusión: clients, providers, projects
const EXCLUSION_MODULES = ["clients", "providers", "projects"];

// Simulación de fetch de entidades (en producción, fetch real)
const fetchEntities = async (businessId: string, module: string) => {
  if (module === "clients") {
    const clients = await getClients(businessId);
    return clients.map((c: any) => ({ id: c.id, name: `${c.name} (${c.nif})` }));
  }
  if (module === "providers") {
    const providers = await getProviders(businessId);
    return providers.map((p: any) => ({ id: p.id, name: `${p.name} (${p.nif})` }));
  }
  if (module === "projects") {
    const projects = await getProjects({});
    return projects.map((prj: any) => ({ id: prj.id, name: prj.name }));
  }
  return [];
};

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
  const [excluded, setExcluded] = useState<{ [module: string]: string[] }>({});
  const [entities, setEntities] = useState<{ [module: string]: { id: string; name: string }[] }>({});

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

  useEffect(() => {
    async function loadEntities() {
      const newEntities: { [module: string]: { id: string; name: string }[] } = {};
      for (const mod of MODULES) {
        if (mod.key === "clients") {
          const clients = await getClientsForCurrentUser(businessId);
          newEntities[mod.key] = clients.map((c: any) => ({ id: c.id, name: `${c.name} (${c.nif})` }));
        } else if (mod.key === "providers") {
          const providers = await getProvidersForCurrentUser(businessId);
          newEntities[mod.key] = providers.map((p: any) => ({ id: p.id, name: `${p.name} (${p.nif})` }));
        } else if (mod.key === "projects") {
          const projects = await getProjectsForCurrentUser({});
          newEntities[mod.key] = projects.map((prj: any) => ({ id: prj.id, name: prj.name }));
        } else {
          newEntities[mod.key] = [];
        }
      }
      setEntities(newEntities);
    }
    loadEntities();
  }, [businessId]);

  useEffect(() => {
    const newExcluded = MODULES.filter(mod => form.watch(`permissions.${mod.key}.canView`)).reduce((acc, mod) => {
      acc[mod.key] = [];
      return acc;
    }, {} as { [module: string]: string[] });
    setExcluded(newExcluded);
  }, [form.watch(`permissions.${MODULES[0]?.key}.canView`)]); // Re-run when permissions change

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
      // Enviar exclusiones junto con los datos
      const result = await updateUser(user.id, businessId, { ...data, exclusions: excluded })

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

        {MODULES.filter(mod => EXCLUSION_MODULES.includes(mod.key) && form.watch(`permissions.${mod.key}.canView`)).map(mod => {
          const sortedEntities = (entities[mod.key] || []).slice().sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }));
          return (
            <FormItem key={mod.key + "-exclusions"}>
              <FormLabel>Excluir {mod.label}</FormLabel>
              <div className="flex flex-col gap-1 border rounded p-2">
                {sortedEntities.map(ent => (
                  <label key={ent.id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={(excluded[mod.key] || []).includes(ent.id)}
                      onChange={e => {
                        setExcluded(prev => {
                          const prevList = prev[mod.key] || [];
                          if (e.target.checked) {
                            if (!prevList.includes(ent.id)) {
                              return { ...prev, [mod.key]: [...prevList, ent.id] };
                            }
                            return prev;
                          } else {
                            return { ...prev, [mod.key]: prevList.filter(id => id !== ent.id) };
                          }
                        });
                      }}
                    />
                    <span>{ent.name}</span>
                  </label>
                ))}
              </div>
              <FormDescription>Selecciona {mod.label.toLowerCase()} que el usuario NO podrá ver ni gestionar.</FormDescription>
            </FormItem>
          );
        })}

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
