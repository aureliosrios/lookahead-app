# Lookahead & PPC Control System (Next.js + Firestore + Vercel)

Este sistema en la nube automatiza y centraliza el control de planificación y avance de obras de construcción civil mediante la metodología **Lookahead (a 3 semanas)** y el indicador de desempeño **PPC (Porcentaje de Plan Completado)**.

---

## 🚀 ¿Qué se ha completado hasta ahora?

1.  **Migración a Arquitectura Cloud:**
    *   Pasamos de un script de simulación local a una aplicación web full-stack con **Next.js (App Router)** y **TypeScript**.
    *   Desplegado exitosamente en **Vercel** (`https://lookahead-app.vercel.app`) y conectado a **Firebase Firestore**.
2.  **Lógica del Backend Serverless (API Routes):**
    *   `POST /api/avance`: Registra los partes diarios de campo en la colección `avance_diario_campo` y recalcula de manera automática y ponderada (basada en costos) el avance porcentual del hito padre Nivel 3.
    *   `GET/POST /api/lookahead`: Administra la jerarquía completa (L3, L4, L5) e inserta la programación detallada de subactividades (Nivel 4) y compromisos de avance semanal (Nivel 5) ingresados por el equipo.
    *   `POST /api/cierre-semana`: Ejecuta el corte semanal evaluando compromisos planificados versus avances reales diarios. Calcula el PPC (%) y guarda los históricos de rendimiento.
3.  **Interfaz de Usuario Premium Adaptable:**
    *   Diseñada con una estética oscura premium, glassmorphism, curvas SVG de rendimiento e interactividad en tiempo real.
    *   **Vista Móvil (Colaborador de Campo):** Formularios táctiles y optimizados para reportar avances físicos diarios (L5) y estructurar/programar subactividades (L4).
    *   **Vista Laptop (Ingeniero de Planeamiento):** Tablero con métricas clave, gráfico de barras del PPC, gestor del Plan Semanal y matriz jerárquica de Lookahead completa.
4.  **Seguridad y Repositorio Limpio:**
    *   Sincronizado con GitHub sin comprometer claves privadas. La cuenta de servicio de Firebase ahora se lee localmente a través de un JSON ignorado por git, y en producción se alimenta de manera segura mediante variables de entorno en Vercel.

---

## 🛠️ Instrucciones de Ejecución y Mantenimiento

### 1. Servidor de Desarrollo Local
Para levantar el servidor web de forma local:
```bash
npm install
npm run dev
```
La aplicación estará disponible en `http://localhost:3000`.

### 2. Carga y Sincronización Inicial de Datos (Excel a Nube)
Si necesitas reiniciar la base de datos o subir nuevos datos de origen desde tus hojas Excel locales (`pry_carretera_...xlsx`):
```bash
npm run import-data
```
Este comando ejecutará el script `importar_datos.js`, subiendo instantáneamente el WBS de Nivel 3 y Nivel 5 a Firestore en la nube.

### 3. Configuración de Variables de Entorno en Vercel
En la pestaña **Settings > Environment Variables** de tu panel de Vercel se encuentran configuradas:
*   `FIREBASE_PROJECT_ID`
*   `FIREBASE_CLIENT_EMAIL`
*   `FIREBASE_PRIVATE_KEY`

---

## 🎯 ¿A dónde queremos llegar? (Próximos Objetivos)

Cuando regreses a esta carpeta, podemos continuar con las siguientes metas del roadmap:

*   [ ] **Autenticación y Control de Accesos:** Implementar Firebase Auth para que el personal de campo y de planeamiento tengan credenciales separadas y la aplicación bloquee o redireccione automáticamente al rol correspondiente al iniciar sesión.
*   [ ] **Alertas de Desviación y Pareto de Pérdidas:** Agregar una sección en el dashboard de planeamiento que clasifique automáticamente las causas de incumplimiento (ej. clima, maquinaria, mano de obra) con gráficos dinámicos para tomar decisiones correctivas.
*   [ ] **Reportabilidad Automatizada:** Crear endpoints para exportar el reporte Lookahead y PPC de la semana a formato PDF firmado o Excel listo para compartir.
*   [ ] **Curva S Física y Financiera:** Incorporar el cálculo acumulado del valor ganado para proyectar la curva real de la obra frente a la línea base directamente en el dashboard del Ingeniero de Planeamiento.

---

*¡Que tengas una buena pausa! El proyecto en la nube está completamente operativo y listo para continuar cuando regreses.*
