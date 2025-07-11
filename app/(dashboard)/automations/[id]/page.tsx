import { getDb } from "@/lib/db";
import { invoiceAutomations, clients, automationExecutions } from "@/app/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AutomationExecutionList } from "@/components/automations/automation-execution-list";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function AutomationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await getDb();
  const [automation] = await db
    .select()
    .from(invoiceAutomations)
    .where(eq(invoiceAutomations.id, id))
    .limit(1);
  if (!automation) notFound();

  // Obtener cliente asociado
  const [client] = await db
    .select()
    .from(clients)
    .where(eq(clients.id, automation.clientId))
    .limit(1);

  // Obtener todas las ejecuciones de la automatización
  const executions = await db
    .select()
    .from(automationExecutions)
    .where(eq(automationExecutions.automationId, id));

  // Loguear las claves y tipos de los objetos de executions
  executions.forEach(e => {
    console.log("Execution keys:", Object.keys(e));
    Object.entries(e).forEach(([k, v]) => {
      console.log(`  ${k}:`, v, typeof v);
    });
  });

  // Normalizar solo los campos necesarios y fechas como string
  const executionsNormalized = executions.map(exec => ({
    id: exec.id,
    executedAt: exec.executedAt instanceof Date ? exec.executedAt.toISOString() : String(exec.executedAt),
    status: exec.status,
    invoiceId: exec.invoiceId,
    errorMessage: exec.errorMessage,
  }));

  function formatDate(date: Date | string | null | undefined) {
    if (!date) return "";
    if (typeof date === "string") {
      const d = new Date(date);
      return !isNaN(d.getTime()) ? d.toLocaleDateString("es-ES") : date;
    }
    if (date instanceof Date) {
      return date.toLocaleDateString("es-ES");
    }
    return "";
  }

  return (
    <div className="w-full px-4 md:px-8 py-8 space-y-6">
      <div className="mb-4">
        <Button asChild variant="ghost" size="sm">
          <Link href="/automations">
            <ArrowLeft className="h-4 w-4 mr-1" /> Volver
          </Link>
        </Button>
      </div>
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle>Detalle de Automatización</CardTitle>
          <CardDescription>
            Cliente: <span className="font-semibold">{client?.name || automation.clientId}</span> | Concepto: {automation.concept}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">Importe: <b>{Number(automation.amount).toFixed(2)} €</b></div>
          <div className="mb-4">Frecuencia: Cada {automation.interval} {automation.frequency}</div>
          <div className="mb-4">Próxima emisión: {formatDate(automation.startDate)} {automation.timeOfDay}</div>
          <div className="mb-4">Última actualización: {formatDate(automation.updatedAt)}</div>
          <div className="mb-4">Estado: {automation.isActive ? 'Activa' : 'Pausada'}</div>
        </CardContent>
      </Card>
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle>Historial de ejecuciones</CardTitle>
        </CardHeader>
        <CardContent>
          <AutomationExecutionList executions={executionsNormalized} statusLabel="" />
        </CardContent>
      </Card>
    </div>
  );
} 