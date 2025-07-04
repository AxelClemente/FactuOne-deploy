import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { notFound, redirect } from "next/navigation"
import { getUserById } from "../../actions"
import { UserForm } from "@/components/users/user-form"
import { getActiveBusiness } from "@/lib/getActiveBusiness"
import { getCurrentUser } from "@/lib/auth"
import { getDb } from "@/lib/db"
import { businessUsers } from "@/app/db/schema"
import { eq, and } from "drizzle-orm"

interface EditUserPageProps {
  params: {
    id: string
  }
}

export default async function EditUserPage({ params }: EditUserPageProps) {
  const { id } = params
  
  // Verificar que el usuario está autenticado
  const currentUser = await getCurrentUser()
  if (!currentUser) {
    redirect("/login")
  }

  const user = await getUserById(id)
  const activeBusiness = await getActiveBusiness()

  if (!user || !activeBusiness) {
    notFound()
  }

  // Verificar que el usuario actual es administrador del negocio
  const db = await getDb()
  const currentUserBusiness = await db.query.businessUsers.findFirst({
    where: (businessUsers, { eq }) => 
      eq(businessUsers.userId, currentUser.id) && 
      eq(businessUsers.businessId, activeBusiness.id) && 
      eq(businessUsers.role, "admin"),
  })

  const isAdmin = !!currentUserBusiness

  // Si no es admin, redirigir al dashboard
  if (!isAdmin) {
    redirect("/dashboard")
  }

  // Obtener el rol del usuario en el negocio activo
  const userBusiness = await db.query.businessUsers.findFirst({
    where: (businessUsers, { eq }) => 
      eq(businessUsers.userId, parseInt(id, 10)) && 
      eq(businessUsers.businessId, activeBusiness.id),
  })

  const userWithRole = {
    id: user.id.toString(),
    name: user.name || "Sin nombre",
    email: user.email,
    role: userBusiness?.role || "accountant",
  }

  return (
    <div className="w-full">
      <div className="mb-4">
        <h1 className="text-2xl font-bold">Editar Usuario</h1>
        <p className="text-muted-foreground">Actualiza los datos del usuario.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Detalles del Usuario</CardTitle>
          <CardDescription>
            Estás editando el perfil de <span className="font-semibold">{userWithRole.name}</span>.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UserForm 
            user={userWithRole} 
            businessId={activeBusiness} 
            currentUserIsAdmin={isAdmin}
          />
        </CardContent>
      </Card>
    </div>
  )
}
