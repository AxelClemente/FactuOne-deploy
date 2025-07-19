"use client"

import { useState, useEffect } from "react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { Bank } from "@/app/db/schema"

interface PaymentMethodSelectorProps {
  value?: "bank" | "bizum" | "cash" | null
  onValueChange: (value: "bank" | "bizum" | "cash" | null) => void
  banks: Bank[]
  selectedBankId?: string | null
  onBankChange: (bankId: string | null) => void
  bizumHolder?: string
  onBizumHolderChange: (holder: string) => void
  bizumNumber?: string
  onBizumNumberChange: (number: string) => void
}

export function PaymentMethodSelector({
  value,
  onValueChange,
  banks,
  selectedBankId,
  onBankChange,
  bizumHolder,
  onBizumHolderChange,
  bizumNumber,
  onBizumNumberChange,
}: PaymentMethodSelectorProps) {
  // DEBUG: Logs para verificar los valores recibidos
  console.log("[PaymentMethodSelector] Props recibidas:", {
    value,
    selectedBankId,
    banks: banks.length,
    bizumHolder,
    bizumNumber
  })
  console.log("[PaymentMethodSelector] Bancos disponibles:", banks.map(b => ({ id: b.id, name: b.bankName })))
  console.log("[PaymentMethodSelector] selectedBankId coincide con algún banco:", banks.some(b => b.id === selectedBankId))

  const [showBizumFields, setShowBizumFields] = useState(false)
  const [showBankSelector, setShowBankSelector] = useState(false)

  useEffect(() => {
    setShowBizumFields(value === "bizum")
    setShowBankSelector(value === "bank")
  }, [value])

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="paymentMethod">Método de Pago</Label>
        <Select value={value || "none"} onValueChange={(val) => onValueChange(val === "none" ? null : val as "bank" | "bizum" | "cash")}>
          <SelectTrigger>
            <SelectValue placeholder="Selecciona el método de pago" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Sin método de pago</SelectItem>
            <SelectItem value="bank">Banco</SelectItem>
            <SelectItem value="bizum">Bizum</SelectItem>
            <SelectItem value="cash">Efectivo</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Selector de Banco */}
      {showBankSelector && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <Label htmlFor="bankSelect">Seleccionar Banco</Label>
              <Select value={selectedBankId || "none"} onValueChange={(val) => onBankChange(val === "none" ? null : val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un banco" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Selecciona un banco</SelectItem>
                  {banks.map((bank) => (
                    <SelectItem key={bank.id} value={bank.id}>
                      {bank.bankName} - {bank.accountHolder}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedBankId && selectedBankId !== "none" && (
                <div className="mt-2 p-3 bg-muted rounded-md text-sm text-muted-foreground">
                  {(() => {
                    const selectedBank = banks.find(b => b.id === selectedBankId)
                    return selectedBank ? (
                      <div className="space-y-1">
                        <p>{selectedBank.accountHolder}</p>
                        <p>{selectedBank.accountNumber}</p>
                        <p>{selectedBank.nif}</p>
                      </div>
                    ) : null
                  })()}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Campos de Bizum */}
      {showBizumFields && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="bizumHolder">Titular del Bizum *</Label>
                <Input
                  id="bizumHolder"
                  value={bizumHolder || ""}
                  onChange={(e) => onBizumHolderChange(e.target.value)}
                  placeholder="Ej: Juan Pérez"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bizumNumber">Número de Teléfono *</Label>
                <Input
                  id="bizumNumber"
                  value={bizumNumber || ""}
                  onChange={(e) => onBizumNumberChange(e.target.value)}
                  placeholder="Ej: 612345678"
                  required
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Información de Efectivo */}
      {value === "cash" && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">
              <p>Pago en efectivo - No se requiere información adicional.</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
} 