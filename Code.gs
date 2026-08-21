// ============================================
// GESTIÓN DE FLETES - APPS SCRIPT
// Backend + conexión Supabase
// ============================================

const APP_VERSION = '3.1.1';
const SUPABASE_URL = 'https://mlgvalvuacdfjscelpnm.supabase.co';
const SUPABASE_KEY = 'sb_publishable_xqJh9IwGfjKDBkYUDeuaVg_9c3EQZ0Q';

// Query fija de cada tabla — se usa tanto para pedir los datos como para saber
// qué clave de caché invalidar después de un guardado/borrado. Si se cambia el
// orden/filtro de alguna de estas, hay que actualizarlo acá (un solo lugar).
var QUERY_FLETES     = 'order=fecha_flete.desc';
var QUERY_VENTAS     = 'order=fecha.desc,comprobante.asc';
var QUERY_PAGOS      = 'order=fecha.desc';
var QUERY_CLIENTES   = 'order=id.asc';
var QUERY_GASTOS     = 'order=fecha.desc';
var QUERY_PROVEEDORES = 'order=nombre.asc';
var QUERY_RUBROS     = 'order=nombre.asc';
var QUERY_BANCOS     = 'order=nombre.asc';
var QUERY_CHEQUES    = 'order=fecha_emision.desc';
var QUERY_CHEQUES_EM = 'order=fecha_pago.desc';
var QUERY_RESUMEN    = 'order=cliente_nombre.asc,anio.asc,mes.asc';

// Supabase alternativa para consultas del proyecto SAL
const SUPABASE_URL_SAL = 'https://ufycqawdocnpgbvfyqch.supabase.co';
const SUPABASE_KEY_SAL = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmeWNxYXdkb2NucGdidmZ5cWNoIiwicm9sZSI6ImFub24iLCJpYXQiOjE2ODcyNTk5MTgsImV4cCI6MjAwMjgzNTkxOH0.nWE9n-eLwqJlqIQXSdpxQQFcwQAXTKu8N3hRgPQvO-M';

// ============================================
// UTILIDADES - SUPABASE
// ============================================

// Trae TODOS los registros paginando de a 1000 (evita el límite max_rows de Supabase)
function supabaseQueryAll(table, rawQuery) {
  var all = [], page = 0, pageSize = 1000;
  while (true) {
    var from = page * pageSize;
    var to   = from + pageSize - 1;
    var url  = SUPABASE_URL + '/rest/v1/' + table + '?' + (rawQuery ? rawQuery + '&' : '') + 'limit=' + pageSize + '&offset=' + from;
    var resp = UrlFetchApp.fetch(url, {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': 'Bearer ' + SUPABASE_KEY,
        'Range': from + '-' + to,
        'Range-Unit': 'items'
      },
      muteHttpExceptions: true
    });
    var rows = JSON.parse(resp.getContentText() || '[]');
    if (!Array.isArray(rows) || rows.length === 0) break;
    all = all.concat(rows);
    if (rows.length < pageSize) break;
    page++;
  }
  return all;
}

// ============================================
// CACHÉ (CacheService) — para no pegarle a Supabase con UrlFetchApp en cada
// tab/carga. UrlFetchApp tiene un tope diario (20.000/día en cuentas gratuitas)
// y cada supabaseQueryAll de una tabla grande son varias llamadas (paginado de
// a 1000). CacheService no cuenta contra ese límite.
//
// CacheService solo acepta valores de hasta 100KB por clave, así que las tablas
// grandes (ventas, pagos) se guardan partidas en varios "chunks" bajo claves
// numeradas. Si el guardado falla por cualquier motivo (cuota de caché, etc.)
// simplemente no se cachea esa vez — nunca rompe la lectura en vivo.
// ============================================
var CACHE_TTL_SEGUNDOS = 300; // 5 minutos
var CACHE_CHUNK_SIZE = 90000; // ~90KB, con margen bajo el límite de 100KB por clave

function cacheGet(key) {
  try {
    var cache = CacheService.getScriptCache();
    var countStr = cache.get(key + '_n');
    if (!countStr) return null;
    var count = parseInt(countStr, 10);
    var chunks = [];
    for (var i = 0; i < count; i++) {
      var chunk = cache.get(key + '_' + i);
      if (chunk === null) return null; // se venció algún chunk a mitad de camino
      chunks.push(chunk);
    }
    return JSON.parse(chunks.join(''));
  } catch (e) {
    return null;
  }
}

function cachePut(key, data) {
  try {
    var cache = CacheService.getScriptCache();
    var json = JSON.stringify(data);
    var count = Math.ceil(json.length / CACHE_CHUNK_SIZE) || 0;
    for (var i = 0; i < count; i++) {
      cache.put(key + '_' + i, json.substring(i * CACHE_CHUNK_SIZE, (i + 1) * CACHE_CHUNK_SIZE), CACHE_TTL_SEGUNDOS);
    }
    cache.put(key + '_n', String(count), CACHE_TTL_SEGUNDOS);
  } catch (e) {
    // Dataset demasiado grande o cuota de caché llena: se sigue sirviendo en vivo, sin cachear.
  }
}

function cacheInvalidate(key) {
  try {
    var cache = CacheService.getScriptCache();
    var countStr = cache.get(key + '_n');
    var count = countStr ? parseInt(countStr, 10) : 0;
    var keys = [key + '_n'];
    for (var i = 0; i < count; i++) keys.push(key + '_' + i);
    cache.removeAll(keys);
  } catch (e) {}
}

// Igual que supabaseQueryAll pero cacheado por nombre de tabla+query.
function supabaseQueryAllCached(table, rawQuery) {
  var key = 'q_' + table + '_' + (rawQuery || '');
  var cached = cacheGet(key);
  if (cached !== null) return cached;
  var data = supabaseQueryAll(table, rawQuery);
  cachePut(key, data);
  return data;
}

// Invalida el caché de una tabla (todas las variantes de query guardadas para ella).
// Como no sabemos qué rawQuery se usó para cachearla, invalidamos por prefijo
// recorriendo las claves conocidas — más simple: cada tabla tiene una sola query
// fija en este proyecto, así que alcanza con reconstruir esa misma clave.
function invalidarCacheTabla(table, rawQuery) {
  cacheInvalidate('q_' + table + '_' + (rawQuery || ''));
}

// ventas y pagos alimentan la vista resumen_ventas_pagos_mensual (Saldos Clientes),
// así que cualquier cambio en cualquiera de las dos invalida también ese resumen.
function invalidarCacheVentas() {
  invalidarCacheTabla('ventas', QUERY_VENTAS);
  invalidarCacheTabla('resumen_ventas_pagos_mensual', QUERY_RESUMEN);
}
function invalidarCachePagos() {
  invalidarCacheTabla('pagos', QUERY_PAGOS);
  invalidarCacheTabla('resumen_ventas_pagos_mensual', QUERY_RESUMEN);
}

function supabaseQuery(table, method, data, filters, rawQuery) {
  Utilities.sleep(100); // Pequeña pausa para sincronización
  Logger.log('>>> supabaseQuery LLAMADA: table=' + table + ', method=' + method);

  if (!table) throw new Error('supabaseQuery: table is required');
  if (!method) method = 'GET';

  var url = SUPABASE_URL + '/rest/v1/' + table;
  var qparts = [];

  if (filters) {
    Object.keys(filters).forEach(function(k) {
      qparts.push(k + '=eq.' + encodeURIComponent(String(filters[k])));
    });
  }
  if (rawQuery) qparts.push(rawQuery);
  if (qparts.length) url += '?' + qparts.join('&');

  var payload = null;
  if (data) {
    payload = JSON.stringify(data);
  }

  var options = {
    method: method,
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': 'Bearer ' + SUPABASE_KEY,
      'Content-Type': 'application/json'
    },
    muteHttpExceptions: false
  };

  if (payload) {
    options.payload = payload;
  }

  if (method === 'POST' || method === 'PATCH' || method === 'PUT') {
    options.headers['Prefer'] = 'return=representation';
  }

  var response = UrlFetchApp.fetch(url, options);
  var status = response.getResponseCode();
  var text = response.getContentText();

  if (status < 200 || status >= 300) {
    throw new Error('Supabase error ' + status + ': ' + text);
  }

  if (!text) return null;
  return JSON.parse(text);
}

