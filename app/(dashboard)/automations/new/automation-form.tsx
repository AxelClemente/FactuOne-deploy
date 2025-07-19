'use client';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";
import { Repeat, Plus, Trash } from "lucide-react";
import { createAutomation as createAutomationAction, updateAutomation as updateAutomationAction } from "@/app/(dashboard)/automations/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Client, Project, Bank } from "@/app/db/schema";
import { PaymentMethodSelector } from "@/components/ui/payment-method-selector";

// Esquema de validación para las líneas de automatización
const automationLineSchema = z.object({
  id: z.string().optional(),
  description: z.string().min(1, { message: "La descripción es obligatoria." }),
  quantity: z.coerce.number().min(1, { message: "La cantidad debe ser al menos 1." }),
  unitPrice: z.coerce.number().min(0, { message: "El precio unitario no puede ser negativo." }),
  taxRate: z.coerce.number().min(0, { message: "El impuesto no puede ser negativo." }),
});

// Esquema de validación para el formulario de automatización
const automationFormSchema = z.object({
  clientId: z.string().min(1, { message: "El cliente es obligatorio." }),
  projectId: z.string().optional(),
  concept: z.string().min(1, { message: "El concepto es obligatorio." }),
  lines: z.array(automationLineSchema).min(1, { message: "Debe incluir al menos una línea." }),
  frequency: z.enum(["day", "month", "year"], { required_error: "La frecuencia es obligatoria." }),
  interval: z.coerce.number().min(1, { message: "El intervalo debe ser al menos 1." }),
  startDate: z.string().min(1, { message: "La fecha de inicio es obligatoria." }),
  timeOfDay: z.string().min(1, { message: "La hora es obligatoria." }),
  maxOccurrences: z.string().optional(),
  isActive: z.boolean().default(true),
});

type AutomationFormValues = z.infer<typeof automationFormSchema>;

// Props del componente
interface AutomationFormProps {
  clients: (Omit<Client, "id"> & { id: string })[];
  projects?: { id: string; name: string }[];
  banks?: Bank[];
  automation?: any;
}

