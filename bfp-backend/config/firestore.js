require('dotenv').config();

const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');

let firestoreDb = null;

function parseBooleanString(value, defaultValue = false) {
  if (value == null) return defaultValue;
  return String(value).toLowerCase() === 'true';
}

function getFirestoreConfig() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const databaseId = process.env.FIRESTORE_DATABASE_ID || '(default)';
  const useEmulator = parseBooleanString(process.env.FIRESTORE_USE_EMULATOR, false);
  const emulatorHost = process.env.FIRESTORE_EMULATOR_HOST;
  const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

  if (!projectId) {
    throw new Error('Missing required environment variable: FIREBASE_PROJECT_ID');
  }

  if (useEmulator && !emulatorHost) {
    throw new Error('Missing required environment variable: FIRESTORE_EMULATOR_HOST when FIRESTORE_USE_EMULATOR=true');
  }

  if (!useEmulator && !serviceAccountPath) {
    throw new Error('Missing required environment variable: GOOGLE_APPLICATION_CREDENTIALS when FIRESTORE_USE_EMULATOR=false');
  }

  return {
    projectId,
    databaseId,
    useEmulator,
    emulatorHost,
  };
}

function initializeFirestore() {
  if (firestoreDb) return firestoreDb;

  const config = getFirestoreConfig();

  if (config.useEmulator && config.emulatorHost) {
    process.env.FIRESTORE_EMULATOR_HOST = config.emulatorHost;
  }

  if (!admin.apps.length) {
    const appOptions = {
      projectId: config.projectId,
    };

    if (!config.useEmulator) {
      appOptions.credential = admin.credential.applicationDefault();
    }

    admin.initializeApp(appOptions);
  }

  firestoreDb = getFirestore(admin.app(), config.databaseId);
  firestoreDb.settings({ ignoreUndefinedProperties: true });

  return firestoreDb;
}

function getFirestoreDb() {
  return initializeFirestore();
}

module.exports = {
  admin,
  getFirestoreConfig,
  initializeFirestore,
  getFirestoreDb,
  firestore: getFirestoreDb,
};
