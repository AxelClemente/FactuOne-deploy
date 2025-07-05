import { notFound } from "next/navigation";
import { getDb } from "@/lib/db";
import { invoiceAutomations, clients } from "@/app/db/schema";
import { eq } from "drizzle-orm";
import { getActiveBusiness } from "@/app/(dashboard)/businesses/actions";
import { AutomationForm } from "@/app/(dashboard)/automations/new/automation-form";

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

  return (
    <AutomationForm clients={clientsList} automation={automation} />
  );
} 