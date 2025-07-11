import { getClientsForCurrentUser } from "@/app/(dashboard)/clients/actions";
import { getProjectsForCurrentUser } from "@/app/(dashboard)/projects/actions";
import { getActiveBusiness } from "@/app/(dashboard)/businesses/actions";
import { AutomationForm } from "./automation-form";

export default async function NewAutomationPage() {
  const activeBusiness = await getActiveBusiness();
  if (!activeBusiness) {
    return <div>No hay negocio activo.</div>;
  }
  const clients = await getClientsForCurrentUser(activeBusiness.id.toString());
  const projects = await getProjectsForCurrentUser({});
  return <AutomationForm clients={clients} projects={projects} />;
} 