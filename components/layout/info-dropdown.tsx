"use client"

import { Info, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function InfoDropdown() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <Info className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onClick={() => (window.location.href = "/profile")}>Mis datos</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => window.open("/legal/privacy", "_blank")}>
          <span>Política de privacidad</span>
          <ExternalLink className="ml-auto h-3 w-3" />
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => window.open("/legal/notice", "_blank")}>
          <span>Aviso legal</span>
          <ExternalLink className="ml-auto h-3 w-3" />
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => window.open("/legal/terms", "_blank")}>
          <span>Términos de uso</span>
          <ExternalLink className="ml-auto h-3 w-3" />
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled>
          <span className="text-muted-foreground">Versión v1.2.4</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
