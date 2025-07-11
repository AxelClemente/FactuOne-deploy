"use server";

import { z } from "zod";
import { getDb } from "@/lib/db";
import { invoiceAutomations, automationLines } from "@/app/db/schema";
import { v4 as uuidv4 } from "uuid";
import { getCurrentUser } from "@/lib/auth";
import { getActiveBusiness } from "@/app/(dashboard)/businesses/actions";
import { eq, and } from "drizzle-orm";
import { hasPermission } from "@/lib/auth";

const automationLineSchema = z.object({
  description: z.string().min(1),
  quantity: z.number().min(1),
  unitPrice: z.number().min(0),
  taxRate: z.number().min(0),
  total: z.number().min(0),
});

const automationSchema = z.object({
  clientId: z.string().min(1),
  projectId: z.string().optional(),
  amount: z.string().or(z.number()).refine((v) => Number(v) > 0, { message: "El importe debe ser mayor que 0" }),
  concept: z.string().min(1),
  lines: z.string().optional(), // JSON string de las líneas
  frequency: z.enum(["day", "month", "year"]),
  interval: z.string().or(z.number()).refine((v) => Number(v) > 0),
  startDate: z.string().min(1),
  timeOfDay: z.string().min(1),
  maxOccurrences: z.string().optional(),
  isActive: z.string().optional(),
});

export async function createAutomation(prevState: any, formData: FormData) {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "No autenticado", details: undefined };
  }
  const activeBusiness = await getActiveBusiness();
  if (!activeBusiness) {
    return { success: false, error: "No hay negocio activo", details: undefined };
  }

  // Parsear y validar datos
  const raw = {
    clientId: formData.get("clientId"),
    projectId: formData.get("projectId"),
    amount: formData.get("amount"),
    concept: formData.get("concept"),
    lines: formData.get("lines"),
    frequency: formData.get("frequency"),
    interval: formData.get("interval"),
    startDate: formData.get("startDate"),
    timeOfDay: formData.get("timeOfDay"),
    maxOccurrences: formData.get("maxOccurrences"),
    isActive: formData.get("isActive"),
  };
  const parsed = automationSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: "Datos inválidos", details: parsed.error.flatten() };
  }
  const data = parsed.data;

  try {
    const db = await getDb();
    const automationId = uuidv4();
    await db.insert(invoiceAutomations).values({
      id: automationId,
      businessId: activeBusiness.id,
      clientId: data.clientId,
      projectId: data.projectId || null,
      amount: Number(data.amount),
      concept: data.concept,
      frequency: data.frequency,
      interval: Number(data.interval),
      startDate: data.startDate,
      timeOfDay: data.timeOfDay,
      maxOccurrences: data.maxOccurrences && data.maxOccurrences.trim() !== "" ? Number(data.maxOccurrences) : null,
      occurrences: 0,
      isActive: !!data.isActive,
      lastRunAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    // Guardar líneas de factura si existen
    if (data.lines) {
      let linesArr: any[] = [];
      try {
        linesArr = JSON.parse(data.lines as string);
      } catch (e) {}
      for (const line of linesArr) {
        const lineParsed = automationLineSchema.safeParse(line);
        if (lineParsed.success) {
          await db.insert(automationLines).values({
            id: uuidv4(),
            automationId,
            description: line.description,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            taxRate: line.taxRate,
            total: line.total,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }
      }
    }
    return { success: true, error: null, details: undefined };
  } catch (error) {
    return { success: false, error: "Error al guardar la automatización", details: undefined };
  }
}

export async function updateAutomation(id: string, prevState: any, formData: FormData) {
  console.log('[updateAutomation] id:', id);
  const user = await getCurrentUser();
  if (!user) {
    console.log('[updateAutomation] No autenticado');
    return { success: false, error: "No autenticado", details: undefined };
  }
  const activeBusiness = await getActiveBusiness();
  if (!activeBusiness) {
    console.log('[updateAutomation] No hay negocio activo');
    return { success: false, error: "No hay negocio activo", details: undefined };
  }

  // Parsear y validar datos
  const raw = {
    clientId: formData.get("clientId"),
    projectId: formData.get("projectId"),
    amount: formData.get("amount"),
    concept: formData.get("concept"),
    lines: formData.get("lines"),
    frequency: formData.get("frequency"),
    interval: formData.get("interval"),
    startDate: formData.get("startDate"),
    timeOfDay: formData.get("timeOfDay"),
    maxOccurrences: formData.get("maxOccurrences"),
    isActive: formData.get("isActive"),
  };
  console.log('[updateAutomation] raw:', raw);
  const parsed = automationSchema.safeParse(raw);
  if (!parsed.success) {
    console.log('[updateAutomation] Datos inválidos', parsed.error.flatten());
    return { success: false, error: "Datos inválidos", details: parsed.error.flatten() };
  }
  const data = parsed.data;
  console.log('[updateAutomation] parsed data:', data);

  try {
    const db = await getDb();
    // Actualizar automatización principal
    await db.update(invoiceAutomations)
      .set({
        clientId: data.clientId,
        projectId: data.projectId || null,
        amount: Number(data.amount),
        concept: data.concept,
        frequency: data.frequency,
        interval: Number(data.interval),
        startDate: data.startDate,
        timeOfDay: data.timeOfDay,
        maxOccurrences: data.maxOccurrences && data.maxOccurrences.trim() !== "" ? Number(data.maxOccurrences) : null,
        isActive: !!data.isActive,
        updatedAt: new Date(),
      })
      .where(and(
        eq(invoiceAutomations.id, id),
        eq(invoiceAutomations.businessId, activeBusiness.id)
      ));
    // Eliminar líneas anteriores
    await db.delete(automationLines).where(eq(automationLines.automationId, id));
    // Guardar nuevas líneas
    if (data.lines) {
      let linesArr: any[] = [];
      try {
        linesArr = JSON.parse(data.lines as string);
      } catch (e) {}
      for (const line of linesArr) {
        const lineParsed = automationLineSchema.safeParse(line);
        if (lineParsed.success) {
          await db.insert(automationLines).values({
            id: uuidv4(),
            automationId: id,
            description: line.description,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            taxRate: line.taxRate,
            total: line.total,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }
      }
    }
    console.log('[updateAutomation] update result: OK');
    return { success: true, error: null, details: undefined };
  } catch (error) {
    console.log('[updateAutomation] Error en update:', error);
    return { success: false, error: "Error al actualizar la automatización", details: undefined };
  }
}

export async function deleteAutomation(id: string) {
  const user = await getCurrentUser();
  if (!user) {
    console.log('[deleteAutomation] No autenticado');
    return { success: false, error: "No autenticado" };
  }
  const activeBusiness = await getActiveBusiness();
  if (!activeBusiness) {
    console.log('[deleteAutomation] No hay negocio activo');
    return { success: false, error: "No hay negocio activo" };
  }
  const canDelete = await hasPermission(user.id, activeBusiness.id.toString(), "automations", "delete");
  console.log('[deleteAutomation] userId:', user.id, 'businessId:', activeBusiness.id, 'canDelete:', canDelete);
  if (!canDelete) {
    return { success: false, error: "No tienes permisos para eliminar automatizaciones" };
  }
  try {
    const db = await getDb();
    await db.delete(invoiceAutomations)
      .where(and(
        eq(invoiceAutomations.id, id),
        eq(invoiceAutomations.businessId, activeBusiness.id)
      ));
    return { success: true };
  } catch (error) {
    console.log('[deleteAutomation] Error al eliminar:', error);
    return { success: false, error: "Error al eliminar la automatización" };
  }
} 