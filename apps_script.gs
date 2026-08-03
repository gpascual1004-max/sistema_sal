// ============================================
// GESTIÓN DE FLETES - APPS SCRIPT
// Dashboard + Carga de datos + Supabase
// ============================================

// CONFIGURACIÓN SUPABASE
const SUPABASE_URL = 'https://mlgvalvuacdfjscelpnm.supabase.co';
const SUPABASE_KEY = 'sb_publishable_xqJh9IwGfjKDBkYUDeuaVg_9c3EQZ0Q';

// ============================================
// UTILIDADES - SUPABASE
// ============================================

function supabaseQuery(table, method, data, filters) {
  method = method || 'GET';
  let url = SUPABASE_URL + '/rest/v1/' + table;

  const options = {
    method: method,
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': 'Bearer ' + SUPABASE_KEY,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    muteHttpExceptions: true
  };

  if (filters) {
    const params = Object.entries(filters)
      .map(function(entry) { return entry[0] + '=eq.' + encodeURIComponent(entry[1]); })
      .join('&');
    url += '?' + params;
  }

  if (data) {
    options.payload = JSON.stringify(data);
  }

  const response = UrlFetchApp.fetch(url, options);
  const result = response.getContentText();

  return result ? JSON.parse(result) : null;
}

// ============================================
// CARGA DE DATOS - BACKEND
// ============================================

function insertarFletes(fletes) {
  let insertados = 0;
  let duplicados = 0;
  const errors = [];

  fletes.forEach(function(flete, index) {
    try {
      const filtros = {
        fecha_flete: flete['FECHA FLETE'],
        proveedor_nombre: flete['PROVEEDOR'],
        chofer_nombre: flete['CHOFER'],
        importe: flete['IMPORTE']
      };

      const existente = supabaseQuery('fletes', 'GET', null, filtros);

      if (existente && existente.length > 0) {
        duplicados++;
        return;
      }

      const nuevoFlete = {
        fecha_flete: flete['FECHA FLETE'],
        proveedor_nombre: flete['PROVEEDOR'],
        chofer_nombre: flete['CHOFER'],
        detalle: flete['DETALLE'] || '',
        remito: flete['REMITO'] || '',
        importe: parseFloat(flete['IMPORTE']) || 0,
        iva: parseFloat(flete['IVA']) || 0,
        factura: flete['FACTURA'] || '',
        estado: flete['ESTADO'] || 'PENDIENTE',
        cheque_numero: flete['CHEQUE N°'] || '',
        fecha_pago: flete['FECHA PAGO'] || null,
        observaciones: flete['OBSERVACIONES'] || ''
      };

      nuevoFlete.total = nuevoFlete.importe + nuevoFlete.iva;

      const result = supabaseQuery('fletes', 'POST', [nuevoFlete]);
      if (result) insertados++;

    } catch (error) {
      errors.push('Fila ' + (index + 1) + ': ' + error.message);
    }
  });

  return { insertados: insertados, duplicados: duplicados, errors: errors };
}

function insertarVentas(ventas) {
  let insertados = 0;
  const errors = [];

  ventas.forEach(function(venta, index) {
    try {
      const nuevaVenta = {
        fecha: venta['Fecha'],
        comprobante: venta['Comprobante'],
        cliente_nombre: venta['Cliente Limpio'] || venta['Cliente'],
        debe: parseFloat(venta['Debe']) || 0,
        observaciones: venta['observaciones'] || ''
      };

      const result = supabaseQuery('ventas', 'POST', [nuevaVenta]);
      if (result) insertados++;

    } catch (error) {
      errors.push('Venta ' + (index + 1) + ': ' + error.message);
    }
  });

  return { insertados: insertados, errors: errors };
}

function insertarPagos(pagos) {
  let insertados = 0;
  const errors = [];

  pagos.forEach(function(pago, index) {
    try {
      const nuevoPago = {
        fecha: pago['Fecha'],
        cliente_nombre: pago['Cliente'],
        haber: parseFloat(pago['Haber']) || 0,
        efectivo: parseFloat(pago['EFECTIVO']) || 0,
        transferencia: parseFloat(pago['TRANSFERENCIA']) || 0,
        cheque_numero: pago['N° CHEQUE'] || '',
        banco: pago['BANCO'] || '',
        importe_cheque: parseFloat(pago['IMPORTE_CH']) || 0,
        observaciones: pago['observaciones'] || ''
      };

      const result = supabaseQuery('pagos', 'POST', [nuevoPago]);
      if (result) insertados++;

    } catch (error) {
      errors.push('Pago ' + (index + 1) + ': ' + error.message);
    }
  });

  return { insertados: insertados, errors: errors };
}

