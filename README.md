# Look-Ahead & PPC Firestore App (Next.js + Firebase Admin API)

Este proyecto implementa la estructura de base de datos y la API Serverless en **Next.js** para gestionar el control de obras a través de la metodología del **Look-Ahead** (a 3 semanas) y la medición del **PPC (Porcentaje de Plan Completado)** en un proyecto de carretera de 90 días.

---

## 🚀 Estado Actual y Progreso

- [x] **Importación Inicial desde Excel**: Población exitosa de actividades en `cronograma_l3` (19 registros) y partidas de costos en `presupuesto_l5` (52 registros) con sus avances acumulados iniciales a la fecha de corte (FC).
- [x] **Conexión e Inicialización**: Conectado a Firestore usando la llave de Cuenta de Servicio privada.
- [x] **Pruebas de Simulación de Lógica de Negocio**: Suite de simulación realizada localmente en `simular_pruebas.js` donde se verificó con éxito el trigger de avance físico ponderado en L3 y el cálculo automático de PPC semanal.
- [x] **Git & Despliegue en Vercel**: Repositorio local inicializado, configurado con `.gitignore` y sincronizado en la nube (GitHub + Despliegue inicial a producción en Vercel).
- [ ] **Migración a Backend Serverless Next.js API Routes** *(Próximo paso pendiente)*.

---

## 📁 Estructura del Backend Serverless (Siguiente Paso)

Cuando regreses, crearemos los siguientes archivos clave dentro del proyecto para habilitar los Endpoints Serverless:

### 1. `/lib/firebaseAdmin.ts`
Inicializa el SDK de Firebase de manera segura en un entorno serverless reutilizando la conexión:
```typescript
import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  const privateKey = process.env.FIREBASE_PRIVATE_KEY
    ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
    : undefined;

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: privateKey,
    }),
  });
}
export const db = admin.firestore();
```

### 2. `/pages/api/avance.ts`
API `POST` para registrar avances de campo diarios y recalcular el avance de la partida L3:
*   Registra el reporte en `avance_diario_campo`.
*   Suma avances para calcular el nuevo metrado acumulado de la partida L5.
*   Calcula el avance ponderado de costo del padre L3 en base a todas las partidas hijas.

### 3. `/pages/api/lookahead.ts`
API `GET` para filtrar y consultar las actividades de Nivel 3 activas durante el periodo del Look-Ahead (Semanas 7, 8 y 9; es decir, del Día 43 al Día 63).

---

## 🛠️ Instrucciones para Configurar el Entorno

Para continuar el desarrollo, crea un archivo `.env.local` en la raíz del proyecto (este archivo ya está excluido en el `.gitignore` para seguridad) y agrega tus credenciales:

```env
FIREBASE_PROJECT_ID="nombre-de-tu-proyecto"
FIREBASE_CLIENT_EMAIL="tu-cuenta-de-servicio@..."
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

### Para el Despliegue en Vercel:
Ve al panel de tu proyecto en Vercel, entra a **Settings > Environment Variables**, e introduce estas mismas tres variables de entorno para que el servidor API en producción pueda leer tu Firestore con total seguridad.

---

*¡Que tengas un buen viaje o salida! Cuando regreses, simplemente hazme saber que estás listo para escribir el backend de Next.js y los crearemos de inmediato.*
