"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useFieldArray, useForm } from "react-hook-form"
import { z } from "zod"
import { CalendarIcon, Plus, Trash } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { createInvoice, updateInvoice } from "@/app/(dashboard)/invoices/actions"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent } from "@/components/ui/card"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger, PopoverPrimitive } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { Invoice, InvoiceLine, Client } from "@/app/db/schema"

// Esquema de validación para el formulario
const invoiceLineSchema = z.object({
  id: z.string().optional(),
  description: z.string().min(1, { message: "La descripción es obligatoria." }),
  quantity: z.coerce.number().min(1, { message: "La cantidad debe ser al menos 1." }),
  unitPrice: z.coerce.number().min(0, { message: "El precio unitario no puede ser negativo." }),
  taxRate: z.coerce.number().min(0, { message: "El impuesto no puede ser negativo." }),
})

const invoiceFormSchema = z.object({
  date: z.date({ required_error: "La fecha es obligatoria." }),
  dueDate: z.date({ required_error: "La fecha de vencimiento es obligatoria." }),
  clientId: z.string().min(1, { message: "El cliente es obligatorio." }),
  projectId: z.string().optional(),
  concept: z.string().min(1, { message: "El concepto es obligatorio." }),
  lines: z.array(invoiceLineSchema).min(1, { message: "Debe incluir al menos una línea." }),
})

type InvoiceFormValues = z.infer<typeof invoiceFormSchema>

// Props del componente con tipos estrictos
interface InvoiceFormProps {
  clients: (Omit<Client, "id"> & { id: string })[]
  projects?: { id: string; name: string }[]
  invoice?: Invoice & { lines: InvoiceLine[] }
}

// Función auxiliar para calcular la fecha de vencimiento
const getDueDate = (date: Date): Date => {
  const newDueDate = new Date(date)
  newDueDate.setDate(newDueDate.getDate() + 30)
  return newDueDate
}