function supabaseDelete(table, id) {
  var url = SUPABASE_URL + '/rest/v1/' + table + '?id=eq.' + encodeURIComponent(id);
  UrlFetchApp.fetch(url, {
    method: 'DELETE',
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY },
    muteHttpExceptions: true
  });
  return { ok: true };
}

function normalizarNombre(str) {
  return (str || '').toLowerCase().trim().replace(/\s+/g, ' ').replace(/[.,]/g, '');
}

function parsearMontoGs(valor) {
  if (!valor) return 0;
  var limpio = String(valor).replace(/\$/g, '').replace(/\s/g, '').replace(/\./g, '').replace(',', '.');
  return parseFloat(limpio) || 0;
}

function parsearFechaGs(v) {
  v = (v || '').trim();
  var partes = v.split('/');
  if (partes.length === 3) {
    var d = partes[0].padStart(2,'0');
    var m = partes[1].padStart(2,'0');
    var y = partes[2].length === 2 ? '20' + partes[2] : partes[2];
    return y + '-' + m + '-' + d;
  }
  return v;
}

// ============================================
// INTERFAZ WEB
// ============================================

function doGet(e) {
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('Sistema de Gestión de Logística - SAL')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// ============================================
// CONSULTAS
// ============================================

function obtenerFletes() {
  return supabaseQueryAllCached('fletes', QUERY_FLETES);
}

function obtenerVentas() {
  return supabaseQueryAllCached('ventas', QUERY_VENTAS);
}

function obtenerPagos() {
  return supabaseQueryAllCached('pagos', QUERY_PAGOS);
}

function obtenerClientes() {
  return supabaseQueryAllCached('clientes', QUERY_CLIENTES);
}

function obtenerDashboardCompleto() {
  return {
    fletes: obtenerFletes(),
    ventas: obtenerVentas(),
    pagos:  obtenerPagos(),
    gastos: obtenerGastos(),
    bancos: obtenerBancos()
  };
}

// Usa la vista resumen_ventas_pagos_mensual (agregada por Postgres) en vez de traer
// cada fila de ventas y pagos — la pestaña "Saldos Clientes" solo necesita totales por mes.
function obtenerResumenVentasPagosMensual() {
  return supabaseQueryAllCached('resumen_ventas_pagos_mensual', QUERY_RESUMEN);
}

// ============================================
// FLETES
// ============================================

function guardarFlete(datos, id, chequeIds, chequeEmitidoIds) {
  var fleteId = id;
  if (!id) {
    try {
      var tempArray = supabaseQuery('fletes', 'POST', [datos]);
      fleteId = (tempArray && tempArray[0] && tempArray[0].id) ? tempArray[0].id : null;
      tempArray = null;
    } catch(e) {
      Logger.log('[guardarFlete] Error creando flete: ' + e.message);
      return { ok: false, error: 'Error al guardar flete: ' + e.message };
    }
  } else {
    try {
      supabaseQuery('fletes', 'PATCH', datos, { id: id });
    } catch(e) {
      Logger.log('[guardarFlete] Error actualizando flete: ' + e.message);
      return { ok: false, error: 'Error al actualizar flete: ' + e.message };
    }
  }

  if (!id && !fleteId) {
    return { ok: false, error: 'Flete no guardado' };
  }

  invalidarCacheTabla('fletes', QUERY_FLETES);
  Logger.log('[guardarFlete] Flete guardado: ' + fleteId);

  // Convertir y validar cheque IDs
  chequeIds = (chequeIds || []).map(function(x) { return parseInt(x, 10); });
  chequeEmitidoIds = (chequeEmitidoIds || []).map(function(x) { return parseInt(x, 10); });

  // Validar que no haya IDs duplicados entre tablas (protección extra)
  var chequeIdsSet = new Set(chequeIds);
  var chequeEmitidoIdsSet = new Set(chequeEmitidoIds);
  chequeIdsSet.forEach(function(id) {
    if (chequeEmitidoIdsSet.has(id)) {
      Logger.log('[guardarFlete] ADVERTENCIA: ID ' + id + ' aparece en ambas tablas');
    }
  });

  var chequesActualizados = 0;
  var chequesDesvinculados = 0;
  var erroresCheques = [];

  // Desvincular cheques actuales (si es edición)
  if (id) {
    try {
      var tempExistentes = supabaseQuery('cheques', 'GET', null, { estado: 'ENTREGADO' }, 'select=id,fecha_salida&limit=1000') || [];
      tempExistentes = tempExistentes.filter(function(c) { return c.fecha_salida === datos.fecha_flete; });
      for (var j = 0; j < tempExistentes.length; j++) {
        try {
          supabaseQuery('cheques', 'PATCH', { estado: 'DISPONIBLE', fecha_salida: null }, { id: tempExistentes[j].id });
          chequesDesvinculados++;
        } catch(e) {
          erroresCheques.push('Error desvinculando cheque ' + tempExistentes[j].id + ': ' + e.message);
        }
      }
      tempExistentes = null;
    } catch(e) {
      Logger.log('[guardarFlete] Error consultando cheques existentes: ' + e.message);
    }
  }

  // Vincular cheques nuevos (recibidos)
  for (var i = 0; i < chequeIds.length; i++) {
    try {
      var chequeData = supabaseQuery('cheques', 'GET', null, { id: chequeIds[i] }, 'limit=1');
      if (!chequeData || !chequeData[0]) {
        erroresCheques.push('Cheque recibido ' + chequeIds[i] + ' no encontrado');
        continue;
      }
      supabaseQuery('cheques', 'PATCH', {
        estado: 'ENTREGADO',
        fecha_salida: datos.fecha_flete
      }, { id: chequeIds[i] });
      chequesActualizados++;
    } catch(e) {
      erroresCheques.push('Error vinculando cheque recibido ' + chequeIds[i] + ': ' + e.message);
    }
  }

  if (chequesActualizados > 0 || chequesDesvinculados > 0) {
    invalidarCacheTabla('cheques', QUERY_CHEQUES);
  }

  // Cheques emitidos
  if (id) {
    try {
      var existentesEm = supabaseQuery('cheques_emitidos', 'GET', null, { estado: 'ENTREGADO' }, 'select=id,created_at&limit=1000') || [];
      existentesEm = (existentesEm || []).filter(function(c) { return c && c.created_at && c.created_at.substr(0,10) === datos.fecha_flete; });
      existentesEm.forEach(function(c) {
        try {
          supabaseQuery('cheques_emitidos', 'PATCH', { estado: 'PENDIENTE' }, { id: c.id });
        } catch(e) {
          erroresCheques.push('Error desvinculando cheque emitido ' + c.id + ': ' + e.message);
        }
      });
    } catch(e) {
      Logger.log('[guardarFlete] Error consultando cheques emitidos existentes: ' + e.message);
    }
  }

  chequeEmitidoIds.forEach(function(cid) {
    try {
      var chequeEmData = supabaseQuery('cheques_emitidos', 'GET', null, { id: cid }, 'limit=1');
      if (!chequeEmData || !chequeEmData[0]) {
        erroresCheques.push('Cheque emitido ' + cid + ' no encontrado');
        return;
      }
      supabaseQuery('cheques_emitidos', 'PATCH', { estado: 'ENTREGADO' }, { id: cid });
    } catch(e) {
      erroresCheques.push('Error vinculando cheque emitido ' + cid + ': ' + e.message);
    }
  });

  if (chequeEmitidoIds.length > 0) {
    invalidarCacheTabla('cheques_emitidos', QUERY_CHEQUES_EM);
  }

  if (erroresCheques.length > 0) {
    Logger.log('[guardarFlete] Errores procesando cheques: ' + erroresCheques.join(' | '));
    return { ok: true, warning: 'Flete guardado pero con errores en cheques: ' + erroresCheques.join('; ') };
  }

  Logger.log('[guardarFlete] Completado - Actualizados: ' + chequesActualizados + ', Desvinculados: ' + chequesDesvinculados);
  return { ok: true };
}

function insertarFletes(rows) {
  // rows ya vienen procesados desde el frontend
  var insertados = 0, errors = [];
  var LOTE = 100;
  for (var i = 0; i < rows.length; i += LOTE) {
    try {
      var lote = rows.slice(i, i + LOTE);
      var r = supabaseQuery('fletes', 'POST', lote);
      insertados += Array.isArray(r) ? r.length : lote.length;
    } catch(e) {
      errors.push('Lote ' + i + ': ' + e.message);
    }
  }
  invalidarCacheTabla('fletes', QUERY_FLETES);
  return { insertados: insertados, errors: errors };
}

function eliminarFleteById(id) {
  var res = supabaseDelete('fletes', id);
  invalidarCacheTabla('fletes', QUERY_FLETES);
  return res;
}

// ============================================
// VENTAS
// ============================================

// Reemplaza las ventas de un mes: borra lo existente en ese período e inserta lo nuevo
function reemplazarVentasDelMes(mesKey, rows) {
  var partes = mesKey.split('-');
  var anio = parseInt(partes[0], 10), mes = parseInt(partes[1], 10);
  var inicio = mesKey + '-01';
  var finMes = mes === 12 ? (anio + 1) + '-01-01' : anio + '-' + (mes + 1 < 10 ? '0' : '') + (mes + 1) + '-01';

  var ventasExistentes = supabaseQuery('ventas', 'GET', null, null, 'fecha=gte.' + inicio + '&fecha=lt.' + finMes + '&order=id.asc') || [];
  var mapaExistentes = {};
  ventasExistentes.forEach(function(v) {
    mapaExistentes[v.comprobante] = v;
  });

  var rowsABorrar = [], rowsAInsertar = [];
  rows.forEach(function(r) {
    var existente = mapaExistentes[r.comprobante];
    if (!existente) {
      rowsAInsertar.push(r);
    } else if (existente.estado !== 'PAGADA') {
      rowsABorrar.push(existente.id);
      rowsAInsertar.push(r);
    }
  });

  rowsABorrar.forEach(function(id) {
    supabaseDelete('ventas', id);
  });

  var insertados = 0, errors = [];
  var LOTE = 200;
  for (var i = 0; i < rowsAInsertar.length; i += LOTE) {
    try {
      var lote = rowsAInsertar.slice(i, i + LOTE);
      var url = SUPABASE_URL + '/rest/v1/ventas?on_conflict=comprobante';
      UrlFetchApp.fetch(url, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': 'Bearer ' + SUPABASE_KEY,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates,return=minimal'
        },
        payload: JSON.stringify(lote),
        muteHttpExceptions: true
      });
      insertados += lote.length;
    } catch(e) {
      errors.push('Mes ' + mesKey + ', lote ' + i + ': ' + e.message);
    }
  }
  return { insertados: insertados, errors: errors };
}

