import { NextResponse } from 'next/server';
import { db, admin } from '@/lib/firebaseAdmin';

export async function GET() {
  try {
    const snapshot = await db.collection('avance_diario_campo')
      .orderBy('fecha_reporte', 'desc')
      .limit(100)
      .get();
    
    const data: any[] = [];
    snapshot.forEach(doc => {
      data.push({ id: doc.id, ...doc.data() });
    });
    
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Error fetching progress:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id_partida_l5, metrado_ejecutado_dia, id_compromiso, responsable, fecha_reporte, causa_incumplimiento } = body;

    if (!id_partida_l5 || metrado_ejecutado_dia === undefined) {
      return NextResponse.json({ success: false, error: 'Faltan parámetros obligatorios.' }, { status: 400 });
    }

    const docFecha = fecha_reporte ? new Date(fecha_reporte) : new Date();

    // 1. Agregar el avance diario a la colección
    const nuevoAvanceRef = await db.collection('avance_diario_campo').add({
      id_partida_l5,
      id_compromiso: id_compromiso || '',
      fecha_reporte: admin.firestore.Timestamp.fromDate(docFecha),
      metrado_ejecutado_dia: Number(metrado_ejecutado_dia),
      responsable: responsable || 'Campo',
      causa_incumplimiento: causa_incumplimiento || ''
    });

    // 2. Sumar todos los avances diarios históricos de esta partida L5
    const avancesSnapshot = await db.collection('avance_diario_campo')
      .where('id_partida_l5', '==', id_partida_l5)
      .get();

    let totalMetradoHistorico = 0;
    avancesSnapshot.forEach(doc => {
      totalMetradoHistorico += Number(doc.data().metrado_ejecutado_dia || 0);
    });

    // 3. Obtener la partida L5 en presupuesto_l5
    const partidaL5Ref = db.collection('presupuesto_l5').doc(id_partida_l5);
    const partidaL5Doc = await partidaL5Ref.get();

    if (!partidaL5Doc.exists) {
      return NextResponse.json({ success: false, error: `La partida presupuesto_l5 con WBS ${id_partida_l5} no existe.` }, { status: 404 });
    }

    const partidaL5Data = partidaL5Doc.data()!;
    const metradoAvanceEstimadoFC = Number(partidaL5Data.metrado_avance_estimado_fc || 0);
    const puSoles = Number(partidaL5Data.pu_soles || 0);
    const idActividadL3Padre = partidaL5Data.id_actividad_l3_padre;

    // Metrado Avance Actual Total y Valorizado Real L5
    const metradoAvanceActualTotal = metradoAvanceEstimadoFC + totalMetradoHistorico;
    const valorizadoRealL5 = metradoAvanceActualTotal * puSoles;

    // Actualizar metrado acumulado en la partida L5
    await partidaL5Ref.update({
      metrado_avance_actual_total: metradoAvanceActualTotal,
      valorizado_real_l5: valorizadoRealL5
    });

    // 4. Recalcular avance L3 del padre
    let pctAvanceL3 = 0;
    let estadoL3 = 'No Iniciado';
    
    if (idActividadL3Padre) {
      const hermanasSnapshot = await db.collection('presupuesto_l5')
        .where('id_actividad_l3_padre', '==', idActividadL3Padre)
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
          valReal = Number(hData.valorizado_real_l5 || (Number(hData.metrado_avance_actual_total || hData.metrado_avance_estimado_fc || 0) * Number(hData.pu_soles || 0)));
        }

        sumaValorizadoRealHijas += valReal;
        sumaPrecioParcialHijas += prParcial;
      });

      if (sumaPrecioParcialHijas > 0) {
        pctAvanceL3 = (sumaValorizadoRealHijas / sumaPrecioParcialHijas) * 100;
        pctAvanceL3 = Math.round((pctAvanceL3 + Number.EPSILON) * 100) / 100;
      }

      if (pctAvanceL3 > 0 && pctAvanceL3 < 100) {
        estadoL3 = 'En Progreso';
      } else if (pctAvanceL3 >= 100) {
        estadoL3 = 'Completado';
      }

      // Actualizar L3
      await db.collection('cronograma_l3').doc(idActividadL3Padre).update({
        pct_avance_metrados: pctAvanceL3,
        estado: estadoL3
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Avance registrado y nivel L3 recalculado con éxito.',
      data: {
        idAvance: nuevoAvanceRef.id,
        metradoAvanceActualTotal,
        valorizadoRealL5,
        idActividadL3Padre,
        pctAvanceL3,
        estadoL3
      }
    });
  } catch (error: any) {
    console.error('Error registering progress:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
