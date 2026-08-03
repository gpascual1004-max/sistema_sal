# ✅ CHECKLIST DE INSTALACIÓN

## Sigue este checklist para instalar sin errores

---

## FASE 1: SUPABASE (5 minutos)

- [ ] Abre [supabase.com](https://supabase.com)
- [ ] Haz clic en "Start your project"
- [ ] Inicia sesión con Google o crea cuenta
- [ ] Espera a que se cargue el dashboard
- [ ] Haz clic en "New Project"
- [ ] Completa:
  - [ ] Name: `gestion-fletes`
  - [ ] Password: Escribe una contraseña fuerte y **GUÁRDALA**
  - [ ] Region: Selecciona la más cercana
  - [ ] Plan: Elige "Free"
- [ ] Haz clic en "Create new project"
- [ ] Espera 2-3 minutos a que se inicialice
- [ ] Verás el dashboard de Supabase
- [ ] En el panel izquierdo, haz clic en **"Settings"**
- [ ] Busca **"API"** en el menú
- [ ] Copia y **guarda en un archivo de texto:**
  - [ ] Project URL (ejemplo: `https://xxxxx.supabase.co`)
  - [ ] Anon Public Key (la primera clave bajo "Project API Keys")
- [ ] En el panel izquierdo, haz clic en **"SQL Editor"**
- [ ] Haz clic en **"New query"**
- [ ] Abre el archivo `supabase_schema.sql` que descargaste
- [ ] Copia TODO el contenido
- [ ] Pégalo en el editor SQL de Supabase
- [ ] Haz clic en **"RUN"** (botón azul)
- [ ] Espera a que termine (debe mostrar "Query successful")
- [ ] En el panel izquierdo, haz clic en **"Table Editor"**
- [ ] Verifica que aparecen las tablas:
  - [ ] clientes
  - [ ] proveedores
  - [ ] fletes
  - [ ] ventas
  - [ ] pagos
  - [ ] gastos

✅ **FASE 1 COMPLETA: Supabase lista**

---

## FASE 2: GOOGLE APPS SCRIPT (5 minutos)

- [ ] Abre [script.google.com](https://script.google.com)
- [ ] Inicia sesión con tu cuenta Google
- [ ] Haz clic en **"New project"** (botón azul)
- [ ] Dale un nombre: `Gestion de Fletes`
- [ ] Haz clic en el área de código
- [ ] **SELECCIONA TODO** (Ctrl+A)
- [ ] **ELIMINA TODO** lo que había por defecto
- [ ] Abre el archivo `apps_script.gs` que descargaste
- [ ] Copia TODO el contenido
- [ ] Pégalo en el editor de Apps Script
- [ ] En el código, busca la línea 5 que dice:
  ```javascript
  const SUPABASE_URL = 'YOUR_SUPABASE_URL';
  ```
- [ ] Reemplázala con tu URL de Supabase:
  ```javascript
  const SUPABASE_URL = 'https://tu-proyecto.supabase.co';
  ```
- [ ] En el código, busca la línea 6 que dice:
  ```javascript
  const SUPABASE_KEY = 'YOUR_SUPABASE_ANON_KEY';
  ```
- [ ] Reemplázala con tu API Key de Supabase:
  ```javascript
  const SUPABASE_KEY = 'eyJhbGc...'; // Tu clave aquí
  ```
- [ ] Guarda el proyecto: **Ctrl+S** o **Cmd+S**
- [ ] Aparecerá un cuadro "Guardar proyecto" (normal)
- [ ] Espera a que aparezca "✅ Proyecto guardado"
- [ ] En la parte superior, haz clic en **"Deploy"**
- [ ] Selecciona **"New deployment"** (si no aparece, busca el botón ▼)
- [ ] En "Select type", elige **"Web app"**
- [ ] En la configuración:
  - [ ] Execute as: Tu cuenta de Google
  - [ ] Who has access: "Anyone"
- [ ] Haz clic en **"Deploy"** (botón azul)
- [ ] Espera a que aparezca el diálogo de confirmación
- [ ] Copia la **URL de despliegue** que aparece (ejemplo: `https://script.google.com/macros/d/...`)
- [ ] **Guarda esta URL**, es tu dashboard

✅ **FASE 2 COMPLETA: Apps Script desplegado**

---

## FASE 3: CARGAR DATOS DE PRUEBA (2 minutos)

- [ ] Abre en una pestaña nueva la **URL del Apps Script** (la que copiaste)
- [ ] Verás un dashboard con colores morados y azules
- [ ] En la parte superior, haz clic en la pestaña **"Cargar Datos"**
- [ ] Busca la sección **"Cargar Fletes (CSV)"**
- [ ] Haz clic en **"Seleccionar archivo"**
- [ ] Abre el archivo `ejemplo_fletes.csv` que descargaste
- [ ] Haz clic en **"Cargar Fletes"** (botón azul)
- [ ] Espera unos segundos
- [ ] Verás un mensaje verde: ✅ "Fletes: 25 insertados, 2 duplicados detectados"
- [ ] Haz clic en la pestaña **"Dashboard"**
- [ ] **¡Verás tus datos!** Los números deben ser:
  - [ ] Total Fletes: 25 (o más si cargaste tus datos)
  - [ ] Ingresos Fletes: $26.200.000 (aproximado)
  - [ ] Gráficos con datos

✅ **FASE 3 COMPLETA: Dashboard con datos**

---

## FASE 4: CARGAR TUS DATOS (5 minutos)

- [ ] Exporta tu CSV del ERP con estructura:
  - [ ] FECHA FLETE, PROVEEDOR, CHOFER, DETALLE, etc
  - [ ] (Usa `ejemplo_fletes.csv` como referencia de formato)
- [ ] En el Apps Script, pestaña **"Cargar Datos"**
- [ ] Sección **"Cargar Fletes (CSV)"**
- [ ] Selecciona tu archivo CSV
- [ ] Haz clic en **"Cargar Fletes"**
- [ ] Espera el mensaje de confirmación
- [ ] Repite para:
  - [ ] Ventas (archivo CSV de ventas/ingresos)
  - [ ] Pagos (archivo CSV de pagos de clientes)
  - [ ] Gastos (archivo CSV de gastos/egresos)
- [ ] Vuelve al **"Dashboard"**
- [ ] Verifica que los números se actualizaron
- [ ] Comprueba:
  - [ ] Total Fletes
  - [ ] Ingresos totales
  - [ ] Gastos totales
  - [ ] Ganancia neta
  - [ ] Margen neto (%)

✅ **FASE 4 COMPLETA: Datos sincronizados**

---

## FASE 5: VERIFICACIÓN FINAL (3 minutos)

Verifica que todo funciona haciendo clic en cada pestaña:

- [ ] **Dashboard**
  - [ ] Muestra las 6 métricas principales
  - [ ] Gráficos visibles
  - [ ] Números correctos

- [ ] **Cargar Datos**
  - [ ] Puedes seleccionar archivos
  - [ ] Aparecen mensajes de confirmación

- [ ] **Fletes**
  - [ ] Tabla visible con todas las columnas
  - [ ] Datos ordenables (haz clic en encabezados)

- [ ] **Saldos Clientes**
  - [ ] Tabla con clientes y saldos pendientes
  - [ ] Números coinc iden con Dashboard

- [ ] **Reportes**
  - [ ] Tabla de Top 10 Proveedores
  - [ ] Números correctos

✅ **FASE 5 COMPLETA: Sistema verificado**

---

## CHECKLIST DE DATOS

Verifica que en Supabase tienes:

- [ ] En **Table Editor**, abre tabla `fletes`
  - [ ] Haz clic en la tabla
  - [ ] Verifica que hay registros (lado derecho muestra "X rows")
  - [ ] Comprueba columnas: fecha_flete, proveedor_nombre, chofer_nombre, importe

- [ ] En **Table Editor**, abre tabla `ventas`
  - [ ] Verifica que hay registros

- [ ] En **Table Editor**, abre tabla `pagos`
  - [ ] Verifica que hay registros

- [ ] En **Table Editor**, abre tabla `gastos`
  - [ ] Verifica que hay registros

✅ **DATOS VERIFICADOS**

---

## PROBLEMAS COMUNES Y SOLUCIONES

Si ves mensajes de error, aquí están las soluciones:

### ❌ "API Key not found" o "Cannot connect"
**Solución:**
- [ ] Copia nuevamente tu API Key desde Supabase → Settings → API
- [ ] Copia la línea que dice "Project API Key" (la con `ey...`)
- [ ] Abre Google Apps Script
- [ ] Busca la línea con `SUPABASE_KEY =`
- [ ] Reemplázala
- [ ] Guarda (Ctrl+S)
- [ ] Redeploy desde Deploy → gestión-fletes → Deploy

### ❌ "Invalid file" o "CSV error"
**Solución:**
- [ ] Verifica que la primera línea tiene los headers correctos
- [ ] Compara con `ejemplo_fletes.csv`
- [ ] Asegúrate que el archivo está en UTF-8
- [ ] En Excel: Guardar como → CSV UTF-8

### ❌ "Database error"
**Solución:**
- [ ] Verifica que ejecutaste el SQL schema en Supabase
- [ ] Abre Supabase → Table Editor
- [ ] Debe haber 8 tablas creadas
- [ ] Si no hay, copia el SQL nuevamente y ejecuta

### ❌ "Dashboard muestra 0"
**Solución:**
- [ ] Recarga la página (F5)
- [ ] Espera 10 segundos
- [ ] Abre Supabase y verifica que hay datos en las tablas
- [ ] Si no hay datos, carga los CSV nuevamente

### ❌ "Puedo cargar CSV pero no aparece en dashboard"
**Solución:**
- [ ] Abre Supabase → Table Editor → fletes
- [ ] ¿Ves los datos que acabas de cargar?
- Si SÍ: Recarga dashboard (F5)
- Si NO: Verifica formato del CSV (primero usar ejemplo_fletes.csv)

---

## MANTENIMIENTO MENSUAL

Haz esto cada mes:

- [ ] **Exporta tu CSV del ERP** con los nuevos datos
- [ ] **Carga en el dashboard** (Cargar Datos)
- [ ] **Verifica totales** en el Dashboard
- [ ] **Revisa saldos pendientes** en Saldos Clientes
- [ ] **Haz backup** (Supabase → Settings → Backups)

---

## SEGURIDAD

⚠️ **IMPORTANTE:**

- [ ] Nunca compartas tu URL de Apps Script con gente no autorizada
- [ ] Nunca compartas tu API Key de Supabase
- [ ] Si accidentalmente la compartiste, regenera la key en Supabase
- [ ] Haz backups regularmente de tus datos

---

## ¿LISTO?

Si completaste todos los ✅, tu sistema está 100% funcional.

**¡Felicidades! 🎉**

Ya tienes un sistema profesional de gestión de fletes con:
- ✅ Dashboard interactivo
- ✅ Cálculo de márgenes
- ✅ Saldos de clientes
- ✅ Análisis financiero
- ✅ Detección de duplicados
- ✅ Todo en la nube

---

## PRÓXIMOS PASOS (Opcionales)

- Automatizar cargas (webhooks)
- Agregar más gráficos
- Enviar reportes por email
- Integración con contabilidad
- App móvil nativa

¿Preguntas? Revisa los otros documentos o consulta con soporte.

**¡Adelante! 🚀**
