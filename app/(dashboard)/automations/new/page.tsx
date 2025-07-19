import { getClientsForCurrentUser } from "@/app/(dashboard)/clients/actions";
import { getProjectsForCurrentUser } from "@/app/(dashboard)/projects/actions";
import { getActiveBusiness } from "@/app/(dashboard)/businesses/actions";
import { getBanksForBusiness } from "@/app/(dashboard)/invoices/actions";
import { AutomationForm } from "./automation-form";

export default async function NewAutomationPage() {
  const activeBusiness = await getActiveBusiness();
  if (!activeBusiness) {
    return <div>No hay negocio activo.</div>;
  }
  const clients = await getClientsForCurrentUser(activeBusiness.id.toString());
  const projects = await getProjectsForCurrentUser({});
  const banks = await getBanksForBusiness(activeBusiness.id.toString());
  return <AutomationForm clients={clients} projects={projects} banks={banks} />;
} 