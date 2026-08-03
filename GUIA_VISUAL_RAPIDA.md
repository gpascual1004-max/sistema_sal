# 🎨 GUÍA VISUAL RÁPIDA - GESTIÓN DE FLETES

## 🎯 EN 5 PASOS

### PASO 1: Crear Supabase (2 min)
```
supabase.com → "Start your project"
    ↓
Nombre: gestion-fletes
Contraseña: xxxxxxxx
Región: Sudamérica/Argentina
    ↓
✅ Proyecto creado
    ↓
Settings → API → Copiar:
- URL: https://xxxxx.supabase.co
- Key: eyJhbGciOiJ...
```

### PASO 2: Crear SQL en Supabase (2 min)
```
Supabase → SQL Editor → New query
    ↓
Pegar contenido de: supabase_schema.sql
    ↓
Hacer clic: RUN
    ↓
✅ Mensaje: "Query successful"
```

### PASO 3: Crear Apps Script (3 min)
```
script.google.com → New project
    ↓
Nombre: Gestión de Fletes
    ↓
Copiar código: apps_script.gs
    ↓
Reemplazar líneas 5-6:
SUPABASE_URL = 'tu-url'
SUPABASE_KEY = 'tu-key'
    ↓
Ctrl+S (Guardar)
```

### PASO 4: Desplegar Web App (2 min)
```
Apps Script → Deploy → New deployment
    ↓
Select type: Web app
    ↓
Execute as: Tu cuenta
Access: Anyone
    ↓
Click: Deploy
    ↓
✅ Copiar URL que aparece
```

### PASO 5: Cargar Datos (1 min)
```
Abre URL del Apps Script
    ↓
Pestaña: Cargar Datos
    ↓
Selecciona: ejemplo_fletes.csv
    ↓
Botón: Cargar Fletes
    ↓
✅ Dashboard actualizado
```

---

## 📊 DASHBOARD - LAYOUT

```
┌─────────────────────────────────────────────────────────────┐
│  📊 Gestión de Fletes                                       │
│  Dashboard de Ingresos, Gastos y Márgenes                  │
└─────────────────────────────────────────────────────────────┘

┌─ Navegación ───────────────────────────────────────────────┐
│ [Dashboard] [Cargar Datos] [Fletes] [Clientes] [Reportes] │
└────────────────────────────────────────────────────────────┘

┌─ Métricas Principales (Grid 3x2) ──────────────────────────┐
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Total        │  │ Ingresos     │  │ Por Cobrar   │     │
│  │ Fletes       │  │ Fletes       │  │              │     │
│  │ 1,254        │  │ $1.419M      │  │ $250.000     │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Gastos       │  │ Ganancia     │  │ Margen       │     │
│  │ Totales      │  │ Neta         │  │ Neto         │     │
│  │ $500.000     │  │ $919.717M    │  │ 64.8%        │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└────────────────────────────────────────────────────────────┘

┌─ Gráficos ─────────────────────────────────────────────────┐
│  ┌────────────────────┐  ┌────────────────────┐           │
│  │ Ingresos vs Gastos │  │ Top 10 Proveedores │           │
│  │                    │  │                    │           │
│  │  📊 [Gráfico]      │  │  📊 [Gráfico]      │           │
│  │                    │  │                    │           │
│  └────────────────────┘  └────────────────────┘           │
└────────────────────────────────────────────────────────────┘
```

---

## 📱 PESTAÑA: CARGAR DATOS

```
┌─ Cargar Fletes ────────────────────────────────────────────┐
│ [📎 Seleccionar archivo] [🚀 Cargar Fletes]              │
│ ✅ 25 fletes insertados, 2 duplicados                     │
└────────────────────────────────────────────────────────────┘

┌─ Cargar Ventas ────────────────────────────────────────────┐
│ [📎 Seleccionar archivo] [🚀 Cargar Ventas]              │
│ ✅ 20 ventas insertadas                                   │
└────────────────────────────────────────────────────────────┘

┌─ Cargar Pagos ─────────────────────────────────────────────┐
│ [📎 Seleccionar archivo] [🚀 Cargar Pagos]               │
│ ✅ 20 pagos insertados                                    │
└────────────────────────────────────────────────────────────┘

┌─ Cargar Gastos ────────────────────────────────────────────┐
│ [📎 Seleccionar archivo] [🚀 Cargar Gastos]              │
│ ✅ 20 gastos insertados                                   │
└────────────────────────────────────────────────────────────┘
```

