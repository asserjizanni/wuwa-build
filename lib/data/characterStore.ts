import fs from 'fs'
import path from 'path'
import os from 'os'
import { FALLBACK_CHARACTERS, CharacterFallback } from './fallback'

declare global {
  // eslint-disable-next-line no-var
  var __cachedCharacters: CharacterFallback[] | undefined
  // eslint-disable-next-line no-var
  var __deletedCharacterIds: Set<string> | undefined
}

// The canonical "seed" file is bundled with the deployment at storage/data/characters.json.
// On Netlify, the project root is read-only but the file is readable.
// Mutations are stored in-memory only (Netlify is serverless — no persistent writable FS).
// On local dev, mutations also write to storage/data/characters.json.

const BUNDLE_DATA_FILE = path.join(process.cwd(), 'storage', 'data', 'characters.json')
const TMP_DATA_FILE = path.join(os.tmpdir(), 'wuwa-characters.json')
const DELETED_IDS_FILE = path.join(os.tmpdir(), 'wuwa-deleted-characters.json')

function getDeletedIds(): Set<string> {
  if (global.__deletedCharacterIds) {
    return global.__deletedCharacterIds
  }

  const set = new Set<string>()
  try {
    if (fs.existsSync(DELETED_IDS_FILE)) {
      const raw = fs.readFileSync(DELETED_IDS_FILE, 'utf-8')
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        parsed.forEach(id => set.add(String(id).toLowerCase()))
      }
    }
  } catch {}

  global.__deletedCharacterIds = set
  return set
}

function saveDeletedIds(set: Set<string>) {
  global.__deletedCharacterIds = set
  try {
    fs.writeFileSync(DELETED_IDS_FILE, JSON.stringify(Array.from(set), null, 2), 'utf-8')
  } catch {}
}

function tryWriteLocal(data: CharacterFallback[]) {
  // Try writing to the project storage file (works on local dev, read-only on Netlify)
  try {
    fs.writeFileSync(BUNDLE_DATA_FILE, JSON.stringify(data, null, 2), 'utf-8')
    return
  } catch {}
  // Fallback to /tmp (ephemeral on Netlify, good for local testing)
  try {
    fs.writeFileSync(TMP_DATA_FILE, JSON.stringify(data, null, 2), 'utf-8')
  } catch {}
}

function loadFromDisk(): CharacterFallback[] {
  const deleted = getDeletedIds()

  // 1. Try /tmp (mutations written in this session)
  try {
    if (fs.existsSync(TMP_DATA_FILE)) {
      const raw = fs.readFileSync(TMP_DATA_FILE, 'utf-8')
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        return parsed.filter(
          c => !deleted.has(String(c.id).toLowerCase()) && !deleted.has(String(c.slug).toLowerCase())
        )
      }
    }
  } catch {}

  // 2. Read from bundled storage/data/characters.json (part of the Git repo / deployment)
  try {
    if (fs.existsSync(BUNDLE_DATA_FILE)) {
      const raw = fs.readFileSync(BUNDLE_DATA_FILE, 'utf-8')
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        return parsed.filter(
          c => !deleted.has(String(c.id).toLowerCase()) && !deleted.has(String(c.slug).toLowerCase())
        )
      }
    }
  } catch {}

  // 3. Ultimate fallback (empty after our change)
  return FALLBACK_CHARACTERS.filter(
    c => !deleted.has(c.id.toLowerCase()) && !deleted.has(c.slug.toLowerCase())
  )
}

export function getStoredCharacters(): CharacterFallback[] {
  if (!global.__cachedCharacters) {
    global.__cachedCharacters = loadFromDisk()
  }
  const deleted = getDeletedIds()
  return global.__cachedCharacters.filter(
    c => !deleted.has(String(c.id).toLowerCase()) && !deleted.has(String(c.slug).toLowerCase())
  )
}

export function getStoredCharacter(idOrSlug: string): CharacterFallback | null {
  const characters = getStoredCharacters()
  const lower = idOrSlug.toLowerCase()
  return (
    characters.find(
      c => c.id.toLowerCase() === lower || c.slug.toLowerCase() === lower
    ) || null
  )
}