function insertarVentas(rows) {
  // rows ya vienen procesados desde el frontend
  var clientes = supabaseQuery('clientes', 'GET', null, null, 'limit=10000') || [];
  var mapaClientes = {};
  clientes.forEach(function(c) { mapaClientes[normalizarNombre(c.nombre)] = c.id; });

  var sin_cliente = [];
  rows.forEach(function(v) {
    if (!v.cliente_id && v.cliente_nombre) {
      var cid = mapaClientes[normalizarNombre(v.cliente_nombre)];
      if (cid) v.cliente_id = cid;
      else sin_cliente.push(v.cliente_nombre);
    }
  });

  // Agrupa por mes (yyyy-mm) y reemplaza los registros existentes de cada período
  var meses = {};
  rows.forEach(function(v) {
    var mesKey = (v.fecha || '').substr(0, 7);
    if (!mesKey) return;
    (meses[mesKey] = meses[mesKey] || []).push(v);
  });

  var insertados = 0, errors = [];
  Object.keys(meses).forEach(function(mesKey) {
    var res = reemplazarVentasDelMes(mesKey, meses[mesKey]);
    insertados += res.insertados;
    errors = errors.concat(res.errors);
  });

  var unicosSin = sin_cliente.filter(function(v,i,a){ return a.indexOf(v)===i; });
  invalidarCacheVentas();
  return { insertados: insertados, sin_cliente: unicosSin, errors: errors };
}

function actualizarVenta(id, datos) {
  supabaseQuery('ventas', 'PATCH', datos, { id: id });
  invalidarCacheVentas();
  return { ok: true };
}

function eliminarVentaById(id) {
  var res = supabaseDelete('ventas', id);
  invalidarCacheVentas();
  return res;
}

function actualizarVentasPorNombreCliente(nombreOriginal, nuevoNombre, clienteId) {
  var url = SUPABASE_URL + '/rest/v1/ventas?cliente_nombre=eq.' + encodeURIComponent(nombreOriginal);
  var options = {
    method: 'PATCH',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': 'Bearer ' + SUPABASE_KEY,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    payload: JSON.stringify({ cliente_nombre: nuevoNombre, cliente_id: clienteId }),
    muteHttpExceptions: true
  };
  var response = UrlFetchApp.fetch(url, options);
  var text = response.getContentText();
  var actualizados = text ? JSON.parse(text) : [];
  invalidarCacheVentas();
  return { ok: true, cantidad: Array.isArray(actualizados) ? actualizados.length : 0 };
}

// ============================================
// PAGOS
// ============================================

function guardarPago(datos, id, comprobantesIds) {
  if (id) {
    supabaseQuery('pagos', 'PATCH', datos, { id: id });
  } else {
    supabaseQuery('pagos', 'POST', [datos]);
  }
  if (comprobantesIds && comprobantesIds.length > 0) {
    comprobantesIds.forEach(function(cId) {
      supabaseQuery('ventas', 'PATCH', { estado: 'PAGADA' }, { id: cId });
    });
  }
  invalidarCachePagos();
  return { ok: true };
}

function obtenerVentasNoPagadas(clienteId, comprobantesEnCobro) {
  comprobantesEnCobro = comprobantesEnCobro || [];
  var todas = supabaseQueryAll('ventas', 'order=comprobante.asc');
  return (todas || []).filter(function(v) {
    if (v.cliente_id !== clienteId) return false;
    var estado = v.estado || '';
    // Mostrar si: no está PAGADA, O está PAGADA pero está en este cobro (para poder deseleccionar)
    return estado !== 'PAGADA' || comprobantesEnCobro.indexOf(String(v.id)) !== -1;
  }).map(function(v) {
    return {
      id: v.id,
      comprobante: v.comprobante || '',
      fecha: v.fecha || '',
      debe: parseFloat(v.debe) || 0,
      estado: v.estado || 'PENDIENTE'
    };
  });
}

function sumarDiasGs(fechaStr, dias) {
  if (!fechaStr) return null;
  var partes = fechaStr.split('-');
  var d = new Date(Date.UTC(parseInt(partes[0], 10), parseInt(partes[1], 10) - 1, parseInt(partes[2], 10)));
  d.setUTCDate(d.getUTCDate() + (parseInt(dias, 10) || 0));
  var y = d.getUTCFullYear(), m = String(d.getUTCMonth() + 1).padStart(2, '0'), day = String(d.getUTCDate()).padStart(2, '0');
  return y + '-' + m + '-' + day;
}

function obtenerChequesDePago(pagoId) {
  return supabaseQuery('cheques', 'GET', null, { pago_id: pagoId }, 'order=id.asc') || [];
}

