"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Building2 } from "lucide-react"
import { setActiveBusiness } from "@/app/(dashboard)/businesses/actions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"

type Business = {
  id: string
  name: string
  nif: string
  role: string
}

export function BusinessSelector({ businesses }: { businesses: Business[] }) {
  const router = useRouter()
  const { toast } = useToast()
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleSelectBusiness = async () => {
    if (!selectedBusinessId) return

    setIsLoading(true)

    try {
      await setActiveBusiness(selectedBusinessId)

      toast({
        title: "Negocio seleccionado",
        description: "Has seleccionado el negocio correctamente",
      })

      // Redirigir al dashboard
      router.push("/dashboard")
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo seleccionar el negocio",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4">
        {businesses.map((business) => (
          <Card
            key={business.id}
            className={`cursor-pointer transition-all hover:border-primary ${
              selectedBusinessId === business.id ? "border-2 border-primary" : ""
            }`}
            onClick={() => setSelectedBusinessId(business.id)}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">{business.name}</CardTitle>
              <CardDescription>{business.nif}</CardDescription>
            </CardHeader>
            <CardContent className="pb-2">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {business.role === "admin" ? "Administrador" : "Contable"}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Button className="w-full" disabled={!selectedBusinessId || isLoading} onClick={handleSelectBusiness}>
        {isLoading ? "Seleccionando..." : "Continuar con este negocio"}
      </Button>
    </div>
  )
}
