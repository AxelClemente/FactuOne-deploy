import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

import { isAuthenticated } from "@/lib/auth"

// Rutas que no requieren autenticación
const publicRoutes = ["/login", "/register", "/forgot-password"]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // En entorno de desarrollo, permitir acceso a todas las rutas para facilitar pruebas
  if (process.env.NODE_ENV !== "production") {
    console.log("Middleware: Modo desarrollo - Permitiendo acceso a todas las rutas")
    return NextResponse.next()
  }

  // Verificar si la ruta es pública
  if (publicRoutes.some((route) => pathname.startsWith(route))) {
    return NextResponse.next()
  }

  // Verificar si el usuario está autenticado
  const isUserAuthenticated = await isAuthenticated()

  // Si no está autenticado, redirigir al login
  if (!isUserAuthenticated && !pathname.startsWith("/api")) {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    url.search = `?redirect=${encodeURIComponent(pathname)}`
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
