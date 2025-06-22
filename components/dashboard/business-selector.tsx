"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { setActiveBusiness } from "@/app/(dashboard)/businesses/actions"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"

type Business = {
  id: string
  name: string
}

interface BusinessSelectorProps {
  businesses: Business[]
  activeBusinessId: string | null
}

export function BusinessSelector({ businesses, activeBusinessId }: BusinessSelectorProps) {
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(activeBusinessId)
  const router = useRouter()
  const { toast } = useToast()

  const handleSelectBusiness = async (businessId: string) => {
    if (businessId === selectedBusinessId) {
      return
    }

    try {
      await setActiveBusiness(businessId)
      setSelectedBusinessId(businessId)

      toast({
        title: "Negocio activo cambiado",
        description: "Se ha cambiado el negocio activo correctamente",
      })

      router.refresh()
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo cambiar el negocio activo",
      })
    }
  }

  const selectedBusinessName = businesses.find((b) => b.id === selectedBusinessId)?.name

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2">
        <p className="text-sm font-medium text-muted-foreground">Negocio activo:</p>
        <Select onValueChange={handleSelectBusiness} value={selectedBusinessId ?? ""}>
          <SelectTrigger className="w-[240px]">
            <SelectValue placeholder="Seleccionar negocio">{selectedBusinessName}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {businesses.map((business) => (
              <SelectItem key={business.id} value={business.id}>
                {business.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
