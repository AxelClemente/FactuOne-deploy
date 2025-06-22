"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { CheckCircle, Edit, MapPin } from "lucide-react"
import { setActiveBusiness } from "@/app/(dashboard)/businesses/actions"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"

type Business = {
  id: string
  name: string
  nif: string
  fiscalAddress: string
  role: string
}

export function BusinessList({ businesses }: { businesses: Business[] }) {
  const router = useRouter()
  const { toast } = useToast()
  const [activatingId, setActivatingId] = useState<string | null>(null)

  const handleSetActive = async (businessId: string) => {
    setActivatingId(businessId)

    try {
      await setActiveBusiness(businessId)

      toast({
        title: "Negocio activo actualizado",
        description: "Se ha establecido el negocio seleccionado como activo",
      })

      // Refrescar la página para actualizar la UI
      router.refresh()

      // Redirigir al dashboard
      router.push("/dashboard")
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo establecer el negocio como activo",
      })
    } finally {
      setActivatingId(null)
    }
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
      {businesses.map((business) => (
        <Card key={business.id} className="hover:shadow-lg transition-shadow duration-200 min-h-[200px]">
          <CardHeader className="pb-4 px-6 pt-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <CardTitle className="text-xl font-semibold leading-tight mb-2">{business.name}</CardTitle>
                <CardDescription className="text-sm font-medium text-muted-foreground">{business.nif}</CardDescription>
              </div>
              <Badge
                variant={business.role === "admin" ? "default" : "secondary"}
                className="shrink-0 text-xs font-medium px-3 py-1"
              >
                {business.role === "admin" ? "Administrador" : "Contable"}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="px-6 pb-5">
            <div className="flex items-start gap-3 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
              <span className="leading-relaxed">{business.fiscalAddress}</span>
            </div>
          </CardContent>

          <CardFooter className="px-6 pb-6 pt-0 gap-3">
            <Button
              variant="default"
              size="default"
              className="flex-1 h-10"
              onClick={() => handleSetActive(business.id)}
              disabled={activatingId === business.id}
            >
              {activatingId === business.id ? (
                "Activando..."
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Seleccionar como activo
                </>
              )}
            </Button>

            {business.role === "admin" && (
              <Button variant="outline" size="default" className="h-10 px-4" asChild>
                <Link href={`/businesses/${business.id}/edit`}>
                  <Edit className="h-4 w-4 mr-2" />
                  Editar
                </Link>
              </Button>
            )}
          </CardFooter>
        </Card>
      ))}
    </div>
  )
}
