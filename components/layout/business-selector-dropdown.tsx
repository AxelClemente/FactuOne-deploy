"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { Building2, Check, ChevronsUpDown, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { setActiveBusiness } from "@/app/(dashboard)/businesses/actions"
import { useToast } from "@/hooks/use-toast"

// Se exporta el tipo para que otros componentes puedan usarlo
export interface Business {
  id: string
  name: string
  nif: string
  role: string
}

interface BusinessSelectorDropdownProps {
  businesses: Business[]
  activeBusiness: Business | null
}

export function BusinessSelectorDropdown({ businesses, activeBusiness }: BusinessSelectorDropdownProps) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const { toast } = useToast()

  // El negocio a mostrar es el activo, o el primero de la lista si no hay ninguno activo
  const businessToDisplay = activeBusiness || businesses[0]

  const handleBusinessChange = (businessId: string) => {
    startTransition(async () => {
      const result = await setActiveBusiness(businessId)
      if (result.success) {
        toast({ title: "Negocio cambiado", description: `Ahora estás trabajando en ${businesses.find(b => b.id === businessId)?.name}.` })
        router.refresh() // Refresca los Server Components con los nuevos datos
      } else {
        toast({ variant: "destructive", title: "Error", description: "No se pudo cambiar de negocio." })
      }
    })
  }

  if (businesses.length === 0) {
    return (
      <Button variant="ghost" className="h-auto p-2 justify-start" disabled>
        <Building2 className="h-4 w-4 mr-2 flex-shrink-0" />
        <span className="text-sm font-medium">Sin negocios</span>
      </Button>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-auto p-2 justify-start w-full" disabled={isPending}>
          <div className="flex items-center flex-1 min-w-0">
            {isPending ? (
              <Loader2 className="h-4 w-4 mr-2 flex-shrink-0 animate-spin" />
            ) : (
              <Building2 className="h-4 w-4 mr-2 flex-shrink-0" />
            )}
            <div className="flex flex-col items-start min-w-0">
              <span className="text-sm font-medium truncate max-w-[150px]">{businessToDisplay?.name ?? 'Seleccionar'}</span>
              <span className="text-xs text-muted-foreground">{businessToDisplay?.nif}</span>
            </div>
          </div>
          {!isPending && <ChevronsUpDown className="h-4 w-4 ml-2 flex-shrink-0" />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        {businesses.map((business) => (
          <DropdownMenuItem
            key={business.id}
            onClick={() => handleBusinessChange(business.id.toString())}
            disabled={isPending || business.id === activeBusiness?.id}
            className="flex items-center justify-between p-3"
          >
            <div className="flex flex-col items-start min-w-0 flex-1">
              <span className="text-sm font-medium truncate">{business.name}</span>
              <span className="text-xs text-muted-foreground">
                {business.nif} • {business.role}
              </span>
            </div>
            {activeBusiness?.id === business.id && <Check className="h-4 w-4 text-primary flex-shrink-0" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