// Guarda el pago y sincroniza sus cheques (puede haber más de uno). cheques: [{id, numero,
// banco, importe, tipo, fecha_emision, fecha_pago, dias}] — id nulo/ausente = cheque nuevo.
// Cualquier cheque que ya estuviera linkeado a este pago y no venga en la lista se borra.
function guardarPagoConCheques(datos, id, cheques, comprobantesIds, comprobantesDeseleccionados) {
  var pagoId = id;
  comprobantesIds = comprobantesIds || [];
  comprobantesDeseleccionados = comprobantesDeseleccionados || [];

  if (id) {
    datos.comprobantes_ids = JSON.stringify(comprobantesIds);
    supabaseQuery('pagos', 'PATCH', datos, { id: id });
  } else {
    datos.comprobantes_ids = JSON.stringify(comprobantesIds);
    var res = supabaseQuery('pagos', 'POST', [datos]);
    pagoId = (res && res[0] && res[0].id) ? res[0].id : null;
  }

  cheques = cheques || [];
  Logger.log('[guardarPagoConCheques] Cheques recibidos: ' + JSON.stringify(cheques));
  var existentes = supabaseQuery('cheques', 'GET', null, { pago_id: pagoId }) || [];
  var idsActuales = cheques.filter(function(c) { return c.id; }).map(function(c) { return c.id; });
  var aBorrar = existentes.filter(function(e) { return idsActuales.indexOf(e.id) === -1; });

  cheques.forEach(function(c) {
    var fechaPago = c.fecha_pago;
    if (!fechaPago && c.fecha_emision) {
      fechaPago = sumarDiasGs(c.fecha_emision, 30);
    }
    var chDatos = {
      pago_id: pagoId, cliente_nombre: datos.cliente_nombre, cliente_id: datos.cliente_id,
      numero: c.numero, banco: c.banco, importe: c.importe, tipo: c.tipo,
      fecha_emision: c.fecha_emision || null, fecha_pago: fechaPago || null,
      dias: c.dias || 0, fecha_vencimiento: fechaPago ? sumarDiasGs(fechaPago, c.dias) : null
    };
    if (c.id) {
      supabaseQuery('cheques', 'PATCH', chDatos, { id: c.id });
    } else {
      supabaseQuery('cheques', 'POST', [chDatos]);
    }
  });

  aBorrar.forEach(function(e) {
    supabaseDelete('cheques', e.id);
  });

  if (comprobantesDeseleccionados && comprobantesDeseleccionados.length > 0) {
    comprobantesDeseleccionados.forEach(function(cId) {
      supabaseQuery('ventas', 'PATCH', { estado: 'ENTREGADA CONFORME' }, { id: parseInt(cId, 10) });
    });
  }

  if (comprobantesIds && comprobantesIds.length > 0) {
    comprobantesIds.forEach(function(cId) {
      supabaseQuery('ventas', 'PATCH', { estado: 'PAGADA' }, { id: parseInt(cId, 10) });
    });
  }

  invalidarCachePagos();
  invalidarCacheTabla('cheques', QUERY_CHEQUES);
  invalidarCacheTabla('ventas', QUERY_VENTAS);
  return { ok: true, pagoId: pagoId };
}

// Reemplaza los cobros de un mes: borra lo existente en ese período e inserta lo nuevo
function reemplazarPagosDelMes(mesKey, rows) {
  var partes = mesKey.split('-');
  var anio = parseInt(partes[0], 10), mes = parseInt(partes[1], 10);
  var inicio = mesKey + '-01';
  var finMes = mes === 12 ? (anio + 1) + '-01-01' : anio + '-' + (mes + 1 < 10 ? '0' : '') + (mes + 1) + '-01';

  // Los cobros que se van a reemplazar pueden tener cheques vinculados (pago_id) —
  // hay que borrarlos primero o el DELETE de "pagos" falla por la FK.
  var pagosExistentes = supabaseQuery('pagos', 'GET', null, null, 'select=id&fecha=gte.' + inicio + '&fecha=lt.' + finMes) || [];
  var idsExistentes = pagosExistentes.map(function(p) { return p.id; });
  if (idsExistentes.length) {
    UrlFetchApp.fetch(SUPABASE_URL + '/rest/v1/cheques?pago_id=in.(' + idsExistentes.join(',') + ')', {
      method: 'DELETE',
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY, 'Prefer': 'return=minimal' },
      muteHttpExceptions: true
    });
  }

  UrlFetchApp.fetch(SUPABASE_URL + '/rest/v1/pagos?fecha=gte.' + inicio + '&fecha=lt.' + finMes, {
    method: 'DELETE',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': 'Bearer ' + SUPABASE_KEY,
      'Prefer': 'return=minimal'
    },
    muteHttpExceptions: true
  });

  // Trae los cheques ya existentes (numero+banco+importe) para no crear una segunda
  // copia si el archivo trae el mismo cheque físico repetido en dos filas de cobro.
  var chequesExistentes = supabaseQuery('cheques', 'GET', null, null, 'select=numero,banco,importe') || [];
  var clavesChequeVistas = {};
  chequesExistentes.forEach(function(c) {
    clavesChequeVistas[[(c.numero || '').trim(), (c.banco || '').trim(), c.importe].join('|')] = true;
  });
  var chequesOmitidos = 0;

  var insertados = 0, errors = [];
  var LOTE = 200;
  for (var i = 0; i < rows.length; i += LOTE) {
    try {
      var lote = rows.slice(i, i + LOTE);
      var r = supabaseQuery('pagos', 'POST', lote);
      var insertadosLote = Array.isArray(r) ? r : [];
      insertados += insertadosLote.length || lote.length;

      // Si la fila traía datos de cheque, se registra también en Cheques Recibidos —
      // igual que cuando se carga un cobro a mano con "Pago incluye cheque(s)".
      var chequesNuevos = [];
      insertadosLote.forEach(function(p, idx) {
        var origen = lote[idx];
        if (origen && origen.cheque_numero && String(origen.cheque_numero).trim()) {
          var numero = String(origen.cheque_numero).trim();
          var banco = origen.banco || '';
          var importe = origen.importe_cheque || 0;
          var clave = [numero, banco, importe].join('|');
          if (clavesChequeVistas[clave]) { chequesOmitidos++; return; }
          clavesChequeVistas[clave] = true;
          chequesNuevos.push({
            pago_id: p.id, cliente_nombre: p.cliente_nombre, cliente_id: p.cliente_id,
            numero: numero, banco: banco, importe: importe, tipo: 'cartera',
            fecha_pago: p.fecha, fecha_vencimiento: sumarDiasGs(p.fecha, 30), dias: 30
          });
        }
      });
      if (chequesNuevos.length) supabaseQuery('cheques', 'POST', chequesNuevos);
    } catch(e) {
      errors.push('Mes ' + mesKey + ', lote ' + i + ': ' + e.message);
    }
  }
  return { insertados: insertados, errors: errors, chequesOmitidos: chequesOmitidos };
}

function insertarPagos(rows) {
  // rows ya vienen procesados desde el frontend (filtrados al último mes con datos).
  // Defensa extra: descarta filas 100% idénticas (el archivo de origen a veces trae
  // la misma fila de cobro repetida — duplicado real del export, no un reemplazo).
  var vistos = {};
  rows = rows.filter(function(r) {
    var clave = [r.fecha, normalizarNombre(r.cliente_nombre), r.haber, r.efectivo, r.transferencia,
      (r.cheque_numero || '').trim(), (r.banco || '').trim(), r.importe_cheque, (r.observaciones || '').trim()].join('|');
    if (vistos[clave]) return false;
    vistos[clave] = true;
    return true;
  });

  var clientes = supabaseQuery('clientes', 'GET', null, null, 'limit=10000') || [];
  var mapaClientes = {};
  clientes.forEach(function(c) { mapaClientes[normalizarNombre(c.nombre)] = c.id; });

  var sin_cliente = [];
  rows.forEach(function(p) {
    if (!p.cliente_id && p.cliente_nombre) {
      var cid = mapaClientes[normalizarNombre(p.cliente_nombre)];
      if (cid) p.cliente_id = cid;
      else sin_cliente.push(p.cliente_nombre);
    }
  });

  // Agrupa por mes (yyyy-mm) y reemplaza los registros existentes de cada período
  var meses = {};
  rows.forEach(function(p) {
    var mesKey = (p.fecha || '').substr(0, 7);
    if (!mesKey) return;
    (meses[mesKey] = meses[mesKey] || []).push(p);
  });

  var insertados = 0, errors = [], chequesOmitidos = 0;
  Object.keys(meses).forEach(function(mesKey) {
    var res = reemplazarPagosDelMes(mesKey, meses[mesKey]);
    insertados += res.insertados;
    chequesOmitidos += res.chequesOmitidos || 0;
    errors = errors.concat(res.errors);
  });

  var unicosSin = sin_cliente.filter(function(v,i,a){ return a.indexOf(v)===i; });
  invalidarCachePagos();
  invalidarCacheTabla('cheques', QUERY_CHEQUES);
  return { insertados: insertados, sin_cliente: unicosSin, errors: errors, chequesOmitidos: chequesOmitidos };
}

function eliminarPagoById(id) {
  var res = supabaseDelete('pagos', id);
  invalidarCachePagos();
  return res;
}

// ============================================
// GASTOS
// ============================================

function obtenerGastos() {
  return supabaseQueryAllCached('gastos', QUERY_GASTOS);
}

var TIPOS_CHEQUE_EMITIDO_PAGABLES = ['CHEQUE PROPIO', 'ECHEQ', 'CHEQUE TERCERO'];

