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
import Link from "next/link"

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
        <Link href="/privacy" passHref legacyBehavior>
          <DropdownMenuItem asChild>
            <a>Política de privacidad</a>
          </DropdownMenuItem>
        </Link>
        <Link href="/legal" passHref legacyBehavior>
          <DropdownMenuItem asChild>
            <a>Aviso legal</a>
          </DropdownMenuItem>
        </Link>
        <Link href="/terms" passHref legacyBehavior>
          <DropdownMenuItem asChild>
            <a>Términos de uso</a>
          </DropdownMenuItem>
        </Link>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled>
          <span className="text-muted-foreground">Versión v1.2.4</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
