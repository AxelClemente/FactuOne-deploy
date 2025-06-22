import { RegisterForm } from "./register-form"
import Image from "next/image"

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen w-full">
      <div className="flex w-full flex-col items-center justify-center px-4 sm:w-1/2 md:px-8 lg:px-12">
        <div className="w-full max-w-md space-y-6">
          <div className="space-y-2 text-center">
            <h1 className="text-3xl font-bold">Crear cuenta</h1>
            <p className="text-muted-foreground">Regístrate para comenzar a usar el CRM de facturación electrónica</p>
          </div>
          <RegisterForm />
        </div>
      </div>
      <div className="hidden bg-muted sm:flex sm:w-1/2 sm:items-center sm:justify-center">
        <Image
          src="/electronic-invoicing-register.png"
          alt="Registro en CRM de Facturación Electrónica"
          width={800}
          height={600}
          className="h-auto max-w-full rounded-lg object-cover"
          priority
        />
      </div>
    </div>
  )
}
