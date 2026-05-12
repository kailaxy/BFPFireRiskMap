const { initializeFirestore, getFirestoreConfig, getFirestoreDb } = require('../../config/firestore');
const { getCollectionMap, resolveCollectionName } = require('./collections');
const {
  DEFAULT_TIMESTAMP_FIELDS,
  toFirestoreTimestamp,
  normalizeGeoShape,
  normalizeTimestamps,
  normalizeDocumentForFirestore,
} = require('./normalizers');
const repository = require('./repository');

module.exports = {
  initializeFirestore,
  getFirestoreConfig,
  getFirestoreDb,
  getCollectionMap,
  resolveCollectionName,
  DEFAULT_TIMESTAMP_FIELDS,
  toFirestoreTimestamp,
  normalizeGeoShape,
  normalizeTimestamps,
  normalizeDocumentForFirestore,
  ...repository,
};
