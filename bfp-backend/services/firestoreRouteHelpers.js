const { queryDocuments } = require('./firestore');

function toDateValue(value) {
  if (value == null) return null;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value?.toDate === 'function') {
    const date = value.toDate();
    return Number.isNaN(date.getTime()) ? null : date;
  }

  if (typeof value === 'object' && value !== null && Object.prototype.hasOwnProperty.call(value, '_seconds')) {
    const seconds = Number(value._seconds);
    const nanoseconds = Number(value._nanoseconds || 0);
    if (Number.isNaN(seconds) || Number.isNaN(nanoseconds)) return null;
    const date = new Date((seconds * 1000) + Math.floor(nanoseconds / 1_000_000));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  if (typeof value === 'number' || typeof value === 'string') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  return null;
}

function toNumberValue(value) {
  if (value == null || value === '') return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function sortByDateDesc(items, field) {
  return [...items].sort((left, right) => {
    const leftDate = toDateValue(left[field]);
    const rightDate = toDateValue(right[field]);
    const leftTime = leftDate ? leftDate.getTime() : 0;
    const rightTime = rightDate ? rightDate.getTime() : 0;
    return rightTime - leftTime;
  });
}

function normalizeForecastRow(doc) {
  return {
    id: toNumberValue(doc.id) ?? doc.id,
    barangay_name: doc.barangay_name ?? null,
    month: toNumberValue(doc.month),
    year: toNumberValue(doc.year),
    predicted_cases: toNumberValue(doc.predicted_cases),
    lower_bound: toNumberValue(doc.lower_bound),
    upper_bound: toNumberValue(doc.upper_bound),
    risk_level: doc.risk_level ?? null,
    risk_flag: doc.risk_flag ?? null,
    created_at: toDateValue(doc.created_atTs) || toDateValue(doc.created_at),
  };
}

function normalizeHistoricalRow(doc) {
  const reportedAt = toDateValue(doc.reported_atTs) || toDateValue(doc.reported_at);
  const resolvedAt = toDateValue(doc.resolved_atTs) || toDateValue(doc.resolved_at);

  return {
    ...doc,
    id: toNumberValue(doc.id) ?? doc.id,
    lat: toNumberValue(doc.lat ?? doc.geo?.lat),
    lng: toNumberValue(doc.lng ?? doc.geo?.lng),
    reported_at: reportedAt,
    resolved_at: resolvedAt,
    casualties: toNumberValue(doc.casualties),
    injuries: toNumberValue(doc.injuries),
    estimated_damage: toNumberValue(doc.estimated_damage),
    duration_minutes: toNumberValue(doc.duration_minutes),
  };
}

function normalizeActiveFireFeature(doc) {
  const lat = toNumberValue(doc.lat ?? doc.geo?.lat);
  const lng = toNumberValue(doc.lng ?? doc.geo?.lng);

  let geometry = doc.geometry ?? null;
  if (!geometry && lat != null && lng != null) {
    geometry = {
      type: 'Point',
      coordinates: [lng, lat],
    };
  }

  return {
    type: 'Feature',
    geometry,
    properties: {
      id: toNumberValue(doc.id) ?? doc.id,
      address: doc.address ?? null,
      barangay: doc.barangay ?? null,
      alarm_level: doc.alarm_level ?? null,
      reported_by: doc.reported_by ?? null,
      reported_at: toDateValue(doc.reported_atTs) || toDateValue(doc.reported_at),
      lat,
      lng,
    },
  };
}

async function getForecastsForMonth(year, month) {
  const docs = await queryDocuments('forecasts', {
    where: [
      { field: 'year', op: '==', value: year },
      { field: 'month', op: '==', value: month },
    ],
  });

  return docs
    .map(normalizeForecastRow)
    .sort((left, right) => String(left.barangay_name || '').localeCompare(String(right.barangay_name || '')));
}

async function getLatestForecasts() {
  const docs = await queryDocuments('forecasts');
  const rows = docs.map(normalizeForecastRow);

  if (!rows.length) return [];

  const latest = rows.reduce((accumulator, current) => {
    if (!accumulator) return { year: current.year || 0, month: current.month || 0 };

    const accumulatorScore = (accumulator.year || 0) * 100 + (accumulator.month || 0);
    const currentScore = (current.year || 0) * 100 + (current.month || 0);

    if (currentScore > accumulatorScore) {
      return { year: current.year || 0, month: current.month || 0 };
    }

    return accumulator;
  }, null);

  return rows
    .filter((row) => row.year === latest.year && row.month === latest.month)
    .sort((left, right) => String(left.barangay_name || '').localeCompare(String(right.barangay_name || '')));
}

async function getForecastsByBarangayName(name, limit = 12) {
  const normalizedNeedle = String(name || '').trim().toLowerCase();
  const docs = await queryDocuments('forecasts');

  const rows = docs
    .map(normalizeForecastRow)
    .filter((row) => String(row.barangay_name || '').toLowerCase().includes(normalizedNeedle))
    .sort((left, right) => {
      const leftScore = (left.year || 0) * 100 + (left.month || 0);
      const rightScore = (right.year || 0) * 100 + (right.month || 0);
      return rightScore - leftScore;
    });

  return rows.slice(0, limit);
}

async function getActiveFiresFeatureCollection() {
  const docs = await queryDocuments('activeFires');
  const normalized = docs
    .map(normalizeActiveFireFeature)
    .sort((left, right) => {
      const leftDate = toDateValue(left.properties.reported_at);
      const rightDate = toDateValue(right.properties.reported_at);
      const leftTime = leftDate ? leftDate.getTime() : 0;
      const rightTime = rightDate ? rightDate.getTime() : 0;
      return rightTime - leftTime;
    });

  return {
    type: 'FeatureCollection',
    features: normalized,
  };
}

async function getHistoricalReports({ q = '', limit = 50, offset = 0 } = {}) {
  const docs = await queryDocuments('historicalFires');
  const rows = sortByDateDesc(docs.map(normalizeHistoricalRow), 'reported_at');

  const normalizedQuery = String(q || '').trim().toLowerCase();
  const filteredRows = normalizedQuery
    ? rows.filter((row) => {
      const address = String(row.address || '').toLowerCase();
      const reportedBy = String(row.reported_by || '').toLowerCase();
      return address.includes(normalizedQuery) || reportedBy.includes(normalizedQuery);
    })
    : rows;

  return {
    rows: filteredRows.slice(offset, offset + limit),
    total: filteredRows.length,
  };
}

function normalizeIncidentHistoryFeature(row) {
  const reportedAt = toDateValue(row.reported_at);
  const year = reportedAt ? reportedAt.getUTCFullYear() : null;
  const lat = toNumberValue(row.lat);
  const lng = toNumberValue(row.lng);

  return {
    type: 'Feature',
    geometry: lat != null && lng != null
      ? {
          type: 'Point',
          coordinates: [lng, lat],
        }
      : null,
    properties: {
      id: toNumberValue(row.id) ?? row.id,
      barangay: row.barangay ?? null,
      year,
      description: row.cause || row.address || 'Historical fire incident',
    },
  };
}

async function getIncidentHistoryFeatureCollection() {
  const docs = await queryDocuments('historicalFires');
  const rows = sortByDateDesc(docs.map(normalizeHistoricalRow), 'reported_at');

  return {
    type: 'FeatureCollection',
    features: rows.map(normalizeIncidentHistoryFeature),
  };
}

function normalizeBarangayFeature(doc) {
  return {
    type: 'Feature',
    geometry: doc.geometry || null,
    properties: {
      id: toNumberValue(doc.id) ?? doc.id,
      name: doc.name ?? null,
      population: toNumberValue(doc.population),
      population_date: doc.population_date ?? null,
      osm_relation_id: doc.osm_relation_id ?? null,
      brief_history: doc.brief_history ?? null,
      economic_profile: doc.economic_profile ?? null,
    },
  };
}

async function getBarangaysFeatureCollection() {
  const docs = await queryDocuments('barangays');

  return {
    type: 'FeatureCollection',
    features: docs.map(normalizeBarangayFeature),
  };
}

async function getBarangaysAdminRows() {
  const docs = await queryDocuments('barangays');

  return docs
    .map((doc) => ({
      id: toNumberValue(doc.id) ?? doc.id,
      name: doc.name ?? null,
      population: toNumberValue(doc.population),
      population_date: doc.population_date ?? null,
      osm_relation_id: doc.osm_relation_id ?? null,
      brief_history: doc.brief_history ?? null,
      economic_profile: doc.economic_profile ?? null,
    }))
    .sort((left, right) => (left.id || 0) - (right.id || 0));
}

function normalizeHydrantFeature(doc) {
  const lat = toNumberValue(doc.latitude ?? doc.lat ?? doc.geo?.lat);
  const lng = toNumberValue(doc.longitude ?? doc.lng ?? doc.geo?.lng);
  let geometry = doc.geometry || null;
  if (!geometry && lat != null && lng != null) {
    geometry = { type: 'Point', coordinates: [lng, lat] };
  }

  return {
    type: 'Feature',
    geometry,
    properties: {
      id: toNumberValue(doc.id) ?? doc.id,
      address: doc.address ?? null,
      type_color: doc.type_color ?? null,
      is_operational: doc.is_operational ?? null,
      remarks: doc.remarks ?? null,
    },
  };
}

async function getHydrantsFeatureCollection() {
  const docs = await queryDocuments('hydrants');
  const features = docs
    .map(normalizeHydrantFeature)
    .filter((feature) => !!feature.geometry);

  return {
    type: 'FeatureCollection',
    features,
  };
}

async function getHydrantsAdminRows() {
  const docs = await queryDocuments('hydrants');

  return docs
    .map((doc) => ({
      id: toNumberValue(doc.id) ?? doc.id,
      address: doc.address ?? null,
      latitude: toNumberValue(doc.latitude ?? doc.lat ?? doc.geo?.lat),
      longitude: toNumberValue(doc.longitude ?? doc.lng ?? doc.geo?.lng),
      type_color: doc.type_color ?? null,
      barangay_id: toNumberValue(doc.barangay_id ?? doc.barangayId),
      is_operational: doc.is_operational ?? null,
      remarks: doc.remarks ?? null,
    }))
    .sort((left, right) => (left.id || 0) - (right.id || 0));
}

function normalizeNotificationRow(doc) {
  return {
    id: toNumberValue(doc.id) ?? doc.id,
    message: doc.message ?? null,
    payload: doc.payload ?? null,
    read: doc.read ?? false,
    created_at: toDateValue(doc.created_atTs) || toDateValue(doc.created_at),
  };
}

async function getUnreadNotificationsForUser(userId) {
  const docs = await queryDocuments('notifications');
  const normalizedUserId = String(userId);

  return docs
    .map(normalizeNotificationRow)
    .filter((row, index) => {
      const raw = docs[index];
      const rowUserId = String(raw.userId ?? raw.user_id ?? '');
      const isUnread = raw.read === false || raw.read == null;
      return rowUserId === normalizedUserId && isUnread;
    })
    .sort((left, right) => {
      const leftDate = toDateValue(left.created_at);
      const rightDate = toDateValue(right.created_at);
      const leftTime = leftDate ? leftDate.getTime() : 0;
      const rightTime = rightDate ? rightDate.getTime() : 0;
      return rightTime - leftTime;
    });
}

function normalizeFireStationFeature(doc) {
  const fromCoordinates = Array.isArray(doc?.geometry?.coordinates)
    ? {
        lng: toNumberValue(doc.geometry.coordinates[0]),
        lat: toNumberValue(doc.geometry.coordinates[1]),
      }
    : null;

  const fromGeometryObject = doc?.geometry
    ? {
        lng: toNumberValue(doc.geometry.longitude ?? doc.geometry.lng),
        lat: toNumberValue(doc.geometry.latitude ?? doc.geometry.lat),
      }
    : null;

  const fromProperties = doc?.properties
    ? {
        lng: toNumberValue(doc.properties.longitude ?? doc.properties.lng),
        lat: toNumberValue(doc.properties.latitude ?? doc.properties.lat),
      }
    : null;

  const fromDocument = {
    lng: toNumberValue(doc.longitude ?? doc.lng ?? doc.geo?.lng),
    lat: toNumberValue(doc.latitude ?? doc.lat ?? doc.geo?.lat),
  };

  const candidates = [fromCoordinates, fromGeometryObject, fromProperties, fromDocument];
  const point = candidates.find((candidate) => (
    candidate
    && Number.isFinite(candidate.lat)
    && Number.isFinite(candidate.lng)
    && Math.abs(candidate.lat) <= 90
    && Math.abs(candidate.lng) <= 180
  )) || null;

  const lat = point ? point.lat : null;
  const lng = point ? point.lng : null;
  const geometry = point
    ? { type: 'Point', coordinates: [lng, lat] }
    : null;

  return {
    type: 'Feature',
    geometry,
    properties: {
      id: toNumberValue(doc.id) ?? doc.id,
      name: doc.name ?? null,
      operator: doc.operator ?? null,
      address: doc.address ?? null,
      contact_phone: doc.contact_phone ?? null,
      latitude: lat,
      longitude: lng,
    },
  };
}

async function getFireStationsFeatureCollection() {
  const docs = await queryDocuments('fireStations');
  const features = docs
    .map(normalizeFireStationFeature)
    .filter((feature) => !!feature.geometry);

  return {
    type: 'FeatureCollection',
    features,
  };
}

async function getFireStationsAdminRows() {
  const docs = await queryDocuments('fireStations');

  return docs
    .map((doc) => ({
      id: toNumberValue(doc.id) ?? doc.id,
      name: doc.name ?? null,
      operator: doc.operator ?? null,
      address: doc.address ?? null,
      contact_phone: doc.contact_phone ?? null,
      latitude: toNumberValue(doc.latitude ?? doc.lat ?? doc.geo?.lat),
      longitude: toNumberValue(doc.longitude ?? doc.lng ?? doc.geo?.lng),
    }))
    .sort((left, right) => (left.id || 0) - (right.id || 0));
}

async function getStationById(stationId) {
  const docs = await queryDocuments('fireStations');
  const target = String(stationId);
  const doc = docs.find((entry) => String(entry.id) === target);
  if (!doc) return null;

  return {
    id: toNumberValue(doc.id) ?? doc.id,
    name: doc.name ?? null,
  };
}

async function getStationResponders(stationId) {
  const target = String(stationId);
  const users = await queryDocuments('users');

  return users
    .filter((user) => {
      const userStation = String(user.stationId ?? user.station_id ?? '');
      return userStation === target && String(user.role || '').toLowerCase() === 'responder';
    })
    .map((user) => ({
      id: toNumberValue(user.id) ?? user.id,
      username: user.username ?? null,
      email: user.email ?? null,
      role: user.role ?? null,
      created_at: toDateValue(user.created_atTs) || toDateValue(user.created_at),
    }))
    .sort((left, right) => {
      const leftDate = toDateValue(left.created_at);
      const rightDate = toDateValue(right.created_at);
      const leftTime = leftDate ? leftDate.getTime() : 0;
      const rightTime = rightDate ? rightDate.getTime() : 0;
      return rightTime - leftTime;
    });
}

module.exports = {
  toDateValue,
  toNumberValue,
  normalizeForecastRow,
  normalizeHistoricalRow,
  getForecastsForMonth,
  getLatestForecasts,
  getForecastsByBarangayName,
  getActiveFiresFeatureCollection,
  getHistoricalReports,
  getIncidentHistoryFeatureCollection,
  getBarangaysFeatureCollection,
  getBarangaysAdminRows,
  getHydrantsFeatureCollection,
  getHydrantsAdminRows,
  getUnreadNotificationsForUser,
  getFireStationsFeatureCollection,
  getFireStationsAdminRows,
  getStationById,
  getStationResponders,
};
