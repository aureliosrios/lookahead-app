import { NextResponse } from 'next/server';
import { db, admin } from '@/lib/firebaseAdmin';

// GET: Obtener toda la jerarquía de actividades (L3, L4, L5) y compromisos
export async function GET() {
  try {
    // 1. Obtener actividades de Nivel 3 (cronograma)
    const l3Snapshot = await db.collection('cronograma_l3').get();
    const l3List: any[] = [];
    l3Snapshot.forEach(doc => {
      l3List.push({ id: doc.id, ...doc.data() });
    });

    // 2. Obtener programación de Nivel 4 (creadas por campo)
    const l4Snapshot = await db.collection('programacion_l4').get();
    const l4List: any[] = [];
    l4Snapshot.forEach(doc => {
      l4List.push({ id: doc.id, ...doc.data() });
    });

    // 3. Obtener partidas de Nivel 5 (presupuesto)
    const l5Snapshot = await db.collection('presupuesto_l5').get();
    const l5List: any[] = [];
    l5Snapshot.forEach(doc => {
      l5List.push({ id: doc.id, ...doc.data() });
    });

    // 4. Obtener compromisos de Lookahead semanales
    const compSnapshot = await db.collection('compromisos_lookahead').get();
    const compromisosList: any[] = [];
    compSnapshot.forEach(doc => {
      compromisosList.push({ id: doc.id, ...doc.data() });
    });

    return NextResponse.json({
      success: true,
      data: {
        l3: l3List,
        l4: l4List,
        l5: l5List,
        compromisos: compromisosList
      }
    });
  } catch (error: any) {
    console.error('Error fetching lookahead structure:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Registrar o actualizar programación de Nivel 4, o registrar compromisos
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { tipo, data } = body; // tipo: 'l4' | 'compromiso' | 'edit_compromiso'

    if (!tipo || !data) {
      return NextResponse.json({ success: false, error: 'Faltan parámetros obligatorios.' }, { status: 400 });
    }

    if (tipo === 'l4') {
      const { id, id_padre_l3, descripcion, fecha_inicio_compromiso, fecha_fin_compromiso, responsable } = data;
      
      if (!id_padre_l3 || !descripcion) {
        return NextResponse.json({ success: false, error: 'Falta id_padre_l3 o descripcion para Nivel 4.' }, { status: 400 });
      }

      const l4Data = {
        id_padre_l3,
        descripcion,
        fecha_inicio_compromiso: fecha_inicio_compromiso ? admin.firestore.Timestamp.fromDate(new Date(fecha_inicio_compromiso)) : null,
        fecha_fin_compromiso: fecha_fin_compromiso ? admin.firestore.Timestamp.fromDate(new Date(fecha_fin_compromiso)) : null,
        responsable: responsable || '',
        estado: 'Pendiente'
      };

      if (id) {
        // Actualizar
        await db.collection('programacion_l4').doc(id).update(l4Data);
        return NextResponse.json({ success: true, message: 'Programación L4 actualizada.', data: { id, ...l4Data } });
      } else {
        // Crear
        const nuevoDoc = await db.collection('programacion_l4').add(l4Data);
        return NextResponse.json({ success: true, message: 'Programación L4 registrada.', data: { id: nuevoDoc.id, ...l4Data } });
      }
    }

    if (tipo === 'compromiso') {
      const { id_partida_l5, id_actividad_l3_padre, semana_lookahead, fecha_inicio_compromiso, fecha_fin_compromiso, metrado_comprometido_semanal, responsable_frente } = data;

      if (!id_partida_l5 || !semana_lookahead || metrado_comprometido_semanal === undefined) {
        return NextResponse.json({ success: false, error: 'Faltan datos del compromiso.' }, { status: 400 });
      }

      const compData = {
        id_partida_l5,
        id_actividad_l3_padre: id_actividad_l3_padre || id_partida_l5.split('.').slice(0, 3).join('.'),
        semana_lookahead: Number(semana_lookahead),
        fecha_inicio_compromiso: fecha_inicio_compromiso ? admin.firestore.Timestamp.fromDate(new Date(fecha_inicio_compromiso)) : null,
        fecha_fin_compromiso: fecha_fin_compromiso ? admin.firestore.Timestamp.fromDate(new Date(fecha_fin_compromiso)) : null,
        metrado_comprometido_semanal: Number(metrado_comprometido_semanal),
        responsable_frente: responsable_frente || 'Campo',
        estado_compromiso: 'Pendiente'
      };

      const nuevoDoc = await db.collection('compromisos_lookahead').add(compData);
      return NextResponse.json({ success: true, message: 'Compromiso registrado con éxito.', data: { id: nuevoDoc.id, ...compData } });
    }

    if (tipo === 'edit_compromiso') {
      const { id, metrado_comprometido_semanal, responsable_frente, estado_compromiso } = data;
      if (!id) {
        return NextResponse.json({ success: false, error: 'Falta el ID del compromiso a editar.' }, { status: 400 });
      }

      const updates: any = {};
      if (metrado_comprometido_semanal !== undefined) updates.metrado_comprometido_semanal = Number(metrado_comprometido_semanal);
      if (responsable_frente !== undefined) updates.responsable_frente = responsable_frente;
      if (estado_compromiso !== undefined) updates.estado_compromiso = estado_compromiso;

      await db.collection('compromisos_lookahead').doc(id).update(updates);
      return NextResponse.json({ success: true, message: 'Compromiso modificado.', data: { id, ...updates } });
    }

    return NextResponse.json({ success: false, error: 'Tipo de operación no admitido.' }, { status: 400 });
  } catch (error: any) {
    console.error('Error saving lookahead program:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