function insertarGastos(gastos) {
  let insertados = 0;
  const errors = [];

  gastos.forEach(function(gasto, index) {
    try {
      const nuevoGasto = {
        fecha: gasto['Fecha'],
        categoria: gasto['Categoria'] || gasto['Categoría'] || '',
        descripcion: gasto['Descripcion'] || gasto['Descripción'] || '',
        monto: parseFloat(gasto['Monto']) || 0,
        proveedor: gasto['Proveedor'] || '',
        metodo_pago: gasto['MetodoPago'] || gasto['Método pago'] || '',
        cheque_numero: gasto['ChequeNumero'] || gasto['Cheque N°'] || '',
        observaciones: gasto['Observaciones'] || '',
        estado: gasto['Estado'] || 'PENDIENTE'
      };

      const result = supabaseQuery('gastos', 'POST', [nuevoGasto]);
      if (result) insertados++;

    } catch (error) {
      errors.push('Gasto ' + (index + 1) + ': ' + error.message);
    }
  });

  return { insertados: insertados, errors: errors };
}

// ============================================
// CONSULTAS - BACKEND
// ============================================

function obtenerFletes() {
  return supabaseQuery('fletes') || [];
}

function obtenerDashboardData() {
  const fletes  = supabaseQuery('fletes')  || [];
  const ventas  = supabaseQuery('ventas')  || [];
  const pagos   = supabaseQuery('pagos')   || [];
  const gastos  = supabaseQuery('gastos')  || [];

  const total_importe_fletes = fletes.reduce(function(sum, f) { return sum + (parseFloat(f.importe) || 0); }, 0);
  const total_ventas         = ventas.reduce(function(sum, v) { return sum + (parseFloat(v.debe)    || 0); }, 0);
  const total_pagos          = pagos.reduce(function(sum, p)  { return sum + (parseFloat(p.haber)   || 0); }, 0);
  const total_gastos         = gastos.reduce(function(sum, g) { return sum + (parseFloat(g.monto)   || 0); }, 0);
  const pagos_fletes         = fletes
    .filter(function(f) { return f.estado === 'PAGADO'; })
    .reduce(function(sum, f) { return sum + (parseFloat(f.importe) || 0); }, 0);

  const ingresos_totales = total_importe_fletes + total_ventas;
  const egresos_totales  = total_gastos;
  const ganancia         = ingresos_totales - egresos_totales;
  const margen           = ingresos_totales > 0 ? (ganancia / ingresos_totales * 100) : 0;

  return {
    total_fletes: fletes.length,
    total_importe: total_importe_fletes,
    ingresos: {
      total_fletes: total_importe_fletes,
      total_ventas: total_ventas
    },
    egresos: {
      total_pagos_fletes: pagos_fletes,
      total_gastos: total_gastos
    },
    resumen: {
      ingresos_totales: ingresos_totales,
      egresos_totales: egresos_totales,
      ganancia_neta: ganancia,
      margen_porcentaje: parseFloat(margen.toFixed(2)),
      cobrados: total_pagos,
      por_cobrar: total_ventas - total_pagos
    }
  };
}

function obtenerSaldosClientes() {
  const ventas = supabaseQuery('ventas') || [];
  const pagos  = supabaseQuery('pagos')  || [];
  const saldos = {};

  ventas.forEach(function(v) {
    const cliente = v.cliente_nombre;
    if (!saldos[cliente]) saldos[cliente] = { ventas: 0, pagos: 0 };
    saldos[cliente].ventas += parseFloat(v.debe) || 0;
  });

  pagos.forEach(function(p) {
    const cliente = p.cliente_nombre;
    if (!saldos[cliente]) saldos[cliente] = { ventas: 0, pagos: 0 };
    saldos[cliente].pagos += parseFloat(p.haber) || 0;
  });

  return Object.entries(saldos)
    .map(function(entry) {
      return {
        cliente: entry[0],
        total_ventas: entry[1].ventas,
        total_pagos: entry[1].pagos,
        saldo_pendiente: entry[1].ventas - entry[1].pagos
      };
    })
    .sort(function(a, b) { return b.saldo_pendiente - a.saldo_pendiente; });
}