// chequeIds: ids de cheques recibidos elegidos para pagar este gasto (cuando metodo_pago
// = CHEQUE o MIXTO). chequeEmitidoIds: ids de cheques emitidos (propio/echeq/tercero) usados
// para lo mismo. Los que se agreguen quedan "entregados"; los que se saquen vuelven a estar
// disponibles (DISPONIBLE en cheques recibidos, PENDIENTE en cheques emitidos).

function guardarGastoEnBD(datos, id) {
  if (id) {
    supabaseQuery('gastos', 'PATCH', datos, { id: id });
    return id;
  } else {
    var res = supabaseQuery('gastos', 'POST', [datos]);
    return (res && res[0] && res[0].id) ? res[0].id : null;
  }
}

function actualizarChequeEnGasto(chequeId, gastoId, fecha_salida) {
  Logger.log('[actualizarChequeEnGasto] Iniciando para chequeId=' + chequeId + ' gastoId=' + gastoId + ' fecha=' + fecha_salida);
  var chq = supabaseQuery('cheques', 'GET', null, null, 'id=eq.' + chequeId) || [];
  Logger.log('[actualizarChequeEnGasto] Datos obtenidos: ' + JSON.stringify(chq));
  if (chq && chq[0]) {
    var c = chq[0];
    Logger.log('[actualizarChequeEnGasto] Actualizando con: numero=' + c.numero + ' banco=' + c.banco + ' importe=' + c.importe);
    supabaseQuery('cheques', 'PATCH', {
      gasto_id: gastoId,
      fecha_salida: fecha_salida,
      estado: 'ENTREGADO',
      pago_id: c.pago_id,
      numero: c.numero,
      banco: c.banco,
      importe: c.importe
    }, { id: chequeId });
    Logger.log('[actualizarChequeEnGasto] Actualización completada');
  } else {
    Logger.log('[actualizarChequeEnGasto] ERROR: No se encontraron datos del cheque');
  }
}

function guardarGasto(datos, id, chequeIds, chequeEmitidoIds) {
  Logger.log('[guardarGasto] INICIANDO - datos=' + JSON.stringify(datos) + ', id=' + id + ', chequeIds=' + JSON.stringify(chequeIds));
  // Guardar gasto y obtener ID
  var gastoId = id;
  if (!id) {
    try {
      var tempArray = supabaseQuery('gastos', 'POST', [datos]);
      gastoId = (tempArray && tempArray[0] && tempArray[0].id) ? tempArray[0].id : null;
      tempArray = null;
    } catch(e) {
      gastoId = null;
    }
  } else {
    // Editar gasto existente
    supabaseQuery('gastos', 'PATCH', datos, { id: id });
  }

  if (!id && !gastoId) {
    return { ok: false, error: 'Gasto no guardado' };
  }

  Logger.log('[guardarGasto] Gasto guardado/editado: ' + gastoId);
  invalidarCacheTabla('gastos', QUERY_GASTOS);

  // Convertir cheque IDs
  chequeIds = (chequeIds || []).map(function(x) { return parseInt(x, 10); });
  chequeEmitidoIds = (chequeEmitidoIds || []).map(function(x) { return parseInt(x, 10); });
  Logger.log('[guardarGasto] chequeIds después de parsear: ' + JSON.stringify(chequeIds) + ', length=' + chequeIds.length);

  var chequesActualizados = 0;
  var chequesDesvinculados = 0;

  // Desvincular cheques actuales
  var tempExistentes = supabaseQuery('cheques', 'GET', null, { gasto_id: gastoId });
  if (tempExistentes) {
    for (var j = 0; j < tempExistentes.length; j++) {
      supabaseQuery('cheques', 'PATCH', { gasto_id: null, estado: 'DISPONIBLE', fecha_salida: null }, { id: tempExistentes[j].id });
      chequesDesvinculados++;
    }
  }
  tempExistentes = null;
  Logger.log('[guardarGasto] Iniciando vinculación de ' + chequeIds.length + ' cheques nuevos');

  // Vincular cheques nuevos
  for (var i = 0; i < chequeIds.length; i++) {
    Logger.log('[guardarGasto] Actualizando cheque ' + chequeIds[i] + ' para gasto ' + gastoId);
    actualizarChequeEnGasto(chequeIds[i], gastoId, datos.fecha);
    chequesActualizados++;
  }
  Logger.log('[guardarGasto] Vinculación completada. Total actualizados: ' + chequesActualizados);

  if (chequesActualizados > 0 || chequesDesvinculados > 0) {
    invalidarCacheTabla('cheques', QUERY_CHEQUES);
  }

  // Cheques emitidos
  var existentesEm = supabaseQuery('cheques_emitidos', 'GET', null, { gasto_id: gastoId }) || [];
  existentesEm.forEach(function(c) {
    supabaseQuery('cheques_emitidos', 'PATCH', { gasto_id: null, estado: 'PENDIENTE' }, { id: c.id });
  });

  chequeEmitidoIds.forEach(function(cid) {
    supabaseQuery('cheques_emitidos', 'PATCH', { gasto_id: gastoId, estado: 'ENTREGADO' }, { id: cid });
  });

  if (chequeEmitidoIds.length > 0 || existentesEm.length > 0) {
    invalidarCacheTabla('cheques_emitidos', QUERY_CHEQUES_EM);
  }

  // Actualizar el campo cheque_numero del gasto con todos los números (recibidos y emitidos)
  var chequesActuales = supabaseQuery('cheques', 'GET', null, { gasto_id: gastoId }) || [];
  var chequesEmitidosActuales = supabaseQuery('cheques_emitidos', 'GET', null, { gasto_id: gastoId }) || [];
  var todos = chequesActuales.concat(chequesEmitidosActuales);
  var numerosCheques = todos.map(function(c) { return c.numero || c.numero_cheque; }).join(', ');
  if (todos.length > 0) {
    supabaseQuery('gastos', 'PATCH', { cheque_numero: numerosCheques }, { id: gastoId });
  }

  var responseObj = {};
  responseObj.ok = true;
  responseObj.gastoId = gastoId;
  responseObj.chequesActualizados = chequesActualizados;
  responseObj.chequesDesvinculados = chequesDesvinculados;
  responseObj.chequeIdsRecibidos = chequeIds;
  responseObj.mensaje = 'Gasto ' + gastoId + ' con ' + chequesActualizados + ' cheques actualizados';

  return JSON.parse(JSON.stringify({ok:true,gastoId:gastoId,chequesActualizados:chequesActualizados,mensaje:'Cheques actualizados: ' + chequesActualizados}));
}

// Cheques disponibles para pagar un gasto: no vencidos y no entregados (recibidos) o
// PENDIENTE (emitidos: propio/echeq/tercero), más los que ya estén vinculados al gasto
// que se está editando (para poder desmarcarlos).
function pruebaBuscarChequeGasto() {
  var gastoId = 3121;
  var resultado = {};

  // Busca directa por gasto_id
  var chequesDirectos = supabaseQuery('cheques', 'GET', null, { gasto_id: gastoId }) || [];
  resultado.chequesDirectos = chequesDirectos.length;
  resultado.chequesDirectosIds = chequesDirectos.map(function(c) { return c.id; });

  // Busca todos con gasto_id no nulo
  var todosCongasto = supabaseQuery('cheques', 'GET', null, null, 'gasto_id=not.is.null') || [];
  resultado.totalCongasto = todosCongasto.length;
  resultado.ejemplos = todosCongasto.slice(0, 5).map(function(c) { return { id: c.id, gasto_id: c.gasto_id, tipo: typeof c.gasto_id }; });

  return resultado;
}

