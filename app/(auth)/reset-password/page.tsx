import { ResetPasswordForm } from "./reset-password-form"

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Restablecer contraseña</h1>
          <p className="text-muted-foreground">Introduce tu email para recibir un enlace de restablecimiento</p>
        </div>
        <ResetPasswordForm />
      </div>
    </div>
  )
}
