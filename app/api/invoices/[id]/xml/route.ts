import { NextRequest } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { getInvoiceWithLines } from "@/app/(dashboard)/invoices/actions"
import { getActiveBusiness } from "@/lib/getActiveBusiness"
import { getDb } from "@/lib/db"
import { businesses } from "@/app/db/schema"
import { eq } from "drizzle-orm"
// import { create } from "xmlbuilder2" // Instalar xmlbuilder2

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  // 1. Validar usuario
  const user = await getCurrentUser()
  if (!user) {
    return new Response("Unauthorized", { status: 401 })
  }

  // 2. Obtener datos de la factura emitida
  const invoice = await getInvoiceWithLines(params.id)
  if (!invoice) {
    return new Response("Factura emitida no encontrada", { status: 404 })
  }

  // 3. Validar que pertenece al negocio activo
  const activeBusinessId = await getActiveBusiness()
  if (!activeBusinessId || invoice.businessId !== activeBusinessId) {
    return new Response("Forbidden", { status: 403 })
  }

  // 4. Obtener datos del negocio para el XML
  const db = await getDb()
  const [business] = await db.select().from(businesses).where(eq(businesses.id, activeBusinessId))
  if (!business) {
    return new Response("Negocio no encontrado", { status: 404 })
  }

  // 5. Generar XML Facturae mínimo (estructura base)
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
        <TaxIdentificationNumber>${business.nif || ""}</TaxIdentificationNumber>
      </TaxIdentification>
      <LegalEntity>
        <CorporateName>${business.name || ""}</CorporateName>
        <AddressInSpain>
          <Address>${business.fiscalAddress || ""}</Address>
        </AddressInSpain>
      </LegalEntity>
    </SellerParty>
    <BuyerParty>
      <TaxIdentification>
        <PersonTypeCode>J</PersonTypeCode>
        <ResidenceTypeCode>R</ResidenceTypeCode>
        <TaxIdentificationNumber>${invoice.client?.nif || ""}</TaxIdentificationNumber>
      </TaxIdentification>
      <LegalEntity>
        <CorporateName>${invoice.client?.name || ""}</CorporateName>
        <AddressInSpain>
          <Address>${invoice.client?.address || ""}</Address>
        </AddressInSpain>
      </LegalEntity>
    </BuyerParty>
  </Parties>
  <Invoices>
    <Invoice>
      <InvoiceHeader>
        <InvoiceNumber>${invoice.number}</InvoiceNumber>
        <InvoiceDocumentType>FC</InvoiceDocumentType>
        <InvoiceClass>OO</InvoiceClass>
      </InvoiceHeader>
      <InvoiceIssueData>
        <IssueDate>${invoice.date ? new Date(invoice.date).toISOString().split('T')[0] : ""}</IssueDate>
        <OperationDate>${invoice.date ? new Date(invoice.date).toISOString().split('T')[0] : ""}</OperationDate>
        <PlaceOfIssue>
          <PostCode>00000</PostCode>
          <CountryCode>ESP</CountryCode>
        </PlaceOfIssue>
      </InvoiceIssueData>
      <TaxesOutputs>
        <TaxOutput>
          <TaxTypeCode>01</TaxTypeCode>
          <TaxRate>21.00</TaxRate>
          <TaxableBase>
            <TotalAmount>${invoice.subtotal || 0}</TotalAmount>
            <EquivalentInEuros>${invoice.subtotal || 0}</EquivalentInEuros>
          </TaxableBase>
          <TaxAmount>${invoice.taxAmount || 0}</TaxAmount>
        </TaxOutput>
      </TaxesOutputs>
      <InvoiceTotals>
        <TotalGrossAmount>${invoice.subtotal || 0}</TotalGrossAmount>
        <TotalGeneralDiscounts>0.00</TotalGeneralDiscounts>
        <TotalGeneralSurcharges>0.00</TotalGeneralSurcharges>
        <TotalGrossAmountBeforeTaxes>${invoice.subtotal || 0}</TotalGrossAmountBeforeTaxes>
        <TotalTaxOutputs>${invoice.taxAmount || 0}</TotalTaxOutputs>
        <TotalTaxesWithheld>0.00</TotalTaxesWithheld>
        <InvoiceTotal>${invoice.total || 0}</InvoiceTotal>
        <TotalOutstandingAmount>${invoice.total || 0}</TotalOutstandingAmount>
        <TotalExecutableAmount>${invoice.total || 0}</TotalExecutableAmount>
      </InvoiceTotals>
      <Items>
        ${(invoice.lines || []).map((line: any) => `
        <InvoiceLine>
          <ItemDescription>${line.description}</ItemDescription>
          <Quantity>${line.quantity}</Quantity>
          <UnitPriceWithoutTax>${line.unitPrice}</UnitPriceWithoutTax>
          <TotalCost>${line.quantity * line.unitPrice}</TotalCost>
          <GrossAmount>${line.quantity * line.unitPrice}</GrossAmount>
          <TaxesOutputs>
            <TaxOutput>
              <TaxTypeCode>01</TaxTypeCode>
              <TaxRate>${line.taxRate}</TaxRate>
              <TaxableBase>
                <TotalAmount>${line.quantity * line.unitPrice}</TotalAmount>
                <EquivalentInEuros>${line.quantity * line.unitPrice}</EquivalentInEuros>
              </TaxableBase>
              <TaxAmount>${(line.quantity * line.unitPrice) * (line.taxRate / 100)}</TaxAmount>
            </TaxOutput>
          </TaxesOutputs>
        </InvoiceLine>
        `).join("")}
      </Items>
      <PaymentDetails>
        <Installment>
          <InstallmentDueDate>${invoice.dueDate ? new Date(invoice.dueDate).toISOString().split('T')[0] : ""}</InstallmentDueDate>
          <InstallmentAmount>${invoice.total || 0}</InstallmentAmount>
          <PaymentMeans>01</PaymentMeans>
        </Installment>
      </PaymentDetails>
    </Invoice>
  </Invoices>
</Facturae>`

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml",
      "Content-Disposition": `attachment; filename=Factura-${invoice.number}.xml`,
    },
  })
} 