"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, useFieldArray } from "react-hook-form"
import { z } from "zod"
import { CalendarIcon, Upload, Trash } from "lucide-react"
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
import { PaymentMethodSelector } from "@/components/ui/payment-method-selector"
import { Bank } from "@/app/db/schema"

// Esquema de validación para línea de factura recibida
const receivedInvoiceLineSchema = z.object({
  description: z.string().min(1, { message: "La descripción es obligatoria." }),
  quantity: z.coerce.number().min(1, { message: "La cantidad debe ser al menos 1." }),
  unitPrice: z.coerce.number().min(0, { message: "El precio unitario no puede ser negativo." }),
  taxRate: z.coerce.number().min(0, { message: "El impuesto no puede ser negativo." }),
})

// Función auxiliar para calcular la fecha de vencimiento
const getDueDate = (date: Date): Date => {
  const newDueDate = new Date(date)
  newDueDate.setDate(newDueDate.getDate() + 30)
  return newDueDate
}

// Esquema de validación actualizado
const receivedInvoiceFormSchema = z.object({
  date: z.date({ required_error: "La fecha es obligatoria" }),
  dueDate: z.date({ required_error: "La fecha de vencimiento es obligatoria" }),
  providerId: z.string().min(1, { message: "Selecciona un proveedor" }),
  status: z.enum(["pending", "recorded", "rejected"], {
    required_error: "El estado es obligatorio",
  }),
  category: z.string().optional(),
  fileUrl: z.string().optional(),
  projectId: z.string().optional(),
  lines: z.array(receivedInvoiceLineSchema).min(1, { message: "Debe incluir al menos una línea." }),
})

type ReceivedInvoiceFormValues = z.infer<typeof receivedInvoiceFormSchema>

interface ReceivedInvoiceFormProps {
  categories: { id: string; name: string }[]
  providers: { id: string; name: string; nif: string }[]
  projects?: { id: string; name: string }[]
  banks?: Bank[]
  invoice?: any
}

