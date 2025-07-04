'use client';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Repeat } from "lucide-react";
import { createAutomation as createAutomationAction, updateAutomation as updateAutomationAction } from "@/app/(dashboard)/automations/actions";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

// Definir el tipo de estado para la automatización
interface AutomationState {
  success: boolean | null;
  error: string | null;
  details?: any;
}

const initialState: AutomationState = { success: null, error: null };

export function AutomationForm({ clients, automation }: { clients: any[]; automation?: any }) {
  const router = useRouter();
  const isEditing = !!automation;

  const actionFn = async (
    prevState: AutomationState,
    formData: FormData
  ): Promise<AutomationState> => {
    if (isEditing) {
      return await updateAutomationAction(automation.id, prevState, formData);
    } else {
      return await createAutomationAction(prevState, formData);
    }
  };
  const [state, formAction] = useActionState<AutomationState, FormData>(
    actionFn,
    initialState
  );
  const { pending } = useFormStatus();

  useEffect(() => {
    if (state.success) {
      router.push("/automations");
    }
  }, [state.success, router]);

  return (
    <div className="max-w-2xl mx-auto py-8">
      <h1 className="text-2xl font-bold flex items-center gap-2 mb-6">
        <Repeat className="w-6 h-6" />
        {isEditing ? "Editar automatización" : "Nueva automatización"}
      </h1>
      <form className="space-y-6" action={formAction}>
        <div>
          <Label>Cliente</Label>
          <Select name="clientId" required defaultValue={automation?.clientId}>
            <SelectTrigger>
              <SelectValue placeholder="Selecciona un cliente" />
            </SelectTrigger>
            <SelectContent>
              {clients.map((client: any) => (
                <SelectItem key={client.id} value={client.id}>
                  {client.name} ({client.nif})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Importe (€)</Label>
          <Input type="number" step="0.01" placeholder="0.00" name="amount" required defaultValue={automation?.amount} />
        </div>
        <div>
          <Label>Concepto</Label>
          <Input type="text" placeholder="Concepto de la factura" name="concept" required defaultValue={automation?.concept} />
        </div>
        <div className="flex gap-4">
          <div className="flex-1">
            <Label>Frecuencia</Label>
            <Select name="frequency" required defaultValue={automation?.frequency}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">Días</SelectItem>
                <SelectItem value="month">Meses</SelectItem>
                <SelectItem value="year">Años</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="w-32">
            <Label>Intervalo</Label>
            <Input type="number" min={1} defaultValue={automation?.interval ?? 1} name="interval" required />
          </div>
        </div>
        <div className="flex gap-4">
          <div className="flex-1">
            <Label>Fecha de inicio</Label>
            <Input type="date" name="startDate" required defaultValue={automation?.startDate} />
          </div>
          <div className="flex-1">
            <Label>Hora de emisión</Label>
            <Input type="time" name="timeOfDay" required defaultValue={automation?.timeOfDay} />
          </div>
        </div>
        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <Label>Nº máximo de repeticiones</Label>
            <Input type="number" min={1} placeholder="Dejar vacío para indefinido" name="maxOccurrences" defaultValue={automation?.maxOccurrences ?? ""} />
          </div>
          <div className="flex items-center gap-2">
            <Input type="checkbox" id="isActive" name="isActive" defaultChecked={automation ? automation.isActive : true} />
            <Label htmlFor="isActive">Activa</Label>
          </div>
        </div>
        {state.error && (
          <div className="bg-red-100 text-red-700 p-2 rounded text-sm">{state.error}</div>
        )}
        <Button type="submit" disabled={pending}>
          {pending ? (isEditing ? "Guardando..." : "Creando...") : isEditing ? "Guardar cambios" : "Crear automatización"}
        </Button>
      </form>
    </div>
  );
} 