# 🔧 CLAUDE CLI - PROBLEMA Y SOLUCIÓN COMPLETA

## 🚨 PROBLEMA IDENTIFICADO

### Error Principal
```
Error: Cannot find module './yoga.wasm'
Require stack:
- /opt/homebrew/lib/node_modules/@anthropic-ai/claude-code/cli.js
```

### Síntomas
- El comando `claude` no funciona desde el terminal
- Error persistente al intentar ejecutar cualquier comando de Claude
- El CLI de Claude funciona en otros proyectos pero no en este
- Error específico con el módulo `yoga.wasm` faltante

### Contexto
- **Sistema**: macOS (darwin 24.5.0)
- **Shell**: zsh
- **Node.js**: v24.3.0
- **Gestor de paquetes**: npm con Homebrew
- **Instalación**: Global via `npm install -g @anthropic-ai/claude-code`

## 🔍 DIAGNÓSTICO DETALLADO

### 1. Verificación de la Instalación
```bash
which claude
# Output: /opt/homebrew/bin/claude

ls -la /opt/homebrew/bin/claude
# Output: lrwxr-xr-x -> ../lib/node_modules/@anthropic-ai/claude-code/cli.js
```

### 2. Análisis del Directorio de Módulos
```bash
ls -la /opt/homebrew/lib/node_modules/@anthropic-ai/claude-code/
# Faltaba el archivo yoga.wasm en el directorio vendor/
```

### 3. Identificación de la Causa Raíz
- **Instalación corrupta**: El directorio `node_modules` estaba en un estado inconsistente
- **Archivo faltante**: `yoga.wasm` no se descargó correctamente durante la instalación
- **Enlaces simbólicos rotos**: El binario apuntaba a una instalación incompleta

## 🛠️ SOLUCIÓN APLICADA

### Paso 1: Limpieza Completa
```bash
# Eliminar el directorio corrupto de node_modules
rm -rf /opt/homebrew/lib/node_modules/@anthropic-ai

# Eliminar el enlace simbólico roto
rm /opt/homebrew/bin/claude
```

### Paso 2: Limpieza de Caché (Opcional)
```bash
# Limpiar caché de npm para evitar conflictos
npm cache clean --force
```

### Paso 3: Reinstalación Limpia
```bash
# Instalar la versión más reciente del CLI
npm install -g @anthropic-ai/claude-code@latest
```

### Paso 4: Verificación
```bash
# Verificar que funciona
claude --version
# Output: 1.0.86 (Claude Code)

claude --help
# Output: Muestra todas las opciones disponibles
```

## 🎯 SOLUCIÓN ALTERNATIVA (LOCAL)

### Si la instalación global sigue fallando:
```bash
# Instalar localmente en el proyecto
npm install @anthropic-ai/claude-code

# Usar con npx
npx claude --help
```

## 📋 CAUSAS RAÍZ IDENTIFICADAS

### 1. **Instalación Incompleta**
- El proceso de instalación se interrumpió o falló parcialmente
- Los archivos binarios no se descargaron completamente
- El directorio `vendor/` no se creó correctamente

### 2. **Conflicto de Versiones**
- Múltiples instalaciones del mismo paquete
- Caché de npm corrupto
- Enlaces simbólicos inconsistentes

### 3. **Permisos de Sistema**
- Problemas de permisos en `/opt/homebrew/`
- Instalación con diferentes usuarios
- Conflictos entre instalaciones globales y locales

### 4. **Dependencias Faltantes**
- El archivo `yoga.wasm` es una dependencia crítica para el CLI
- Fallo en la descarga de dependencias opcionales
- Problemas de red durante la instalación

## 🚀 PREVENCIÓN FUTURA

### 1. **Buenas Prácticas de Instalación**
```bash
# Siempre verificar la instalación
npm install -g @anthropic-ai/claude-code@latest
claude --version

# Si falla, limpiar y reinstalar
npm uninstall -g @anthropic-ai/claude-code
npm cache clean --force
npm install -g @anthropic-ai/claude-code@latest
```

### 2. **Verificación de Integridad**
```bash
# Verificar que todos los archivos están presentes
ls -la /opt/homebrew/lib/node_modules/@anthropic-ai/claude-code/vendor/
ls -la /opt/homebrew/lib/node_modules/@anthropic-ai/claude-code/

# Verificar el enlace simbólico
ls -la /opt/homebrew/bin/claude
```

### 3. **Mantenimiento Regular**
```bash
# Actualizar regularmente
npm update -g @anthropic-ai/claude-code

# Verificar estado de la instalación
claude doctor
```

## 🔧 COMANDOS DE DIAGNÓSTICO RÁPIDO

### Para identificar el problema rápidamente:
```bash
# 1. Verificar si el comando existe
which claude

# 2. Verificar si el enlace simbólico está roto
ls -la $(which claude)

# 3. Verificar si el directorio de módulos existe
ls -la /opt/homebrew/lib/node_modules/@anthropic-ai/claude-code/

# 4. Verificar archivos críticos
ls -la /opt/homebrew/lib/node_modules/@anthropic-ai/claude-code/vendor/

# 5. Probar ejecución
claude --version
```

### Si alguno de estos comandos falla, aplicar la solución completa.

## 📝 NOTAS IMPORTANTES

### 1. **Diferencias entre Entornos**
- El problema puede ser específico de macOS con Homebrew
- En otros sistemas, la ruta puede ser diferente
- Las soluciones pueden variar según el gestor de paquetes

### 2. **Alternativas de Instalación**
- **npm global**: `npm install -g @anthropic-ai/claude-code`
- **npm local**: `npm install @anthropic-ai/claude-code` + `npx claude`
- **Homebrew**: `brew install claude-code` (si está disponible)

### 3. **Monitoreo Continuo**
- Verificar regularmente que el CLI funciona
- Mantener actualizada la instalación
- Documentar cualquier cambio en el sistema

## ✅ VERIFICACIÓN FINAL

### Comandos para confirmar que todo funciona:
```bash
# Verificar versión
claude --version

# Verificar ayuda
claude --help

# Probar comando básico
claude "Hola, ¿funcionas?"

# Verificar configuración
claude config list
```

## 🎯 RESUMEN DE LA SOLUCIÓN

**Problema**: CLI de Claude corrupto por instalación incompleta
**Causa**: Archivo `yoga.wasm` faltante en la instalación global
**Solución**: Limpieza completa + reinstalación limpia
**Prevención**: Verificación regular y mantenimiento de la instalación

---

**Fecha de resolución**: 21 de agosto de 2025  
**Versión del CLI**: 1.0.86  
**Sistema**: macOS con Homebrew  
**Estado**: ✅ RESUELTO
