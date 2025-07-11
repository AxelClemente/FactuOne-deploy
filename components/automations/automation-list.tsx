"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { MoreHorizontal, Edit, Trash, Eye } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { deleteAutomation } from "@/app/(dashboard)/automations/actions";

export function AutomationList({ automations, clientMap, projectMap, linesMap }: { automations: any[]; clientMap: Record<string, any>; projectMap: Record<string, any>; linesMap: Record<string, any[]> }) {
  const [items, setItems] = useState(automations);

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de que deseas eliminar esta automatización? Esta acción no se puede deshacer.")) {
      return;
    }
    const result = await deleteAutomation(id);
    if (result.success) {
      setItems((prev) => prev.filter((a) => a.id !== id));
    } else {
      alert(result.error || "Error al eliminar");
    }
  };

  return (
    <div className="rounded-md border overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead className="bg-muted">
          <tr>
            <th className="px-4 py-2 text-left font-semibold text-muted-foreground">Cliente</th>
            <th className="px-4 py-2 text-left font-semibold text-muted-foreground">Proyecto</th>
            <th className="px-4 py-2 text-left font-semibold text-muted-foreground">Concepto</th>
            <th className="px-4 py-2 text-left font-semibold text-muted-foreground">Importe</th>
            <th className="px-4 py-2 text-left font-semibold text-muted-foreground">Líneas</th>
            <th className="px-4 py-2 text-left font-semibold text-muted-foreground">Frecuencia</th>
            <th className="px-4 py-2 text-left font-semibold text-muted-foreground">Próxima emisión</th>
            <th className="px-4 py-2 text-left font-semibold text-muted-foreground">Estado</th>
            <th className="px-4 py-2 w-12"></th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 && (
            <tr>
              <td colSpan={9} className="text-center py-8 text-muted-foreground">No hay automatizaciones registradas.</td>
            </tr>
          )}
          {items.map(auto => {
            const cliente = clientMap[auto.clientId];
            const proyecto = auto.projectId ? projectMap[auto.projectId] : null;
            const prox = auto.startDate + ' ' + auto.timeOfDay;
            const lines = linesMap[auto.id] || [];
            const totalLines = lines.length;
            const totalAmount = lines.reduce((acc, l) => acc + Number(l.total), 0);
            return (
              <tr key={auto.id} className="border-b">
                <td className="px-4 py-2 font-medium">{cliente ? cliente.name : auto.clientId}</td>
                <td className="px-4 py-2">{proyecto ? proyecto.name : '-'}</td>
                <td className="px-4 py-2">{auto.concept}</td>
                <td className="px-4 py-2">{Number(auto.amount).toFixed(2)} €</td>
                <td className="px-4 py-2">{totalLines} línea(s)<br /><span className="text-xs text-muted-foreground">Total: {totalAmount.toFixed(2)} €</span></td>
                <td className="px-4 py-2">Cada {auto.interval} {auto.frequency === 'day' ? 'día(s)' : auto.frequency === 'month' ? 'mes(es)' : 'año(s)'}</td>
                <td className="px-4 py-2">{prox}</td>
                <td className="px-4 py-2">{auto.isActive ? 'Activa' : 'Pausada'}</td>
                <td className="px-4 py-2 text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Acciones</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/automations/${auto.id}`}>
                          <Eye className="mr-2 h-4 w-4" />
                          Ver detalle
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href={`/automations/${auto.id}/edit`}>
                          <Edit className="mr-2 h-4 w-4" />
                          Editar
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDelete(auto.id)} className="text-destructive">
                        <Trash className="mr-2 h-4 w-4" />
                        Eliminar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
} 