function obtenerChequesDisponiblesParaGasto(gastoId) {
  gastoId = gastoId ? parseInt(gastoId, 10) : null;

  var hoy = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'America/Argentina/Mendoza', 'yyyy-MM-dd');

  // Cheques RECIBIDOS
  var chequesDelGasto = [];
  var chequesDisponibles = supabaseQuery('cheques', 'GET', null, null, 'estado=eq.DISPONIBLE&fecha_vencimiento=gte.' + hoy + '&order=fecha_vencimiento.asc') || [];

  if (gastoId) {
    var todosConGasto = supabaseQuery('cheques', 'GET', null, null, 'gasto_id=not.is.null&order=fecha_vencimiento.asc') || [];
    chequesDelGasto = todosConGasto.filter(function(c) { return c.gasto_id == gastoId; });
  }

  var mapa = {};
  chequesDisponibles.forEach(function(c) { mapa[c.id] = c; });
  chequesDelGasto.forEach(function(c) { mapa[c.id] = c; });
  var lista = Object.keys(mapa).map(function(id) { return mapa[id]; })
    .sort(function(a, b) { return (a.fecha_vencimiento || '').localeCompare(b.fecha_vencimiento || ''); });

  // Cheques EMITIDOS
  var chequesEmitidosDelGasto = [];
  var tipoQuery = TIPOS_CHEQUE_EMITIDO_PAGABLES.map(function(t) { return encodeURIComponent(t); }).join(',');
  var chequesEmitidosPendientes = supabaseQuery('cheques_emitidos', 'GET', null, null, 'estado=eq.PENDIENTE&tipo_cheque=in.(' + tipoQuery + ')&order=fecha_pago.asc') || [];

  if (gastoId) {
    var todosEmitidosConGasto = supabaseQuery('cheques_emitidos', 'GET', null, null, 'gasto_id=not.is.null&order=fecha_pago.asc') || [];
    chequesEmitidosDelGasto = todosEmitidosConGasto.filter(function(c) { return c.gasto_id == gastoId; });
  }

  var mapaEm = {};
  chequesEmitidosPendientes.forEach(function(c) { mapaEm[c.id] = c; });
  chequesEmitidosDelGasto.forEach(function(c) { mapaEm[c.id] = c; });
  var listaEm = Object.keys(mapaEm).map(function(id) { return mapaEm[id]; })
    .sort(function(a, b) { return (a.fecha_pago || '').localeCompare(b.fecha_pago || ''); });

  return {
    disponibles: lista,
    yaAsignadosIds: chequesDelGasto.map(function(c) { return c.id; }),
    disponiblesEm: listaEm,
    yaAsignadosEmIds: chequesEmitidosDelGasto.map(function(c) { return c.id; })
  };
}

// Libera los cheques (recibidos y emitidos) vinculados a un gasto y recién después lo
// borra — si no, el DELETE falla por la FK gasto_id.
function eliminarGastoById(id) {
  var vinculados = supabaseQuery('cheques', 'GET', null, { gasto_id: id }) || [];
  vinculados.forEach(function(c) {
    supabaseQuery('cheques', 'PATCH', { gasto_id: null, fecha_salida: null, monto_salida: null, estado: 'DISPONIBLE' }, { id: c.id });
  });
  if (vinculados.length) invalidarCacheTabla('cheques', QUERY_CHEQUES);

  var vinculadosEm = supabaseQuery('cheques_emitidos', 'GET', null, { gasto_id: id }) || [];
  vinculadosEm.forEach(function(c) {
    supabaseQuery('cheques_emitidos', 'PATCH', { gasto_id: null, estado: 'PENDIENTE' }, { id: c.id });
  });
  if (vinculadosEm.length) invalidarCacheTabla('cheques_emitidos', QUERY_CHEQUES_EM);

  var res = supabaseDelete('gastos', id);
  invalidarCacheTabla('gastos', QUERY_GASTOS);
  return res;
}

// Reemplaza los gastos de un mes: borra lo existente en ese período e inserta lo nuevo
function reemplazarGastosDelMes(mesKey, rows) {
  var partes = mesKey.split('-');
  var anio = parseInt(partes[0], 10), mes = parseInt(partes[1], 10);
  var inicio = mesKey + '-01';
  var finMes = mes === 12 ? (anio + 1) + '-01-01' : anio + '-' + (mes + 1 < 10 ? '0' : '') + (mes + 1) + '-01';

  UrlFetchApp.fetch(SUPABASE_URL + '/rest/v1/gastos?fecha=gte.' + inicio + '&fecha=lt.' + finMes, {
    method: 'DELETE',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': 'Bearer ' + SUPABASE_KEY,
      'Prefer': 'return=minimal'
    },
    muteHttpExceptions: true
  });

  var insertados = 0, errors = [];
  var LOTE = 100;
  for (var i = 0; i < rows.length; i += LOTE) {
    try {
      var lote = rows.slice(i, i + LOTE);
      var r = supabaseQuery('gastos', 'POST', lote);
      insertados += Array.isArray(r) ? r.length : lote.length;
    } catch(e) {
      errors.push('Mes ' + mesKey + ', lote ' + i + ': ' + e.message);
    }
  }
  return { insertados: insertados, errors: errors };
}

// rows: filas ya parseadas del CSV (fecha, proveedor, rubro, monto, metodo_pago,
// cheque_numero, estado, observaciones), sin proveedor_id todavía. Acá se matchea
// contra el maestro de proveedores (excluyendo las filas de proveedores no registrados)
// y se agrupa por mes para reemplazar los registros existentes de cada período.
function insertarGastos(rows) {
  var proveedores = supabaseQuery('proveedores', 'GET', null, null, 'limit=10000') || [];
  var mapaProveedores = {};
  proveedores.forEach(function(p) { mapaProveedores[normalizarNombre(p.nombre)] = p; });

  var validos = [], sinProveedor = [];
  rows.forEach(function(g) {
    var match = mapaProveedores[normalizarNombre(g.proveedor)];
    if (!match) { if (g.proveedor) sinProveedor.push(g.proveedor); return; }
    g.proveedor_id = match.id;
    validos.push(g);
  });

  var meses = {};
  validos.forEach(function(g) {
    var mesKey = (g.fecha || '').substr(0, 7);
    if (!mesKey) return;
    (meses[mesKey] = meses[mesKey] || []).push(g);
  });

  var insertados = 0, errors = [];
  Object.keys(meses).forEach(function(mesKey) {
    var res = reemplazarGastosDelMes(mesKey, meses[mesKey]);
    insertados += res.insertados;
    errors = errors.concat(res.errors);
  });

  var unicosSin = sinProveedor.filter(function(v,i,a){ return a.indexOf(v)===i; });
  invalidarCacheTabla('gastos', QUERY_GASTOS);
  return { insertados: insertados, excluidos: rows.length - validos.length, proveedoresNoRegistrados: unicosSin, errors: errors };
}

// ============================================
// PROVEEDORES
// ============================================

function obtenerProveedores() {
  return supabaseQueryAllCached('proveedores', QUERY_PROVEEDORES);
}

function guardarProveedor(datos, id) {
  if (datos.nombre) datos.nombre = datos.nombre.toUpperCase();
  if (id) {
    supabaseQuery('proveedores', 'PATCH', datos, { id: id });
  } else {
    supabaseQuery('proveedores', 'POST', [datos]);
  }
  invalidarCacheTabla('proveedores', QUERY_PROVEEDORES);
  return { ok: true };
}

function eliminarProveedorById(id) {
  var res = supabaseDelete('proveedores', id);
  invalidarCacheTabla('proveedores', QUERY_PROVEEDORES);
  return res;
}

// ============================================
// RUBROS (maestro de rubros de Gastos)
// ============================================

function obtenerRubros() {
  return supabaseQueryAllCached('rubros', QUERY_RUBROS);
}

function guardarRubro(nombre) {
  var r = supabaseQuery('rubros', 'POST', [{ nombre: nombre }]);
  invalidarCacheTabla('rubros', QUERY_RUBROS);
  return Array.isArray(r) ? r[0] : r;
}

// ============================================
// BANCOS (maestro de bancos de Cheques Recibidos/Emitidos)
// ============================================

function obtenerBancos() {
  return supabaseQueryAllCached('bancos', QUERY_BANCOS);
}

function guardarBanco(nombre) {
  var r = supabaseQuery('bancos', 'POST', [{ nombre: nombre }]);
  invalidarCacheTabla('bancos', QUERY_BANCOS);
  return Array.isArray(r) ? r[0] : r;
}

// ============================================
// CLIENTES
// ============================================

