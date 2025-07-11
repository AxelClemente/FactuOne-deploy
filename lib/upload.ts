import { put, del } from "@vercel/blob";
import { randomUUID } from "crypto";

export async function uploadContract(file: File, projectId: string): Promise<string> {
  const filename = `contracts/${projectId}-${randomUUID()}.pdf`;
  const blob = await put(filename, file, {
    access: "public",
  });
  return blob.url;
}

export async function deleteContractFromBlob(url: string): Promise<void> {
  // Extraer la ruta relativa del blob desde la URL completa
  // Ejemplo: https://<account>.blob.vercel-storage.com/contracts/uuid.pdf
  const match = url.match(/\.com\/(.*)$/);
  if (!match) throw new Error("No se pudo extraer la ruta del blob de la URL");
  const pathname = match[1];
  await del(pathname);
}