function obtenerTopProveedores() {
  const fletes     = supabaseQuery('fletes') || [];
  const proveedores = {};

  fletes.forEach(function(f) {
    const nombre = f.proveedor_nombre;
    if (!proveedores[nombre]) proveedores[nombre] = { cantidad: 0, total: 0 };
    proveedores[nombre].cantidad++;
    proveedores[nombre].total += parseFloat(f.importe) || 0;
  });

  return Object.entries(proveedores)
    .map(function(entry) {
      return {
        proveedor: entry[0],
        cantidad_fletes: entry[1].cantidad,
        total_importe: entry[1].total,
        promedio: entry[1].cantidad > 0 ? entry[1].total / entry[1].cantidad : 0
      };
    })
    .sort(function(a, b) { return b.total_importe - a.total_importe; })
    .slice(0, 10);
}

// ============================================
// INTERFAZ WEB
// ============================================

function doGet(e) {
  return HtmlService.createHtmlOutput(getHtmlContent())
    .setTitle('Gestión de Fletes')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function getHtmlContent() {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Gestión de Fletes - Dashboard</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@3.9.1/dist/chart.min.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      padding: 20px;
    }

    .container {
      max-width: 1400px;
      margin: 0 auto;
      background: white;
      border-radius: 10px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.2);
      overflow: hidden;
    }

    header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      text-align: center;
    }

    header h1 { font-size: 2.5em; margin-bottom: 10px; }

    .nav {
      display: flex;
      gap: 10px;
      background: #f8f9fa;
      padding: 15px 30px;
      border-bottom: 2px solid #e9ecef;
      flex-wrap: wrap;
    }

    .nav button {
      padding: 10px 20px;
      border: none;
      background: #667eea;
      color: white;
      border-radius: 5px;
      cursor: pointer;
      font-size: 14px;
      transition: all 0.3s;
    }

    .nav button:hover { background: #764ba2; transform: translateY(-2px); }
    .nav button.active {
      background: #764ba2;
      box-shadow: 0 4px 15px rgba(118,75,162,0.3);
    }

    .content { padding: 30px; }

    .section { display: none; }
    .section.active {
      display: block;
      animation: fadeIn 0.3s;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }

    .card {
      background: white;
      border: 1px solid #e9ecef;
      border-radius: 8px;
      padding: 20px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      transition: all 0.3s;
    }

    .card:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.15); transform: translateY(-2px); }

    .card h3 {
      color: #667eea;
      margin-bottom: 10px;
      font-size: 13px;
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    .card .value { font-size: 26px; font-weight: bold; color: #333; margin-bottom: 5px; }
    .card .subtitle { font-size: 12px; color: #999; }
    .card.positive .value { color: #28a745; }
    .card.negative .value { color: #dc3545; }
    .card.warning  .value { color: #ffc107; }

    .charts-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(450px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }

    .chart-container { position: relative; height: 350px; margin-top: 10px; }

    .upload-section {
      background: #f8f9fa;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 20px;
    }

    .upload-section h3 { margin-bottom: 15px; color: #333; }

    .upload-group {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
      align-items: center;
    }

    input[type="file"] {
      padding: 8px;
      border: 1px solid #ddd;
      border-radius: 5px;
      flex: 1;
      min-width: 200px;
    }

    .btn {
      padding: 10px 20px;
      border: none;
      border-radius: 5px;
      cursor: pointer;
      font-size: 14px;
      font-weight: bold;
      transition: all 0.3s;
      white-space: nowrap;
    }

    .btn-primary { background: #667eea; color: white; }
    .btn-primary:hover { background: #764ba2; transform: translateY(-2px); }
    .btn-success { background: #28a745; color: white; }
    .btn-success:hover { background: #218838; }

    .table-container { overflow-x: auto; margin-top: 20px; }

    table { width: 100%; border-collapse: collapse; font-size: 13px; }

    table thead { background: #f8f9fa; border-bottom: 2px solid #e9ecef; }
    table th { padding: 12px; text-align: left; font-weight: 600; color: #667eea; }
    table td { padding: 12px; border-bottom: 1px solid #e9ecef; }
    table tbody tr:hover { background: #f8f9fa; }

    .status-badge {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: bold;
    }

    .status-pagado   { background: #d4edda; color: #155724; }
    .status-pendiente { background: #fff3cd; color: #856404; }

    .message {
      padding: 12px 15px;
      margin-bottom: 15px;
      border-radius: 5px;
      display: none;
    }

    .message.success { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; display: block; }
    .message.error   { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; display: block; }
    .message.info    { background: #d1ecf1; color: #0c5460; border: 1px solid #bee5eb; display: block; }

    .loading { text-align: center; padding: 40px; color: #999; font-size: 16px; }

    footer {
      background: #f8f9fa;
      padding: 20px;
      text-align: center;
      color: #999;
      font-size: 12px;
      border-top: 1px solid #e9ecef;
    }

    @media (max-width: 768px) {
      header h1 { font-size: 1.8em; }
      .grid { grid-template-columns: 1fr; }
      .charts-grid { grid-template-columns: 1fr; }
      .nav { flex-direction: column; }
      .nav button { width: 100%; }
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>Gestión de Fletes</h1>
      <p>Dashboard de Ingresos, Gastos y Márgenes</p>
    </header>

    <nav class="nav">
      <button class="nav-btn active" data-tab="dashboard">Dashboard</button>
      <button class="nav-btn" data-tab="cargar">Cargar Datos</button>
      <button class="nav-btn" data-tab="fletes">Fletes</button>
      <button class="nav-btn" data-tab="clientes">Saldos Clientes</button>
      <button class="nav-btn" data-tab="reportes">Reportes</button>
    </nav>

    <div class="content">

      <!-- DASHBOARD -->
      <div class="section active" id="dashboard">
        <div id="dashboardMessage"></div>
        <div class="grid">
          <div class="card positive">
            <h3>Total Fletes</h3>
            <div class="value" id="totalFletes">-</div>
            <div class="subtitle">Registros cargados</div>
          </div>
          <div class="card positive">
            <h3>Ingresos Fletes</h3>
            <div class="value" id="totalIngresosFletes">-</div>
            <div class="subtitle">Importe total</div>
          </div>
          <div class="card warning">
            <h3>Por Cobrar</h3>
            <div class="value" id="ingresosPorCobrar">-</div>
            <div class="subtitle">Saldo pendiente clientes</div>
          </div>
          <div class="card negative">
            <h3>Total Gastos</h3>
            <div class="value" id="totalGastos">-</div>
            <div class="subtitle">Egresos operativos</div>
          </div>
          <div class="card positive">
            <h3>Ganancia Neta</h3>
            <div class="value" id="gananciaNeta">-</div>
            <div class="subtitle">Ingresos - Gastos</div>
          </div>
          <div class="card">
            <h3>Margen Neto</h3>
            <div class="value" id="margenNeto">-</div>
            <div class="subtitle">Ganancia / Ingresos</div>
          </div>
        </div>

        <div class="charts-grid">
          <div class="card">
            <h3>Ingresos vs Gastos</h3>
            <div class="chart-container">
              <canvas id="chartIngresosGastos"></canvas>
            </div>
          </div>
          <div class="card">
            <h3>Top Proveedores</h3>
            <div class="chart-container">
              <canvas id="chartProveedores"></canvas>
            </div>
          </div>
        </div>
      </div>

      <!-- CARGAR DATOS -->
      <div class="section" id="cargar">
        <div id="cargaMessage"></div>

        <div class="upload-section">
          <h3>Cargar Fletes (CSV)</h3>
          <div class="upload-group">
            <input type="file" id="fileFletes" accept=".csv">
            <button class="btn btn-primary" onclick="procesarFletes()">Cargar Fletes</button>
          </div>
        </div>

        <div class="upload-section">
          <h3>Cargar Ventas (CSV)</h3>
          <div class="upload-group">
            <input type="file" id="fileVentas" accept=".csv">
            <button class="btn btn-primary" onclick="procesarVentas()">Cargar Ventas</button>
          </div>
        </div>

        <div class="upload-section">
          <h3>Cargar Pagos (CSV)</h3>
          <div class="upload-group">
            <input type="file" id="filePagos" accept=".csv">
            <button class="btn btn-primary" onclick="procesarPagos()">Cargar Pagos</button>
          </div>
        </div>

        <div class="upload-section">
          <h3>Cargar Gastos (CSV)</h3>
          <div class="upload-group">
            <input type="file" id="fileGastos" accept=".csv">
            <button class="btn btn-primary" onclick="procesarGastos()">Cargar Gastos</button>
          </div>
        </div>
      </div>

      <!-- FLETES -->
      <div class="section" id="fletes">
        <h2>Lista de Fletes</h2>
        <div id="fletesMessage"></div>
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Proveedor</th>
                <th>Chofer</th>
                <th>Detalle</th>
                <th>Importe</th>
                <th>IVA</th>
                <th>Total</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody id="fletesBody">
              <tr><td colspan="8" class="loading">Cargando...</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- CLIENTES -->
      <div class="section" id="clientes">
        <h2>Saldos de Clientes</h2>
        <div id="clientesMessage"></div>
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Total Ventas</th>
                <th>Total Pagos</th>
                <th>Saldo Pendiente</th>
              </tr>
            </thead>
            <tbody id="clientesBody">
              <tr><td colspan="4" class="loading">Cargando...</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- REPORTES -->
      <div class="section" id="reportes">
        <h2>Top 10 Proveedores por Importe</h2>
        <div id="reportContent">
          <div class="loading">Cargando...</div>
        </div>
      </div>

    </div>

    <footer>
      <p>Sistema de Gestión de Fletes v1.0 | Conectado a Supabase</p>
    </footer>
  </div>

  <script>
    // ==========================================
    // NAVEGACIÓN
    // ==========================================

    document.querySelectorAll('.nav-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var tab = btn.dataset.tab;

        document.querySelectorAll('.nav-btn').forEach(function(b) { b.classList.remove('active'); });
        document.querySelectorAll('.section').forEach(function(s) { s.classList.remove('active'); });

        btn.classList.add('active');
        document.getElementById(tab).classList.add('active');

        if (tab === 'dashboard') cargarDashboard();
        if (tab === 'fletes')    mostrarFletes();
        if (tab === 'clientes')  mostrarClientes();
        if (tab === 'reportes')  mostrarReportes();
      });
    });

    // ==========================================
    // UTILIDADES
    // ==========================================

    function formatPesos(valor) {
      return '\\$' + (valor || 0).toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    }

    function mostrarMensaje(elementId, mensaje, tipo) {
      var div = document.getElementById(elementId);
      if (!div) return;
      div.className = 'message ' + tipo;
      div.textContent = mensaje;
      setTimeout(function() { div.style.display = 'none'; }, 6000);
    }

    // Parser CSV genérico (maneja campos entre comillas)
    function parsearCsv(csv) {
      var lines = csv.split('\\n').filter(function(l) { return l.trim() !== ''; });
      if (lines.length < 2) return [];

      var headers = parsearLineaCsv(lines[0]);
      var datos = [];

      for (var i = 1; i < lines.length; i++) {
        var values = parsearLineaCsv(lines[i]);
        var obj = {};
        headers.forEach(function(header, index) {
          obj[header.trim()] = (values[index] || '').trim().replace(/^"|"$/g, '');
        });
        datos.push(obj);
      }

      return datos;
    }

    function parsearLineaCsv(linea) {
      var resultado = [];
      var actual = '';
      var dentroComillas = false;

      for (var i = 0; i < linea.length; i++) {
        var c = linea[i];
        if (c === '"') {
          dentroComillas = !dentroComillas;
        } else if (c === ',' && !dentroComillas) {
          resultado.push(actual);
          actual = '';
        } else {
          actual += c;
        }
      }
      resultado.push(actual);
      return resultado;
    }

    // ==========================================
    // DASHBOARD
    // ==========================================

    var chartIngresosGastos = null;
    var chartProveedores    = null;

    function cargarDashboard() {
      google.script.run
        .withSuccessHandler(function(data) {
          document.getElementById('totalFletes').textContent       = data.total_fletes;
          document.getElementById('totalIngresosFletes').textContent = formatPesos(data.total_importe);
          document.getElementById('totalGastos').textContent        = formatPesos(data.egresos.total_gastos);
          document.getElementById('ingresosPorCobrar').textContent  = formatPesos(data.resumen.por_cobrar);
          document.getElementById('gananciaNeta').textContent       = formatPesos(data.resumen.ganancia_neta);
          document.getElementById('margenNeto').textContent         = data.resumen.margen_porcentaje + '%';

          renderizarGraficoBarras(data);
        })
        .withFailureHandler(function(err) {
          mostrarMensaje('dashboardMessage', 'Error al cargar dashboard: ' + err.message, 'error');
        })
        .obtenerDashboardData();

      // Gráfico de proveedores en paralelo
      google.script.run
        .withSuccessHandler(function(top) {
          renderizarGraficoProveedores(top);
        })
        .obtenerTopProveedores();
    }

    function renderizarGraficoBarras(data) {
      var ctx = document.getElementById('chartIngresosGastos').getContext('2d');
      if (chartIngresosGastos) chartIngresosGastos.destroy();

      chartIngresosGastos = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: ['Fletes', 'Ventas', 'Gastos'],
          datasets: [{
            label: 'Monto ($)',
            data: [
              data.ingresos.total_fletes,
              data.ingresos.total_ventas,
              data.egresos.total_gastos
            ],
            backgroundColor: ['#28a745', '#17a2b8', '#dc3545']
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: { y: { beginAtZero: true } }
        }
      });
    }

    function renderizarGraficoProveedores(top) {
      var ctx = document.getElementById('chartProveedores').getContext('2d');
      if (chartProveedores) chartProveedores.destroy();

      chartProveedores = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: top.map(function(p) { return p.proveedor; }),
          datasets: [{
            label: 'Total ($)',
            data: top.map(function(p) { return p.total_importe; }),
            backgroundColor: '#667eea'
          }]
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: { x: { beginAtZero: true } }
        }
      });
    }

    // ==========================================
    // PESTAÑA FLETES
    // ==========================================

    function mostrarFletes() {
      google.script.run
        .withSuccessHandler(function(fletes) {
          var tbody = document.getElementById('fletesBody');

          if (!fletes || fletes.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:#999">Sin datos cargados</td></tr>';
            return;
          }

          tbody.innerHTML = '';
          fletes.forEach(function(f) {
            var tr = tbody.insertRow();
            var estadoClass = f.estado === 'PAGADO' ? 'status-pagado' : 'status-pendiente';
            tr.innerHTML =
              '<td>' + (f.fecha_flete || '') + '</td>' +
              '<td>' + (f.proveedor_nombre || '') + '</td>' +
              '<td>' + (f.chofer_nombre || '') + '</td>' +
              '<td>' + (f.detalle || '') + '</td>' +
              '<td>' + formatPesos(f.importe) + '</td>' +
              '<td>' + formatPesos(f.iva) + '</td>' +
              '<td>' + formatPesos(f.total) + '</td>' +
              '<td><span class="status-badge ' + estadoClass + '">' + (f.estado || '') + '</span></td>';
          });
        })
        .withFailureHandler(function(err) {
          mostrarMensaje('fletesMessage', 'Error: ' + err.message, 'error');
        })
        .obtenerFletes();
    }

    // ==========================================
    // PESTAÑA CLIENTES
    // ==========================================

    function mostrarClientes() {
      google.script.run
        .withSuccessHandler(function(saldos) {
          var tbody = document.getElementById('clientesBody');

          if (!saldos || saldos.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:#999">Sin datos cargados</td></tr>';
            return;
          }

          tbody.innerHTML = '';
          saldos.forEach(function(s) {
            var tr = tbody.insertRow();
            var color = s.saldo_pendiente > 0 ? 'color:#dc3545;font-weight:bold' : 'color:#28a745';
            tr.innerHTML =
              '<td>' + (s.cliente || '') + '</td>' +
              '<td>' + formatPesos(s.total_ventas) + '</td>' +
              '<td>' + formatPesos(s.total_pagos) + '</td>' +
              '<td style="' + color + '">' + formatPesos(s.saldo_pendiente) + '</td>';
          });
        })
        .withFailureHandler(function(err) {
          mostrarMensaje('clientesMessage', 'Error: ' + err.message, 'error');
        })
        .obtenerSaldosClientes();
    }

    // ==========================================
    // PESTAÑA REPORTES
    // ==========================================

    function mostrarReportes() {
      document.getElementById('reportContent').innerHTML = '<div class="loading">Cargando...</div>';

      google.script.run
        .withSuccessHandler(function(top) {
          if (!top || top.length === 0) {
            document.getElementById('reportContent').innerHTML = '<p style="color:#999">Sin datos cargados</p>';
            return;
          }

          var html = '<div class="table-container"><table>' +
            '<thead><tr><th>Proveedor</th><th>Cantidad Fletes</th><th>Total Importe</th><th>Promedio por Flete</th></tr></thead><tbody>';

          top.forEach(function(p) {
            html += '<tr>' +
              '<td>' + p.proveedor + '</td>' +
              '<td>' + p.cantidad_fletes + '</td>' +
              '<td>' + formatPesos(p.total_importe) + '</td>' +
              '<td>' + formatPesos(p.promedio) + '</td>' +
              '</tr>';
          });

          html += '</tbody></table></div>';
          document.getElementById('reportContent').innerHTML = html;
        })
        .withFailureHandler(function(err) {
          document.getElementById('reportContent').innerHTML = '<p style="color:#dc3545">Error: ' + err.message + '</p>';
        })
        .obtenerTopProveedores();
    }

    // ==========================================
    // CARGA DE ARCHIVOS CSV
    // ==========================================

    function procesarFletes() {
      var file = document.getElementById('fileFletes').files[0];
      if (!file) { mostrarMensaje('cargaMessage', 'Selecciona un archivo CSV', 'error'); return; }

      var reader = new FileReader();
      reader.onload = function(e) {
        var datos = parsearCsv(e.target.result);
        google.script.run
          .withSuccessHandler(function(result) {
            mostrarMensaje('cargaMessage',
              'Fletes: ' + result.insertados + ' insertados, ' + result.duplicados + ' duplicados.' +
              (result.errors.length > 0 ? ' Errores: ' + result.errors.join(', ') : ''),
              'success'
            );
            cargarDashboard();
          })
          .withFailureHandler(function(err) {
            mostrarMensaje('cargaMessage', 'Error: ' + err.message, 'error');
          })
          .insertarFletes(datos);
      };
      reader.readAsText(file);
    }

    function procesarVentas() {
      var file = document.getElementById('fileVentas').files[0];
      if (!file) { mostrarMensaje('cargaMessage', 'Selecciona un archivo CSV', 'error'); return; }

      var reader = new FileReader();
      reader.onload = function(e) {
        var datos = parsearCsv(e.target.result);
        google.script.run
          .withSuccessHandler(function(result) {
            mostrarMensaje('cargaMessage',
              'Ventas: ' + result.insertados + ' insertadas.' +
              (result.errors.length > 0 ? ' Errores: ' + result.errors.join(', ') : ''),
              'success'
            );
            cargarDashboard();
          })
          .withFailureHandler(function(err) {
            mostrarMensaje('cargaMessage', 'Error: ' + err.message, 'error');
          })
          .insertarVentas(datos);
      };
      reader.readAsText(file);
    }

    function procesarPagos() {
      var file = document.getElementById('filePagos').files[0];
      if (!file) { mostrarMensaje('cargaMessage', 'Selecciona un archivo CSV', 'error'); return; }

      var reader = new FileReader();
      reader.onload = function(e) {
        var datos = parsearCsv(e.target.result);
        google.script.run
          .withSuccessHandler(function(result) {
            mostrarMensaje('cargaMessage',
              'Pagos: ' + result.insertados + ' insertados.' +
              (result.errors.length > 0 ? ' Errores: ' + result.errors.join(', ') : ''),
              'success'
            );
            cargarDashboard();
          })
          .withFailureHandler(function(err) {
            mostrarMensaje('cargaMessage', 'Error: ' + err.message, 'error');
          })
          .insertarPagos(datos);
      };
      reader.readAsText(file);
    }

    function procesarGastos() {
      var file = document.getElementById('fileGastos').files[0];
      if (!file) { mostrarMensaje('cargaMessage', 'Selecciona un archivo CSV', 'error'); return; }

      var reader = new FileReader();
      reader.onload = function(e) {
        var datos = parsearCsv(e.target.result);
        google.script.run
          .withSuccessHandler(function(result) {
            mostrarMensaje('cargaMessage',
              'Gastos: ' + result.insertados + ' insertados.' +
              (result.errors.length > 0 ? ' Errores: ' + result.errors.join(', ') : ''),
              'success'
            );
            cargarDashboard();
          })
          .withFailureHandler(function(err) {
            mostrarMensaje('cargaMessage', 'Error: ' + err.message, 'error');
          })
          .insertarGastos(datos);
      };
      reader.readAsText(file);
    }

    // Carga inicial
    window.onload = function() { cargarDashboard(); };
  </script>
</body>
</html>
  `;
}
