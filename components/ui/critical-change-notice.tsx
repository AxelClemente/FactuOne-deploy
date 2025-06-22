"use client"
import { AlertTriangle } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface CriticalChangeNoticeProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  entityType: "business" | "client" | "provider" | "project" | "user" | "invoiceType"
  fieldName: "nif" | "fiscalName" | "taxId" | "legalName" | "other"
}

export function CriticalChangeNotice({ isOpen, onClose, onConfirm, entityType, fieldName }: CriticalChangeNoticeProps) {
  // Mapeo de tipos de entidad a nombres en español
  const entityNames = {
    business: "negocio",
    client: "cliente",
    provider: "proveedor",
    project: "proyecto",
    user: "usuario",
    invoiceType: "tipo de factura",
  }

  // Mapeo de nombres de campo a nombres en español
  const fieldNames = {
    nif: "NIF/CIF",
    fiscalName: "razón social",
    taxId: "identificación fiscal",
    legalName: "nombre legal",
    other: "información crítica",
  }

  const entityName = entityNames[entityType]
  const fieldLabel = fieldNames[fieldName]

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-amber-600">
            <AlertTriangle className="h-5 w-5" />
            Cambio en información fiscal crítica
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>
                Estás a punto de modificar el <strong>{fieldLabel}</strong> de este {entityName}.
              </p>
              <p>
                Este cambio puede tener implicaciones legales o contables. No se aplicará retroactivamente a las facturas
                ya emitidas o recibidas.
              </p>
              <p className="font-medium">¿Estás seguro de que deseas continuar?</p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className="bg-amber-600 hover:bg-amber-700">
            Confirmar cambio
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
