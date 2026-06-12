import * as admin from 'firebase-admin';
import path from 'path';
import fs from 'fs';

if (!admin.apps.length) {
  // Intentar cargar la cuenta de servicio local si existe
  const localKeyPath = path.join(process.cwd(), 'lookahead-carretera-10km-firebase-adminsdk-fbsvc-5d6b6bc536.json');
  
  if (fs.existsSync(localKeyPath)) {
    try {
      const serviceAccount = JSON.parse(fs.readFileSync(localKeyPath, 'utf8'));
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      console.log('Firebase Admin inicializado localmente con JSON de cuenta de servicio.');
    } catch (e) {
      console.error('Error al inicializar con JSON local, intentando variables de entorno:', e);
    }
  } else {
    // Si no está el JSON, inicializar con variables de entorno
    const privateKey = process.env.FIREBASE_PRIVATE_KEY
      ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
      : undefined;

    if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !privateKey) {
      console.warn('Faltan credenciales de Firebase en variables de entorno.');
    } else {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: privateKey,
        }),
      });
      console.log('Firebase Admin inicializado usando variables de entorno.');
    }
  }
}

export const db = admin.firestore();
export { admin };
