# MySQL models

## ¿Cómo se crearon los modelos manualmente?

Este documento explica cómo se crearon manualmente todas las tablas y relaciones de la base de datos MySQL para el proyecto **FactuOne**.

---

## Pasos seguidos

1. **Verificamos que la base de datos de producción estuviera vacía**
   - Nos conectamos a la base de datos usando MySQL Workbench y ejecutamos:
     ```sql
     SHOW TABLES;
     ```
   - Si había tablas, las eliminamos para partir de cero.

2. **Extraímos el esquema de modelos desde el código fuente**
   - Leímos el archivo `app/db/schema.ts` para obtener la estructura de todas las tablas, tipos de datos, claves primarias, foráneas y restricciones únicas.

3. **Generamos el SQL de creación de tablas**
   - Se generó un script SQL completo con todas las tablas, relaciones y constraints, adaptado a MySQL.

4. **Ejecutamos el script en MySQL Workbench**
   - Abrimos una nueva consulta en MySQL Workbench conectada a la base de datos de producción.
   - Pegamos y ejecutamos el siguiente bloque de SQL:

```sql
-- Tabla: users
CREATE TABLE users (
  id VARCHAR(36) PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Tabla: businesses
CREATE TABLE businesses (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  nif VARCHAR(20) NOT NULL UNIQUE,
  fiscal_address VARCHAR(500) NOT NULL,
  phone VARCHAR(20),
  email VARCHAR(255),
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Tabla: business_users
CREATE TABLE business_users (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  business_id VARCHAR(36) NOT NULL,
  role ENUM('admin', 'accountant', 'user') NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY business_users_user_id_business_id_unique (user_id, business_id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (business_id) REFERENCES businesses(id)
);

-- Tabla: clients
CREATE TABLE clients (
  id VARCHAR(36) PRIMARY KEY,
  business_id VARCHAR(36) NOT NULL,
  name VARCHAR(255) NOT NULL,
  nif VARCHAR(20) NOT NULL,
  address VARCHAR(500) NOT NULL,
  postal_code VARCHAR(10),
  city VARCHAR(100),
  country VARCHAR(100) DEFAULT 'España',
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(255) NOT NULL,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (business_id) REFERENCES businesses(id)
);

-- Tabla: invoice_types
CREATE TABLE invoice_types (
  id VARCHAR(36) PRIMARY KEY,
  business_id VARCHAR(36) NOT NULL,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) NOT NULL,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (business_id) REFERENCES businesses(id)
);

-- Tabla: invoices
CREATE TABLE invoices (
  id VARCHAR(36) PRIMARY KEY,
  business_id VARCHAR(36) NOT NULL,
  client_id VARCHAR(36) NOT NULL,
  invoice_type_id VARCHAR(36),
  number VARCHAR(50) NOT NULL,
  date DATETIME NOT NULL,
  due_date DATETIME NOT NULL,
  concept TEXT NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  tax_amount DECIMAL(10,2) NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  status ENUM('draft', 'sent', 'paid', 'overdue', 'cancelled') NOT NULL DEFAULT 'draft',
  document_url VARCHAR(500),
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (business_id) REFERENCES businesses(id),
  FOREIGN KEY (client_id) REFERENCES clients(id),
  FOREIGN KEY (invoice_type_id) REFERENCES invoice_types(id)
);

-- Tabla: invoice_lines
CREATE TABLE invoice_lines (
  id VARCHAR(36) PRIMARY KEY,
  invoice_id VARCHAR(36) NOT NULL,
  description TEXT NOT NULL,
  quantity INT NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  tax_rate DECIMAL(5,2) NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (invoice_id) REFERENCES invoices(id)
);

-- Tabla: received_invoice_types
CREATE TABLE received_invoice_types (
  id VARCHAR(36) PRIMARY KEY,
  business_id VARCHAR(36) NOT NULL,
  name VARCHAR(255) NOT NULL,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (business_id) REFERENCES businesses(id)
);

-- Tabla: received_invoices
CREATE TABLE received_invoices (
  id VARCHAR(36) PRIMARY KEY,
  business_id VARCHAR(36) NOT NULL,
  received_invoice_type_id VARCHAR(36),
  number VARCHAR(50) NOT NULL,
  date DATETIME NOT NULL,
  due_date DATETIME NOT NULL,
  provider_name VARCHAR(255) NOT NULL,
  provider_nif VARCHAR(20) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  tax_amount DECIMAL(10,2) NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  status ENUM('pending', 'recorded', 'rejected', 'paid') NOT NULL DEFAULT 'pending',
  category VARCHAR(100),
  document_url VARCHAR(500),
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (business_id) REFERENCES businesses(id),
  FOREIGN KEY (received_invoice_type_id) REFERENCES received_invoice_types(id)
);

-- Tabla: projects
CREATE TABLE projects (
  id VARCHAR(36) PRIMARY KEY,
  business_id VARCHAR(36) NOT NULL,
  client_id VARCHAR(36),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  status ENUM('won', 'lost', 'pending') NOT NULL DEFAULT 'pending',
  start_date DATETIME,
  end_date DATETIME,
  contract_url VARCHAR(500),
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (business_id) REFERENCES businesses(id),
  FOREIGN KEY (client_id) REFERENCES clients(id)
);
```
Modelo de Proveedores (providers) y Relación con Facturas Recibidas
Tabla: providers

5. **Verificamos que todas las tablas y relaciones se crearon correctamente**
   - Usamos MySQL Workbench para inspeccionar la estructura y relaciones.

---CREATE TABLE providers (
  id VARCHAR(36) PRIMARY KEY,
  business_id VARCHAR(36) NOT NULL,
  name VARCHAR(255) NOT NULL,
  nif VARCHAR(20) NOT NULL,
  address VARCHAR(500) NOT NULL,
  postal_code VARCHAR(10),
  city VARCHAR(100),
  country VARCHAR(100) DEFAULT 'España',
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(255) NOT NULL,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (business_id) REFERENCES businesses(id)
);

Relación con Facturas Recibidas
ALTER TABLE received_invoices
ADD COLUMN provider_id VARCHAR(36) AFTER business_id;

ALTER TABLE received_invoices
ADD CONSTRAINT fk_received_invoices_provider
FOREIGN KEY (provider_id) REFERENCES providers(id);


## Resumen del comando principal usado

El comando principal fue simplemente **pegar y ejecutar el bloque SQL anterior** en MySQL Workbench conectado a la base de datos de producción.

---

**¡Con esto, la base de datos quedó lista y alineada con el código fuente!** 