function insertarClientes(clientes) {
  // Trae los clientes existentes UNA sola vez (en vez de un GET de duplicado por fila).
  // El id SIEMPRE se genera acá siguiendo la correlación "CLIxxxx" de la tabla — no se
  // usa ninguna columna "id"/"ID" que traiga el archivo (puede venir con cualquier cosa,
  // como el nombre de la solapa de origen del Excel).
  var existentes = supabaseQueryAll('clientes', 'select=id,nombre');
  var nombresExistentes = {};
  var maxNum = 0;
  existentes.forEach(function(c) {
    nombresExistentes[normalizarNombre(c.nombre)] = true;
    var m = /^CLI(\d+)$/.exec(c.id || '');
    if (m) maxNum = Math.max(maxNum, parseInt(m[1], 10));
  });
  var siguienteNum = maxNum + 1;

  var rows = [], duplicados = 0;
  var nombresEnArchivo = {}; // duplicados dentro del propio archivo
  clientes.forEach(function(c) {
    var nombre = c['cliente'] || c['Cliente'] || c['nombre'] || c['Nombre'] || '';
    if (!nombre) return;
    var nombreNorm = normalizarNombre(nombre);
    if (nombresExistentes[nombreNorm] || nombresEnArchivo[nombreNorm]) { duplicados++; return; }
    nombresEnArchivo[nombreNorm] = true;

    var id = 'CLI' + ('0000' + siguienteNum).slice(-4);
    siguienteNum++;

    rows.push({
      id: id, nombre: nombre, nombre_limpio: nombre,
      email:     c['email']     || c['Email']     || '',
      telefono:  c['telefono']  || c['Teléfono']  || c['Telefono'] || '',
      direccion: c['direccion'] || c['Dirección'] || c['Direccion'] || '',
      ciudad:    c['ciudad']    || c['Ciudad']    || ''
    });
  });

  var insertados = 0, errors = [];
  var LOTE = 200;
  for (var i = 0; i < rows.length; i += LOTE) {
    try {
      var lote = rows.slice(i, i + LOTE);
      var r = supabaseQuery('clientes', 'POST', lote);
      insertados += Array.isArray(r) ? r.length : lote.length;
    } catch (e) {
      errors.push('Lote ' + i + ': ' + e.message);
    }
  }

  if (rows.length) invalidarCacheTabla('clientes', QUERY_CLIENTES);

  // Con el maestro ya actualizado, reintenta el match de Ventas y Cobros que habían
  // quedado "sin cliente" — así no hay que ir a asignarlos uno por uno a mano.
  var clientesFrescos = rows.length ? supabaseQueryAll('clientes', 'select=id,nombre') : existentes;
  var rematchVentas = rematchearSinCliente('ventas', clientesFrescos);
  var rematchPagos  = rematchearSinCliente('pagos', clientesFrescos);

  return {
    insertados: insertados, duplicados: duplicados, errors: errors,
    ventasMatcheadas: rematchVentas, pagosMatcheados: rematchPagos
  };
}

// Reintenta el match por nombre de las filas de "tabla" (ventas o pagos) que tienen
// cliente_id vacío, usando el maestro de clientes recién actualizado.
function rematchearSinCliente(tabla, clientesFrescos) {
  var filasSinMatch = supabaseQueryAll(tabla, 'cliente_id=is.null&select=id,cliente_nombre');
  if (!filasSinMatch.length) return 0;

  var mapaClientes = {};
  clientesFrescos.forEach(function(c) { mapaClientes[normalizarNombre(c.nombre)] = c; });

  var grupos = {}; // nombre normalizado -> { cliente, ids: [...] }
  filasSinMatch.forEach(function(f) {
    if (!f.cliente_nombre) return;
    var norm = normalizarNombre(f.cliente_nombre);
    var match = mapaClientes[norm];
    if (!match) return;
    var g = grupos[norm] || (grupos[norm] = { cliente: match, ids: [] });
    g.ids.push(f.id);
  });

  var actualizadas = 0;
  var LOTE_IDS = 150;
  Object.keys(grupos).forEach(function(key) {
    var g = grupos[key];
    for (var i = 0; i < g.ids.length; i += LOTE_IDS) {
      var lote = g.ids.slice(i, i + LOTE_IDS);
      UrlFetchApp.fetch(SUPABASE_URL + '/rest/v1/' + tabla + '?id=in.(' + lote.join(',') + ')', {
        method: 'PATCH',
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
        payload: JSON.stringify({ cliente_id: g.cliente.id }),
        muteHttpExceptions: true
      });
      actualizadas += lote.length;
    }
  });

  if (actualizadas) {
    if (tabla === 'ventas') invalidarCacheVentas();
    if (tabla === 'pagos')  invalidarCachePagos();
  }
  return actualizadas;
}

function verificarYGuardarCliente(datos, modoEdicion) {
  var id     = datos.id;
  var nombre = datos.nombre;

  if (modoEdicion) {
    var url = SUPABASE_URL + '/rest/v1/clientes?nombre=eq.' + encodeURIComponent(nombre)
            + '&id=neq.' + encodeURIComponent(id) + '&select=id';
    var dup = JSON.parse(UrlFetchApp.fetch(url, {
      method: 'GET',
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY },
      muteHttpExceptions: true
    }).getContentText() || '[]');
    if (dup && dup.length > 0) return { error: 'Ya existe otro cliente con ese nombre.' };

    supabaseQuery('clientes', 'PATCH', {
      nombre: nombre, nombre_limpio: nombre,
      email: datos.email, telefono: datos.telefono,
      direccion: datos.direccion, ciudad: datos.ciudad
    }, { id: id });
    invalidarCacheTabla('clientes', QUERY_CLIENTES);
    return { ok: true };
  } else {
    var dupId     = supabaseQuery('clientes', 'GET', null, { id: id },     'select=id');
    var dupNombre = supabaseQuery('clientes', 'GET', null, { nombre: nombre }, 'select=id');
    if (dupId     && dupId.length > 0)     return { error: 'Ya existe un cliente con ese ID.' };
    if (dupNombre && dupNombre.length > 0) return { error: 'Ya existe un cliente con ese nombre.' };

    supabaseQuery('clientes', 'POST', [{
      id: id, nombre: nombre, nombre_limpio: nombre,
      email: datos.email, telefono: datos.telefono,
      direccion: datos.direccion, ciudad: datos.ciudad
    }]);
    invalidarCacheTabla('clientes', QUERY_CLIENTES);

    // Con el cliente nuevo ya guardado, reintenta el match de Ventas/Cobros que
    // estuvieran esperando por este nombre exacto — igual que en la carga por CSV.
    var clientesFrescos = supabaseQueryAll('clientes', 'select=id,nombre');
    var ventasMatcheadas = rematchearSinCliente('ventas', clientesFrescos);
    var pagosMatcheados  = rematchearSinCliente('pagos', clientesFrescos);
    return { ok: true, ventasMatcheadas: ventasMatcheadas, pagosMatcheados: pagosMatcheados };
  }
}

function eliminarClienteById(id) {
  var res = supabaseDelete('clientes', id);
  invalidarCacheTabla('clientes', QUERY_CLIENTES);
  return res;
}

// ============================================
// CHEQUES RECIBIDOS
// ============================================

function obtenerCheques() {
  return supabaseQueryAllCached('cheques', QUERY_CHEQUES);
}

function guardarCheque(datos, id) {
  if (id) {
    supabaseQuery('cheques', 'PATCH', datos, { id: id });
  } else {
    supabaseQuery('cheques', 'POST', [datos]);
  }
  invalidarCacheTabla('cheques', QUERY_CHEQUES);
  return { ok: true };
}

function eliminarChequeById(id) {
  var res = supabaseDelete('cheques', id);
  invalidarCacheTabla('cheques', QUERY_CHEQUES);
  return res;
}

// Guarda o actualiza un cheque a partir del número (llamado desde guardarPago)
function guardarChequeDesde(datos) {
  var numero = datos.numero;
  if (!numero) return { ok: false, error: 'Sin número de cheque' };
  var existentes = supabaseQuery('cheques', 'GET', null, null, 'numero=eq.' + encodeURIComponent(numero) + '&select=id');
  if (existentes && existentes.length > 0) {
    supabaseQuery('cheques', 'PATCH', datos, { id: existentes[0].id });
  } else {
    supabaseQuery('cheques', 'POST', [datos]);
  }
  invalidarCacheTabla('cheques', QUERY_CHEQUES);
  return { ok: true };
}

// ============================================
// CHEQUES EMITIDOS
// ============================================

function obtenerCheqEm() {
  return supabaseQueryAllCached('cheques_emitidos', QUERY_CHEQUES_EM);
}

