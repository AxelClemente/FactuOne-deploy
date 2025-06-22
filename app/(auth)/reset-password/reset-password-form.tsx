"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"

const resetPasswordSchema = z.object({
  email: z.string().email({ message: "Email inválido" }),
})

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>

export function ResetPasswordForm() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      email: "",
    },
  })

  async function onSubmit(data: ResetPasswordFormValues) {
    setIsSubmitting(true)

    try {
      // Simular envío de email
      await new Promise((resolve) => setTimeout(resolve, 2000))

      console.log("Enviando email de restablecimiento a:", data.email)

      setEmailSent(true)

      toast({
        title: "Email enviado",
        description: "Revisa tu bandeja de entrada para restablecer tu contraseña",
      })
    } catch (error) {
      console.error("Error enviando email:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo enviar el email de restablecimiento",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (emailSent) {
    return (
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-green-600">Email enviado</CardTitle>
          <CardDescription>
            Hemos enviado un enlace de restablecimiento a tu email. Revisa tu bandeja de entrada y sigue las
            instrucciones.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">¿No has recibido el email? Revisa tu carpeta de spam.</p>
            <Button variant="outline" onClick={() => setEmailSent(false)} className="w-full">
              Enviar de nuevo
            </Button>
          </div>
          <div className="text-center">
            <Link href="/login" className="text-sm text-primary hover:underline">
              Volver al login
            </Link>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Restablecer contraseña</CardTitle>
        <CardDescription>
          Introduce tu dirección de email y te enviaremos un enlace para restablecer tu contraseña.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="tu@email.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Enviando..." : "Enviar enlace de restablecimiento"}
            </Button>

            <div className="text-center">
              <Link href="/login" className="text-sm text-primary hover:underline">
                Volver al login
              </Link>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
