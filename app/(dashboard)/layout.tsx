import type React from "react"
import { redirect } from "next/navigation"
import { AppSidebar } from "@/components/layout/sidebar"
import { TopBar } from "@/components/layout/top-bar"
import { getCurrentUser } from "@/lib/auth"
import { getBusinessesForUser } from "@/lib/db"
import { getActiveBusiness } from "@/app/(dashboard)/businesses/actions"

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()

  if (!user) {
    redirect("/login")
  }

  const businesses = user ? await getBusinessesForUser(user.id) : []
  const activeBusiness = await getActiveBusiness()

  return (
    <div className="relative min-h-screen bg-background">
      <AppSidebar />
      <div className="md:pl-64 w-full">
        <TopBar businesses={businesses} activeBusiness={activeBusiness} />
        <div className="px-4 py-4 md:px-6 w-full">{children}</div>
      </div>
    </div>
  )
}
