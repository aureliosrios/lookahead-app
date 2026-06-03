const admin = require('firebase-admin');

// Inicializar la conexión si no se ha hecho
if (admin.apps.length === 0) {
  const serviceAccount = require('./lookahead-carretera-10km-firebase-adminsdk-fbsvc-5d6b6bc536.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

// 1. Simulación de la Cloud Function: actualizarAvanceL3
async function simularActualizarAvanceL3(id_partida_l5) {
  console.log(`\n--- Simulando Trigger actualizarAvanceL3 para partida ${id_partida_l5} ---`);
  
  // Sumar todos los metrado_ejecutado_dia históricos de esta partida L5 en avance_diario_campo
  const avancesSnapshot = await db.collection("avance_diario_campo")
    .where("id_partida_l5", "==", id_partida_l5)
    .get();
  
  let totalMetradoHistorico = 0;
  avancesSnapshot.forEach(doc => {
    totalMetradoHistorico += Number(doc.data().metrado_ejecutado_dia || 0);
  });
  console.log(`> Metrado diario registrado en campo para la partida: ${totalMetradoHistorico} m3`);

  // Obtener la partida L5 en presupuesto_l5
  const partidaL5Ref = db.collection("presupuesto_l5").doc(id_partida_l5);
  const partidaL5Doc = await partidaL5Ref.get();

  if (!partidaL5Doc.exists) {
    throw new Error(`La partida presupuesto_l5 con WBS ${id_partida_l5} no existe.`);
  }

  const partidaL5Data = partidaL5Doc.data();
  const metradoAvanceEstimadoFC = Number(partidaL5Data.metrado_avance_estimado_fc || 0);
  const puSoles = Number(partidaL5Data.pu_soles || 0);
  const idActividadL3Padre = partidaL5Data.id_actividad_l3_padre;

  console.log(`> Metrado Inicial FC: ${metradoAvanceEstimadoFC} m3 | PU: S/. ${puSoles}`);

  // Metrado Avance Actual Total y Valorizado Real L5
  const metradoAvanceActualTotal = metradoAvanceEstimadoFC + totalMetradoHistorico;
  const valorizadoRealL5 = metradoAvanceActualTotal * puSoles;

  console.log(`> Nuevo Metrado Avance Actual Total: ${metradoAvanceActualTotal} m3`);
  console.log(`> Nuevo Valorizado Real L5: S/. ${valorizadoRealL5}`);

  // Actualizar metrado acumulado en la partida L5
  await partidaL5Ref.update({
    metrado_avance_actual_total: metradoAvanceActualTotal,
    valorizado_real_l5: valorizadoRealL5
  });

  // Buscar todas las partidas L5 hermanas (que comparten el mismo L3 padre)
  const hermanasSnapshot = await db.collection("presupuesto_l5")
    .where("id_actividad_l3_padre", "==", idActividadL3Padre)
    .get();

  let sumaValorizadoRealHijas = 0;
  let sumaPrecioParcialHijas = 0;

  hermanasSnapshot.forEach(doc => {
    const hData = doc.data();
    const prParcial = Number(hData.precio_parcial_soles || 0);
    let valReal = 0;
    
    if (doc.id === id_partida_l5) {
      valReal = valorizadoRealL5;
    } else {
      const metAcumulado = Number(hData.metrado_avance_actual_total || hData.metrado_avance_estimado_fc || 0);
      const pu = Number(hData.pu_soles || 0);
      valReal = metAcumulado * pu;
    }

    sumaValorizadoRealHijas += valReal;
    sumaPrecioParcialHijas += prParcial;
  });

  // Calcular % Avance L3
  let pctAvanceL3 = 0;
  if (sumaPrecioParcialHijas > 0) {
    pctAvanceL3 = (sumaValorizadoRealHijas / sumaPrecioParcialHijas) * 100;
    pctAvanceL3 = Math.round((pctAvanceL3 + Number.EPSILON) * 100) / 100;
  }

  // Determinar estado
  let estadoL3 = "No Iniciado";
  if (pctAvanceL3 > 0 && pctAvanceL3 < 100) {
    estadoL3 = "En Progreso";
  } else if (pctAvanceL3 >= 100) {
    estadoL3 = "Completado";
  }

  console.log(`> L3 Padre (${idActividadL3Padre}) -> Suma Valorizado Hijas: S/. ${sumaValorizadoRealHijas} de S/. ${sumaPrecioParcialHijas}`);
  console.log(`> Nuevo Avance Calculado para L3: ${pctAvanceL3}% (Estado: ${estadoL3})`);

  // Actualizar L3
  await db.collection("cronograma_l3").doc(idActividadL3Padre).update({
    pct_avance_metrados: pctAvanceL3,
    estado: estadoL3
  });
}

// 2. Simulación de la Cloud Function: cierreSemanalPPC
async function simularCierreSemanalPPC(semanaActiva) {
  console.log(`\n--- Simulando Proceso de Cierre Semanal para Semana ${semanaActiva} ---`);

  // Filtrar compromisos de la semana activa
  const compromisosSnapshot = await db.collection("compromisos_lookahead")
    .where("semana_lookahead", "==", semanaActiva)
    .get();

  if (compromisosSnapshot.empty) {
    console.log(`No hay compromisos planificados para la Semana ${semanaActiva}.`);
    return;
  }

  let compromisosCumplidos = 0;
  const totalCompromisos = compromisosSnapshot.size;
  const batch = db.batch();

  for (const doc of compromisosSnapshot.docs) {
    const compromisoId = doc.id;
    const compData = doc.data();
    const metradoComprometido = Number(compData.metrado_comprometido_semanal || 0);

    // Sumar los metrados ejecutados diarios específicos de este compromiso
    const avancesSnapshot = await db.collection("avance_diario_campo")
      .where("id_compromiso", "==", compromisoId)
      .get();

    let avanceRealSemanal = 0;
    avancesSnapshot.forEach(avDoc => {
      avanceRealSemanal += Number(avDoc.data().metrado_ejecutado_dia || 0);
    });

    const cumplido = (avanceRealSemanal >= metradoComprometido);
    const nuevoEstado = cumplido ? "Cumplido" : "No Cumplido";

    console.log(`> Compromiso ${compromisoId} (Partida ${compData.id_partida_l5}): Comprometido = ${metradoComprometido} | Real = ${avanceRealSemanal} -> Estado: ${nuevoEstado}`);

    if (cumplido) {
      compromisosCumplidos++;
    }

    const compromisoRef = db.collection("compromisos_lookahead").doc(compromisoId);
    batch.update(compromisoRef, { estado_compromiso: nuevoEstado });
  }

  // Calcular PPC
  const ppcPorcentaje = Math.round(((compromisosCumplidos / totalCompromisos) * 100) * 100) / 100;
  console.log(`> PPC de la Semana ${semanaActiva}: ${ppcPorcentaje}% (${compromisosCumplidos} de ${totalCompromisos} cumplidos)`);

  const metricaRef = db.collection("metricas_desempeno").doc(`semana_${semanaActiva}`);
  batch.set(metricaRef, {
    semana_lookahead: semanaActiva,
    fecha_cierre: new Date(),
    compromisos_totales: totalCompromisos,
    compromisos_cumplidos: compromisosCumplidos,
    ppc_porcentaje: ppcPorcentaje
  });

  await batch.commit();
}

// 3. Ejecución de un Flujo de Prueba Escenario Completo
async function ejecutarPrueba() {
  try {
    console.log('Iniciando Suite de Pruebas...');

    // Escenario: Creamos un compromiso para la partida L5 '1.1.1.1.01' (hija de L3 '1.1.1') para la Semana 7
    const compromisoRef = await db.collection("compromisos_lookahead").add({
      id_partida_l5: "1.1.1.1.01",
      id_actividad_l3_padre: "1.1.1",
      semana_lookahead: 7,
      fecha_inicio_compromiso: admin.firestore.Timestamp.fromDate(new Date("2026-06-12")),
      fecha_fin_compromiso: admin.firestore.Timestamp.fromDate(new Date("2026-06-18")),
      metrado_comprometido_semanal: 0.5, // Nos comprometemos a hacer la mitad
      responsable_frente: "Ing. Residente Prueba",
      estado_compromiso: "Pendiente"
    });

    console.log(`Compromiso de prueba creado con ID: ${compromisoRef.id}`);

    // Reportamos avance diario de 0.3
    const avance1Ref = await db.collection("avance_diario_campo").add({
      id_compromiso: compromisoRef.id,
      id_partida_l5: "1.1.1.1.01",
      fecha_reporte: admin.firestore.Timestamp.fromDate(new Date("2026-06-13")),
      metrado_ejecutado_dia: 0.3,
      causa_incumplimiento: ""
    });
    console.log(`Avance Diario 1 de 0.3 registrado.`);
    // Ejecutamos trigger de avance L3
    await simularActualizarAvanceL3("1.1.1.1.01");

    // Reportamos un segundo avance diario de 0.3 (Total = 0.6, superando el compromiso de 0.5)
    const avance2Ref = await db.collection("avance_diario_campo").add({
      id_compromiso: compromisoRef.id,
      id_partida_l5: "1.1.1.1.01",
      fecha_reporte: admin.firestore.Timestamp.fromDate(new Date("2026-06-14")),
      metrado_ejecutado_dia: 0.3,
      causa_incumplimiento: ""
    });
    console.log(`Avance Diario 2 de 0.3 registrado.`);
    // Ejecutamos trigger de avance L3
    await simularActualizarAvanceL3("1.1.1.1.01");

    // Ejecutar el cierre semanal de la Semana 7 para evaluar cumplimiento y PPC
    await simularCierreSemanalPPC(7);

    // Limpieza de datos de prueba
    console.log('\nLimpiando datos de prueba...');
    await avance1Ref.delete();
    await avance2Ref.delete();
    await compromisoRef.delete();
    console.log('Limpieza completada.');

  } catch (error) {
    console.error("Error durante las pruebas:", error);
  }
}

ejecutarPrueba();
