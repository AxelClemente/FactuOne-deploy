import React from "react"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export default function PrivacyPage() {
  return (
    <main className="max-w-2xl mx-auto py-10 px-4">
      <Link href="/dashboard" className="inline-flex items-center mb-6 text-sm text-black hover:text-primary transition-colors">
        <ArrowLeft className="w-4 h-4 mr-2 text-black" /> Volver al dashboard
      </Link>
      <h1 className="text-2xl font-bold mb-6">Política de Privacidad</h1>
      <section className="mb-6">
        <h2 className="text-lg font-semibold mb-2">1. Responsable del tratamiento</h2>
        <p>El responsable del tratamiento de los datos personales proporcionados a través de esta plataforma es:</p>
        <ul className="list-disc ml-6">
          <li>Pixelaris S.L.</li>
          <li>CIF: B21739354</li>
          <li>Domicilio: Carrer Penyagolosa, Nº 8 - Pl. 5 - Prta. D, 12540 Vila-real (CASTELLÓN)</li>
          <li>Correo electrónico de contacto: <a href="mailto:support@factuone.com" className="underline">support@factuone.com</a></li>
        </ul>
        <p>Versión del documento: 1.0</p>
      </section>
      <section className="mb-6">
        <h2 className="text-lg font-semibold mb-2">2. Finalidad del tratamiento</h2>
        <p>Los datos personales que recopilamos tienen como única finalidad permitir:</p>
        <ul className="list-disc ml-6">
          <li>La creación y gestión de cuentas de usuario.</li>
          <li>La gestión empresarial y documental por parte del propio usuario.</li>
          <li>La correcta prestación de los servicios contratados.</li>
        </ul>
        <p>No se utilizan los datos con fines publicitarios ni se elaboran perfiles comerciales.</p>
      </section>
      <section className="mb-6">
        <h2 className="text-lg font-semibold mb-2">3. Base legal</h2>
        <ul className="list-disc ml-6">
          <li>La ejecución de un contrato: para prestar el servicio de gestión y facturación.</li>
          <li>El cumplimiento de obligaciones legales, en caso de facturación o conservación de registros.</li>
          <li>El interés legítimo del usuario en administrar su información de forma segura.</li>
        </ul>
      </section>
      <section className="mb-6">
        <h2 className="text-lg font-semibold mb-2">4. Cesión de datos</h2>
        <p>FactuOne no vende ni cede datos personales a terceros.</p>
        <p>Los únicos proveedores que intervienen en el tratamiento son servicios de infraestructura necesarios para el funcionamiento de la plataforma, y están ubicados dentro del Espacio Económico Europeo (EEE) o garantizan un nivel adecuado de protección conforme al RGPD.</p>
      </section>
      <section className="mb-6">
        <h2 className="text-lg font-semibold mb-2">5. Almacenamiento de datos</h2>
        <ul className="list-disc ml-6">
          <li>Los datos y registros administrativos se almacenan en servidores propios ubicados en Europa, gestionados por el proveedor OVH.</li>
          <li>Los documentos adjuntos o generados por el usuario (facturas, contratos, archivos subidos) se almacenan cifrados en la nube de IDrive, también bajo infraestructura europea o con garantías equivalentes.</li>
        </ul>
        <p>Ambos proveedores cumplen con el Reglamento General de Protección de Datos (RGPD).</p>
      </section>
      <section className="mb-6">
        <h2 className="text-lg font-semibold mb-2">6. Creación de usuarios adicionales y datos de terceros</h2>
        <p>La plataforma permite al usuario crear cuentas de acceso adicionales o registrar datos de empleados, colaboradores, proveedores o contactos en el entorno empresarial.</p>
        <p>FactuOne actúa como encargado del tratamiento respecto a esa información. Es responsabilidad exclusiva del usuario:</p>
        <ul className="list-disc ml-6">
          <li>Contar con base legal para introducir datos de terceros.</li>
          <li>No introducir datos personales innecesarios para la actividad profesional.</li>
          <li>Evitar el uso de correos electrónicos personales de terceros siempre que sea posible.</li>
        </ul>
        <p>FactuOne no se hace responsable del uso de correos personales ni de información no empresarial introducida sin consentimiento o base legal adecuada.</p>
      </section>
      <section className="mb-6">
        <h2 className="text-lg font-semibold mb-2">7. Cookies</h2>
        <p>Este sitio web únicamente utiliza cookies técnicas estrictamente necesarias para garantizar el correcto funcionamiento de la plataforma.</p>
        <p>No se utilizan cookies de seguimiento, analítica, publicidad ni de terceros.</p>
      </section>
      <section className="mb-6">
        <h2 className="text-lg font-semibold mb-2">8. Derechos de los usuarios</h2>
        <p>Puedes ejercer en cualquier momento tus derechos de:</p>
        <ul className="list-disc ml-6">
          <li>Acceso</li>
          <li>Rectificación</li>
          <li>Supresión</li>
          <li>Limitación del tratamiento</li>
          <li>Portabilidad</li>
          <li>Oposición</li>
        </ul>
        <p>Enviando tu solicitud a: <a href="mailto:support@factuone.com" className="underline">support@factuone.com</a></p>
        <p>Podremos solicitarte una copia de tu documento de identidad si fuera necesario para acreditar tu identidad.</p>
      </section>
      <section className="mb-6">
        <h2 className="text-lg font-semibold mb-2">9. Conservación de datos</h2>
        <p>Los datos se conservarán mientras exista una relación contractual con el usuario y, posteriormente, durante los plazos legales exigidos en materia fiscal y mercantil.</p>
      </section>
      <section className="mb-6">
        <h2 className="text-lg font-semibold mb-2">10. Seguridad</h2>
        <p>FactuOne aplica medidas de seguridad técnicas y organizativas adecuadas para proteger los datos personales contra pérdida, mal uso, acceso no autorizado o divulgación.</p>
      </section>
      <section className="mb-6">
        <h2 className="text-lg font-semibold mb-2">11. Cambios en la política</h2>
        <p>Esta política puede ser actualizada para adaptarse a cambios legislativos, técnicos o de funcionamiento. Recomendamos revisar esta sección de forma periódica.</p>
        <p className="text-sm text-muted-foreground mt-2">Última actualización: 10 de julio de 2025</p>
      </section>
    </main>
  )
} 