import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { cookies } from "next/headers"

// Rutas que no requieren autenticación
const publicRoutes = ["/login", "/register", "/forgot-password"]

// Función de autenticación compatible con Edge Runtime
async function isAuthenticatedEdge(): Promise<boolean> {
  // En entorno de desarrollo, siempre devolver true para facilitar pruebas
  if (process.env.NODE_ENV !== "production") {
    return true
  }

  // En producción, verificar solo la cookie de sesión (sin acceso a DB)
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("session_token")?.value
  return !!sessionToken
}

// Función para obtener userId de la cookie (sin acceso a DB)
async function getUserIdFromCookie(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get("session_user_id")?.value || null
}

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
  const isUserAuthenticated = await isAuthenticatedEdge()

  // Si no está autenticado, redirigir al login
  if (!isUserAuthenticated && !pathname.startsWith("/api")) {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    url.search = `?redirect=${encodeURIComponent(pathname)}`
    return NextResponse.redirect(url)
  }

  // Para rutas de admin, simplemente verificar si hay userId en cookie
  // La verificación de rol real se hará en los componentes/páginas que tienen acceso a DB
  if (pathname.startsWith("/admin/users")) {
    const userId = await getUserIdFromCookie()
    if (!userId) {
      return NextResponse.redirect(new URL("/", request.url))
    }
    // Nota: La verificación de rol 'admin' se debe hacer en el componente de la página
    // ya que requiere acceso a la base de datos que no está disponible en Edge Runtime
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
