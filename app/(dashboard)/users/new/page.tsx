import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/auth"
import { getActiveBusiness } from "@/lib/getActiveBusiness"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { UserRegistrationForm } from "@/components/users/user-registration-form"
import { getDb, schema } from "@/lib/db"
import { eq, and } from "drizzle-orm"

export default async function NewUserPage() {
  // Verificar que el usuario está autenticado
  const currentUser = await getCurrentUser()
  if (!currentUser) {
    redirect("/login")
  }

  // Obtener el negocio activo
  const activeBusiness = await getActiveBusiness()
  if (!activeBusiness) {
    redirect("/businesses")
  }
  console.log("[NEW USER PAGE] currentUser:", currentUser)
  console.log("[NEW USER PAGE] currentUser.id:", currentUser.id)
  console.log("[NEW USER PAGE] activeBusiness (ID):", activeBusiness)

  // Verificar que el usuario actual es administrador del negocio
  const db = await getDb();
  console.log("[NEW USER PAGE] Ejecutando query de admin con:", {
    userId: currentUser.id,
    businessId: activeBusiness,
    role: "admin"
  })
  const businessUser = await db
    .select()
    .from(schema.businessUsers)
    .where(
      and(
        eq(schema.businessUsers.userId, currentUser.id),
        eq(schema.businessUsers.businessId, activeBusiness),
        eq(schema.businessUsers.role, "admin")
      )
    )
    .then((rows) => rows[0]);
  console.log("[NEW USER PAGE] Resultado de businessUser:", businessUser)

  if (!businessUser) {
    // Si no es administrador, redirigir al dashboard
    console.log("[NEW USER PAGE] Usuario no es admin, redirigiendo al dashboard")
    redirect("/dashboard")
  }

  return (
    <div className="w-full py-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Registrar nuevo usuario</h1>
        <p className="text-muted-foreground">Añade un nuevo usuario al negocio actual</p>
      </div>

      <div className="rounded-md border p-6 shadow-sm">
        <UserRegistrationForm businessId={activeBusiness} />
      </div>
    </div>
  )
}
