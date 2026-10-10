const DB_NAME = "jaylyn-debut-program-audio";
const DB_VERSION = 2;
const TRACK_STORE = "tracks";
const VIDEO_STORE = "videos";

type StoredMedia = {
  id: string;
  fileName: string;
  mimeType: string;
  createdAt: string;
  blob: Blob;
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB open failed"));
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = request.result;
      if (!db.objectStoreNames.contains(TRACK_STORE)) {
        db.createObjectStore(TRACK_STORE, { keyPath: "id" });
      }
      if (event.newVersion !== null && event.newVersion >= 2 && !db.objectStoreNames.contains(VIDEO_STORE)) {
        db.createObjectStore(VIDEO_STORE, { keyPath: "id" });
      }
    };
  });
}

function runTransaction<T>(
  storeName: string,
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T> | void,
): Promise<T | void> {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, mode);
        const store = tx.objectStore(storeName);
        const request = fn(store);
        tx.oncomplete = () => {
          db.close();
          if (request && "result" in request) resolve((request as IDBRequest<T>).result);
          else resolve(undefined);
        };
        tx.onerror = () => {
          db.close();
          reject(tx.error ?? new Error("IndexedDB transaction failed"));
        };
      }),
  );
}

function listMedia(storeName: string): Promise<Omit<StoredMedia, "blob">[]> {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, "readonly");
        const request = tx.objectStore(storeName).getAll();
        request.onsuccess = () => {
          const rows = (request.result as StoredMedia[]).map(({ id, fileName, mimeType, createdAt }) => ({
            id,
            fileName,
            mimeType,
            createdAt,
          }));
          rows.sort((a, b) => a.fileName.localeCompare(b.fileName));
          db.close();
          resolve(rows);
        };
        request.onerror = () => {
          db.close();
          reject(request.error);
        };
      }),
  );
}

function getMediaBlob(storeName: string, id: string): Promise<Blob | null> {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, "readonly");
        const request = tx.objectStore(storeName).get(id);
        request.onsuccess = () => {
          const row = request.result as StoredMedia | undefined;
          db.close();
          resolve(row?.blob ?? null);
        };
        request.onerror = () => {
          db.close();
          reject(request.error);
        };
      }),
  );
}

async function saveMedia(storeName: string, file: File, fallbackMime: string): Promise<StoredMedia> {
  const record: StoredMedia = {
    id: crypto.randomUUID(),
    fileName: file.name,
    mimeType: file.type || fallbackMime,
    createdAt: new Date().toISOString(),
    blob: file,
  };
  await runTransaction(storeName, "readwrite", (store) => store.put(record));
  return record;
}

export async function saveTrack(file: File): Promise<StoredMedia> {
  return saveMedia(TRACK_STORE, file, "audio/mpeg");
}

export async function listTracks(): Promise<Omit<StoredMedia, "blob">[]> {
  return listMedia(TRACK_STORE);
}

export async function getTrackBlob(id: string): Promise<Blob | null> {
  return getMediaBlob(TRACK_STORE, id);
}

export async function deleteTrack(id: string): Promise<void> {
  await runTransaction(TRACK_STORE, "readwrite", (store) => store.delete(id));
}

export async function saveVideo(file: File): Promise<StoredMedia> {
  return saveMedia(VIDEO_STORE, file, "video/mp4");
}

export async function listVideos(): Promise<Omit<StoredMedia, "blob">[]> {
  return listMedia(VIDEO_STORE);
}

export async function getVideoBlob(id: string): Promise<Blob | null> {
  return getMediaBlob(VIDEO_STORE, id);
}

export async function deleteVideo(id: string): Promise<void> {
  await runTransaction(VIDEO_STORE, "readwrite", (store) => store.delete(id));
}
