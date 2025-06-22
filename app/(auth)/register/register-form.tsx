"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { registerUser } from "./actions"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"

const registerSchema = z
  .object({
    name: z.string().optional(),
    email: z.string().min(1, { message: "El email es obligatorio" }).email({ message: "Introduce un email válido" }),
    password: z.string().min(6, { message: "La contraseña debe tener al menos 6 caracteres" }),
    confirmPassword: z.string().min(1, { message: "Confirma tu contraseña" }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  })

type RegisterFormValues = z.infer<typeof registerSchema>

export function RegisterForm() {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  })

  async function onSubmit(data: RegisterFormValues) {
    setIsLoading(true)
    console.log("Iniciando proceso de registro con:", data.email)

    try {
      const result = await registerUser({
        name: data.name,
        email: data.email,
        password: data.password,
      })
      console.log("Resultado del registro:", result)

      if (result.success) {
        toast({
          title: "Registro exitoso",
          description: "Tu cuenta ha sido creada correctamente (datos simulados)",
        })
        // Añadir un pequeño retraso para que el toast sea visible
        setTimeout(() => {
          router.push("/login")
        }, 1500)
      } else {
        toast({
          variant: "destructive",
          title: "Error de registro",
          description: result.error || "No se pudo completar el registro",
        })
      }
    } catch (error) {
      console.error("Error en el proceso de registro:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Ocurrió un error al registrar tu cuenta. Inténtalo de nuevo.",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre (opcional)</FormLabel>
              <FormControl>
                <Input placeholder="Tu nombre" disabled={isLoading} {...field} />
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
                <Input
                  placeholder="ejemplo@empresa.com"
                  type="email"
                  autoComplete="email"
                  disabled={isLoading}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Contraseña</FormLabel>
              <FormControl>
                <Input
                  placeholder="••••••••"
                  type="password"
                  autoComplete="new-password"
                  disabled={isLoading}
                  {...field}
                />
              </FormControl>
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
                <Input
                  placeholder="••••••••"
                  type="password"
                  autoComplete="new-password"
                  disabled={isLoading}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? "Registrando..." : "Crear cuenta"}
        </Button>
        <div className="text-center text-sm text-muted-foreground">
          ¿Ya tienes una cuenta?{" "}
          <Link href="/login" className="font-medium text-primary underline underline-offset-4 hover:text-primary/90">
            Inicia sesión
          </Link>
        </div>
        <div className="mt-4 rounded-md bg-muted p-3 text-xs text-muted-foreground">
          <p className="font-medium">Entorno de desarrollo</p>
          <p>Los datos de registro son simulados y solo persisten durante la sesión actual.</p>
        </div>
      </form>
    </Form>
  )
}