export function AutomationForm({ clients, projects = [], banks = [], automation }: AutomationFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [subtotal, setSubtotal] = useState(0);
  const [taxTotal, setTaxTotal] = useState(0);
  const [total, setTotal] = useState(0);

  // Estado para método de pago
  const [paymentMethod, setPaymentMethod] = useState<"bank" | "bizum" | "cash" | null>(automation?.paymentMethod || null)
  const [selectedBankId, setSelectedBankId] = useState<string | null>(automation?.bankId || null)
  const [bizumHolder, setBizumHolder] = useState(automation?.bizumHolder || "")
  const [bizumNumber, setBizumNumber] = useState(automation?.bizumNumber || "")

  const isEditing = !!automation;

  // Valores por defecto para el formulario
  const defaultValues: Partial<AutomationFormValues> = {
    clientId: automation?.clientId || "",
    projectId: automation?.projectId || undefined,
    concept: automation?.concept || "",
    lines: automation?.lines && automation.lines.length > 0
      ? automation.lines.map((line: any) => ({
          id: line.id?.toString(),
          description: line.description,
          quantity: line.quantity,
          unitPrice: Number(line.unitPrice),
          taxRate: Number(line.taxRate),
        }))
      : [{ description: "", quantity: 1, unitPrice: 0, taxRate: 21 }],
    frequency: automation?.frequency || "month",
    interval: automation?.interval || 1,
    startDate: automation?.startDate || new Date().toISOString().split('T')[0],
    timeOfDay: automation?.timeOfDay || "09:00",
    maxOccurrences: automation?.maxOccurrences ? automation.maxOccurrences.toString() : "",
    isActive: automation ? automation.isActive : true,
  };

  const form = useForm<AutomationFormValues>({
    resolver: zodResolver(automationFormSchema),
    defaultValues,
    mode: "all",
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "lines",
  });

  // Watchers para cálculos dinámicos
  const watchedLines = form.watch("lines");

  // Efecto para calcular los totales de la automatización
  useEffect(() => {
    const newSubtotal = watchedLines.reduce((acc, line) => {
      const quantity = Number(line.quantity) || 0;
      const unitPrice = Number(line.unitPrice) || 0;
      return acc + quantity * unitPrice;
    }, 0);

    const newTaxTotal = watchedLines.reduce((acc, line) => {
      const quantity = Number(line.quantity) || 0;
      const unitPrice = Number(line.unitPrice) || 0;
      const taxRate = Number(line.taxRate) || 0;
      const lineSubtotal = quantity * unitPrice;
      return acc + lineSubtotal * (taxRate / 100);
    }, 0);

    setSubtotal(newSubtotal);
    setTaxTotal(newTaxTotal);
    setTotal(newSubtotal + newTaxTotal);
  }, [JSON.stringify(watchedLines)]);

  // Función para enviar el formulario
  async function onSubmit(data: AutomationFormValues) {
    setIsSubmitting(true);
    
    const formData = new FormData();
    formData.append("clientId", data.clientId);
    if (data.projectId) formData.append("projectId", data.projectId);
    formData.append("concept", data.concept);
    formData.append("frequency", data.frequency);
    formData.append("interval", data.interval.toString());
    formData.append("startDate", data.startDate);
    formData.append("timeOfDay", data.timeOfDay);
    if (data.maxOccurrences && data.maxOccurrences.trim() !== "") formData.append("maxOccurrences", data.maxOccurrences);
    formData.append("isActive", data.isActive.toString());
    formData.append("amount", total.toString());
    
    // Agregar datos del método de pago
    if (paymentMethod) formData.append("paymentMethod", paymentMethod);
    if (selectedBankId) formData.append("bankId", selectedBankId);
    if (bizumHolder) formData.append("bizumHolder", bizumHolder);
    if (bizumNumber) formData.append("bizumNumber", bizumNumber);
    
    // Agregar líneas como JSON
    const linesData = data.lines.map((line) => ({
      ...line,
      total: (line.quantity || 0) * (line.unitPrice || 0),
    }));
    formData.append("lines", JSON.stringify(linesData));

    try {
      const result = isEditing 
        ? await updateAutomationAction(automation.id, { success: null, error: null }, formData)
        : await createAutomationAction({ success: null, error: null }, formData);

      if (result.success) {
        toast({
          title: `Automatización ${isEditing ? "actualizada" : "creada"}`,
          description: `La automatización se ha ${isEditing ? "actualizado" : "creado"} correctamente.`,
        });
        router.push("/automations");
        router.refresh();
      } else {
        toast({ variant: "destructive", title: "Error", description: result.error });
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Ocurrió un error inesperado." });
    } finally {
      setIsSubmitting(false);
    }
  }

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(amount);

  return (
    <div className="w-full py-8">
      <h1 className="text-2xl font-bold flex items-center gap-2 mb-6">
        <Repeat className="w-6 h-6" />
        {isEditing ? "Editar automatización" : "Nueva automatización"}
      </h1>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          {/* Información básica */}
          <Card>
            <CardHeader>
              <CardTitle>Información básica</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="clientId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cliente *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona un cliente" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {clients.map((client) => (
                            <SelectItem key={client.id} value={client.id}>
                              {client.name} ({client.nif})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="projectId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Proyecto</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona un proyecto (opcional)" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {projects.map((project) => (
                            <SelectItem key={project.id} value={project.id}>
                              {project.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="concept"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Concepto *</FormLabel>
                    <FormControl>
                      <Input placeholder="Concepto de la factura" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Método de Pago */}
          <Card>
            <CardHeader>
              <CardTitle>Método de Pago</CardTitle>
              <FormDescription>
                Define el método de pago que se aplicará a las facturas automáticas.
              </FormDescription>
            </CardHeader>
            <CardContent>
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
            </CardContent>
          </Card>

          {/* Líneas de factura */}
          <Card>
            <CardHeader>
              <CardTitle>Líneas de factura</CardTitle>
              <FormDescription>
                Define los productos o servicios que se incluirán en cada factura automática.
              </FormDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {fields.map((field, index) => (
                <div key={field.id} className="grid gap-4 p-4 border rounded-lg">
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <FormField
                      control={form.control}
                      name={`lines.${index}.description`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Descripción *</FormLabel>
                          <FormControl>
                            <Input placeholder="Descripción del producto/servicio" {...field} />
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
                          <FormLabel>Cantidad *</FormLabel>
                          <FormControl>
                            <Input type="number" min="1" step="0.01" placeholder="1" {...field} />
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
                          <FormLabel>Precio unitario (€) *</FormLabel>
                          <FormControl>
                            <Input type="number" min="0" step="0.01" placeholder="0.00" {...field} />
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
                          <FormLabel>IVA (%) *</FormLabel>
                          <FormControl>
                            <Input type="number" min="0" step="0.01" placeholder="21" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {fields.length > 1 && (
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => remove(index)}
                      className="w-fit"
                    >
                      <Trash className="w-4 h-4 mr-2" />
                      Eliminar línea
                    </Button>
                  )}
                </div>
              ))}

              <Button
                type="button"
                variant="outline"
                onClick={() => append({ description: "", quantity: 1, unitPrice: 0, taxRate: 21 })}
              >
                <Plus className="w-4 h-4 mr-2" />
                Agregar línea
              </Button>
            </CardContent>
          </Card>

          {/* Resumen */}
          <Card>
            <CardHeader>
              <CardTitle>Resumen</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>IVA:</span>
                  <span>{formatCurrency(taxTotal)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg border-t pt-2">
                  <span>Total:</span>
                  <span>{formatCurrency(total)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Configuración de automatización */}
          <Card>
            <CardHeader>
              <CardTitle>Configuración de automatización</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="frequency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Frecuencia *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona la frecuencia" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="day">Días</SelectItem>
                          <SelectItem value="month">Meses</SelectItem>
                          <SelectItem value="year">Años</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="interval"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Intervalo *</FormLabel>
                      <FormControl>
                        <Input type="number" min="1" placeholder="1" {...field} />
                      </FormControl>
                      <FormDescription>
                        Cada cuántos días/meses/años se emitirá la factura
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fecha de inicio *</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="timeOfDay"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hora de emisión *</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="maxOccurrences"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nº máximo de repeticiones</FormLabel>
                      <FormControl>
                        <Input type="number" min="1" placeholder="Dejar vacío para indefinido" {...field} />
                      </FormControl>
                      <FormDescription>
                        Dejar vacío para que la automatización sea indefinida
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <input
                          type="checkbox"
                          checked={field.value}
                          onChange={field.onChange}
                          className="mt-1"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Activa</FormLabel>
                        <FormDescription>
                          La automatización se ejecutará solo si está activa
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Botones de acción */}
          <div className="flex justify-end gap-2">
            <a href="/automations">
              <Button type="button" variant="outline">Cancelar</Button>
            </a>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (isEditing ? "Guardando..." : "Creando...") : isEditing ? "Guardar cambios" : "Crear automatización"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
} 