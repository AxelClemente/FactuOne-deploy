"use client"
import { useState, useEffect } from "react"
import { getInvoicesForProject } from "@/app/(dashboard)/invoices/actions"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { useRouter } from "next/navigation"

interface ProjectInvoicesCardProps {
  projectId: string
}

export function ProjectInvoicesCard({ projectId }: ProjectInvoicesCardProps) {
  const [tab, setTab] = useState<"number" | "concept" | "total">("number")
  const [search, setSearch] = useState("")
  const [invoices, setInvoices] = useState<any[]>([])
  const [notFound, setNotFound] = useState(false)
  const router = useRouter()

  useEffect(() => {
    async function fetchInvoices() {
      setNotFound(false)
      console.log('[ProjectInvoicesCard] Buscando facturas:', { projectId, search, filterBy: tab })
      const result = await getInvoicesForProject({ projectId, search, filterBy: tab })
      console.log('[ProjectInvoicesCard] Resultado de facturas:', result)
      setInvoices(result)
    }
    fetchInvoices()
  }, [projectId, search, tab])

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (tab === "number" && e.key === "Enter") {
      console.log('[ProjectInvoicesCard] Enter pressed. Search:', search)
      console.log('[ProjectInvoicesCard] Invoices:', invoices)
      const exact = invoices.find(inv => inv.number.toLowerCase() === search.trim().toLowerCase())
      console.log('[ProjectInvoicesCard] Exact match:', exact)
      if (exact) {
        setNotFound(false)
        router.push(`/invoices/${exact.id}`)
      } else {
        setNotFound(true)
      }
    }
    if (tab === "total" && e.key === "Enter") {
      console.log('[ProjectInvoicesCard] Enter pressed (total). Search:', search)
      console.log('[ProjectInvoicesCard] Invoices:', invoices)
      if (invoices.length === 1) {
        setNotFound(false)
        console.log('[ProjectInvoicesCard] Redirecting to invoice:', invoices[0])
        router.push(`/invoices/${invoices[0].id}`)
      } else if (invoices.length === 0) {
        setNotFound(true)
        console.log('[ProjectInvoicesCard] No invoice found for total')
      }
    }
  }

  console.log('[ProjectInvoicesCard] Render:', { search, tab, invoices })

  return (
    <div className="rounded-md border p-4">
      <h3 className="text-lg font-medium mb-2">Facturas relacionadas</h3>
      <Tabs value={tab} onValueChange={v => setTab(v as any)} className="mb-4">
        <TabsList>
          <TabsTrigger value="number">Número</TabsTrigger>
          {/* <TabsTrigger value="concept">Concepto</TabsTrigger> */}
          <TabsTrigger value="total">Monto</TabsTrigger>
        </TabsList>
      </Tabs>
      <Input
        placeholder={`Buscar por ${tab === "number" ? "número" : tab === "concept" ? "concepto" : "monto"}`}
        value={search}
        onChange={e => setSearch(e.target.value)}
        onKeyDown={handleInputKeyDown}
        className="mb-4"
      />
      <Select onValueChange={id => router.push(`/invoices/${id}`)}>
        <SelectTrigger>
          <SelectValue placeholder="Selecciona una factura" />
        </SelectTrigger>
        <SelectContent>
          {invoices.length === 0 ? null : (
            invoices.map(inv => (
              <SelectItem key={inv.id} value={inv.id}>
                #{inv.number} · {inv.concept} · {Number(inv.total).toLocaleString("es-ES", { style: "currency", currency: "EUR" })}
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>
      {invoices.length === 0 && (
        <div className="text-muted-foreground text-sm mt-2">No hay facturas</div>
      )}
      {notFound && (
        <div className="text-destructive text-sm mt-2">Factura no encontrada</div>
      )}
    </div>
  )
} 