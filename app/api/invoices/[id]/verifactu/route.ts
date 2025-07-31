import { NextRequest } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { getInvoiceWithLines } from "@/app/(dashboard)/invoices/actions"
import { getActiveBusiness } from "@/lib/getActiveBusiness"
import { VerifactuService } from "@/lib/verifactu-service"

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    // 1. Validar usuario
    const user = await getCurrentUser()
    if (!user) {
      return new Response("Unauthorized", { status: 401 })
    }

    // 2. Obtener datos de la factura
    const invoice = await getInvoiceWithLines(params.id)
    if (!invoice) {
      return new Response("Factura no encontrada", { status: 404 })
    }

    // 3. Validar que pertenece al negocio activo
    const activeBusinessId = await getActiveBusiness()
    if (!activeBusinessId || invoice.businessId !== activeBusinessId) {
      return new Response("Forbidden", { status: 403 })
    }

    // 4. Obtener registro VERI*FACTU si existe
    const registry = await VerifactuService.getRegistryByInvoice(params.id, 'sent')
    
    if (!registry) {
      // Si no existe registro, verificar si VERI*FACTU está habilitado
      const config = await VerifactuService.getConfig(activeBusinessId)
      if (!config || !config.enabled) {
        return new Response("VERI*FACTU no está habilitado", { status: 404 })
      }
      
      // Crear el registro VERI*FACTU
      try {
        const newRegistry = await VerifactuService.createRegistry({
          invoiceId: params.id,
          invoiceType: 'sent',
          businessId: activeBusinessId
        })
        
        return Response.json({
          qrCode: newRegistry.qrCode,
          qrUrl: newRegistry.qrUrl,
          isVerifiable: newRegistry.isVerifiable,
          hash: newRegistry.currentHash,
          sequenceNumber: newRegistry.sequenceNumber,
          status: newRegistry.transmissionStatus
        })
      } catch (error) {
        console.error('Error creando registro VERI*FACTU:', error)
        return new Response("Error creando registro VERI*FACTU", { status: 500 })
      }
    }

    // 5. Devolver datos del registro existente
    return Response.json({
      qrCode: registry.qrCode,
      qrUrl: registry.qrUrl,
      isVerifiable: registry.isVerifiable,
      hash: registry.currentHash,
      sequenceNumber: registry.sequenceNumber,
      status: registry.transmissionStatus,
      transmissionDate: registry.transmissionDate,
      aeatCsv: registry.aeatCsv
    })
  } catch (error) {
    console.error('Error obteniendo datos VERI*FACTU:', error)
    return new Response("Error interno del servidor", { status: 500 })
  }
}