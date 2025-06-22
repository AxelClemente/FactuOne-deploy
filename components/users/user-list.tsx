"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Edit, Trash2, UserCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { removeUserFromBusiness } from "@/app/(dashboard)/users/actions"

interface User {
  id: string
  name: string
  email: string
  role: string
}

interface UserListProps {
  users: User[]
  businessId: string
  currentUserId: string
  isAdmin: boolean
}

export function UserList({ users, businessId, currentUserId, isAdmin }: UserListProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isRemoving, setIsRemoving] = useState<string | null>(null)

  const handleRemoveUser = async (userId: string) => {
    if (userId === currentUserId) {
      toast({
        variant: "destructive",
        title: "Operación no permitida",
        description: "No puedes eliminarte a ti mismo del negocio",
      })
      return
    }

    setIsRemoving(userId)

    try {
      const result = await removeUserFromBusiness(userId, businessId)

      if (result.success) {
        toast({
          title: "Usuario eliminado",
          description: "El usuario ha sido eliminado del negocio",
        })
        router.refresh()
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: result.error || "No se pudo eliminar el usuario",
        })
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Ocurrió un error inesperado",
      })
    } finally {
      setIsRemoving(null)
    }
  }

  if (users.length === 0) {
    return (
      <div className="rounded-md border p-8 text-center">
        <h3 className="text-lg font-medium">No hay usuarios</h3>
        <p className="mt-2 text-sm text-muted-foreground">No hay usuarios asociados a este negocio.</p>
        {isAdmin && (
          <Button asChild className="mt-4">
            <Link href="/users/new">Añadir usuario</Link>
          </Button>
        )}
      </div>
    )
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {users.map((user) => (
        <Card key={user.id}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">{user.name}</CardTitle>
              <Badge variant={user.role === "admin" ? "default" : "outline"}>
                {user.role === "admin" ? "Administrador" : "Contable"}
              </Badge>
            </div>
            <CardDescription>{user.email}</CardDescription>
          </CardHeader>
          <CardContent className="pb-3">
            <div className="flex items-center">
              <UserCircle className="mr-2 h-5 w-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{user.id === currentUserId ? "Tú" : "Usuario"}</span>
            </div>
          </CardContent>
          {isAdmin && (
            <CardFooter className="flex justify-end gap-2 pt-3">
              <Button variant="outline" size="sm" asChild>
                <Link href={`/users/${user.id}/edit`}>
                  <Edit className="mr-2 h-4 w-4" />
                  Editar
                </Link>
              </Button>

              {user.id !== currentUserId && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm">
                      <Trash2 className="mr-2 h-4 w-4" />
                      Eliminar
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>¿Eliminar usuario del negocio?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta acción eliminará al usuario {user.name} ({user.email}) del negocio actual. El usuario
                        perderá acceso a todos los datos del negocio.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleRemoveUser(user.id)} disabled={isRemoving === user.id}>
                        {isRemoving === user.id ? "Eliminando..." : "Eliminar"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </CardFooter>
          )}
        </Card>
      ))}
    </div>
  )
}
