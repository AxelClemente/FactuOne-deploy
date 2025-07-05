import { getClients } from "@/app/(dashboard)/clients/actions";
import { getActiveBusiness } from "@/app/(dashboard)/businesses/actions";
import { AutomationForm } from "./automation-form";

export default async function NewAutomationPage() {
  const activeBusiness = await getActiveBusiness();
  if (!activeBusiness) {
    return <div>No hay negocio activo.</div>;
  }
  const clients = await getClients(activeBusiness.id.toString());
  return <AutomationForm clients={clients} />;
} 