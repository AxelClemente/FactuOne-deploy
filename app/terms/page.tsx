import React from "react"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export default function TermsPage() {
  return (
    <main className="max-w-2xl mx-auto py-10 px-4">
      <Link href="/dashboard" className="inline-flex items-center mb-6 text-sm text-black hover:text-primary transition-colors">
        <ArrowLeft className="w-4 h-4 mr-2 text-black" /> Volver al dashboard
      </Link>
      <h1 className="text-2xl font-bold mb-6">Términos y Condiciones de Uso</h1>
      <section className="mb-6">
        <h2 className="text-lg font-semibold mb-2">1. Objeto</h2>
        <p>El presente documento establece los términos que regulan el acceso, registro y uso de la plataforma FactuOne, titularidad de su equipo de desarrollo, disponible a través del sitio web y otros medios electrónicos asociados.</p>
        <p>FactuOne es un sistema de gestión empresarial que permite a autónomos y empresas controlar clientes, facturación emitida y recibida, gastos, proyectos, ingresos, así como consultar información agregada a través de un panel de control.</p>
        <p>Actualmente, FactuOne no está acreditado como software certificado Verifactu, aunque se encuentra en proceso de adaptación.</p>
      </section>
      <section className="mb-6">
        <h2 className="text-lg font-semibold mb-2">2. Aceptación de las condiciones</h2>
        <p>El acceso a la plataforma y su utilización implica que el usuario ha leído, entendido y acepta expresamente los presentes Términos y Condiciones, así como las políticas complementarias (Aviso Legal, Política de Privacidad, etc.).</p>
        <p>El uso de FactuOne está destinado exclusivamente a personas físicas dadas de alta en el Régimen Especial de Trabajadores Autónomos (RETA) o a personas jurídicas legalmente constituidas y debidamente inscritas en el Registro Mercantil de España.</p>
        <p>Queda prohibido el uso del sistema por parte de particulares no vinculados a una actividad económica o empresarial, así como por entidades no formalizadas conforme a la legislación mercantil y tributaria vigente.</p>
      </section>
      <section className="mb-6">
        <h2 className="text-lg font-semibold mb-2">3. Acceso y Registro</h2>
        <p>Para utilizar FactuOne, el usuario deberá registrarse mediante un formulario de alta, proporcionar datos veraces y mantenerlos actualizados. El acceso se realiza mediante credenciales personales (correo electrónico y contraseña).</p>
        <p>El usuario es responsable de mantener la confidencialidad de sus credenciales y de toda actividad realizada desde su cuenta.</p>
      </section>
      <section className="mb-6">
        <h2 className="text-lg font-semibold mb-2">4. Funcionalidades del servicio</h2>
        <p>FactuOne ofrece un conjunto de herramientas digitales destinadas a facilitar la gestión empresarial, incluyendo —entre otras— funcionalidades de facturación electrónica, gestión de clientes, proyectos, ingresos, gastos y estadísticas.</p>
        <p>Las funcionalidades disponibles en cada cuenta pueden variar en función del plan contratado, el estado de desarrollo del sistema y las actualizaciones periódicas implementadas.</p>
        <p>FactuOne se reserva el derecho de añadir, modificar, limitar o eliminar funcionalidades en cualquier momento, con el fin de mejorar la experiencia del usuario, garantizar el cumplimiento normativo o adaptar el servicio a nuevas necesidades del mercado.</p>
      </section>
      <section className="mb-6">
        <h2 className="text-lg font-semibold mb-2">5. Uso del sistema</h2>
        <ul className="list-disc ml-6 mb-2">
          <li>Usar la plataforma conforme a la ley, a los presentes Términos y al principio de buena fe.</li>
          <li>No utilizar FactuOne con fines ilícitos, fraudulentos o que vulneren derechos de terceros.</li>
          <li>Asegurarse de que los datos introducidos en el sistema (facturas, clientes, importes) sean correctos y veraces.</li>
          <li>Utilizar los documentos generados bajo su propia responsabilidad profesional o empresarial.</li>
        </ul>
        <p>El usuario es el único responsable del uso que haga del sistema y de las consecuencias legales derivadas.</p>
      </section>
      <section className="mb-6">
        <h2 className="text-lg font-semibold mb-2">6. Limitaciones del servicio</h2>
        <ul className="list-disc ml-6 mb-2">
          <li>FactuOne no es un software de contabilidad ni un asesor fiscal. Tampoco sustituye la intervención de un profesional contable.</li>
          <li>FactuOne no genera automáticamente el formato Facturae 4.0 válido para Verifactu ni está certificado aún.</li>
          <li>El usuario debe asegurarse de que sus facturas cumplen con los requisitos legales específicos de su actividad y país.</li>
          <li>Los documentos generados tienen validez únicamente si contienen la información legalmente exigida.</li>
        </ul>
      </section>
      <section className="mb-6">
        <h2 className="text-lg font-semibold mb-2">7. Fallos, errores y soporte</h2>
        <p>FactuOne puede contener errores o fallos técnicos. El usuario acepta que:</p>
        <ul className="list-disc ml-6 mb-2">
          <li>El sistema puede estar en constante evolución.</li>
          <li>Pueden existir interrupciones temporales o errores no detectados.</li>
          <li>Cualquier error debe ser comunicado a <a href="mailto:support@factuone.com" className="underline">support@factuone.com</a>.</li>
        </ul>
        <p>FactuOne se compromete a investigar y, si procede, corregir los errores comunicados en un plazo razonable, según su criticidad.</p>
      </section>
      <section className="mb-6">
        <h2 className="text-lg font-semibold mb-2">8. Propiedad intelectual e industrial</h2>
        <p>Todos los elementos que conforman la plataforma FactuOne (software, diseño, interfaz, textos, código, bases de datos, logotipos, etc.) son propiedad exclusiva de sus titulares o de sus licenciantes y están protegidos por la legislación vigente.</p>
        <p>Queda estrictamente prohibida la reproducción, modificación, distribución o cualquier otro uso no autorizado.</p>
      </section>
      <section className="mb-6">
        <h2 className="text-lg font-semibold mb-2">9. Suspensión o cancelación de la cuenta</h2>
        <ul className="list-disc ml-6 mb-2">
          <li>Uso indebido de la plataforma.</li>
          <li>Incumplimiento grave o reiterado de los presentes términos.</li>
          <li>Conductas que puedan dañar la integridad del sistema o de otros usuarios.</li>
        </ul>
      </section>
      <section className="mb-6">
        <h2 className="text-lg font-semibold mb-2">10. Modificaciones</h2>
        <p>FactuOne podrá actualizar estos Términos y Condiciones en cualquier momento. Las modificaciones se considerarán aceptadas por el usuario si continúa utilizando la plataforma tras su publicación.</p>
      </section>
      <section className="mb-6">
        <h2 className="text-lg font-semibold mb-2">11. Legislación y jurisdicción</h2>
        <p>El presente acuerdo se rige por la legislación española. En caso de conflicto, las partes se someten a los juzgados y tribunales del domicilio del titular del servicio, salvo que por ley deba aplicarse otra jurisdicción.</p>
      </section>
    </main>
  )
} 