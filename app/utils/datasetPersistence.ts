import type {
  ImageRecord,
  PersistedDataset,
  PersistedDatasetState,
  PersistedFileRecord,
  PersistedImageState
} from "~/types/imageTagger";

const databaseName = "tva-image-tagger";
const databaseVersion = 1;
const stateStoreName = "dataset-state";
const fileStoreName = "dataset-files";
const currentStateKey = "current";

interface PersistedStateEntry {
  id: string;
  state: PersistedDatasetState;
}

export function createPersistedDatasetState(datasetName: string, images: ImageRecord[]): PersistedDatasetState {
  return {
    version: 1,
    savedAt: Date.now(),
    datasetName,
    images: images.map(createPersistedImageState)
  };
}

export function createPersistedFileRecords(images: ImageRecord[]): PersistedFileRecord[] {
  return images.map((image) => ({
    id: image.id,
    file: image.file
  }));
}

export async function savePersistedDataset(
  state: PersistedDatasetState,
  fileRecords?: PersistedFileRecord[]
): Promise<void> {
  const database = await openPersistenceDatabase();
  const storeNames = fileRecords ? [stateStoreName, fileStoreName] : [stateStoreName];

  try {
    await runTransaction(database, storeNames, "readwrite", (transaction) => {
      const stateStore = transaction.objectStore(stateStoreName);
      stateStore.put({ id: currentStateKey, state } satisfies PersistedStateEntry);

      if (!fileRecords) {
        return;
      }

      const fileStore = transaction.objectStore(fileStoreName);
      fileStore.clear();
      for (const fileRecord of fileRecords) {
        fileStore.put(fileRecord);
      }
    });
  } finally {
    database.close();
  }
}

export async function loadPersistedDataset(): Promise<PersistedDataset | null> {
  const database = await openPersistenceDatabase();

  try {
    const stateEntry = await getRequest<PersistedStateEntry | undefined>(
      database.transaction(stateStoreName, "readonly").objectStore(stateStoreName).get(currentStateKey)
    );

    if (!stateEntry?.state?.images?.length) {
      return null;
    }

    const files = await getRequest<PersistedFileRecord[]>(
      database.transaction(fileStoreName, "readonly").objectStore(fileStoreName).getAll()
    );
    const filesById = new Map(files.map((record) => [record.id, record.file]));

    return {
      state: stateEntry.state,
      filesById
    };
  } finally {
    database.close();
  }
}

function createPersistedImageState(image: ImageRecord): PersistedImageState {
  return {
    id: image.id,
    index: image.index,
    relativePath: image.relativePath,
    fileName: image.fileName,
    originalFileName: image.originalFileName,
    tagFileName: image.tagFileName,
    outputTagPath: image.outputTagPath,
    width: image.width,
    height: image.height,
    fileSize: image.fileSize,
    tags: [...image.tags],
    originalTags: [...image.originalTags],
    removedTags: [...image.removedTags],
    selectedTag: image.selectedTag,
    editText: image.editText,
    draftDirty: image.draftDirty,
    dirty: image.dirty,
    lastSavedAt: image.lastSavedAt
  };
}

function openPersistenceDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(databaseName, databaseVersion);

    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(stateStoreName)) {
        database.createObjectStore(stateStoreName, { keyPath: "id" });
      }
      if (!database.objectStoreNames.contains(fileStoreName)) {
        database.createObjectStore(fileStoreName, { keyPath: "id" });
      }
    };
    request.onerror = () => reject(request.error ?? new Error("IndexedDB could not be opened."));
    request.onsuccess = () => resolve(request.result);
  });
}

function runTransaction(
  database: IDBDatabase,
  storeNames: string[],
  mode: IDBTransactionMode,
  callback: (transaction: IDBTransaction) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeNames, mode);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("IndexedDB transaction failed."));
    transaction.onabort = () => reject(transaction.error ?? new Error("IndexedDB transaction was aborted."));
    callback(transaction);
  });
}

function getRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed."));
    request.onsuccess = () => resolve(request.result);
  });
}
