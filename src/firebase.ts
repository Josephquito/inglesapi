import 'dotenv/config';
import * as admin from 'firebase-admin';
import { readFileSync } from 'fs';

const saPath = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
if (!saPath) throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON no está definido.');

const serviceAccount = JSON.parse(readFileSync(saPath, 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
});

export const bucket = admin.storage().bucket();
