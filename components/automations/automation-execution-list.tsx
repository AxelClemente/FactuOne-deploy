import Link from "next/link";

interface AutomationExecutionListProps {
  executions: any[];
  statusLabel: string;
}

function formatDate(date: string | Date | null | undefined) {
  if (!date) return "";
  if (typeof date === "string") {
    // Si es string, intenta parsear
    const d = new Date(date);
    return !isNaN(d.getTime()) ? d.toLocaleString("es-ES") : date;
  }
  if (date instanceof Date) {
    return date.toLocaleString("es-ES");
  }
  return "";
}

export function AutomationExecutionList({ executions, statusLabel }: AutomationExecutionListProps) {
  if (!executions || executions.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Todavía no hay registros de ejecuciones para el estado <b>{statusLabel}</b>.
      </div>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border text-sm">
        <thead>
          <tr>
            <th className="border px-2 py-1">Fecha de ejecución</th>
            <th className="border px-2 py-1">Estado</th>
            <th className="border px-2 py-1">Factura generada</th>
            <th className="border px-2 py-1">Error</th>
          </tr>
        </thead>
        <tbody>
          {executions.map(exec => (
            <tr key={exec.id}>
              <td className="border px-2 py-1">
                {formatDate(exec.executedAt)}
              </td>
              <td className="border px-2 py-1">{exec.status}</td>
              <td className="border px-2 py-1">
                {exec.invoiceId ? (
                  <Link href={`/invoices/${exec.invoiceId}`} className="text-blue-600 hover:underline">Ver factura</Link>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </td>
              <td className="border px-2 py-1 text-destructive">{exec.errorMessage || "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
} 