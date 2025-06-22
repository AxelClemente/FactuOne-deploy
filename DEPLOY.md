# 🚀 Guía de Deploy - FactuOne

Esta guía te ayudará a desplegar la aplicación FactuOne en el servidor de producción.

## 📋 Información del Servidor

- **IP del Servidor**: 37.59.125.76
- **Usuario**: almalinux
- **Contraseña**: U*mjVJV7ci8q8kWWWyauQE
- **Base de Datos**: MySQL
  - Host: 37.59.125.76
  - Puerto: 3306
  - Esquema: factuone
  - Usuario: factuuser
  - Contraseña: F0rd@Rapt0r

## 🔧 Prerrequisitos

Antes de comenzar, asegúrate de tener instalado:

1. **Node.js** (versión 18 o superior)
2. **npm** o **pnpm**
3. **sshpass** (para automatizar las conexiones SSH)

### Instalar sshpass (Ubuntu/Debian):
```bash
sudo apt-get install sshpass
```

### Instalar sshpass (macOS):
```bash
brew install hudochenkov/sshpass/sshpass
```

## 📦 Pasos del Deploy

### 1. Configuración Inicial del Servidor

Ejecuta el script de configuración inicial:

```bash
chmod +x scripts/setup-server.sh
./scripts/setup-server.sh
```

Este script instalará:
- Node.js 18 (LTS)
- PM2 (Process Manager)
- Nginx (Proxy Reverso)
- Configurará el firewall

### 2. Configuración de MySQL

Ejecuta el script de configuración de MySQL:

```bash
chmod +x scripts/setup-mysql.sh
./scripts/setup-mysql.sh
```

Este script:
- Configurará el acceso remoto a MySQL
- Creará la base de datos `factuone`
- Creará el usuario `factuuser`
- Configurará los permisos necesarios

### 3. Ejecutar Migraciones

Ejecuta las migraciones de Drizzle:

```bash
chmod +x scripts/run-migrations.sh
./scripts/run-migrations.sh
```

### 4. Deploy de la Aplicación

Finalmente, ejecuta el deploy:

```bash
chmod +x scripts/deploy.sh
./scripts/deploy.sh
```

## 🔍 Verificación

Después del deploy, puedes verificar que todo funcione correctamente:

### Verificar la aplicación:
```bash
curl http://37.59.125.76
```

### Verificar el estado de PM2:
```bash
sshpass -p "U*mjVJV7ci8q8kWWWyauQE" ssh almalinux@37.59.125.76 "pm2 status"
```

### Verificar logs:
```bash
sshpass -p "U*mjVJV7ci8q8kWWWyauQE" ssh almalinux@37.59.125.76 "pm2 logs factuone"
```

## 🛠️ Comandos Útiles

### Reiniciar la aplicación:
```bash
sshpass -p "U*mjVJV7ci8q8kWWWyauQE" ssh almalinux@37.59.125.76 "pm2 restart factuone"
```

### Ver logs en tiempo real:
```bash
sshpass -p "U*mjVJV7ci8q8kWWWyauQE" ssh almalinux@37.59.125.76 "pm2 logs factuone --lines 100"
```

### Verificar estado de servicios:
```bash
sshpass -p "U*mjVJV7ci8q8kWWWyauQE" ssh almalinux@37.59.125.76 "sudo systemctl status nginx mysqld"
```

## 🔧 Configuración Manual (si es necesario)

### Variables de Entorno

Si necesitas configurar manualmente las variables de entorno, crea un archivo `.env.production` en el servidor:

```bash
sshpass -p "U*mjVJV7ci8q8kWWWyauQE" ssh almalinux@37.59.125.76 "cat > /home/almalinux/factuone/.env.production << 'EOF'
DATABASE_URL=mysql://factuuser:F0rd@Rapt0r@37.59.125.76:3306/factuone
NODE_ENV=production
NEXTAUTH_URL=https://37.59.125.76
NEXTAUTH_SECRET=factuone-production-secret-2024
APP_URL=https://37.59.125.76
EOF"
```

### Configuración de Nginx

Si necesitas modificar la configuración de Nginx:

```bash
sshpass -p "U*mjVJV7ci8q8kWWWyauQE" ssh almalinux@37.59.125.76 "sudo nano /etc/nginx/conf.d/factuone.conf"
```

Después de modificar Nginx:
```bash
sshpass -p "U*mjVJV7ci8q8kWWWyauQE" ssh almalinux@37.59.125.76 "sudo systemctl reload nginx"
```

## 🚨 Solución de Problemas

### Error de conexión a la base de datos:
1. Verificar que MySQL esté ejecutándose
2. Verificar que el puerto 3306 esté abierto
3. Verificar las credenciales de la base de datos

### Error de permisos:
```bash
sshpass -p "U*mjVJV7ci8q8kWWWyauQE" ssh almalinux@37.59.125.76 "sudo chown -R almalinux:almalinux /home/almalinux/factuone"
```

### Reiniciar todos los servicios:
```bash
sshpass -p "U*mjVJV7ci8q8kWWWyauQE" ssh almalinux@37.59.125.76 "sudo systemctl restart nginx mysqld && pm2 restart factuone"
```

## 📞 Soporte

Si encuentras problemas durante el deploy, verifica:

1. Los logs de PM2: `pm2 logs factuone`
2. Los logs de Nginx: `sudo journalctl -u nginx`
3. Los logs de MySQL: `sudo journalctl -u mysqld`

La aplicación estará disponible en: **http://37.59.125.76** 