export function InvoiceForm({ clients, projects = [], invoice }: InvoiceFormProps) {
  // DEBUG: Ver las props que recibe el componente
  console.log("[InvoiceForm] Props recibidas:", { clients, projects, invoice })

  const router = useRouter()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [subtotal, setSubtotal] = useState(0)
  const [taxTotal, setTaxTotal] = useState(0)
  const [total, setTotal] = useState(0)

  const isEditing = !!invoice

  // Valores por defecto para el formulario
  const defaultValues: Partial<InvoiceFormValues> = {
    date: invoice ? new Date(invoice.date) : new Date(),
    dueDate: invoice ? new Date(invoice.dueDate) : getDueDate(new Date()),
    clientId: invoice?.clientId?.toString() || "",
    projectId: invoice?.projectId?.toString() || undefined,
    concept: invoice?.concept || "",
    lines:
      invoice?.lines && invoice.lines.length > 0
        ? invoice.lines.map((line) => ({
            id: line.id.toString(),
            description: line.description,
            quantity: line.quantity,
            unitPrice: Number(line.unitPrice),
            taxRate: Number(line.taxRate),
          }))
        : [{ description: "", quantity: 1, unitPrice: 0, taxRate: 21 }],
  }

  const form = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues,
    mode: "all",
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
    if (watchedDate && !isEditing) {
      form.setValue("dueDate", getDueDate(watchedDate))
    }
  }, [watchedDate, form, isEditing])

  // Efecto para calcular los totales de la factura
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
    // Usamos JSON.stringify para forzar la detección de cambios en el array
  }, [JSON.stringify(watchedLines)])

  // Función para enviar el formulario
  async function onSubmit(data: InvoiceFormValues) {
    setIsSubmitting(true)
    const dataForAction = {
      ...data,
      lines: data.lines.map((line) => ({
        ...line,
        total: (line.quantity || 0) * (line.unitPrice || 0),
      })),
    }

    try {
      const result = isEditing 
        ? await updateInvoice(invoice.id, dataForAction)
        : await createInvoice(dataForAction)

      if (result.success) {
        toast({
          title: `Factura ${isEditing ? "actualizada" : "creada"}`,
          description: `La factura se ha ${isEditing ? "actualizado" : "creado"} correctamente.`,
        })
        router.push(`/invoices/${result.invoiceId}`)
        router.refresh() // Forzar actualización de la página anterior
      } else {
        toast({ variant: "destructive", title: "Error", description: result.error })
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Ocurrió un error inesperado." })
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(amount)

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Fecha de Emisión */}
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
                        {field.value ? format(field.value, "PPP", { locale: es }) : <span>Seleccionar fecha</span>}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverPrimitive.Portal>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) => date < new Date("1900-01-01")}
                        initialFocus
                        locale={es}
                      />
                    </PopoverContent>
                  </PopoverPrimitive.Portal>
                </Popover>
                <FormDescription>Fecha en la que se crea la factura.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Fecha de Vencimiento */}
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
                        {field.value ? format(field.value, "PPP", { locale: es }) : <span>Seleccionar fecha</span>}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverPrimitive.Portal>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus locale={es} />
                    </PopoverContent>
                  </PopoverPrimitive.Portal>
                </Popover>
                <FormDescription>Fecha límite para el pago de la factura.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Cliente */}
          <FormField
            control={form.control}
            name="clientId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cliente</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar un cliente" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>Cliente al que se emite la factura.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Proyecto (opcional) */}
          <FormField
            control={form.control}
            name="projectId"
            render={({ field }) => {
              console.log("[InvoiceForm] Valor actual de projectId:", field.value)
              return (
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
              )
            }}
          />
        </div>

        {/* Concepto */}
        <FormField
          control={form.control}
          name="concept"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Concepto</FormLabel>
              <FormControl>
                <Input placeholder="Ej: Desarrollo de página web" {...field} />
              </FormControl>
              <FormDescription>Concepto general de la factura.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Líneas de factura */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Líneas de factura</h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append({ description: "", quantity: 1, unitPrice: 0, taxRate: 21 })}
            >
              <Plus className="mr-2 h-4 w-4" />
              Añadir línea
            </Button>
          </div>

          {fields.length === 0 ? (
            <p className="text-sm text-muted-foreground">Añade al menos una línea de factura.</p>
          ) : (
            <div className="space-y-4">
              {fields.map((field, index) => (
                <Card key={field.id}>
                  <CardContent className="pt-6">
                    <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-5">
                      <FormField
                        control={form.control}
                        name={`lines.${index}.description`}
                        render={({ field }) => (
                          <FormItem className="md:col-span-2">
                            <FormLabel>Descripción</FormLabel>
                            <FormControl>
                              <Input placeholder="Producto o servicio" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`lines.${index}.quantity`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Cantidad</FormLabel>
                            <FormControl>
                              <Input type="number" min={1} {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`lines.${index}.unitPrice`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Precio (€)</FormLabel>
                            <FormControl>
                              <Input type="number" step="0.01" min="0" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`lines.${index}.taxRate`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>IVA (%)</FormLabel>
                            <Select
                              onValueChange={(value) => form.setValue(`lines.${index}.taxRate`, Number(value))}
                              defaultValue={field.value.toString()}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="21">21%</SelectItem>
                                <SelectItem value="10">10%</SelectItem>
                                <SelectItem value="4">4%</SelectItem>
                                <SelectItem value="0">0%</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="mt-4 flex justify-between">
                      <div className="text-sm">
                        Total Línea:{" "}
                        <span className="font-semibold">
                          {formatCurrency(
                            (Number(watchedLines[index]?.quantity) || 0) * (Number(watchedLines[index]?.unitPrice) || 0),
                          )}
                        </span>
                      </div>
                      {fields.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:bg-destructive/10"
                          onClick={() => remove(index)}
                        >
                          <Trash className="mr-2 h-4 w-4" />
                          Eliminar
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Resumen de totales */}
        <div className="flex justify-end">
          <div className="w-full max-w-sm rounded-lg border p-4">
            <h3 className="mb-4 text-lg font-medium">Resumen</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>Impuestos</span>
                <span>{formatCurrency(taxTotal)}</span>
              </div>
              <div className="flex justify-between border-t pt-2 text-lg font-bold">
                <span>Total</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Botones de acción */}
        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => router.back()} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting
              ? isEditing
                ? "Actualizando..."
                : "Creando..."
              : isEditing
              ? "Guardar cambios"
              : "Crear factura"}
          </Button>
        </div>
      </form>
    </Form>
  )
}
