const admin = require('firebase-admin');
const xlsx = require('xlsx');
const path = require('path');

// 1. Inicializar Firebase Admin SDK con la credencial del directorio
const serviceAccount = require('./lookahead-carretera-10km-firebase-adminsdk-fbsvc-5d6b6bc536.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Función auxiliar para convertir fechas de Excel a Timestamps de Firestore
function excelDateToTimestamp(excelDate) {
  if (!excelDate) return null;
  // Si ya es un string con formato de fecha
  if (typeof excelDate === 'string') {
    return admin.firestore.Timestamp.fromDate(new Date(excelDate));
  }
  // Si viene en formato numérico de Excel
  const date = new Date(Math.round((excelDate - 25569) * 86400 * 1000));
  return admin.firestore.Timestamp.fromDate(date);
}

async function cargarCronogramaL3() {
  console.log('Cargando cronograma_l3...');
  const workbook = xlsx.readFile(path.join(__dirname, 'pry_carretera_cronograma_l3.xlsx'));
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = xlsx.utils.sheet_to_json(worksheet);

  const batch = db.batch();
  let count = 0;
  for (const row of data) {
    if (!row.WBS) continue;
    // Solo cargamos elementos L3 (Nivel 3)
    if (Number(row.Nivel) !== 3) continue;
    
    const docRef = db.collection('cronograma_l3').doc(String(row.WBS).trim());
    batch.set(docRef, {
      id_actividad_p6: row.id_actividad_p6 ? String(row.id_actividad_p6) : '',
      nivel: Number(row.Nivel || 3),
      tipo: row.Tipo ? String(row.Tipo) : 'Actividad',
      descripcion: row.Descripcion ? String(row.Descripcion) : '',
      fecha_inicio_plan: excelDateToTimestamp(row.fecha_inicio_plan || row.fecha_inicio),
      fecha_fin_plan: excelDateToTimestamp(row.fecha_fin_plan || row.fecha_fin),
      duracion_plan_dias: Number(row.duracion_plan_dias || row.duracion || 0),
      pct_avance_metrados: 0,
      estado: 'No Iniciado'
    });
    count++;
  }
  if (count > 0) {
    await batch.commit();
  }
  console.log(`cronograma_l3 cargado exitosamente. (${count} registros)`);
}

async function cargarPresupuestoL5() {
  console.log('Cargando presupuesto_l5 y acumulados a FC...');
  
  // 1. Leer presupuesto base
  const wbPresupuesto = xlsx.readFile(path.join(__dirname, 'pry_carretera_presupuesto_l5.xlsx'));
  const dataPresupuesto = xlsx.utils.sheet_to_json(wbPresupuesto.Sheets[wbPresupuesto.SheetNames[0]]);
  
  // 2. Leer avance acumulado a la fecha de corte (FC) si existe
  let avancesFC = {};
  try {
    const wbAvance = xlsx.readFile(path.join(__dirname, 'pry_carretera_avance_l5_FC.xlsx'));
    const dataAvance = xlsx.utils.sheet_to_json(wbAvance.Sheets[wbAvance.SheetNames[0]]);
    for (const row of dataAvance) {
      const wbsKey = row.WBS || row.wbs;
      if (wbsKey) {
        avancesFC[String(wbsKey).trim()] = Number(row.metrado_avance_estimado_fc || row.metrado_avance || row.metrado_avance_fc || 0);
      }
    }
  } catch (e) {
    console.log('No se encontró archivo de avance inicial FC o tiene formato diferente. Se asumirá 0.');
  }

  const batch = db.batch();
  let count = 0;
  for (const row of dataPresupuesto) {
    const wbs = row.WBS ? String(row.WBS).trim() : null;
    if (!wbs) continue;
    // Solo cargamos partidas de Nivel 5
    if (Number(row.Nivel) !== 5) continue;

    const metradoTotal = Number(row.Metrado_Total || row.metrado_total || 0);
    const metradoAvanceFC = avancesFC[wbs] || 0;
    const metradoRemanente = Math.max(0, metradoTotal - metradoAvanceFC);
    const puSoles = Number(row.PU_Soles || row.pu_soles || 0);

    const docRef = db.collection('presupuesto_l5').doc(wbs);
    batch.set(docRef, {
      id_actividad_l3_padre: row.id_actividad_l3_padre ? String(row.id_actividad_l3_padre).trim() : wbs.split('.').slice(0, 3).join('.'),
      nivel: 5,
      tipo: row.Tipo ? String(row.Tipo) : 'Actividad',
      descripcion: row.Descripcion ? String(row.Descripcion) : '',
      unidad: row.Unidad ? String(row.Unidad) : 'm3',
      metrado_total: metradoTotal,
      pu_soles: puSoles,
      precio_parcial_soles: Number(row.Precio_Parcial_Soles || row.precio_parcial_soles || (metradoTotal * puSoles)),
      metrado_avance_estimado_fc: metradoAvanceFC,
      metrado_remanente_inicial_fc: metradoRemanente,
      metrado_avance_actual_total: metradoAvanceFC
    });
    count++;
  }
  if (count > 0) {
    await batch.commit();
  }
  console.log(`presupuesto_l5 cargado exitosamente. (${count} registros)`);
}

async function main() {
  try {
    await cargarCronogramaL3();
    await cargarPresupuestoL5();
    console.log('Inicialización completa.');
  } catch (error) {
    console.error('Error en la inicialización de datos:', error);
  }
}

main();
