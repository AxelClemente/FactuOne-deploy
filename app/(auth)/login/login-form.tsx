"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { loginUser } from "./actions"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"

const loginSchema = z.object({
  email: z.string().min(1, { message: "El email es obligatorio" }).email({ message: "Introduce un email válido" }),
  password: z.string().min(1, { message: "La contraseña es obligatoria" }),
})

type LoginFormValues = z.infer<typeof loginSchema>

export function LoginForm() {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  })

  async function onSubmit(data: LoginFormValues) {
    setIsLoading(true)
    console.log("Iniciando proceso de login con:", data.email)

    try {
      const result = await loginUser(data)
      console.log("Resultado del login:", result)

      if (result.success) {
        toast({
          title: "Inicio de sesión exitoso",
          description: "Redirigiendo...",
        })

        // Ahora manejamos la redirección en el cliente
        if (result.redirectTo) {
          // Pequeño retraso para que el toast sea visible
          setTimeout(() => {
            router.push(result.redirectTo!)
          }, 1000)
        } else {
          // Si por alguna razón no hay ruta de redirección, ir al dashboard
          setTimeout(() => {
            router.push("/dashboard")
          }, 1000)
        }
      } else {
        toast({
          variant: "destructive",
          title: "Error de inicio de sesión",
          description: result.error || "Credenciales incorrectas",
        })
      }
    } catch (error) {
      console.error("Error en el proceso de login:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Ocurrió un error al iniciar sesión. Inténtalo de nuevo.",
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
              <div className="flex items-center justify-between">
                <FormLabel>Contraseña</FormLabel>
                <Link
                  href="/forgot-password"
                  className="text-xs text-muted-foreground underline underline-offset-4 hover:text-primary"
                >
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
              <FormControl>
                <Input
                  placeholder="••••••••"
                  type="password"
                  autoComplete="current-password"
                  disabled={isLoading}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? "Iniciando sesión..." : "Iniciar sesión"}
        </Button>
        <div className="text-center text-sm text-muted-foreground">
          ¿No tienes una cuenta?{" "}
          <Link
            href="/register"
            className="font-medium text-primary underline underline-offset-4 hover:text-primary/90"
          >
            Regístrate
          </Link>
        </div>
      </form>
    </Form>
  )
}
