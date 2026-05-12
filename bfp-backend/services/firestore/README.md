# Firestore Data Access Foundation

This module provides shared Firestore data-access primitives for backend migration tasks.

## Provider mode
- Controlled by `DATA_PROVIDER` in `utils/dataProvider.js`
- `DATA_PROVIDER=postgres` keeps current PostgreSQL flow as default
- `DATA_PROVIDER=firestore` enables Firestore client usage

## Main exports
- `initializeFirestore`, `getFirestoreDb`, `getFirestoreConfig`
- Collection helpers: `getCollectionMap`, `resolveCollectionName`
- Repository helpers: `queryDocuments`, `getDocument`, `setDocument`, `addDocument`, `updateDocument`, `deleteDocument`
- Advanced helpers: `batchWrite`, `runInTransaction`
- Normalizers: `normalizeDocumentForFirestore`, `normalizeGeoShape`, `normalizeTimestamps`, `toFirestoreTimestamp`

## Query helper shape
`queryDocuments(collection, options)` supports:
- `where`: array of `{ field, op, value }`
- `orderBy`: array of `{ field, direction }`
- `limit`: number
- `startAfter`, `startAt`, `endAt`

## Batch helper shape
`batchWrite(operations, { batchSize })` operations:
- `set`: `{ type: 'set', collection, id, data, merge? }`
- `update`: `{ type: 'update', collection, id, data }`
- `delete`: `{ type: 'delete', collection, id }`

## Notes for Tasks 3.2 / 3.3
- Keep endpoint-level mapping/transform logic outside this module.
- Reuse normalizers to preserve timestamp and geo normalization consistency.
