import { NextResponse } from 'next/server';
import { db, admin } from '@/lib/firebaseAdmin';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { semana } = body;

    if (!semana) {
      return NextResponse.json({ success: false, error: 'Falta especificar la semana de corte.' }, { status: 400 });
    }

    const semanaActiva = Number(semana);

    // 1. Filtrar compromisos de la semana activa
    const compromisosSnapshot = await db.collection('compromisos_lookahead')
      .where('semana_lookahead', '==', semanaActiva)
      .get();

    if (compromisosSnapshot.empty) {
      return NextResponse.json({
        success: false,
        error: `No hay compromisos planificados para la Semana ${semanaActiva}.`
      }, { status: 404 });
    }

    let compromisosCumplidos = 0;
    const totalCompromisos = compromisosSnapshot.size;
    const batch = db.batch();
    const resultadosDetalle: any[] = [];

    for (const doc of compromisosSnapshot.docs) {
      const compromisoId = doc.id;
      const compData = doc.data();
      const metradoComprometido = Number(compData.metrado_comprometido_semanal || 0);

      // Sumar los metrados ejecutados diarios específicos de este compromiso
      const avancesSnapshot = await db.collection('avance_diario_campo')
        .where('id_compromiso', '==', compromisoId)
        .get();

      let avanceRealSemanal = 0;
      avancesSnapshot.forEach(avDoc => {
        avanceRealSemanal += Number(avDoc.data().metrado_ejecutado_dia || 0);
      });

      const cumplido = (avanceRealSemanal >= metradoComprometido);
      const nuevoEstado = cumplido ? 'Cumplido' : 'No Cumplido';

      if (cumplido) {
        compromisosCumplidos++;
      }

      const compromisoRef = db.collection('compromisos_lookahead').doc(compromisoId);
      batch.update(compromisoRef, { estado_compromiso: nuevoEstado });

      resultadosDetalle.push({
        id: compromisoId,
        id_partida_l5: compData.id_partida_l5,
        metrado_comprometido_semanal: metradoComprometido,
        avance_real: avanceRealSemanal,
        estado: nuevoEstado
      });
    }

    // Calcular PPC (Porcentaje de Plan Completado)
    const ppcPorcentaje = Math.round(((compromisosCumplidos / totalCompromisos) * 100) * 100) / 100;

    // Registrar métricas de desempeño
    const metricaRef = db.collection('metricas_desempeno').doc(`semana_${semanaActiva}`);
    batch.set(metricaRef, {
      semana_lookahead: semanaActiva,
      fecha_cierre: admin.firestore.Timestamp.fromDate(new Date()),
      compromisos_totales: totalCompromisos,
      compromisos_cumplidos: compromisosCumplidos,
      ppc_porcentaje: ppcPorcentaje
    });

    await batch.commit();

    return NextResponse.json({
      success: true,
      message: `Cierre de semana ${semanaActiva} realizado. PPC calculado: ${ppcPorcentaje}%`,
      data: {
        semana: semanaActiva,
        ppc: ppcPorcentaje,
        compromisos_totales: totalCompromisos,
        compromisos_cumplidos: compromisosCumplidos,
        detalles: resultadosDetalle
      }
    });
  } catch (error: any) {
    console.error('Error during weekly closure:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// GET: Obtener las métricas históricas de PPC
export async function GET() {
  try {
    const snapshot = await db.collection('metricas_desempeno')
      .orderBy('semana_lookahead', 'asc')
      .get();

    const data: any[] = [];
    snapshot.forEach(doc => {
      data.push({ id: doc.id, ...doc.data() });
    });

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Error fetching PPC metrics:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
