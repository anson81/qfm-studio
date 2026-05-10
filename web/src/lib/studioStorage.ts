/* ─── TikTok Studio Storage ─── */
/* localStorage for metadata, IndexedDB for binary blobs */

import type { VideoProject, Avatar, ProductPhoto } from './studioTypes'

const PROJECT_KEY = 'qfm_studio_project'
const AVATARS_KEY = 'qfm_studio_avatars'
const DB_NAME = 'qfm_studio_db'
const DB_VERSION = 1
const PHOTOS_STORE = 'photos'
const VOICE_SAMPLES_STORE = 'voice_samples'

// ─── Project Persistence ───

export function saveProject(project: VideoProject): void {
  // Don't store binary data in localStorage — only references
  const toStore = { ...project }
  localStorage.setItem(PROJECT_KEY, JSON.stringify(toStore))
}

export function loadProject(): VideoProject | null {
  const raw = localStorage.getItem(PROJECT_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function clearProject(): void {
  localStorage.removeItem(PROJECT_KEY)
}

// ─── Avatar Library ───

export function saveAvatars(avatars: Avatar[]): void {
  localStorage.setItem(AVATARS_KEY, JSON.stringify(avatars))
}

export function loadAvatars(): Avatar[] {
  const raw = localStorage.getItem(AVATARS_KEY)
  if (!raw) return []
  try {
    return JSON.parse(raw)
  } catch {
    return []
  }
}

export function saveAvatar(avatar: Avatar): void {
  const avatars = loadAvatars()
  const idx = avatars.findIndex(a => a.id === avatar.id)
  if (idx >= 0) {
    avatars[idx] = avatar
  } else {
    avatars.push(avatar)
  }
  saveAvatars(avatars)
}

export function deleteAvatar(id: string): void {
  const avatars = loadAvatars().filter(a => a.id !== id)
  saveAvatars(avatars)
}

// ─── IndexedDB for Binary Blobs ───

let dbInstance: IDBDatabase | null = null

function openDB(): Promise<IDBDatabase> {
  if (dbInstance) return Promise.resolve(dbInstance)
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(PHOTOS_STORE)) {
        db.createObjectStore(PHOTOS_STORE, { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains(VOICE_SAMPLES_STORE)) {
        db.createObjectStore(VOICE_SAMPLES_STORE, { keyPath: 'id' })
      }
    }
    req.onsuccess = () => {
      dbInstance = req.result
      resolve(req.result)
    }
    req.onerror = () => reject(req.error)
  })
}

export async function savePhotoBlob(id: string, blob: Blob): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PHOTOS_STORE, 'readwrite')
    tx.objectStore(PHOTOS_STORE).put({ id, blob })
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function loadPhotoBlob(id: string): Promise<Blob | null> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PHOTOS_STORE, 'readonly')
    const req = tx.objectStore(PHOTOS_STORE).get(id)
    req.onsuccess = () => {
      const result = req.result as { id: string; blob: Blob } | undefined
      resolve(result?.blob ?? null)
    }
    req.onerror = () => reject(req.error)
  })
}

export async function deletePhotoBlob(id: string): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PHOTOS_STORE, 'readwrite')
    tx.objectStore(PHOTOS_STORE).delete(id)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function saveVoiceSample(id: string, blob: Blob): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(VOICE_SAMPLES_STORE, 'readwrite')
    tx.objectStore(VOICE_SAMPLES_STORE).put({ id, blob })
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function loadVoiceSample(id: string): Promise<Blob | null> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(VOICE_SAMPLES_STORE, 'readonly')
    const req = tx.objectStore(VOICE_SAMPLES_STORE).get(id)
    req.onsuccess = () => {
      const result = req.result as { id: string; blob: Blob } | undefined
      resolve(result?.blob ?? null)
    }
    req.onerror = () => reject(req.error)
  })
}

// ─── Utility ───

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}