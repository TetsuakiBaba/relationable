const DB_NAME = 'relationable_db';
const DB_VERSION = 1;
const STORE_DATA = 'graph_data';
const STORE_IMAGES = 'node_images';

export async function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_DATA)) {
                db.createObjectStore(STORE_DATA);
            }
            if (!db.objectStoreNames.contains(STORE_IMAGES)) {
                db.createObjectStore(STORE_IMAGES);
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

export async function saveGraphData(data) {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_DATA, 'readwrite');
        const store = transaction.objectStore(STORE_DATA);
        const request = store.put(data, 'current_graph');
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

export async function loadGraphData() {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_DATA, 'readonly');
        const store = transaction.objectStore(STORE_DATA);
        const request = store.get('current_graph');
        request.onsuccess = () => resolve(request.result || { nodes: [], links: [] });
        request.onerror = () => reject(request.error);
    });
}

export async function saveNodeImage(id, blob) {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_IMAGES, 'readwrite');
        const store = transaction.objectStore(STORE_IMAGES);
        const request = store.put(blob, id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

export async function getNodeImage(id) {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_IMAGES, 'readonly');
        const store = transaction.objectStore(STORE_IMAGES);
        const request = store.get(id);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

export async function deleteNodeImage(id) {
    const db = await initDB();
    const transaction = db.transaction(STORE_IMAGES, 'readwrite');
    transaction.objectStore(STORE_IMAGES).delete(id);
}

export async function getAllNodeImages() {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_IMAGES, 'readonly');
        const store = transaction.objectStore(STORE_IMAGES);
        const request = store.getAll();
        const keysRequest = store.getAllKeys();

        request.onsuccess = () => {
            keysRequest.onsuccess = () => {
                const results = {};
                request.result.forEach((blob, index) => {
                    results[keysRequest.result[index]] = blob;
                });
                resolve(results);
            };
        };
        request.onerror = () => reject(request.error);
    });
}

export async function clearAllData() {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction([STORE_DATA, STORE_IMAGES], 'readwrite');
        tx.objectStore(STORE_DATA).clear();
        tx.objectStore(STORE_IMAGES).clear();
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

export async function resizeImage(file, maxSize = 300) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > maxSize) {
                        height *= maxSize / width;
                        width = maxSize;
                    }
                } else {
                    if (height > maxSize) {
                        width *= maxSize / height;
                        height = maxSize;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                canvas.toBlob((blob) => {
                    resolve(blob);
                }, file.type || 'image/jpeg', 0.8);
            };
            img.onerror = reject;
        };
        reader.onerror = reject;
    });
}
