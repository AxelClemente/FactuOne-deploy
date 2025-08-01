-- Migración para añadir campos de certificados a la tabla verifactu_config
-- IMPORTANTE: Ejecutar en MySQL después de actualizar el código

-- 1. Eliminar columna antigua de contraseña si existe
ALTER TABLE verifactu_config 
DROP COLUMN IF EXISTS certificate_password;

-- 2. Añadir nuevas columnas para certificados
ALTER TABLE verifactu_config 
ADD COLUMN certificate_password_encrypted TEXT NULL COMMENT 'Contraseña del certificado encriptada con AES-256',
ADD COLUMN certificate_uploaded_at TIMESTAMP NULL COMMENT 'Fecha y hora de carga del certificado',
ADD COLUMN certificate_valid_until DATE NULL COMMENT 'Fecha de expiración del certificado';

-- 3. Actualizar columna certificate_path si es necesario
ALTER TABLE verifactu_config 
MODIFY COLUMN certificate_path VARCHAR(500) NULL COMMENT 'Ruta completa al archivo de certificado';

-- 4. Añadir índice para búsquedas por expiración (opcional pero recomendado)
CREATE INDEX idx_certificate_expiration 
ON verifactu_config(certificate_valid_until) 
WHERE certificate_valid_until IS NOT NULL;

-- 5. Verificar estructura actualizada
DESCRIBE verifactu_config;

-- NOTA: Si la tabla no tiene la columna certificate_path, añadirla primero:
-- ALTER TABLE verifactu_config ADD COLUMN certificate_path VARCHAR(500) NULL;