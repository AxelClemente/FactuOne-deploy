import { CreateUserForm } from "./create-user-form"

async function getUsers() {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/admin/users`, {
      cache: 'no-store'
    })
    if (!response.ok) throw new Error('Failed to fetch users')
    return await response.json()
  } catch (error) {
    console.error('Error fetching users:', error)
    return []
  }
}

export default async function AdminUsersPage() {
  const users = await getUsers()

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Gestión de Usuarios</h1>
      <div className="mb-4 flex justify-end">
        <CreateUserForm />
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full border text-sm">
          <thead>
            <tr className="bg-muted">
              <th className="px-4 py-2 text-left">Nombre</th>
              <th className="px-4 py-2 text-left">Email</th>
              <th className="px-4 py-2 text-left">Estado</th>
              <th className="px-4 py-2 text-left">Fecha de creación</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user: any) => (
              <tr key={user.id} className="border-b">
                <td className="px-4 py-2">{user.name || <span className="text-muted-foreground">Sin nombre</span>}</td>
                <td className="px-4 py-2">{user.email}</td>
                <td className="px-4 py-2">
                  {user.isDeleted ? (
                    <span className="text-destructive">Inactivo</span>
                  ) : (
                    <span className="text-success">Activo</span>
                  )}
                </td>
                <td className="px-4 py-2">{user.createdAt ? new Date(user.createdAt).toLocaleString() : "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
} 