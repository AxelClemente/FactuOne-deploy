import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Repeat } from "lucide-react";
import { getDb } from "@/lib/db";
import { invoiceAutomations, clients } from "@/app/db/schema";
import { getActiveBusiness } from "@/app/(dashboard)/businesses/actions";
import { eq, inArray } from "drizzle-orm";

export default async function AutomationsPage() {
  const activeBusiness = await getActiveBusiness();
  if (!activeBusiness) {
    return <div>No hay negocio activo.</div>;
  }
  const db = await getDb();
  // Obtener automatizaciones y clientes asociados
  const automations = await db.select().from(invoiceAutomations).where(eq(invoiceAutomations.businessId, activeBusiness.id));
  const clientIds = automations.map(a => a.clientId);
  const clientsList = clientIds.length > 0
    ? await db.select().from(clients).where(inArray(clients.id, clientIds))
    : [];
  const clientMap = Object.fromEntries(clientsList.map(c => [c.id, c]));

  return (
    <div className="w-full">
      <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Repeat className="w-6 h-6" />
            Automatizaciones
          </h1>
          <p className="text-muted-foreground">Gestiona las automatizaciones de emisión de facturas recurrentes</p>
        </div>
        <Button asChild>
          <Link href="/automations/new">
            Nueva automatización
          </Link>
        </Button>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full border text-sm">
          <thead>
            <tr>
              <th className="border px-2 py-1">Cliente</th>
              <th className="border px-2 py-1">Concepto</th>
              <th className="border px-2 py-1">Importe</th>
              <th className="border px-2 py-1">Frecuencia</th>
              <th className="border px-2 py-1">Próxima emisión</th>
              <th className="border px-2 py-1">Estado</th>
            </tr>
          </thead>
          <tbody>
            {automations.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-8 text-muted-foreground">No hay automatizaciones registradas.</td>
              </tr>
            )}
            {automations.map(auto => {
              const cliente = clientMap[auto.clientId];
              // Calcular próxima emisión (simplificado)
              const prox = auto.startDate + ' ' + auto.timeOfDay;
              return (
                <tr key={auto.id}>
                  <td className="border px-2 py-1 font-medium">{cliente ? cliente.name : auto.clientId}</td>
                  <td className="border px-2 py-1">{auto.concept}</td>
                  <td className="border px-2 py-1">{Number(auto.amount).toFixed(2)} €</td>
                  <td className="border px-2 py-1">Cada {auto.interval} {auto.frequency === 'day' ? 'día(s)' : auto.frequency === 'month' ? 'mes(es)' : 'año(s)'}</td>
                  <td className="border px-2 py-1">{prox}</td>
                  <td className="border px-2 py-1">{auto.isActive ? 'Activa' : 'Pausada'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
} 