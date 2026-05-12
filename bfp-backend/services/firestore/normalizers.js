const { Timestamp } = require('firebase-admin/firestore');

const DEFAULT_TIMESTAMP_FIELDS = ['reported_at', 'resolved_at', 'created_at', 'date'];

function toFirestoreTimestamp(value) {
  if (value == null) return value;
  if (value instanceof Timestamp) return value;

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return value;
    return Timestamp.fromDate(value);
  }

  if (typeof value === 'number') {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return Timestamp.fromDate(date);
  }

  if (typeof value === 'string') {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return Timestamp.fromDate(date);
  }

  return value;
}

function normalizeGeoShape(document) {
  if (!document || typeof document !== 'object') return document;

  const next = { ...document };
  if (next.geo && typeof next.geo === 'object') {
    const lat = next.geo.lat ?? next.lat ?? null;
    const lng = next.geo.lng ?? next.lng ?? null;
    next.geo = { lat, lng };
    return next;
  }

  const hasLatLng = Object.prototype.hasOwnProperty.call(next, 'lat') || Object.prototype.hasOwnProperty.call(next, 'lng');
  if (hasLatLng) {
    next.geo = {
      lat: next.lat ?? null,
      lng: next.lng ?? null,
    };
  }

  return next;
}

function normalizeTimestamps(document, timestampFields = DEFAULT_TIMESTAMP_FIELDS) {
  if (!document || typeof document !== 'object') return document;

  const next = { ...document };
  for (const field of timestampFields) {
    if (Object.prototype.hasOwnProperty.call(next, field)) {
      next[field] = toFirestoreTimestamp(next[field]);
    }
  }

  return next;
}

function normalizeDocumentForFirestore(document, options = {}) {
  if (!document || typeof document !== 'object') return document;

  const timestampFields = Array.isArray(options.timestampFields) && options.timestampFields.length
    ? options.timestampFields
    : DEFAULT_TIMESTAMP_FIELDS;

  const withGeo = normalizeGeoShape(document);
  return normalizeTimestamps(withGeo, timestampFields);
}

module.exports = {
  DEFAULT_TIMESTAMP_FIELDS,
  toFirestoreTimestamp,
  normalizeGeoShape,
  normalizeTimestamps,
  normalizeDocumentForFirestore,
};
