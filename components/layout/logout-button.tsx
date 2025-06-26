"use client"

import { LogOut } from "lucide-react"
import { logout } from "@/app/(auth)/login/actions"
import { SidebarMenuButton } from "@/components/ui/sidebar"
import { useRouter } from "next/navigation"

export function LogoutButton() {
  const router = useRouter();

  const handleLogout = async (e: React.FormEvent) => {
    e.preventDefault();
    await logout();
    router.push("/login");
  };

  return (
    <form onSubmit={handleLogout}>
      <SidebarMenuButton type="submit">
        <LogOut className="h-5 w-5" />
        <span>Cerrar sesión</span>
      </SidebarMenuButton>
    </form>
  );
}
