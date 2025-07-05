"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Building2, FileText, FolderKanban, Home, Menu, Receipt, Users, X, Activity } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import { LogoutButton } from "@/components/layout/logout-button"
import { useIsMobile } from "@/hooks/use-mobile"

export function AppSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const isMobile = useIsMobile()
  const [isOpen, setIsOpen] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Verificar si el usuario está autenticado basado en la ruta
  useEffect(() => {
    // Si estamos en una ruta protegida, consideramos que el usuario está autenticado
    // Las rutas de autenticación comienzan con /login, /register, etc.
    const isAuthRoute =
      pathname.startsWith("/login") || pathname.startsWith("/register") || pathname.startsWith("/forgot-password")

    setIsAuthenticated(!isAuthRoute && pathname !== "/")
  }, [pathname])

  // Si el usuario no está autenticado, no mostramos el sidebar
  if (!isAuthenticated) {
    return null
  }

  const handleNavigation = (path: string) => {
    router.push(path)
    if (isMobile) {
      setIsOpen(false)
    }
  }

  const menuItems = [
    {
      name: "Dashboard",
      path: "/dashboard",
      icon: Home,
      onClick: () => handleNavigation("/dashboard"),
    },
    {
      name: "Mis Negocios",
      path: "/businesses",
      icon: Building2,
      onClick: () => handleNavigation("/businesses"),
    },
    {
      name: "Clientes",
      path: "/clients",
      icon: Users,
      onClick: () => handleNavigation("/clients"),
    },
    {
      name: "Proveedores",
      path: "/proveedores",
      icon: Users,
      onClick: () => handleNavigation("/proveedores"),
    },
    {
      name: "Facturas emitidas",
      path: "/invoices",
      icon: FileText,
      onClick: () => handleNavigation("/invoices"),
    },
    {
      name: "Facturas recibidas",
      path: "/received-invoices",
      icon: Receipt,
      onClick: () => handleNavigation("/received-invoices"),
    },
    {
      name: "Proyectos",
      path: "/projects",
      icon: FolderKanban,
      onClick: () => handleNavigation("/projects"),
    },
    {
      name: "Auditoría",
      path: "/audit",
      icon: Activity,
      onClick: () => handleNavigation("/audit"),
    },
  ]

  // Prevent hydration mismatch by showing a skeleton until mounted
  if (!mounted) {
    return (
      <div className="hidden md:flex h-screen w-64 flex-col fixed left-0 top-0 bottom-0 bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
        <div className="flex h-14 items-center px-4 border-b border-sidebar-border">
          <div className="h-4 w-32 bg-muted rounded animate-pulse"></div>
        </div>
        <div className="flex-1 overflow-auto py-2">
          <div className="flex flex-col gap-1 px-2">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-10 bg-muted rounded animate-pulse"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Renderizar el sidebar para dispositivos móviles (drawer)
  if (isMobile) {
    return (
      <>
        <Button variant="ghost" size="icon" className="fixed top-4 left-4 z-50" onClick={() => setIsOpen(true)}>
          <Menu className="h-6 w-6" />
          <span className="sr-only">Abrir menú</span>
        </Button>

        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetContent side="left" className="p-0 w-[280px]">
            <SheetTitle className="sr-only">Menú principal</SheetTitle>
            <div className="flex flex-col h-full bg-sidebar text-sidebar-foreground">
              <div className="flex h-14 items-center px-4 border-b border-sidebar-border justify-between">
                <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
                  <span>CRM Facturación</span>
                </Link>
              </div>

              <div className="flex-1 overflow-auto py-2">
                <nav className="flex flex-col gap-1 px-2">
                  {menuItems.map((item) => (
                    <a
                      key={item.path}
                      href={item.path}
                      onClick={(e) => {
                        e.preventDefault()
                        item.onClick()
                      }}
                      className={`flex items-center gap-2 rounded-md p-2 text-sm ${
                        pathname.startsWith(item.path)
                          ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                          : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      }`}
                    >
                      <item.icon className="h-5 w-5" />
                      <span>{item.name}</span>
                    </a>
                  ))}
                </nav>
              </div>

              <div className="p-4 border-t border-sidebar-border">
                <LogoutButton className="w-full" />
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </>
    )
  }

  // Renderizar el sidebar para escritorio
  return (
    <div className="hidden md:flex h-screen w-64 flex-col fixed left-0 top-0 bottom-0 bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
      <div className="flex h-14 items-center px-4 border-b border-sidebar-border">
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
          <span>CRM Facturación</span>
        </Link>
      </div>

      <div className="flex-1 overflow-auto py-2">
        <nav className="flex flex-col gap-1 px-2">
          {menuItems.map((item) => (
            <a
              key={item.path}
              href={item.path}
              onClick={(e) => {
                e.preventDefault()
                item.onClick()
              }}
              className={`flex items-center gap-2 rounded-md p-2 text-sm ${
                pathname.startsWith(item.path)
                  ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              }`}
            >
              <item.icon className="h-5 w-5" />
              <span>{item.name}</span>
            </a>
          ))}
        </nav>
      </div>

      <div className="p-4 border-t border-sidebar-border">
        <LogoutButton className="w-full" />
      </div>
    </div>
  )
}
