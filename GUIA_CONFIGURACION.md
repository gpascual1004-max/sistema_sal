# 🚀 GUÍA COMPLETA: GESTIÓN DE FLETES CON SUPABASE + APPS SCRIPT

## 📋 ÍNDICE
1. Configurar Supabase
2. Configurar Google Apps Script
3. Cargar datos iniciales
4. Usar el dashboard

---

## 1️⃣ CONFIGURAR SUPABASE

### Paso 1.1: Crear el proyecto

1. Ve a [supabase.com](https://supabase.com)
2. Haz clic en "Start your project" / "New Project"
3. Completa:
   - **Project name**: `gestion-fletes` (o el nombre que prefieras)
   - **Database password**: Usa una contraseña segura y **guárdala**
   - **Region**: Elige la más cercana a tu ubicación
   - **Pricing**: Free tier es suficiente para comenzar

4. Haz clic en "Create new project"
5. Espera a que se inicialice (unos 2-3 minutos)

### Paso 1.2: Obtener credenciales

Una vez creado el proyecto:

1. En el panel izquierdo, haz clic en **Settings** → **API**
2. Copia:
   - **URL**: Busca "Project URL" (ejemplo: `https://xxxxx.supabase.co`)
   - **API Key**: Busca "anon public" (la clave pública)
3. Guarda estos valores en un archivo de texto

### Paso 1.3: Crear las tablas

1. En Supabase, ve a **SQL Editor**
2. Haz clic en "New query"
3. Copia TODO el contenido del archivo `supabase_schema.sql`
4. Pégalo en el editor
5. Haz clic en **"Run"** (botón azul)
6. Espera a que se ejecute

✅ Verás un mensaje: "Query successful"

**Las tablas creadas son:**
- `clientes` - Información de clientes
- `proveedores` - Proveedores y choferes
- `fletes` - Datos de transportes
- `ventas` - Ingresos por ventas
- `pagos` - Pagos de clientes
- `gastos` - Egresos/gastos
- `saldos_clientes` - Resumen de saldos

---

## 2️⃣ CONFIGURAR GOOGLE APPS SCRIPT

### Paso 2.1: Crear un nuevo proyecto

1. Ve a [script.google.com](https://script.google.com)
2. Haz clic en "New project"
3. Nómbralo: "Gestión de Fletes"

### Paso 2.2: Copiar el código

1. En la pestaña `Code.gs`, **elimina TODO el contenido** por defecto
2. Copia TODO el contenido del archivo `apps_script.gs`
3. Pégalo en `Code.gs`
4. Guarda el proyecto (Ctrl+S o Cmd+S)

### Paso 2.3: Agregar tus credenciales de Supabase

En el Apps Script, **modifica estas líneas al inicio:**

```javascript
// CONFIGURACIÓN SUPABASE
const SUPABASE_URL = 'https://tu-proyecto.supabase.co'; // ← REEMPLAZA
const SUPABASE_KEY = 'tu-api-key-anon'; // ← REEMPLAZA
```

**Donde:**
- `SUPABASE_URL`: La URL que copiaste en Paso 1.2
- `SUPABASE_KEY`: La API Key que copiaste en Paso 1.2

Ejemplo:
```javascript
const SUPABASE_URL = 'https://mybzxlskqhvwerty.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
```

### Paso 2.4: Desplegar como Web App

1. En el Apps Script, haz clic en **"Deploy"** (botón arriba a la derecha)
2. Selecciona **"New deployment"**
3. En "Select type", elige **"Web app"**
4. Configura:
   - **Execute as**: Tu cuenta de Google
   - **Who has access**: "Anyone"
5. Haz clic en **"Deploy"**
6. Copia la **URL de despliegue** que aparece

✅ Ahora tienes tu dashboard web app listo

---

## 3️⃣ CARGAR DATOS INICIALES

### Opción A: Desde el Dashboard (Recomendado)

1. Abre la URL del Apps Script en tu navegador
2. Haz clic en la pestaña **"Cargar Datos"**
3. Carga tu CSV del ERP en cada sección:
   - 📤 Fletes
   - 📤 Ventas
   - 📤 Pagos
   - 📤 Gastos
4. Verás mensajes de confirmación

### Opción B: Desde Supabase (Para datos en lote)

1. En Supabase, ve a **Table Editor**
2. Abre la tabla `fletes`
3. Haz clic en el ícono "+" arriba a la derecha
4. Selecciona **"Insert row"** o **"Import data"**
5. Pega tus datos

---

## 4️⃣ USAR EL DASHBOARD

### Pestaña: Dashboard
- 📊 **Resumen financiero** en tiempo real
- 💰 Total de ingresos, gastos y ganancia neta
- 📈 Gráficos de ingresos vs gastos
- 👑 Top 10 proveedores

### Pestaña: Cargar Datos
- 📤 Sube archivos CSV del ERP
- 🧹 Detecta y elimina duplicados automáticamente
- ✅ Sincroniza con Supabase

### Pestaña: Fletes
- 📋 Tabla de todos los fletes
- 🔍 Filtra por estado (PAGADO/PENDIENTE)
- 📊 Ver detalles: proveedor, chofer, importe, etc

### Pestaña: Saldos Clientes
- 👥 Deuda total de cada cliente
- 💵 Total vendido vs pagado
- 📌 Identifica clientes con saldo pendiente

### Pestaña: Reportes
- 📈 Top proveedores
- 💰 Análisis de márgenes
- 📊 Tendencias de negocio

---

## 📝 FORMATO DE ARCHIVOS CSV

### CSV de Fletes
```
FECHA FLETE,PROVEEDOR,CHOFER,DETALLE,REMITO,IMPORTE,IVA,FACTURA,ESTADO,CHEQUE N°,FECHA PAGO,OBSERVACIONES
2024-09-03,Rodrigo,Chiquitin,Deposito,12345,1000000,210000,1084,PAGADO,62436950,2024-10-07,Cheque propio
```

### CSV de Ventas
```
Fecha,Comprobante,Cliente,Cliente Limpio,Debe,observaciones
2024-09-01,01-000072,BENJAMIN SAN JUAN,BENJAMIN SAN JUAN,76806,
```

### CSV de Pagos
```
Fecha,Cliente,Haber,EFECTIVO,TRANSFERENCIA,N° CHEQUE,BANCO,IMPORTE_CH,observaciones
2024-09-01,BRONZEN S.A,100000,100000,0,,,,
```

### CSV de Gastos
```
Fecha,Categoria,Descripcion,Monto,Proveedor,MetodoPago,ChequeNumero,Observaciones,Estado
2024-09-01,Combustible,Nafta Mercedes,50000,YPF,EFECTIVO,,Tanque lleno,PAGADO
```

---

## 🔧 MANTENIMIENTO Y TIPS

### Actualizar datos regularmente
- Exporta tu CSV del ERP
- Carga en el dashboard cada semana/mes
- El sistema detecta duplicados automáticamente

### Hacer backup
1. En Supabase, ve a **Settings** → **Database Backups**
2. Haz clic en **"Request backup"**
3. Descargará un archivo SQL con toda tu data

### Mejorar el dashboard
- Modifica los gráficos en el código HTML
- Agrega más métricas según necesites
- Personaliza colores y diseño

### Errores comunes

**Error: "Couldn't connect to Supabase"**
- Verifica que copiaste correctamente URL y API Key
- Asegúrate de que tus credenciales son válidas

**Error: "Invalid CSV"**
- Asegúrate que la primera línea son los headers (nombres de columnas)
- Los valores no deben contener comas (usa ";" en su lugar)

**Los datos no aparecen en el dashboard**
- Recarga la página (F5)
- Verifica que cargaste los datos en las tablas correctas

---

## 📞 SOPORTE

- **Supabase Docs**: https://supabase.com/docs
- **Apps Script Docs**: https://developers.google.com/apps-script
- **Preguntas**: Consulta los documentos o busca en Stack Overflow

---

## ✨ ¿QUÉ SIGUE?

Opcionales para mejorar:

1. **Agregar más gráficos** - Tendencias mensuales, por proveedor, etc
2. **Automatización** - Sincronizar CSV automáticamente del ERP
3. **Alertas** - Notificaciones para saldos vencidos
4. **Exportar reportes** - Generar PDF/Excel automáticamente
5. **Integración con Gmail** - Enviar reportes por email

¿Quieres que agregue alguno de estos? 🚀
