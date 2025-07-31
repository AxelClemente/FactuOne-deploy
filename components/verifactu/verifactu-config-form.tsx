"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Save } from "lucide-react"
import { getVerifactuConfig, updateVerifactuConfig } from "@/app/(dashboard)/verifactu/actions"

const formSchema = z.object({
  enabled: z.boolean(),
  mode: z.enum(["verifactu", "requerimiento"]),
  environment: z.enum(["production", "testing"]),
  autoSubmit: z.boolean(),
  includeInPdf: z.boolean(),
  flowControlSeconds: z.number().min(60).max(3600),
  maxRecordsPerSubmission: z.number().min(1).max(1000),
})

type FormData = z.infer<typeof formSchema>

interface VerifactuConfigFormProps {
  businessId: string
}

export function VerifactuConfigForm({ businessId }: VerifactuConfigFormProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const { toast } = useToast()
  
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      enabled: false,
      mode: "verifactu",
      environment: "testing",
      autoSubmit: true,
      includeInPdf: true,
      flowControlSeconds: 60,
      maxRecordsPerSubmission: 100,
    },
  })

  useEffect(() => {
    async function loadConfig() {
      try {
        const config = await getVerifactuConfig()
        if (config) {
          form.reset({
            enabled: config.enabled,
            mode: config.mode,
            environment: config.environment,
            autoSubmit: config.autoSubmit,
            includeInPdf: config.includeInPdf,
            flowControlSeconds: config.flowControlSeconds,
            maxRecordsPerSubmission: config.maxRecordsPerSubmission,
          })
        }
      } catch (error) {
        toast({
          title: "Error",
          description: "No se pudo cargar la configuración",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }
    
    loadConfig()
  }, [form, toast])

  async function onSubmit(data: FormData) {
    setIsSaving(true)
    
    try {
      const result = await updateVerifactuConfig(data)
      
      if (result.success) {
        toast({
          title: "Configuración actualizada",
          description: "Los cambios se han guardado correctamente",
        })
      } else {
        toast({
          title: "Error",
          description: result.error || "No se pudo actualizar la configuración",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Error al guardar la configuración",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="enabled"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">
                  Activar VERI*FACTU
                </FormLabel>
                <FormDescription>
                  Habilitar el sistema de facturación verificable
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="mode"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Modo de operación</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona el modo" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="verifactu">
                    VERI*FACTU (Envío voluntario)
                  </SelectItem>
                  <SelectItem value="requerimiento">
                    Por requerimiento
                  </SelectItem>
                </SelectContent>
              </Select>
              <FormDescription>
                VERI*FACTU permite la verificación inmediata de facturas
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="environment"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Entorno</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona el entorno" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="testing">Pruebas</SelectItem>
                  <SelectItem value="production">Producción</SelectItem>
                </SelectContent>
              </Select>
              <FormDescription>
                Usa el entorno de pruebas para validar tu implementación
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="flowControlSeconds"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Segundos entre envíos</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  {...field}
                  onChange={(e) => field.onChange(parseInt(e.target.value))}
                />
              </FormControl>
              <FormDescription>
                Tiempo mínimo de espera entre envíos a la AEAT (60-3600 segundos)
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="maxRecordsPerSubmission"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Registros por envío</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  {...field}
                  onChange={(e) => field.onChange(parseInt(e.target.value))}
                />
              </FormControl>
              <FormDescription>
                Número máximo de registros por envío (1-1000)
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="autoSubmit"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">
                  Envío automático
                </FormLabel>
                <FormDescription>
                  Enviar automáticamente los registros a la AEAT
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="includeInPdf"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">
                  Incluir en PDF
                </FormLabel>
                <FormDescription>
                  Incluir código QR y leyenda VERI*FACTU en los PDFs
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <Button type="submit" disabled={isSaving}>
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Guardando...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Guardar configuración
            </>
          )}
        </Button>
      </form>
    </Form>
  )
}