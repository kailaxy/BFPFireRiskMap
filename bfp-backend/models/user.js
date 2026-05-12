const bcrypt = require('bcrypt');
const { isFirestoreProvider } = require('../utils/dataProvider');
const { admin, getFirestoreDb } = require('../config/firestore');

const SALT_ROUNDS = 10;

function getDb() {
  return require('../db');
}

function toDateValue(value, fallback = null) {
  if (!value) return fallback;
  if (typeof value.toDate === 'function') return value.toDate();
  if (value instanceof Date) return value;
  return fallback;
}

async function getFirestoreUserByUsername(username) {
  const firestore = getFirestoreDb();
  const snapshot = await firestore
    .collection('users')
    .where('username', '==', username)
    .limit(1)
    .get();

  if (snapshot.empty) return undefined;

  const doc = snapshot.docs[0];
  return {
    id: doc.id,
    ...doc.data(),
  };
}

async function createFirestoreUser({ username, password_hash, email, role, station_id = null }) {
  const firestore = getFirestoreDb();
  const now = admin.firestore.FieldValue.serverTimestamp();

  const payload = {
    username,
    password_hash,
    email,
    role,
    station_id,
    created_at: now,
  };

  const docRef = await firestore.collection('users').add(payload);
  const createdDoc = await docRef.get();
  const createdData = createdDoc.data() || payload;

  return {
    id: docRef.id,
    username: createdData.username,
    email: createdData.email,
    role: createdData.role,
    station_id: createdData.station_id ?? null,
    created_at: toDateValue(createdData.created_at, new Date()),
  };
}

async function createUser({ username, password, email, role, station_id = null }) {
  const password_hash = await bcrypt.hash(password, SALT_ROUNDS);
  if (isFirestoreProvider()) {
    return createFirestoreUser({ username, password_hash, email, role, station_id });
  }

  const sql = `
    INSERT INTO users (username, password_hash, email, role, station_id)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id, username, email, role, station_id, created_at
  `;
  const params = [username, password_hash, email, role, station_id];
  const db = getDb();
  const { rows } = await db.query(sql, params);
  return rows[0];
}

async function findByUsername(username) {
  if (isFirestoreProvider()) {
    return getFirestoreUserByUsername(username);
  }

  const sql = `SELECT * FROM users WHERE username = $1`;
  const db = getDb();
  const { rows } = await db.query(sql, [username]);
  return rows[0];
}

async function validatePassword(username, password) {
  if (!username || !password) return false;
  const user = await findByUsername(username);
  if (!user) return false;
  if (!user.password_hash) return false;
  return await bcrypt.compare(password, user.password_hash) ? user : false;
}

module.exports = {
  createUser,
  findByUsername,
  validatePassword,
};