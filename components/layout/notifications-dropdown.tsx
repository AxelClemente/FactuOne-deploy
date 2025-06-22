"use client"

import { Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"

export function NotificationsDropdown() {
  // Datos mock simples para testing
  const notifications = [
    {
      id: "1",
      title: "Nueva factura recibida",
      summary: "Factura #FAC-2024-001 de Proveedor ABC",
      time: "hace 2 horas",
      isRead: false,
    },
    {
      id: "2",
      title: "Pago procesado",
      summary: "Pago de €1,250.00 procesado correctamente",
      time: "hace 1 día",
      isRead: true,
    },
  ]

  const unreadCount = notifications.filter((n) => !n.isRead).length

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center"
            >
              {unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="p-4">
          <h3 className="font-semibold text-sm mb-3">Notificaciones</h3>
          <div className="space-y-2">
            {notifications.map((notification) => (
              <DropdownMenuItem key={notification.id} className="p-3 h-auto">
                <div className="flex items-start justify-between w-full">
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${!notification.isRead ? "text-blue-900" : "text-foreground"}`}>
                      {notification.title}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">{notification.summary}</p>
                    <p className="text-xs text-muted-foreground mt-2">{notification.time}</p>
                  </div>
                  {!notification.isRead && <div className="w-2 h-2 bg-blue-500 rounded-full ml-2 mt-1 flex-shrink-0" />}
                </div>
              </DropdownMenuItem>
            ))}
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
