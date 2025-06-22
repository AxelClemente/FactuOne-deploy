"use client"

import { LogOut } from "lucide-react"
import { logout } from "@/app/(auth)/login/actions"
import { SidebarMenuButton } from "@/components/ui/sidebar"

export function LogoutButton() {
  return (
    <form action={logout}>
      <SidebarMenuButton type="submit">
        <LogOut className="h-5 w-5" />
        <span>Cerrar sesión</span>
      </SidebarMenuButton>
    </form>
  )
}
