import { notFound } from "next/navigation";
import { getDb } from "@/lib/db";
import { invoiceAutomations, clients, automationLines, projects } from "@/app/db/schema";
import { eq } from "drizzle-orm";
import { getActiveBusiness } from "@/app/(dashboard)/businesses/actions";
import { AutomationForm } from "@/app/(dashboard)/automations/new/automation-form";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function EditAutomationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const activeBusiness = await getActiveBusiness();
  if (!activeBusiness) {
    return <div>No hay negocio activo.</div>;
  }
  const db = await getDb();
  // Obtener la automatización por id y negocio
  const [automation] = await db
    .select()
    .from(invoiceAutomations)
    .where(eq(invoiceAutomations.id, id))
    .limit(1);
  if (!automation) {
    notFound();
  }
  // Obtener clientes del negocio
  const clientsList = await db
    .select()
    .from(clients)
    .where(eq(clients.businessId, activeBusiness.id));
  // Obtener proyectos del negocio
  const projectsList = await db
    .select()
    .from(projects)
    .where(eq(projects.businessId, activeBusiness.id));
  // Obtener líneas de la automatización
  const lines = await db
    .select()
    .from(automationLines)
    .where(eq(automationLines.automationId, id));
  automation.lines = lines;

  return (
    <div className="container mx-auto px-4 py-8">
      <Link href="/automations" className="inline-flex items-center mb-6 text-black text-sm font-medium leading-5 hover:text-primary transition-colors">
        <ArrowLeft className="w-5 h-5 mr-2" />
        Volver al listado
      </Link>
      <AutomationForm clients={clientsList} projects={projectsList} automation={automation} />
    </div>
  );
} 