import { NextRequest } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { getReceivedInvoiceById } from "@/app/(dashboard)/received-invoices/actions"
// import { create } from "xmlbuilder2" // Instalar xmlbuilder2

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  // 1. Validar usuario
  const user = await getCurrentUser()
  if (!user) {
    return new Response("Unauthorized", { status: 401 })
  }

  // 2. Obtener datos de la factura recibida
  const invoice = await getReceivedInvoiceById(params.id)
  if (!invoice) {
    return new Response("Factura recibida no encontrada", { status: 404 })
  }

  // 3. (Opcional) Validar permisos y pertenencia al negocio
  // TODO: Validar que el usuario puede acceder a esta factura

  // 4. Generar XML Facturae mínimo (estructura base)
  // TODO: Completar todos los campos y namespaces según XSD oficial
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Facturae xmlns="http://www.facturae.es/Facturae/2009/v3.2/Facturae">
  <FileHeader>
    <SchemaVersion>3.2.1</SchemaVersion>
    <Modality>I</Modality>
    <InvoiceIssuerType>EM</InvoiceIssuerType>
  </FileHeader>
  <Parties>
    <SellerParty>
      <TaxIdentification>
        <PersonTypeCode>J</PersonTypeCode>
        <ResidenceTypeCode>R</ResidenceTypeCode>
        <TaxIdentificationNumber>${invoice.provider?.nif || ""}</TaxIdentificationNumber>
      </TaxIdentification>
      <LegalEntity>
        <CorporateName>${invoice.provider?.name || ""}</CorporateName>
        <AddressInSpain>
          <Address>${invoice.provider?.address || ""}</Address>
        </AddressInSpain>
      </LegalEntity>
    </SellerParty>
    <BuyerParty>
      <TaxIdentification>
        <PersonTypeCode>J</PersonTypeCode>
        <ResidenceTypeCode>R</ResidenceTypeCode>
        <TaxIdentificationNumber>${invoice.business?.nif || ""}</TaxIdentificationNumber>
      </TaxIdentification>
      <LegalEntity>
        <CorporateName>${invoice.business?.name || ""}</CorporateName>
        <AddressInSpain>
          <Address>${invoice.business?.fiscalAddress || ""}</Address>
        </AddressInSpain>
      </LegalEntity>
    </BuyerParty>
  </Parties>
  <!-- ... más nodos según XSD ... -->
</Facturae>`

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml",
      "Content-Disposition": `attachment; filename=FacturaRecibida-${invoice.number}.xml`,
    },
  })
} 