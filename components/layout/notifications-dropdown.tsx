"use client"

import useSWR from "swr"
import { useEffect } from "react"
import { Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"

function timeAgo(dateString: string) {
  const date = new Date(dateString)
  const now = new Date()
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000)
  if (diff < 60) return "hace unos segundos"
  if (diff < 3600) return `hace ${Math.floor(diff / 60)} minutos`
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)} horas`
  if (diff < 2592000) return `hace ${Math.floor(diff / 86400)} días`
  return date.toLocaleDateString("es-ES")
}

const fetcher = (url: string) => fetch(url).then(res => res.json())

export function NotificationsDropdown() {
  const { data, isLoading, mutate } = useSWR("/api/notifications", fetcher, { refreshInterval: 0 })
  const notifications = data?.notifications || []
  const unreadCount = notifications.filter((n: any) => !n.is_read).length

  // Exponer función global para refrescar notificaciones desde cualquier parte
  useEffect(() => {
    (window as any).refreshNotifications = mutate
    return () => {
      (window as any).refreshNotifications = undefined
    }
  }, [mutate])

  async function markAsRead(id: string) {
    try {
      await fetch(`/api/notifications/${id}/read`, { method: "PATCH" })
      mutate()
    } catch {}
  }

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
            {isLoading ? (
              <div className="text-xs text-muted-foreground">Cargando...</div>
            ) : notifications.length === 0 ? (
              <div className="text-xs text-muted-foreground">No hay notificaciones</div>
            ) : (
              notifications.map((notification: any) => (
                <DropdownMenuItem
                  key={notification.id}
                  className={`p-3 h-auto cursor-pointer transition-colors ${notification.is_read ? "bg-muted text-muted-foreground" : "bg-white"}`}
                  onClick={() => !notification.is_read && markAsRead(notification.id)}
                >
                  <div className="flex items-start justify-between w-full">
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${!notification.is_read ? "text-blue-900" : "text-muted-foreground"}`}>
                        {notification.title}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">{notification.message}</p>
                      <p className="text-xs text-muted-foreground mt-2">{timeAgo(notification.created_at)}</p>
                    </div>
                    {!notification.is_read && <div className="w-2 h-2 bg-blue-500 rounded-full ml-2 mt-1 flex-shrink-0" />}
                  </div>
                </DropdownMenuItem>
              ))
            )}
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
