-- ============================================
-- SCHEMA PARA SUPABASE - GESTIÓN DE FLETES
-- ============================================

-- Tabla: Clientes
CREATE TABLE clientes (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  nombre_limpio TEXT,
  email TEXT,
  telefono TEXT,
  direccion TEXT,
  ciudad TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabla: Proveedores/Choferes
CREATE TABLE proveedores (
  id SERIAL PRIMARY KEY,
  nombre TEXT NOT NULL UNIQUE,
  tipo TEXT, -- 'Proveedor', 'Chofer'
  contacto TEXT,
  telefono TEXT,
  banco TEXT,
  cuenta TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabla: Fletes (Transportes)
CREATE TABLE fletes (
  id SERIAL PRIMARY KEY,
  fecha_flete DATE NOT NULL,
  proveedor_id INTEGER REFERENCES proveedores(id),
  proveedor_nombre TEXT,
  chofer_id INTEGER REFERENCES proveedores(id),
  chofer_nombre TEXT,
  detalle TEXT,
  remito TEXT,
  importe DECIMAL(12,2) NOT NULL,
  iva DECIMAL(12,2) DEFAULT 0,
  total DECIMAL(12,2) DEFAULT 0,
  factura TEXT,
  estado TEXT DEFAULT 'PENDIENTE', -- PENDIENTE, PAGADO
  cheque_numero TEXT,
  fecha_pago DATE,
  observaciones TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabla: Ventas/Ingresos
CREATE TABLE ventas (
  id SERIAL PRIMARY KEY,
  fecha DATE NOT NULL,
  comprobante TEXT NOT NULL UNIQUE,
  cliente_id TEXT REFERENCES clientes(id),
  cliente_nombre TEXT,
  debe DECIMAL(12,2) NOT NULL,
  observaciones TEXT,
  estado TEXT DEFAULT 'PENDIENTE',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabla: Pagos (Ingresos de clientes)
CREATE TABLE pagos (
  id SERIAL PRIMARY KEY,
  fecha DATE NOT NULL,
  cliente_id TEXT REFERENCES clientes(id),
  cliente_nombre TEXT,
  haber DECIMAL(12,2) NOT NULL,
  efectivo DECIMAL(12,2) DEFAULT 0,
  transferencia DECIMAL(12,2) DEFAULT 0,
  cheque_numero TEXT,
  banco TEXT,
  importe_cheque DECIMAL(12,2) DEFAULT 0,
  observaciones TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabla: Gastos/Egresos
CREATE TABLE gastos (
  id SERIAL PRIMARY KEY,
  fecha DATE NOT NULL,
  categoria TEXT, -- legado, ver "rubro"
  rubro TEXT, -- Combustible, Alquiler, Sueldos, etc (reemplaza a categoria)
  descripcion TEXT,
  monto DECIMAL(12,2) NOT NULL,
  proveedor TEXT,
  proveedor_id INTEGER REFERENCES proveedores(id),
  metodo_pago TEXT, -- Efectivo, Cheque, Transferencia
  cheque_numero TEXT,
  observaciones TEXT,
  estado TEXT DEFAULT 'PENDIENTE',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabla: Saldos de Clientes (Vista materializada para reportes rápidos)
CREATE TABLE saldos_clientes (
  id SERIAL PRIMARY KEY,
  cliente_id TEXT REFERENCES clientes(id),
  cliente_nombre TEXT,
  total_ventas DECIMAL(12,2) DEFAULT 0,
  total_pagos DECIMAL(12,2) DEFAULT 0,
  saldo_pendiente DECIMAL(12,2) DEFAULT 0,
  dias_atraso INTEGER DEFAULT 0,
  last_venta DATE,
  last_pago DATE,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabla: Resumen por Período (Para dashboard)
CREATE TABLE resumen_periodos (
  id SERIAL PRIMARY KEY,
  periodo TEXT NOT NULL, -- 'YYYY-MM'
  total_fletes INTEGER DEFAULT 0,
  total_importe_fletes DECIMAL(12,2) DEFAULT 0,
  total_iva_fletes DECIMAL(12,2) DEFAULT 0,
  total_ventas DECIMAL(12,2) DEFAULT 0,
  total_pagos DECIMAL(12,2) DEFAULT 0,
  total_gastos DECIMAL(12,2) DEFAULT 0,
  ganancia_neta DECIMAL(12,2) DEFAULT 0,
  margen_porcentaje DECIMAL(5,2) DEFAULT 0,
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(periodo)
);

-- Tabla: Cheques Recibidos
CREATE TABLE cheques (
  id SERIAL PRIMARY KEY,
  banco TEXT,
  fecha_emision DATE,
  fecha_pago DATE,
  numero TEXT,
  importe DECIMAL(12,2) DEFAULT 0,
  tipo TEXT DEFAULT 'cartera', -- 'cartera' | 'no_cartera'
  dias INTEGER DEFAULT 0,
  fecha_vencimiento DATE,
  estado TEXT DEFAULT 'DISPONIBLE', -- 'DISPONIBLE' | 'ENTREGADO'
  monto_salida DECIMAL(12,2),
  fecha_salida DATE,
  cliente_nombre TEXT,
  cliente_id TEXT REFERENCES clientes(id),
  pago_id INTEGER REFERENCES pagos(id),
  gasto_id INTEGER REFERENCES gastos(id), -- cheque usado para pagar un gasto (queda "entregado": fecha_salida seteada)
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabla: Cheques Emitidos (pagos a proveedores/choferes con cheque)
-- Columnas alineadas 1 a 1 con la hoja "cheques propio" del Excel:
-- fecha, Operación, cliente/proveed, Descripcion, Detalle, DEB_O_CHEQUE (numero_cheque),
-- banco, Importe, Fecha emisión, Fecha Pago, Tipo, estado.
-- "chofer" y "detalle_2" quedan en la tabla por compatibilidad con datos viejos, pero ya
-- no se usan desde el formulario ni la carga de Cheques Emitidos.
CREATE TABLE cheques_emitidos (
  id SERIAL PRIMARY KEY,
  fecha DATE,
  operacion TEXT,      -- columna "Operación" del Excel
  cliente_proveed TEXT,
  descripcion TEXT,    -- columna "Descripcion" del Excel
  detalle TEXT,        -- columna "Detalle" del Excel
  chofer TEXT,         -- legado, sin uso en el formulario actual
  detalle_2 TEXT,       -- legado, sin uso en el formulario actual
  numero_cheque TEXT,
  banco TEXT,
  importe_cheque DECIMAL(12,2),
  fecha_emis DATE,
  fecha_pago DATE,
  tipo_cheque TEXT DEFAULT 'CHEQUE PROPIO', -- 'CHEQUE PROPIO', 'CHEQUE TERCERO'
  estado TEXT DEFAULT 'PENDIENTE',          -- 'PENDIENTE', 'PAGADO', 'RECHAZADO', 'ANULADO', 'ENTREGADO'
  gasto_id INTEGER REFERENCES gastos(id),   -- gasto que se pagó con este cheque emitido
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ÍNDICES para optimizar queries
CREATE INDEX idx_fletes_fecha ON fletes(fecha_flete);
CREATE INDEX idx_fletes_proveedor ON fletes(proveedor_nombre);
CREATE INDEX idx_fletes_estado ON fletes(estado);
CREATE INDEX idx_ventas_cliente ON ventas(cliente_nombre);
CREATE INDEX idx_ventas_fecha ON ventas(fecha);
CREATE INDEX idx_pagos_cliente ON pagos(cliente_nombre);
CREATE INDEX idx_pagos_fecha ON pagos(fecha);
CREATE INDEX idx_gastos_categoria ON gastos(categoria);
CREATE INDEX idx_gastos_fecha ON gastos(fecha);
CREATE INDEX idx_gastos_rubro ON gastos(rubro);
CREATE INDEX idx_gastos_proveedor ON gastos(proveedor);
CREATE INDEX idx_proveedores_nombre ON proveedores(nombre);
CREATE INDEX idx_saldos_cliente ON saldos_clientes(cliente_nombre);
CREATE INDEX idx_cheques_banco ON cheques(banco);
CREATE INDEX idx_cheques_vencimiento ON cheques(fecha_vencimiento);
CREATE INDEX idx_cheques_cliente ON cheques(cliente_nombre);
CREATE INDEX idx_cheques_em_banco ON cheques_emitidos(banco);
CREATE INDEX idx_cheques_em_fecha_pago ON cheques_emitidos(fecha_pago);
CREATE INDEX idx_cheques_em_estado ON cheques_emitidos(estado);

-- PERMISOS (Opcional - para seguridad)
-- ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE fletes ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE ventas ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE pagos ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE gastos ENABLE ROW LEVEL SECURITY;

-- ============================================
-- VISTA: Resumen mensual de ventas/pagos por cliente
-- Usada por la pestaña "Saldos Clientes" para no tener que traer
-- cada fila de ventas y pagos al navegador y sumarlas ahí (lento
-- con miles de registros). Postgres hace el GROUP BY y solo viaja
-- una fila por cliente/mes con actividad.
-- ============================================
CREATE OR REPLACE VIEW resumen_ventas_pagos_mensual AS
SELECT
  COALESCE(v.cliente_nombre, p.cliente_nombre) AS cliente_nombre,
  COALESCE(v.anio, p.anio)                     AS anio,
  COALESCE(v.mes, p.mes)                       AS mes,
  COALESCE(v.ventas, 0)                        AS ventas,
  COALESCE(p.pagos, 0)                         AS pagos
FROM (
  SELECT cliente_nombre,
         EXTRACT(YEAR FROM fecha)::int  AS anio,
         EXTRACT(MONTH FROM fecha)::int AS mes,
         SUM(debe) AS ventas
  FROM ventas
  WHERE cliente_nombre IS NOT NULL AND cliente_nombre <> ''
  GROUP BY cliente_nombre, anio, mes
) v
FULL OUTER JOIN (
  SELECT cliente_nombre,
         EXTRACT(YEAR FROM fecha)::int  AS anio,
         EXTRACT(MONTH FROM fecha)::int AS mes,
         SUM(haber) AS pagos
  FROM pagos
  WHERE cliente_nombre IS NOT NULL AND cliente_nombre <> ''
  GROUP BY cliente_nombre, anio, mes
) p
  ON v.cliente_nombre = p.cliente_nombre
 AND v.anio = p.anio
 AND v.mes = p.mes
-- Orden estable: sin esto, el GROUP BY + FULL OUTER JOIN no garantiza el mismo
-- orden entre llamadas, y como la vista tiene ~5000 filas (se pagina de a 1000),
-- eso hacía que algunas filas aparecieran duplicadas entre páginas e infle el
-- saldo de algunos clientes en "Saldos Clientes" (ej: se vio con CERALFA S.A).
ORDER BY cliente_nombre, anio, mes;

GRANT SELECT ON resumen_ventas_pagos_mensual TO anon, authenticated;

-- ============================================
-- MIGRACIÓN: Sección de Gastos + maestro de Proveedores
-- Para bases YA creadas con el schema anterior, correr esto una vez
-- (la tabla "gastos" ya existía sin "rubro" ni "proveedor_id").
-- ============================================
ALTER TABLE gastos ALTER COLUMN categoria DROP NOT NULL;
ALTER TABLE gastos ADD COLUMN IF NOT EXISTS rubro TEXT;
ALTER TABLE gastos ADD COLUMN IF NOT EXISTS proveedor_id INTEGER REFERENCES proveedores(id);

CREATE INDEX IF NOT EXISTS idx_gastos_rubro      ON gastos(rubro);
CREATE INDEX IF NOT EXISTS idx_gastos_proveedor  ON gastos(proveedor);
CREATE INDEX IF NOT EXISTS idx_proveedores_nombre ON proveedores(nombre);

-- ============================================
-- MIGRACIÓN: Maestro de Rubros de Gastos
-- Permite agregar rubros nuevos desde la pantalla de Gastos
-- en vez de dejar el campo como texto libre. Se siembra con
-- los rubros distintos que ya existían cargados en "gastos".
-- ============================================
CREATE TABLE IF NOT EXISTS rubros (
  id SERIAL PRIMARY KEY,
  nombre TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rubros_nombre ON rubros(nombre);

GRANT SELECT, INSERT, UPDATE, DELETE ON rubros TO anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE rubros_id_seq TO anon, authenticated;

INSERT INTO rubros (nombre) VALUES
  ('931'), ('Alquiler'), ('Combustible'), ('Comisiones'), ('Fletes Bs As Mza'),
  ('Honorarios'), ('Impuestos'), ('Mantenimiento VH'), ('Mantenimiento inmuebles'),
  ('Perdida mercaderia'), ('Ropa trabajo'), ('Servicio auroelevador'), ('Sindicatos'),
  ('gastos fijos'), ('reparto'), ('seguro'), ('sueldos')
ON CONFLICT (nombre) DO NOTHING;

-- ============================================
-- MIGRACIÓN: corrige el nombre de columna en cheques_emitidos
-- La tabla real en producción quedó creada con "importe_cheque" (no "importe",
-- como decía este archivo) — esto es solo para alinear el .sql con la realidad,
-- no hace falta correrlo si la columna ya se llama "importe_cheque".
-- ALTER TABLE cheques_emitidos RENAME COLUMN importe TO importe_cheque;

-- ============================================
-- MIGRACIÓN: Maestro de Bancos
-- Permite agregar bancos nuevos desde Cheques Recibidos/Emitidos en vez de
-- dejar el campo como texto libre. Se siembra con los bancos ya cargados hoy.
-- ============================================
CREATE TABLE IF NOT EXISTS bancos (
  id SERIAL PRIMARY KEY,
  nombre TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bancos_nombre ON bancos(nombre);

GRANT SELECT, INSERT, UPDATE, DELETE ON bancos TO anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE bancos_id_seq TO anon, authenticated;

INSERT INTO bancos (nombre) VALUES
  ('BBVA'), ('Bancor'), ('Comafi'), ('Credicoop'), ('Galicia'), ('ICBC'),
  ('La Pampa'), ('Macro'), ('Municipal'), ('Nacion'), ('Provincia'),
  ('San Juan'), ('Santa Fe'), ('Santander'), ('Supervielle')
ON CONFLICT (nombre) DO NOTHING;

-- ============================================
-- MIGRACIÓN: Pagar Gastos con cheques recibidos en cartera
-- Permite elegir, al cargar un Gasto pagado con cheque, cuáles cheques
-- recibidos (no vencidos, no entregados) se usan para pagarlo. Al guardar,
-- esos cheques quedan "entregados" (fecha_salida seteada) y vinculados al gasto.
-- ============================================
ALTER TABLE cheques ADD COLUMN IF NOT EXISTS gasto_id INTEGER REFERENCES gastos(id);
CREATE INDEX IF NOT EXISTS idx_cheques_gasto ON cheques(gasto_id);

-- ============================================
-- MIGRACIÓN: Estado real del Cheque Recibido (Disponible / Entregado)
-- Antes "entregado" se inferia solo de fecha_salida. Ahora es un estado
-- explícito: se puede marcar a mano, o se setea solo al usarlo para pagar
-- un gasto. Se usa para filtrar los cheques disponibles a la hora de pagar.
-- ============================================
ALTER TABLE cheques ADD COLUMN IF NOT EXISTS estado TEXT DEFAULT 'DISPONIBLE';
CREATE INDEX IF NOT EXISTS idx_cheques_estado ON cheques(estado);
UPDATE cheques SET estado = 'ENTREGADO' WHERE fecha_salida IS NOT NULL AND (estado IS NULL OR estado = 'DISPONIBLE');

-- ============================================
-- MIGRACIÓN: columnas de Cheques Emitidos alineadas 1 a 1 con la hoja
-- "cheques propio" del Excel. "detalle" ya existía y ahora corresponde a la
-- columna "Detalle" del Excel; se agrega "operacion" (columna "Operación")
-- y "descripcion" (columna "Descripcion"). "chofer" y "detalle_2" quedan
-- en la tabla por compatibilidad pero ya no se usan desde el formulario.
-- ============================================
ALTER TABLE cheques_emitidos ADD COLUMN IF NOT EXISTS operacion TEXT;
ALTER TABLE cheques_emitidos ADD COLUMN IF NOT EXISTS descripcion TEXT;

-- ============================================
-- MIGRACIÓN: permite pagar un Gasto con un Cheque Emitido (propio/echeq/de
-- tercero) además de con Cheques Recibidos. Al asignarlo pasa a ENTREGADO;
-- si se borra el gasto o se destilda, vuelve a PENDIENTE.
-- ============================================
ALTER TABLE cheques_emitidos ADD COLUMN IF NOT EXISTS gasto_id INTEGER REFERENCES gastos(id);
CREATE INDEX IF NOT EXISTS idx_cheques_em_gasto ON cheques_emitidos(gasto_id);