export function ReceivedInvoiceForm({ categories, providers, projects = [], banks = [], invoice }: ReceivedInvoiceFormProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [fileUploading, setFileUploading] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<string | null>(invoice?.fileUrl || null)
  const [showCriticalNotice, setShowCriticalNotice] = useState(false)
  const [pendingFormData, setPendingFormData] = useState<ReceivedInvoiceFormValues | null>(null)

  // Estado para método de pago
  const [paymentMethod, setPaymentMethod] = useState<"bank" | "bizum" | "cash" | null>(invoice?.paymentMethod || null)
  const [selectedBankId, setSelectedBankId] = useState<string | null>(invoice?.bankId || null)
  const [bizumHolder, setBizumHolder] = useState(invoice?.bizumHolder || "")
  const [bizumNumber, setBizumNumber] = useState(invoice?.bizumNumber || "")

  const isEditing = !!invoice

  // Guardar los valores originales para comparación
  const [originalValues, setOriginalValues] = useState({
    providerId: invoice?.providerId || "",
  })

  // Valores por defecto para el formulario
  const defaultValues: Partial<ReceivedInvoiceFormValues> = {
    date: invoice ? new Date(invoice.date) : new Date(),
    dueDate: invoice ? new Date(invoice.dueDate) : getDueDate(new Date()),
    providerId: invoice?.providerId || "",
    status: invoice?.status || "pending",
    category: invoice?.category || "",
    fileUrl: invoice?.fileUrl || "",
    projectId: invoice?.projectId || undefined,
    lines:
      invoice?.lines && invoice.lines.length > 0
        ? invoice.lines.map((line: any) => ({
            description: line.description,
            quantity: line.quantity,
            unitPrice: Number(line.unitPrice),
            taxRate: Number(line.taxRate),
          }))
        : [{ description: "", quantity: 1, unitPrice: 0, taxRate: 21 }],
  }

  // Inicializar el formulario
  const form = useForm<ReceivedInvoiceFormValues>({
    resolver: zodResolver(receivedInvoiceFormSchema),
    defaultValues,
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "lines",
  })

  // Watchers para cálculos dinámicos
  const watchedLines = form.watch("lines")
  const watchedDate = form.watch("date")

  // Efecto para actualizar la fecha de vencimiento automáticamente
  useEffect(() => {
    if (watchedDate && !invoice) {
      form.setValue("dueDate", getDueDate(watchedDate))
    }
  }, [watchedDate, form, invoice])

  // Efecto para calcular los totales de la factura
  const [subtotal, setSubtotal] = useState(0)
  const [taxTotal, setTaxTotal] = useState(0)
  const [total, setTotal] = useState(0)
  useEffect(() => {
    const newSubtotal = watchedLines.reduce((acc, line) => {
      const quantity = Number(line.quantity) || 0
      const unitPrice = Number(line.unitPrice) || 0
      return acc + quantity * unitPrice
    }, 0)
    const newTaxTotal = watchedLines.reduce((acc, line) => {
      const quantity = Number(line.quantity) || 0
      const unitPrice = Number(line.unitPrice) || 0
      const taxRate = Number(line.taxRate) || 0
      const lineSubtotal = quantity * unitPrice
      return acc + lineSubtotal * (taxRate / 100)
    }, 0)
    setSubtotal(newSubtotal)
    setTaxTotal(newTaxTotal)
    setTotal(newSubtotal + newTaxTotal)
  }, [JSON.stringify(watchedLines)])

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
      const dataForAction = {
        ...data,
        amount: subtotal + taxTotal,
        taxAmount: taxTotal,
        lines: data.lines.map((line) => ({
          ...line,
          total: (line.quantity || 0) * (line.unitPrice || 0),
        })),
        // Datos del método de pago
        paymentMethod,
        bankId: selectedBankId,
        bizumHolder,
        bizumNumber,
      }
      if (isEditing) {
        // Actualizar factura existente
        const result = await updateReceivedInvoice(invoice.id, dataForAction)

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
        const result = await createReceivedInvoice(dataForAction)

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
            {/* Fecha de emisión */}
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
            {/* Fecha de vencimiento */}
            <FormField
              control={form.control}
              name="dueDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Fecha de vencimiento</FormLabel>
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
                        disabled={(date) => date < form.getValues("date")}
                        initialFocus
                        locale={es}
                      />
                    </PopoverContent>
                  </Popover>
                  <FormDescription>Fecha límite para el pago de la factura</FormDescription>
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

          {/* Método de Pago */}
          <PaymentMethodSelector
            value={paymentMethod}
            onValueChange={setPaymentMethod}
            banks={banks}
            selectedBankId={selectedBankId}
            onBankChange={setSelectedBankId}
            bizumHolder={bizumHolder}
            onBizumHolderChange={setBizumHolder}
            bizumNumber={bizumNumber}
            onBizumNumberChange={setBizumNumber}
          />

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

          {/* Líneas de factura y Resumen */}
          <div className="mt-8 flex flex-col lg:flex-row gap-8 items-start">
            <div className="flex-1 w-full">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold">Líneas de factura</h3>
                <Button type="button" variant="outline" onClick={() => append({ description: "", quantity: 1, unitPrice: 0, taxRate: 21 })}>
                  + Añadir línea
                </Button>
              </div>
              <div className="rounded-md border p-4 bg-white">
                <div className="grid grid-cols-12 gap-2 items-end font-semibold mb-2">
                  <div className="col-span-4">Descripción</div>
                  <div className="col-span-2">Cantidad</div>
                  <div className="col-span-2">Precio (€)</div>
                  <div className="col-span-2">IVA (%)</div>
                  <div className="col-span-1 text-right"></div>
                </div>
                {fields.map((field, idx) => (
                  <div key={field.id} className="grid grid-cols-12 gap-2 items-end mb-2">
                    <div className="col-span-4">
                      <FormField
                        control={form.control}
                        name={`lines.${idx}.description`}
                        render={({ field }) => (
                          <FormItem className="w-full">
                            <FormControl>
                              <Input {...field} placeholder="Producto o servicio" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="col-span-2">
                      <FormField
                        control={form.control}
                        name={`lines.${idx}.quantity`}
                        render={({ field }) => (
                          <FormItem className="w-full">
                            <FormControl>
                              <Input type="number" min={1} {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="col-span-2">
                      <FormField
                        control={form.control}
                        name={`lines.${idx}.unitPrice`}
                        render={({ field }) => (
                          <FormItem className="w-full">
                            <FormControl>
                              <Input type="number" min={0} step={0.01} {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="col-span-2">
                      <FormField
                        control={form.control}
                        name={`lines.${idx}.taxRate`}
                        render={({ field }) => (
                          <FormItem className="w-full">
                            <FormControl>
                              <Input type="number" min={0} max={100} step={1} {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="col-span-1 flex justify-end">
                      <Button type="button" variant="ghost" onClick={() => remove(idx)}><Trash /></Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {/* Resumen a la derecha en un card */}
            <div className="w-full lg:w-80">
              <div className="rounded-md border p-6 bg-white">
                <h3 className="text-lg font-semibold mb-2">Resumen</h3>
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground text-sm">Subtotal</span>
                    <span className="font-semibold">{subtotal.toLocaleString("es-ES", { style: "currency", currency: "EUR" })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground text-sm">Impuestos</span>
                    <span className="font-semibold">{taxTotal.toLocaleString("es-ES", { style: "currency", currency: "EUR" })}</span>
                  </div>
                  <div className="flex justify-between mt-2 border-t pt-2">
                    <span className="font-bold text-lg">Total</span>
                    <span className="font-bold text-lg">{total.toLocaleString("es-ES", { style: "currency", currency: "EUR" })}</span>
                  </div>
                </div>
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
