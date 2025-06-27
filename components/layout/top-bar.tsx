"use client"

import { Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { NotificationsDropdown } from "./notifications-dropdown"
import { InfoDropdown } from "./info-dropdown"
import { BusinessSelectorDropdown } from "./business-selector-dropdown"
import { useIsMobile } from "@/hooks/use-mobile"
import type { Business } from "@/components/layout/business-selector-dropdown"

interface TopBarProps {
  businesses: Business[]
  activeBusiness: Business | null
}

export function TopBar({ businesses, activeBusiness }: TopBarProps) {
  const isMobile = useIsMobile()

  return (
    <div className="sticky top-0 z-40 flex h-16 items-center justify-between border-b bg-background px-4 md:px-6">
      {/* Espaciador para empujar elementos a la derecha */}
      <div className="flex-1" />

      {/* Elementos de la derecha */}
      <div className="flex items-center space-x-2">
        {/* Selector de negocio */}
        <BusinessSelectorDropdown businesses={businesses} activeBusiness={activeBusiness} />

        {/* Notificaciones */}
        <NotificationsDropdown />

        {/* Información */}
        <InfoDropdown />
      </div>
    </div>
  )
}
