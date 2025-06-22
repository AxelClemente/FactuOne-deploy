# 🚀 Deploy en Vercel - FactuOne

Esta guía te ayudará a desplegar FactuOne en Vercel usando la base de datos MySQL del cliente.

## 📋 Prerrequisitos

1. **Cuenta de Vercel** (gratuita)
2. **Cuenta de GitHub** 
3. **Node.js** instalado localmente
4. **Base de datos MySQL** configurada (ya tienes los datos del cliente)

## 🔧 Configuración Local

### 1. Preparar el repositorio

```bash
# Eliminar .git actual (si existe)
rm -rf .git

# Inicializar nuevo repositorio
git init
git add .
git commit -m "Initial commit - FactuOne CRM"

# Crear repositorio en GitHub y conectar
git remote add origin https://github.com/TU_USUARIO/factuone.git
git push -u origin main
```

### 2. Configurar variables de entorno

Crea un archivo `.env.local` para desarrollo:

```bash
# Base de datos MySQL del cliente
DATABASE_URL=mysql://factuuser:F0rd@Rapt0r@37.59.125.76:3306/factuone

# NextAuth.js
NEXTAUTH_SECRET=tu-secret-key-aqui
NEXTAUTH_URL=http://localhost:3000

# Configuración de la aplicación
NODE_ENV=development
APP_URL=http://localhost:3000
```

### 3. Configurar la base de datos

```bash
# Ejecutar migraciones
npx drizzle-kit push:mysql
```

## 🚀 Deploy en Vercel

### 1. Conectar con Vercel

1. Ve a [vercel.com](https://vercel.com)
2. Inicia sesión con tu cuenta de GitHub
3. Haz clic en "New Project"
4. Importa tu repositorio de GitHub

### 2. Configurar variables de entorno en Vercel

En la configuración del proyecto en Vercel, agrega estas variables:

```
DATABASE_URL=mysql://factuuser:F0rd@Rapt0r@37.59.125.76:3306/factuone
NEXTAUTH_SECRET=tu-secret-key-muy-seguro-aqui
NEXTAUTH_URL=https://tu-app.vercel.app
NODE_ENV=production
APP_URL=https://tu-app.vercel.app
```

### 3. Configurar build settings

Vercel detectará automáticamente que es un proyecto Next.js, pero puedes verificar:

- **Framework Preset**: Next.js
- **Build Command**: `npm run build`
- **Output Directory**: `.next`
- **Install Command**: `npm install`

### 4. Deploy

1. Haz clic en "Deploy"
2. Espera a que termine el build
3. Verifica que la aplicación funcione

## 🔍 Verificación

### 1. Verificar la aplicación
- Navega a tu URL de Vercel
- Verifica que la página de login aparezca
- Prueba crear una cuenta

### 2. Verificar la base de datos
- Verifica que las tablas se crearon correctamente
- Prueba crear un negocio y un usuario

### 3. Verificar logs
- En Vercel Dashboard, ve a "Functions" para ver logs
- Verifica que no hay errores de conexión a la base de datos

## 🛠️ Comandos útiles

### Verificar build localmente:
```bash
npm run build
```

### Ejecutar migraciones:
```bash
npx drizzle-kit push:mysql
```

### Verificar esquema:
```bash
npx drizzle-kit studio
```

## 🚨 Solución de problemas

### Error de conexión a la base de datos:
1. Verificar que la IP de Vercel esté permitida en MySQL
2. Verificar las credenciales de la base de datos
3. Verificar que el puerto 3306 esté abierto

### Error de build:
1. Verificar que todas las dependencias estén en `package.json`
2. Verificar que no haya errores de TypeScript
3. Verificar los logs de build en Vercel

### Error de NextAuth:
1. Verificar que `NEXTAUTH_SECRET` esté configurado
2. Verificar que `NEXTAUTH_URL` coincida con tu dominio de Vercel

## 📞 Transferir al cliente

Una vez que todo funcione correctamente:

1. **Pasar el código al repositorio del cliente**
2. **El cliente conecta su cuenta de Vercel**
3. **Configura las mismas variables de entorno**
4. **Hace el deploy**

## 🎯 URLs importantes

- **Vercel Dashboard**: https://vercel.com/dashboard
- **Documentación de Vercel**: https://vercel.com/docs
- **Next.js en Vercel**: https://vercel.com/docs/functions/serverless-functions/runtimes/nodejs

¡Tu aplicación estará disponible en: `https://tu-app.vercel.app`! 🎉 