---

## 📋 PESTAÑA: FLETES

```
┌─ Lista de Fletes ──────────────────────────────────────────┐
│                                                             │
│ Fecha      │ Proveedor    │ Chofer      │ Detalle        │
├────────────┼──────────────┼─────────────┼────────────────┤
│ 2024-09-03 │ Loco         │ Carlos      │ ALBERDI        │
│ 2024-09-03 │ OLIVERA      │ Leo         │ ALBERDI        │
│ 2024-09-03 │ Diver        │ Fernando    │ ALBERDI        │
│ 2024-09-04 │ Rodrigo      │ Chiquitin   │ PLAS BAG       │
│ 2024-09-04 │ ARCE         │ Fredy       │ DEPOSITO       │
│                                                             │
│ Importe    │ IVA        │ Total       │ Estado        │
├────────────┼────────────┼─────────────┼───────────────┤
│ $950.000   │ -          │ $950.000    │ ✅ PAGADO     │
│ $950.000   │ -          │ $950.000    │ ✅ PAGADO     │
│ $950.000   │ -          │ $950.000    │ ✅ PAGADO     │
│ $950.000   │ $199.500   │ $1.149.500  │ ✅ PAGADO     │
│ $950.000   │ -          │ $950.000    │ ⏳ PENDIENTE   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 👥 PESTAÑA: SALDOS CLIENTES

```
┌─ Saldos de Clientes ───────────────────────────────────────┐
│                                                             │
│ Cliente                  │ Total Ventas │ Pagos │ Pendiente │
├──────────────────────────┼──────────────┼───────┼───────────┤
│ BENJAMIN SAN JUAN        │ $166.000     │ $90K  │ $76.000   │
│ BRONZEN S.A              │ $178.000     │ $78K  │ $100.000  │
│ CERALFA S.A              │ $185.000     │ $105K │ $80.000   │
│ DESCARTABLES DEL ESTE    │ $160.000     │ $65K  │ $95.000   │
│ OCHENTA&SIETE SA         │ $135.000     │ $85K  │ $50.000   │
│ A+ D SRL                 │ $218.000     │ $120K │ $98.000   │
│ AGROQUIMICOS MAUAL S.A   │ $207.500     │ $88K  │ $119.500  │
│ ALBERDI WORK SA          │ $134.000     │ $72K  │ $62.000   │
│ DANIEL FLAVIANI          │ $100.000     │ $45K  │ $55.000   │
│ DISEÑO E ILUMINACION     │ $205.000     │ $95K  │ $110.000  │
│                                                             │
│ ⚠️  Clientes con saldo pendiente: 10                      │
│ 💰 Total por cobrar: $845.500                             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 📈 PESTAÑA: REPORTES

```
┌─ Top 10 Proveedores ───────────────────────────────────────┐
│                                                             │
│ Proveedor            │ Fletes │ Total        │ Promedio    │
├──────────────────────┼────────┼──────────────┼─────────────┤
│ Rodrigo              │ 362    │ $385.000.000 │ $1.063.000  │
│ Loco                 │ 112    │ $125.000.000 │ $1.116.000  │
│ ARCE                 │ 138    │ $155.000.000 │ $1.123.000  │
│ Diver                │ 137    │ $145.000.000 │ $1.058.000  │
│ Ricardo Crespi       │ 95     │ $105.000.000 │ $1.105.000  │
│ Transporte D&F       │ 85     │ $98.000.000  │ $1.152.000  │
│ MAF                  │ 78     │ $88.000.000  │ $1.128.000  │
│ Transce              │ 72     │ $82.000.000  │ $1.138.000  │
│ Criseb SA            │ 68     │ $75.000.000  │ $1.102.000  │
│ Los Diaz             │ 58     │ $62.000.000  │ $1.068.000  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔧 ESTRUCTURA SUPABASE

```
supabase
├── clientes (2.796 registros)
│   ├── id (CLI0001...)
│   ├── nombre
│   └── nombre_limpio
│
├── proveedores (500+ registros)
│   ├── id
│   ├── nombre
│   ├── tipo (Proveedor/Chofer)
│   └── telefono
│
├── fletes (1.254 registros)
│   ├── id
│   ├── fecha_flete
│   ├── proveedor_id/nombre
│   ├── chofer_id/nombre
│   ├── importe
│   ├── iva
│   ├── total
│   └── estado (PAGADO/PENDIENTE)
│
├── ventas (27.384 registros)
│   ├── id
│   ├── fecha
│   ├── comprobante
│   ├── cliente_nombre
│   └── debe
│
├── pagos (6.325 registros)
│   ├── id
│   ├── fecha
│   ├── cliente_nombre
│   ├── haber
│   ├── efectivo
│   ├── transferencia
│   └── cheque_numero
│
└── gastos
    ├── id
    ├── fecha
    ├── categoria (Combustible, Alquiler, etc)
    ├── monto
    └── estado