function guardarCheqEm(datos, id) {
  if (id) {
    supabaseQuery('cheques_emitidos', 'PATCH', datos, { id: id });
  } else {
    supabaseQuery('cheques_emitidos', 'POST', [datos]);
  }
  invalidarCacheTabla('cheques_emitidos', QUERY_CHEQUES_EM);
  return { ok: true };
}

function eliminarCheqEmById(id) {
  var res = supabaseDelete('cheques_emitidos', id);
  invalidarCacheTabla('cheques_emitidos', QUERY_CHEQUES_EM);
  return res;
}

// ============================================
// SALDOS
// ============================================
function obtenerSaldos() {
  var cache = CacheService.getUserCache();
  var key = 'supabase_saldos';
  var cached = cache.get(key);
  if (cached) return JSON.parse(cached);
  var resultado = supabaseQuery('saldos', 'GET', null, null, 'order=fecha.desc') || [];
  cache.put(key, JSON.stringify(resultado), 3600);
  return resultado;
}

function guardarSaldo(datos, id) {
  if (!datos.fecha || !datos.tipo || !datos.banco_caja || datos.monto === null || datos.monto === undefined) {
    throw new Error('Faltan datos obligatorios: fecha, tipo, banco_caja y monto son requeridos');
  }
  if (id) {
    supabaseQuery('saldos', 'PATCH', datos, { id });
  } else {
    supabaseQuery('saldos', 'POST', [datos]);
  }
  invalidarCacheTabla('saldos', 'order=fecha.desc');
  return { ok: true };
}

function eliminarSaldoById(id) {
  var res = supabaseDelete('saldos', id);
  invalidarCacheTabla('saldos', 'order=fecha.desc');
  return res;
}

// ============================================
// LIMPIEZA DE CACHE
// ============================================

function limpiarTodoElCache() {
  var cache = CacheService.getUserCache();
  cache.removeAll(cache.getKeys());
  return { ok: true, mensaje: 'Cache limpiado completamente' };
}

function limpiarCacheProveedores() {
  invalidarCacheTabla('proveedores', QUERY_PROVEEDORES);
  invalidarCacheTabla('fletes', QUERY_FLETES);
  invalidarCacheTabla('gastos', QUERY_GASTOS);
  return { ok: true, mensaje: 'Cache de proveedores, fletes y gastos limpiado' };
}

// ============================================
// NORMALIZACIÓN PROVEEDORES
// ============================================

function normalizarProveedor(str) {
  return (str || '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[.,]/g, '');
}

function analizarProveedoresDuplicados() {
  var todosProveedores = supabaseQueryAll('proveedores', QUERY_PROVEEDORES);
  var mapa = {};
  var duplicados = [];

  (todosProveedores || []).forEach(function(p) {
    var original = p.nombre || '';
    var normalizado = normalizarProveedor(original);

    if (!mapa[normalizado]) {
      mapa[normalizado] = [];
    }
    mapa[normalizado].push({
      id: p.id,
      nombre_original: original,
      tipo: p.tipo || ''
    });
  });

  Object.keys(mapa).forEach(function(key) {
    if (mapa[key].length > 1) {
      duplicados.push({
        normalizado: key,
        variantes: mapa[key]
      });
    }
  });

  return {
    total: todosProveedores.length,
    con_duplicados: duplicados.length,
    duplicados: duplicados,
    todos: todosProveedores
  };
}

function consolidarProveedores(operaciones) {
  // operaciones = [{ principal_id: 123, eliminar_ids: [124, 125] }, ...]
  var resultados = [];

  (operaciones || []).forEach(function(op) {
    try {
      var idPrincipal = op.principal_id;
      var idsEliminar = op.eliminar_ids || [];

      // Actualizar referencias en fletes
      var fletes = supabaseQueryAll('fletes', 'order=id.asc');
      (fletes || []).forEach(function(f) {
        if (idsEliminar.indexOf(f.proveedor_id) !== -1) {
          supabaseQuery('fletes', 'PATCH', { proveedor_id: idPrincipal }, { id: f.id });
        }
        if (idsEliminar.indexOf(f.chofer_id) !== -1) {
          supabaseQuery('fletes', 'PATCH', { chofer_id: idPrincipal }, { id: f.id });
        }
      });

      // Actualizar referencias en gastos
      var gastos = supabaseQueryAll('gastos', 'order=id.asc');
      (gastos || []).forEach(function(g) {
        if (idsEliminar.indexOf(g.proveedor_id) !== -1) {
          supabaseQuery('gastos', 'PATCH', { proveedor_id: idPrincipal }, { id: g.id });
        }
      });

      // Eliminar proveedores duplicados
      idsEliminar.forEach(function(id) {
        supabaseDelete('proveedores', id);
      });

      resultados.push({ principal_id: idPrincipal, eliminados: idsEliminar.length });
    } catch(e) {
      resultados.push({ error: e.message });
    }
  });

  invalidarCacheTabla('proveedores', QUERY_PROVEEDORES);
  invalidarCacheTabla('fletes', QUERY_FLETES);
  invalidarCacheTabla('gastos', QUERY_GASTOS);

  return resultados;
}

function obtenerGuiasDeObservaciones() {
  var pagos = supabaseQueryAll('pagos', QUERY_PAGOS);
  var ventas = supabaseQueryAll('ventas', 'order=fecha.desc'); // Ordenar por fecha DESC para obtener datos más recientes primero
  var guias = [];

  // Crear índice de ventas por cliente normalizado
  var ventasPorClienteNorm = {};
  ventas.forEach(function(v) {
    var clienteNorm = (v.cliente_nombre || '').toUpperCase().trim();
    if (!ventasPorClienteNorm[clienteNorm]) {
      ventasPorClienteNorm[clienteNorm] = [];
    }
    ventasPorClienteNorm[clienteNorm].push({
      comprobante: (v.comprobante || '').trim(),
      estado: v.estado || 'PENDIENTE',
      fecha: v.fecha
    });
  });

  pagos.forEach(function(p) {
    var obs = (p.observaciones || '').trim();
    if (!obs) return;

    var clienteNombre = p.cliente_nombre || '(sin cliente)';
    var clienteNorm = clienteNombre.toUpperCase().trim();
    var fecha = p.fecha || '';

    var codigos = obs.split('-').map(function(s) { return s.trim(); }).filter(function(s) { return s; });

    codigos.forEach(function(codigo) {
      var ventasDelCliente = ventasPorClienteNorm[clienteNorm] || [];
      var comprobante = null;
      var estadoVentas = null;

      // Buscar comprobante: extraer dígitos de la guía y comparar contra últimos N dígitos del comprobante
      var digitosGuia = codigo.replace(/\D/g, '');
      if (digitosGuia.length >= 4) {
        for (var i = 0; i < ventasDelCliente.length; i++) {
          var v = ventasDelCliente[i];
          var digitosCompro = v.comprobante.replace(/\D/g, '');
          var ultimosDigitosCompro = digitosCompro.slice(-digitosGuia.length);
          if (ultimosDigitosCompro === digitosGuia) {
            comprobante = v.comprobante;
            estadoVentas = v.estado;
            break;
          }
        }
      }

      guias.push({
        cliente: clienteNombre,
        fecha: fecha,
        guia: codigo,
        comprobante: comprobante || '—',
        estadoVentas: estadoVentas || '—',
        encontrado: comprobante ? 'SÍ' : 'NO'
      });
    });
  });

  guias.sort(function(a, b) {
    if (a.cliente !== b.cliente) return a.cliente.localeCompare(b.cliente);
    if (a.encontrado !== b.encontrado) return (a.encontrado === 'SÍ' ? -1 : 1);
    if (a.fecha !== b.fecha) return b.fecha.localeCompare(a.fecha);
    return a.guia.localeCompare(b.guia);
  });

  return guias;
}

// ============================================
// CONFIGURACIÓN CASHFLOW
// ============================================
function guardarConfigCashflow(gastosAbiertos) {
  var props = PropertiesService.getUserProperties();
  props.setProperty('cfGastosAbiertos', JSON.stringify(gastosAbiertos || []));
  Logger.log('Config guardada');
  return true;
}

function obtenerConfigCashflow() {
  var props = PropertiesService.getUserProperties();
  var cfg = props.getProperty('cfGastosAbiertos');
  return cfg ? JSON.parse(cfg) : [];
}

function obtenerVersion() {
  return APP_VERSION;
}
