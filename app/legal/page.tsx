import React from "react"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export default function AvisoLegalPage() {
  return (
    <main className="max-w-2xl mx-auto py-10 px-4">
      <Link href="/dashboard" className="inline-flex items-center mb-6 text-sm text-black hover:text-primary transition-colors">
        <ArrowLeft className="w-4 h-4 mr-2 text-black" /> Volver al dashboard
      </Link>
      <h1 className="text-2xl font-bold mb-6">Aviso Legal</h1>
      <section className="mb-6">
        <h2 className="text-lg font-semibold mb-2">Titular del Sitio y del Servicio</h2>
        <p>Este sitio web y la plataforma FactuOne son titularidad de:</p>
        <ul className="list-disc ml-6">
          <li>Nombre comercial: FactuOne</li>
          <li>Email de contacto: <a href="mailto:support@factuone.com" className="underline">support@factuone.com</a></li>
        </ul>
      </section>
      <section className="mb-6">
        <h2 className="text-lg font-semibold mb-2">Objeto</h2>
        <p>El presente Aviso Legal regula el acceso, navegación y uso de la plataforma FactuOne, una solución digital de gestión empresarial que permite a autónomos y empresas administrar clientes, proyectos, facturas emitidas y recibidas, gastos, así como otros elementos relacionados con la gestión comercial.</p>
      </section>
      <section className="mb-6">
        <h2 className="text-lg font-semibold mb-2">Estado actual del servicio respecto a Verifactu</h2>
        <p>FactuOne no se encuentra actualmente acreditado por la Agencia Tributaria como software certificado conforme al sistema Verifactu. No obstante, el equipo de desarrollo se encuentra trabajando activamente en la adaptación y cumplimiento de todos los requisitos técnicos y legales para lograr la conformidad con dicha normativa en futuras actualizaciones.</p>
        <p>Mientras tanto, los usuarios son responsables de verificar el cumplimiento de sus obligaciones fiscales mediante otros medios adicionales, si así lo requiere su actividad.</p>
      </section>
      <section className="mb-6">
        <h2 className="text-lg font-semibold mb-2">Condiciones de uso y responsabilidad del usuario</h2>
        <ul className="list-disc ml-6 mb-2">
          <li>Utilizar la plataforma de manera diligente, correcta y lícita.</li>
          <li>Mantener actualizados los datos fiscales y comerciales introducidos en el sistema.</li>
          <li>Verificar la validez y exactitud de las facturas emitidas y recibidas.</li>
          <li>No utilizar la plataforma con fines fraudulentos o contrarios a la normativa vigente.</li>
        </ul>
        <p>FactuOne no se responsabiliza de los errores, omisiones o consecuencias derivadas del uso inadecuado del sistema por parte del usuario. La plataforma está concebida como una herramienta de apoyo y no sustituye, en ningún caso, la responsabilidad del usuario en materia fiscal, contable o legal.</p>
      </section>
      <section className="mb-6">
        <h2 className="text-lg font-semibold mb-2">Limitación de responsabilidad</h2>
        <ul className="list-disc ml-6 mb-2">
          <li>Daños directos o indirectos derivados de errores, interrupciones o pérdida de datos.</li>
          <li>Incumplimientos legales por parte del usuario.</li>
          <li>Consecuencias derivadas del uso del sistema en versiones no adaptadas aún a Verifactu.</li>
        </ul>
        <p>En ningún caso FactuOne será responsable por daños, sanciones o perjuicios derivados de una interpretación incorrecta de los datos generados o del incumplimiento normativo por parte del usuario.</p>
      </section>
      <section className="mb-6">
        <h2 className="text-lg font-semibold mb-2">Detección y notificación de errores</h2>
        <p>Si el usuario detecta cualquier fallo, error de funcionamiento, comportamiento inesperado o discrepancia en la generación de documentos, estos deben ser comunicados lo antes posible a través del canal oficial de soporte:</p>
        <p className="font-semibold">📩 <a href="mailto:support@factuone.com" className="underline">support@factuone.com</a></p>
        <p>El equipo técnico se compromete a analizar y, en su caso, corregir los errores reportados en el menor plazo posible, según prioridad técnica.</p>
      </section>
      <section className="mb-6">
        <h2 className="text-lg font-semibold mb-2">Propiedad intelectual</h2>
        <p>Todos los elementos de la plataforma, incluidos el código fuente, diseño, logotipos, textos, gráficos y funcionalidades, están protegidos por los derechos de propiedad intelectual e industrial, y son titularidad exclusiva de FactuOne o de sus licenciantes.</p>
      </section>
      <section className="mb-6">
        <h2 className="text-lg font-semibold mb-2">Legislación aplicable y jurisdicción</h2>
        <p>Este Aviso Legal se rige por la legislación española. Para la resolución de cualquier conflicto que pudiera derivarse del uso del sitio o de la plataforma, las partes se someten a los juzgados y tribunales del domicilio del titular, salvo que la normativa establezca otra cosa.</p>
      </section>
    </main>
  )
} 