export function createStoredCharacter(input: {
  name: string
  slug?: string
  element: 'AERO' | 'SPECTRO' | 'FUSION' | 'ELECTRO' | 'GLACIO' | 'HAVOC'
  weaponType: 'BROADBLADE' | 'SWORD' | 'PISTOLS' | 'GAUNTLETS' | 'RECTIFIER'
  rarity?: 'FIVE_STAR' | 'FOUR_STAR'
  description?: string | null
  sourceUrl?: string | null
  isPublished?: boolean
  isComingSoon?: boolean
  releaseVersion?: string | null
  isFeatured?: boolean
  tags?: string[]
  portraitPath?: string | null
  backgroundPath?: string | null
}): CharacterFallback {
  const characters = getStoredCharacters()
  const slug =
    input.slug ||
    input.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') ||
    `resonator-${Date.now()}`

  // If this slug was in deleted ids, revive it
  const deleted = getDeletedIds()
  if (deleted.has(slug.toLowerCase())) {
    deleted.delete(slug.toLowerCase())
    saveDeletedIds(deleted)
  }

  const isComingSoon = Boolean(input.isComingSoon)

  const newChar: CharacterFallback = {
    id: `char-${Date.now()}`,
    name: input.name,
    nameEn: input.name,
    slug,
    element: input.element,
    weaponType: input.weaponType,
    rarity: input.rarity || 'FIVE_STAR',
    description: input.description || '',
    portraitPath: input.portraitPath || null,
    backgroundPath: input.backgroundPath || null,
    sortOrder: isComingSoon ? 0 : characters.length + 1,
    isPublished: input.isPublished ?? true,
    isComingSoon,
    releaseVersion: input.releaseVersion || null,
    tags: input.tags || [],
    guides: [],
    ...(input.isFeatured !== undefined ? { isFeatured: input.isFeatured } : {}),
  } as any

  characters.unshift(newChar)
  global.__cachedCharacters = characters
  tryWriteLocal(characters)
  return newChar
}

export function updateStoredCharacter(
  idOrSlug: string,
  updates: Partial<CharacterFallback> & Record<string, any>
): CharacterFallback | null {
  const characters = getStoredCharacters()
  const lower = idOrSlug.toLowerCase()
  const index = characters.findIndex(
    c => c.id.toLowerCase() === lower || c.slug.toLowerCase() === lower
  )
  if (index === -1) return null

  const existing = characters[index]
  const updated: CharacterFallback = {
    ...existing,
    ...updates,
    updatedAt: new Date().toISOString(),
  } as any

  characters[index] = updated
  global.__cachedCharacters = characters
  tryWriteLocal(characters)
  return updated
}

export function deleteStoredCharacter(idOrSlug: string): boolean {
  const characters = getStoredCharacters()
  const lower = idOrSlug.toLowerCase()
  const target = characters.find(
    c => c.id.toLowerCase() === lower || c.slug.toLowerCase() === lower
  )

  const deleted = getDeletedIds()
  deleted.add(lower)
  if (target) {
    deleted.add(target.id.toLowerCase())
    deleted.add(target.slug.toLowerCase())
  }
  saveDeletedIds(deleted)

  const filtered = characters.filter(
    c => c.id.toLowerCase() !== lower && c.slug.toLowerCase() !== lower
  )

  global.__cachedCharacters = filtered
  tryWriteLocal(filtered)
  return true
}

export function deleteStoredGuide(guideId: string): boolean {
  const characters = getStoredCharacters()
  let modified = false

  for (const char of characters) {
    if (char.guides && Array.isArray(char.guides)) {
      const initialCount = char.guides.length
      char.guides = char.guides.filter((g: any) => g.id !== guideId)
      if (char.guides.length !== initialCount) {
        modified = true
      }
    }
  }

  if (modified) {
    global.__cachedCharacters = characters
    tryWriteLocal(characters)
  }

  return modified
}

export function addStoredGuide(characterIdOrSlug: string, guideData: any): any {
  const characters = getStoredCharacters()
  const lower = characterIdOrSlug.toLowerCase()
  const char = characters.find(
    c => c.id.toLowerCase() === lower || c.slug.toLowerCase() === lower
  )
  if (!char) return null

  if (!char.guides) char.guides = []
  // If active, deactivate others
  if (guideData.isActive) {
    char.guides.forEach((g: any) => (g.isActive = false))
  }
  char.guides.unshift(guideData)

  global.__cachedCharacters = characters
  tryWriteLocal(characters)
  return guideData
}

export function publishStoredGuide(guideId: string): boolean {
  const characters = getStoredCharacters()
  let modified = false

  for (const char of characters) {
    if (char.guides && Array.isArray(char.guides)) {
      if (char.guides.some((g: any) => g.id === guideId)) {
        char.guides = char.guides.map((g: any) => {
          if (g.id === guideId) {
            return {
              ...g,
              status: 'PUBLISHED',
              isActive: true,
              publishedAt: new Date().toISOString(),
            }
          }
          return { ...g, isActive: false }
        })
        modified = true
      }
    }
  }

  if (modified) {
    global.__cachedCharacters = characters
    tryWriteLocal(characters)
  }

  return modified
}
