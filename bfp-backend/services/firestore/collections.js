const COLLECTION_ENV_KEYS = Object.freeze({
  activeFires: 'FIRESTORE_COLLECTION_ACTIVE_FIRES',
  historicalFires: 'FIRESTORE_COLLECTION_HISTORICAL_FIRES',
  forecasts: 'FIRESTORE_COLLECTION_FORECASTS',
  forecastsGraphs: 'FIRESTORE_COLLECTION_FORECASTS_GRAPHS',
  barangays: 'FIRESTORE_COLLECTION_BARANGAYS',
  hydrants: 'FIRESTORE_COLLECTION_HYDRANTS',
  notifications: 'FIRESTORE_COLLECTION_NOTIFICATIONS',
  users: 'FIRESTORE_COLLECTION_USERS',
  fireStations: 'FIRESTORE_COLLECTION_FIRE_STATIONS',
});

const DEFAULT_COLLECTIONS = Object.freeze({
  [COLLECTION_ENV_KEYS.activeFires]: 'active_fires',
  [COLLECTION_ENV_KEYS.historicalFires]: 'historical_fires',
  [COLLECTION_ENV_KEYS.forecasts]: 'forecasts',
  [COLLECTION_ENV_KEYS.forecastsGraphs]: 'forecasts_graphs',
  [COLLECTION_ENV_KEYS.barangays]: 'barangays',
  [COLLECTION_ENV_KEYS.hydrants]: 'hydrants',
  [COLLECTION_ENV_KEYS.notifications]: 'notifications',
  [COLLECTION_ENV_KEYS.users]: 'users',
  [COLLECTION_ENV_KEYS.fireStations]: 'fire_stations',
});

function getCollectionNameByEnvKey(envKey) {
  const fromEnv = process.env[envKey];
  if (fromEnv) return String(fromEnv).trim();
  return DEFAULT_COLLECTIONS[envKey];
}

function getCollectionMap() {
  return {
    activeFires: getCollectionNameByEnvKey(COLLECTION_ENV_KEYS.activeFires),
    historicalFires: getCollectionNameByEnvKey(COLLECTION_ENV_KEYS.historicalFires),
    forecasts: getCollectionNameByEnvKey(COLLECTION_ENV_KEYS.forecasts),
    forecastsGraphs: getCollectionNameByEnvKey(COLLECTION_ENV_KEYS.forecastsGraphs),
    barangays: getCollectionNameByEnvKey(COLLECTION_ENV_KEYS.barangays),
    hydrants: getCollectionNameByEnvKey(COLLECTION_ENV_KEYS.hydrants),
    notifications: getCollectionNameByEnvKey(COLLECTION_ENV_KEYS.notifications),
    users: getCollectionNameByEnvKey(COLLECTION_ENV_KEYS.users),
    fireStations: getCollectionNameByEnvKey(COLLECTION_ENV_KEYS.fireStations),
  };
}

function resolveCollectionName(domainOrCollection) {
  if (!domainOrCollection) {
    throw new Error('Collection name or domain key is required');
  }

  const collectionMap = getCollectionMap();
  if (collectionMap[domainOrCollection]) {
    return collectionMap[domainOrCollection];
  }

  return String(domainOrCollection).trim();
}

module.exports = {
  COLLECTION_ENV_KEYS,
  DEFAULT_COLLECTIONS,
  getCollectionMap,
  resolveCollectionName,
};
