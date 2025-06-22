import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { notFound } from "next/navigation"
import { getUserById } from "../../actions"
import { UserForm } from "@/components/users/user-form"
import { getActiveBusiness } from "@/lib/getActiveBusiness"

interface EditUserPageProps {
  params: {
    id: string
  }
}

export default async function EditUserPage({ params }: EditUserPageProps) {
  const { id } = params
  const user = await getUserById(id)
  const activeBusinessId = await getActiveBusiness()

  if (!user || !activeBusinessId) {
    notFound()
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
            Estás editando el perfil de <span className="font-semibold">{user.name || user.email}</span>.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UserForm user={user} businessId={activeBusinessId} />
        </CardContent>
      </Card>
    </div>
  )
}
