"use client"

import type React from "react"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { CalendarIcon, Upload, X, FileText } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { createProject, updateProject } from "@/app/(dashboard)/projects/actions"
import type { Project } from "@/app/db/schema"

// Esquema de validación
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ACCEPTED_FILE_TYPES = ["application/pdf"]

const projectFormSchema = z
  .object({
    name: z.string().min(1, "El nombre es obligatorio"),
    clientId: z.string().optional(),
    status: z.enum(["won", "lost", "pending"]),
    startDate: z.date().optional(),
    endDate: z.date().optional(),
    contract: z
      .any()
      .optional()
      .refine((file) => !file || !(file instanceof File) || file.size <= MAX_FILE_SIZE, {
        message: `El tamaño máximo del archivo es ${MAX_FILE_SIZE / 1024 / 1024}MB`,
      })
      .refine((file) => !file || !(file instanceof File) || ACCEPTED_FILE_TYPES.includes(file.type), {
        message: "Solo se permiten archivos PDF",
      }),
  })
  .refine(
    (data) => {
      if (data.startDate && data.endDate) {
        return data.startDate <= data.endDate
      }
      return true
    },
    {
      message: "La fecha de inicio debe ser anterior a la fecha de fin",
      path: ["endDate"],
    },
  )

type ProjectFormValues = z.infer<typeof projectFormSchema>

interface ProjectFormProps {
  clients: { id: string; name: string }[]
  project?: Project
}

export function ProjectForm({ clients, project }: ProjectFormProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [existingContractUrl, setExistingContractUrl] = useState(project?.contractUrl || null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const isEditing = !!project

  const defaultValues: Partial<ProjectFormValues> = {
    name: project?.name ?? "",
    clientId: project?.clientId?.toString() ?? "none",
    status: project?.status ?? "pending",
    startDate: project?.startDate ? new Date(project.startDate) : undefined,
    endDate: project?.endDate ? new Date(project.endDate) : undefined,
    contract: undefined,
  }

  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues,
  })

  const onSubmit = async (data: ProjectFormValues) => {
    setIsSubmitting(true)
    try {
      const formData = new FormData()
      formData.append("name", data.name)
      formData.append("status", data.status)
      if (data.clientId && data.clientId !== "none") formData.append("clientId", data.clientId)
      if (data.startDate) formData.append("startDate", data.startDate.toISOString())
      if (data.endDate) formData.append("endDate", data.endDate.toISOString())
      if (data.contract instanceof File) {
        formData.append("contract", data.contract)
      }

      const result = isEditing ? await updateProject(project.id, formData) : await createProject(formData)

      if (result.error) {
        toast({ title: "Error", description: result.error, variant: "destructive" })
      } else {
        toast({
          title: `Proyecto ${isEditing ? "actualizado" : "creado"}`,
          description: `El proyecto se ha ${isEditing ? "actualizado" : "creado"} correctamente.`,
        })
        router.push(`/projects/${result.id}`)
        router.refresh()
      }
    } catch (error) {
      console.error(`Error al ${isEditing ? "actualizar" : "crear"} el proyecto:`, error)
      toast({ title: "Error", description: `No se pudo ${isEditing ? "actualizar" : "crear"} el proyecto`, variant: "destructive" })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0]
      setSelectedFile(file)
      setExistingContractUrl(null)
      form.setValue("contract", file, { shouldValidate: true })
    }
  }

  const handleRemoveFile = () => {
    setSelectedFile(null)
    setExistingContractUrl(null)
    form.setValue("contract", undefined, { shouldValidate: true })
    if (fileInputRef.current) fileInputRef.current.value = ""
    toast({ title: "Contrato eliminado", description: "El contrato se eliminará al guardar los cambios." })
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Nombre del proyecto <span className="text-destructive">*</span>
              </FormLabel>
              <FormControl>
                <Input placeholder="Nombre del proyecto" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid gap-6 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="clientId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cliente</FormLabel>
                <Select onValueChange={field.onChange} value={field.value || "none"}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar cliente" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="none">Sin cliente</SelectItem>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>Opcional: Asociar este proyecto a un cliente</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Estado <span className="text-destructive">*</span>
                </FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar estado" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="pending">Pendiente</SelectItem>
                    <SelectItem value="won">Ganado</SelectItem>
                    <SelectItem value="lost">Perdido</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="startDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Fecha de inicio</FormLabel>
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
                </Popover>
                <FormDescription>Fecha en que comienza el proyecto</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="endDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Fecha de fin</FormLabel>
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
                </Popover>
                <FormDescription>Fecha estimada de finalización</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="space-y-2">
          <FormLabel>Contrato (PDF, máx 10MB)</FormLabel>
          <FormControl>
            <Input
              type="file"
              accept="application/pdf"
              onChange={handleFileChange}
              ref={fileInputRef}
              className="hidden"
              id="file-upload"
              disabled={isSubmitting}
            />
          </FormControl>

          {existingContractUrl ? (
            <div className="flex items-center justify-between rounded-md border p-3">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                <a
                  href={existingContractUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-primary hover:underline"
                >
                  Ver contrato actual
                </a>
              </div>
              <Button type="button" variant="ghost" size="icon" onClick={() => fileInputRef.current?.click()}>
                <Upload className="h-4 w-4" />
                <span className="sr-only">Reemplazar</span>
              </Button>
            </div>
          ) : selectedFile ? (
            <div className="flex items-center justify-between rounded-md border p-3">
              <span className="text-sm">{selectedFile.name}</span>
              <Button type="button" variant="ghost" size="icon" onClick={handleRemoveFile}>
                <X className="h-4 w-4" />
                <span className="sr-only">Eliminar</span>
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => fileInputRef.current?.click()}
              disabled={isSubmitting}
            >
              <Upload className="mr-2 h-4 w-4" />
              Subir contrato
            </Button>
          )}

          <FormMessage>{form.formState.errors.contract?.message}</FormMessage>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={() => router.back()} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting
              ? isEditing
                ? "Guardando..."
                : "Creando..."
              : isEditing
              ? "Guardar cambios"
              : "Crear proyecto"}
          </Button>
        </div>
      </form>
    </Form>
  )
}
