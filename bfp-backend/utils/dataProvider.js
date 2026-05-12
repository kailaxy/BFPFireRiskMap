const SUPPORTED_DATA_PROVIDERS = Object.freeze({
  POSTGRES: 'postgres',
  FIRESTORE: 'firestore',
});

function normalizeDataProvider(value) {
  if (!value) return SUPPORTED_DATA_PROVIDERS.POSTGRES;
  const normalized = String(value).trim().toLowerCase();
  if (normalized === SUPPORTED_DATA_PROVIDERS.FIRESTORE) return SUPPORTED_DATA_PROVIDERS.FIRESTORE;
  return SUPPORTED_DATA_PROVIDERS.POSTGRES;
}

function getDataProvider() {
  return normalizeDataProvider(process.env.DATA_PROVIDER);
}

function isPostgresProvider() {
  return getDataProvider() === SUPPORTED_DATA_PROVIDERS.POSTGRES;
}

function isFirestoreProvider() {
  return getDataProvider() === SUPPORTED_DATA_PROVIDERS.FIRESTORE;
}

module.exports = {
  SUPPORTED_DATA_PROVIDERS,
  normalizeDataProvider,
  getDataProvider,
  isPostgresProvider,
  isFirestoreProvider,
};
