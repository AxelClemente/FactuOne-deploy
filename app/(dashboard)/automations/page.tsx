import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Repeat, PlusCircle, MoreHorizontal, Edit, Trash } from "lucide-react";
import { getDb } from "@/lib/db";
import { invoiceAutomations, clients, projects, automationLines } from "@/app/db/schema";
import { getActiveBusiness } from "@/app/(dashboard)/businesses/actions";
import { eq, inArray } from "drizzle-orm";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AutomationList } from "@/components/automations/automation-list";

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

  // Obtener proyectos asociados
  const projectIds = automations.map(a => a.projectId).filter(Boolean);
  const projectsList = projectIds.length > 0
    ? await db.select().from(projects).where(inArray(projects.id, projectIds))
    : [];
  const projectMap = Object.fromEntries(projectsList.map(p => [p.id, p]));

  // Obtener líneas de automatización
  const automationIds = automations.map(a => a.id);
  const linesList = automationIds.length > 0
    ? await db.select().from(automationLines).where(inArray(automationLines.automationId, automationIds))
    : [];
  // Agrupar por automationId
  const linesMap: Record<string, any[]> = {};
  for (const line of linesList) {
    if (!linesMap[line.automationId]) linesMap[line.automationId] = [];
    linesMap[line.automationId].push(line);
  }

  // --- Funciones de acción ---
  // Eliminar automatización (deberás implementar la lógica real en un client component)
  const handleDelete = (id: string) => {
    // Aquí deberías llamar a una acción server/client para eliminar
    alert(`Eliminar automatización ${id} (implementa la lógica real)`);
  };

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Repeat className="w-6 h-6" />
            Automatizaciones
          </h1>
          <p className="text-muted-foreground">Gestiona las automatizaciones de emisión de facturas recurrentes</p>
        </div>
        <Button asChild>
          <Link href="/automations/new">
            <PlusCircle className="mr-2 h-4 w-4" />
            Nueva automatización
          </Link>
        </Button>
      </div>
      <AutomationList automations={automations} clientMap={clientMap} projectMap={projectMap} linesMap={linesMap} />
    </div>
  );
} 