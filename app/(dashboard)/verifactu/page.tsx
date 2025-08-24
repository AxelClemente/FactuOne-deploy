import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { VerifactuConfigForm } from "@/components/verifactu/verifactu-config-form"
import { VerifactuStats } from "@/components/verifactu/verifactu-stats"
import { VerifactuRegistryList } from "@/components/verifactu/verifactu-registry-list"
import { VerifactuWorkerMonitor } from "@/components/verifactu/verifactu-worker-monitor"
import { CertificateUploadForm } from "@/components/verifactu/certificate-upload-form"
import { getActiveBusiness } from "@/lib/getActiveBusiness"
import { getCurrentUser, hasPermission } from "@/lib/auth"
import { redirect } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default async function VerifactuPage() {
  const user = await getCurrentUser()
  if (!user) redirect("/login")

  const businessId = await getActiveBusiness()
  if (!businessId) redirect("/select-business")

  // Verificar permisos de administrador
  const canManage = await hasPermission(user.id, businessId, "invoices", "create")
  if (!canManage) {
    redirect("/dashboard")
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">VERI*FACTU</h2>
      </div>

      <Tabs defaultValue="config" className="space-y-4">
        <TabsList>
          <TabsTrigger value="config">Configuración</TabsTrigger>
          <TabsTrigger value="certificate">Certificado</TabsTrigger>
          <TabsTrigger value="stats">Estadísticas</TabsTrigger>
          <TabsTrigger value="registry">Registros</TabsTrigger>
          <TabsTrigger value="worker">Worker</TabsTrigger>
        </TabsList>

        <TabsContent value="config" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Configuración VERI*FACTU</CardTitle>
              <CardDescription>
                Configure los parámetros de su sistema VERI*FACTU para cumplir con la normativa de facturación electrónica.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <VerifactuConfigForm businessId={businessId} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="certificate" className="space-y-4">
          <CertificateUploadForm businessId={businessId} />
        </TabsContent>

        <TabsContent value="stats" className="space-y-4">
          <VerifactuStats businessId={businessId} />
        </TabsContent>

        <TabsContent value="registry" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Registros de Facturación</CardTitle>
              <CardDescription>
                Historial de registros enviados a la AEAT con su estado actual.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <VerifactuRegistryList businessId={businessId} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="worker" className="space-y-4">
          <VerifactuWorkerMonitor businessId={businessId} />
        </TabsContent>
      </Tabs>
    </div>
  )
}