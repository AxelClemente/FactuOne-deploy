"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { CalendarIcon, Upload } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { createReceivedInvoice, updateReceivedInvoice } from "@/app/(dashboard)/received-invoices/actions"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { CriticalChangeNotice } from "@/components/ui/critical-change-notice"

// Esquema de validación actualizado
const receivedInvoiceFormSchema = z.object({
  date: z.date({ required_error: "La fecha es obligatoria" }),
  providerId: z.string().min(1, { message: "Selecciona un proveedor" }),
  amount: z.coerce.number().min(0, { message: "El importe debe ser positivo" }),
  status: z.enum(["pending", "recorded", "rejected"], {
    required_error: "El estado es obligatorio",
  }),
  category: z.string().optional(),
  fileUrl: z.string().optional(),
  projectId: z.string().optional(),
})

type ReceivedInvoiceFormValues = z.infer<typeof receivedInvoiceFormSchema>

interface ReceivedInvoiceFormProps {
  categories: { id: string; name: string }[]
  providers: { id: string; name: string; nif: string }[]
  projects?: { id: string; name: string }[]
  invoice?: any
}

export function ReceivedInvoiceForm({ categories, providers, projects = [], invoice }: ReceivedInvoiceFormProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [fileUploading, setFileUploading] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<string | null>(invoice?.fileUrl || null)
  const [showCriticalNotice, setShowCriticalNotice] = useState(false)
  const [pendingFormData, setPendingFormData] = useState<ReceivedInvoiceFormValues | null>(null)

  const isEditing = !!invoice

  // Guardar los valores originales para comparación
  const [originalValues, setOriginalValues] = useState({
    providerId: invoice?.providerId || "",
  })

  // Valores por defecto para el formulario
  const defaultValues: Partial<ReceivedInvoiceFormValues> = {
    date: invoice ? new Date(invoice.date) : new Date(),
    providerId: invoice?.providerId || "",
    amount: invoice?.amount || 0,
    status: invoice?.status || "pending",
    category: invoice?.category || "",
    fileUrl: invoice?.fileUrl || "",
    projectId: invoice?.projectId || undefined,
  }

  // Inicializar el formulario
  const form = useForm<ReceivedInvoiceFormValues>({
    resolver: zodResolver(receivedInvoiceFormSchema),
    defaultValues,
  })

  // Detectar cambios en campos críticos
  const watchProviderId = form.watch("providerId")

  // Simular subida de archivo
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setFileUploading(true)

    // Simulamos una subida de archivo
    setTimeout(() => {
      // En una implementación real, aquí subiríamos el archivo a un servicio de almacenamiento
      // y obtendríamos la URL del archivo subido
      const mockFileUrl = `https://example.com/uploads/${file.name}`
      setUploadedFile(mockFileUrl)
      form.setValue("fileUrl", mockFileUrl)
      setFileUploading(false)

      toast({
        title: "Archivo subido",
        description: `Se ha subido correctamente el archivo: ${file.name}`,
      })
    }, 1500)
  }

  // Enviar el formulario
  async function onSubmit(data: ReceivedInvoiceFormValues) {
    // Verificar si hay cambios en campos críticos
    if (
      isEditing &&
      (data.providerId !== originalValues.providerId)
    ) {
      setPendingFormData(data)
      setShowCriticalNotice(true)
      return
    }

    // Si no hay cambios críticos o es una creación nueva, proceder normalmente
    await submitForm(data)
  }

  async function submitForm(data: ReceivedInvoiceFormValues) {
    setIsSubmitting(true)

    try {
      if (isEditing) {
        // Actualizar factura existente
        const result = await updateReceivedInvoice(invoice.id, data)

        if (result.success) {
          toast({
            title: "Factura actualizada",
            description: "La factura recibida ha sido actualizada correctamente",
          })
          router.push(`/received-invoices/${result.invoiceId}`)
        } else {
          toast({
            variant: "destructive",
            title: "Error",
            description: result.error || "No se pudo actualizar la factura",
          })
        }
      } else {
        // Crear nueva factura
        const result = await createReceivedInvoice(data)

        if (result.success) {
          toast({
            title: "Factura registrada",
            description: "La factura recibida ha sido registrada correctamente",
          })
          router.push(`/received-invoices/${result.invoiceId}`)
        } else {
          toast({
            variant: "destructive",
            title: "Error",
            description: result.error || "No se pudo registrar la factura",
          })
        }
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Ocurrió un error inesperado",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleConfirmCriticalChange() {
    if (pendingFormData) {
      submitForm(pendingFormData)
    }
    setShowCriticalNotice(false)
  }

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Fecha */}
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Fecha de emisión</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                        >
                          {field.value ? (
                            format(field.value, "dd/MM/yyyy", { locale: es })
                          ) : (
                            <span>Seleccionar fecha</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) => date > new Date()}
                        initialFocus
                        locale={es}
                      />
                    </PopoverContent>
                  </Popover>
                  <FormDescription>Fecha de emisión de la factura recibida</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Importe */}
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Importe (€)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" min="0" placeholder="0.00" {...field} />
                  </FormControl>
                  <FormDescription>Importe total de la factura (IVA incluido)</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Proveedor */}
            <FormField
              control={form.control}
              name="providerId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Proveedor</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar proveedor" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {providers.map((provider) => (
                        <SelectItem key={provider.id} value={provider.id}>
                          {provider.name} ({provider.nif})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>Selecciona el proveedor de la factura</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Proyecto (opcional) */}
            <FormField
              control={form.control}
              name="projectId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Proyecto (opcional)</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value && field.value !== "" ? field.value : undefined}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sin proyecto asociado" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {projects
                        .filter((project) => !!project.id && project.id !== "")
                        .map((project) => (
                          <SelectItem key={project.id} value={project.id}>
                            {project.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>Asocia esta factura a un proyecto si corresponde.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Categoría */}
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Categoría</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar categoría" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                   {Array.isArray(categories) &&
  categories.map((category) => (
    <SelectItem key={category.id} value={category.id}>
      {category.name}
    </SelectItem>
  ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>Categoría del gasto</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Estado */}
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Estado</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar estado" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="pending">Pendiente</SelectItem>
                      <SelectItem value="recorded">Contabilizada</SelectItem>
                      <SelectItem value="rejected">Rechazada</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>Estado actual de la factura</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Subida de archivo */}
          <div className="space-y-4">
            <div>
              <FormLabel>Documento de factura</FormLabel>
              <div className="mt-2">
                <div className="flex items-center gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById("file-upload")?.click()}
                    disabled={fileUploading}
                    className="w-full md:w-auto"
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    {fileUploading ? "Subiendo..." : "Subir documento"}
                  </Button>
                  <input
                    id="file-upload"
                    type="file"
                    className="hidden"
                    accept=".pdf,.jpg,.jpeg,.png,.xml"
                    onChange={handleFileUpload}
                    disabled={fileUploading}
                  />
                  {uploadedFile && (
                    <div className="text-sm text-muted-foreground">
                      Documento subido:{" "}
                      <a
                        href={uploadedFile}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 underline"
                      >
                        Ver archivo
                      </a>
                    </div>
                  )}
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Formatos aceptados: PDF, JPG, PNG, XML. Tamaño máximo: 10MB
                </p>
              </div>
            </div>
          </div>

          {/* Botones de acción */}
          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                // Si estamos editando, volver a los detalles de la factura
                if (isEditing && invoice?.id) {
                  router.push(`/received-invoices/${invoice.id}`)
                } else {
                  // Si estamos creando, volver a la lista
                  router.push("/received-invoices")
                }
              }}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? isEditing
                  ? "Actualizando..."
                  : "Registrando..."
                : isEditing
                  ? "Actualizar factura"
                  : "Registrar factura"}
            </Button>
          </div>
        </form>
      </Form>

      <CriticalChangeNotice
        isOpen={showCriticalNotice}
        onClose={() => setShowCriticalNotice(false)}
        onConfirm={handleConfirmCriticalChange}
        entityType="provider"
        fieldName={watchProviderId !== originalValues.providerId ? "id" : ""}
      />
    </>
  )
}
