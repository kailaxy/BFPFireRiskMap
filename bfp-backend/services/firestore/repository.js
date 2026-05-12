const { getFirestoreDb } = require('../../config/firestore');
const { resolveCollectionName } = require('./collections');
const { normalizeDocumentForFirestore } = require('./normalizers');

function collectionRef(domainOrCollection) {
  const db = getFirestoreDb();
  const collectionName = resolveCollectionName(domainOrCollection);
  return db.collection(collectionName);
}

function applyQueryOptions(query, options = {}) {
  let nextQuery = query;

  const where = Array.isArray(options.where) ? options.where : [];
  for (const clause of where) {
    if (!clause || !clause.field || !clause.op) continue;
    nextQuery = nextQuery.where(clause.field, clause.op, clause.value);
  }

  const orderBy = Array.isArray(options.orderBy) ? options.orderBy : [];
  for (const order of orderBy) {
    if (!order || !order.field) continue;
    nextQuery = nextQuery.orderBy(order.field, order.direction || 'asc');
  }

  if (Array.isArray(options.select) && options.select.length) {
    nextQuery = nextQuery.select(...options.select);
  }

  if (typeof options.limit === 'number' && options.limit > 0) {
    nextQuery = nextQuery.limit(options.limit);
  }

  if (options.startAfter !== undefined) {
    nextQuery = nextQuery.startAfter(options.startAfter);
  }

  if (options.startAt !== undefined) {
    nextQuery = nextQuery.startAt(options.startAt);
  }

  if (options.endAt !== undefined) {
    nextQuery = nextQuery.endAt(options.endAt);
  }

  return nextQuery;
}

async function queryDocuments(domainOrCollection, options = {}) {
  const ref = collectionRef(domainOrCollection);
  const query = applyQueryOptions(ref, options);
  const snapshot = await query.get();

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
}

async function getDocument(domainOrCollection, documentId) {
  const ref = collectionRef(domainOrCollection).doc(String(documentId));
  const snapshot = await ref.get();

  if (!snapshot.exists) return null;
  return { id: snapshot.id, ...snapshot.data() };
}

async function setDocument(domainOrCollection, documentId, data, options = {}) {
  const ref = collectionRef(domainOrCollection).doc(String(documentId));
  const normalized = normalizeDocumentForFirestore(data, options);
  await ref.set(normalized, { merge: options.merge === true });
  return { id: ref.id, ...normalized };
}

async function addDocument(domainOrCollection, data, options = {}) {
  const normalized = normalizeDocumentForFirestore(data, options);
  const ref = await collectionRef(domainOrCollection).add(normalized);
  return { id: ref.id, ...normalized };
}

async function updateDocument(domainOrCollection, documentId, data, options = {}) {
  const ref = collectionRef(domainOrCollection).doc(String(documentId));
  const normalized = normalizeDocumentForFirestore(data, options);
  await ref.update(normalized);
  return { id: ref.id, ...normalized };
}

async function deleteDocument(domainOrCollection, documentId) {
  const ref = collectionRef(domainOrCollection).doc(String(documentId));
  await ref.delete();
  return { id: ref.id, deleted: true };
}

async function batchWrite(operations = [], options = {}) {
  const db = getFirestoreDb();
  const batchSize = typeof options.batchSize === 'number' && options.batchSize > 0 ? options.batchSize : 250;

  if (!Array.isArray(operations) || operations.length === 0) {
    return { committedBatches: 0, operations: 0 };
  }

  let committedBatches = 0;
  let opCount = 0;
  let batch = db.batch();

  for (const operation of operations) {
    if (!operation || !operation.type || !operation.collection || !operation.id) continue;

    const ref = collectionRef(operation.collection).doc(String(operation.id));

    if (operation.type === 'set') {
      const data = normalizeDocumentForFirestore(operation.data || {}, operation.options || {});
      batch.set(ref, data, { merge: operation.merge === true });
      opCount += 1;
    }

    if (operation.type === 'update') {
      const data = normalizeDocumentForFirestore(operation.data || {}, operation.options || {});
      batch.update(ref, data);
      opCount += 1;
    }

    if (operation.type === 'delete') {
      batch.delete(ref);
      opCount += 1;
    }

    if (opCount > 0 && opCount % batchSize === 0) {
      await batch.commit();
      committedBatches += 1;
      batch = db.batch();
    }
  }

  if (opCount % batchSize !== 0) {
    await batch.commit();
    committedBatches += 1;
  }

  return { committedBatches, operations: opCount };
}

async function runInTransaction(handler) {
  const db = getFirestoreDb();
  return db.runTransaction(handler);
}

module.exports = {
  collectionRef,
  applyQueryOptions,
  queryDocuments,
  getDocument,
  setDocument,
  addDocument,
  updateDocument,
  deleteDocument,
  batchWrite,
  runInTransaction,
};