```

---

## 💡 FLUJO DE DATOS

```
┌─────────────────┐
│   ERP (CSV)     │
│   Tu sistema    │
└────────┬────────┘
         │ Exportar CSV
         ▼
┌─────────────────────────┐
│  Google Apps Script     │  ◄─── Tu interfaz web
│  (Dashboard Web App)    │
└────────┬────────────────┘
         │ Procesar y enviar
         ▼
┌─────────────────────────┐
│      SUPABASE           │
│   Base de Datos         │
│   (Guardar datos)       │
└────────┬────────────────┘
         │ Leer datos
         ▼
┌─────────────────────────┐
│  Apps Script (HTML)     │
│  Mostrar gráficos y     │
│  reportes              │
└─────────────────────────┘
```

---

## ⚡ ATAJOS RÁPIDOS

| Necesito... | Voy a... | Resultado |
|-------------|----------|-----------|
| Ver ganancias | Dashboard → Tarjeta "Ganancia Neta" | Valor en $ |
| Cobrar a un cliente | Clientes → Buscar → Ver pendiente | Monto por cobrar |
| Top proveedores | Reportes → Primera tabla | Top 10 |
| Cargar datos nuevos | Cargar Datos → Seleccionar CSV | Sincronizado |
| Detectar duplicados | Sistema automático al cargar | Aviso en pantalla |
| Analizar márgenes | Dashboard → Tarjeta "Margen Neto" | Porcentaje |
| Filtrar por estado | Fletes → Estado = PAGADO | Tabla filtrada |

---

## 🎨 COLORES Y SIGNIFICADO

| Color | Significado | Ejemplo |
|-------|------------|---------|
| 🟢 Verde | Positivo/Ganancia | Ingresos, Pagado |
| 🔴 Rojo | Negativo/Pérdida | Gastos, Pendiente |
| 🟠 Naranja | Advertencia | Por cobrar |
| 🔵 Azul | Información/Total | Cantidad fletes |
| ⚪ Gris | Neutral/Histórico | Datos antiguos |

---

## 📞 ERRORES COMUNES Y SOLUCIONES

### "Couldn't connect to Supabase"
✅ Solución:
1. Revisa que copiaste bien la URL
2. Revisa que copiaste bien la API Key
3. Abre una pestaña nueva y accede a tu proyecto Supabase

### "Invalid CSV"
✅ Solución:
1. Asegúrate que la primera línea tiene los headers
2. No uses comas dentro de los valores
3. Guarda como UTF-8

### "Los datos no aparecen"
✅ Solución:
1. Recarga la página (F5)
2. Espera unos segundos (Supabase puede ser lento)
3. Verifica en Supabase que los datos se insertaron

### "Dashboard lento"
✅ Solución:
1. Cierra otras pestañas
2. Limpia caché del navegador
3. Actualiza la página

---

## ✨ RESUMEN

**Instalación:** 15 minutos
**Carga inicial:** 5 minutos
**Uso diario:** 2 minutos (cargar CSV)
**Valor:** Análisis completo de tu negocio

**¡Adelante! 🚀**
