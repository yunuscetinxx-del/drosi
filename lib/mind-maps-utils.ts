import type { MindMap, MindMapFolder, MindMapNode, Lesson } from "@/types/lesson"

const newId = () => Math.random().toString(36).substring(2, 11)

type LegacyLesson = Partial<Lesson> & {
  mindMapNodes?: MindMapNode[]
  mindMapSaved?: boolean
  mindMaps?: MindMap[]
  mindMapFolders?: MindMapFolder[]
}

export function reviveMindMapFolder(folder: MindMapFolder): MindMapFolder {
  return {
    ...folder,
    createdAt: new Date(folder.createdAt as unknown as string),
    updatedAt: new Date(folder.updatedAt as unknown as string),
  }
}

export function normalizeMindMapFolders(raw: LegacyLesson): MindMapFolder[] {
  if (!Array.isArray(raw.mindMapFolders)) return []
  return raw.mindMapFolders.map(reviveMindMapFolder)
}

export function reviveMindMap(map: MindMap): MindMap {
  return {
    ...map,
    saved: true,
    folderId: map.folderId ?? null,
    nodes: (map.nodes ?? []).map((n) => ({
      ...n,
      linkedMapId: n.linkedMapId ?? null,
      linkedImageId: n.linkedImageId ?? null,
      linkedWordPageId: n.linkedWordPageId ?? null,
      linkedKeyPointIndex: n.linkedKeyPointIndex ?? null,
    })),
    createdAt: new Date(map.createdAt as unknown as string),
    updatedAt: new Date(map.updatedAt as unknown as string),
  }
}

/** تحويل الحقل القديم mindMapNodes إلى مصفوفة mindMaps */
export function normalizeMindMaps(
  raw: LegacyLesson,
  lessonId?: string,
  defaultTitle = "الخريطة الرئيسية"
): MindMap[] {
  if (Array.isArray(raw.mindMaps) && raw.mindMaps.length > 0) {
    return raw.mindMaps.map(reviveMindMap)
  }

  const nodes = raw.mindMapNodes ?? []
  if (nodes.length === 0 && !raw.mindMapSaved) return []

  const now = new Date()
  return [
    {
      id: lessonId ? `legacy-${lessonId}` : newId(),
      title: defaultTitle,
      nodes,
      saved: true,
      folderId: null,
      createdAt: now,
      updatedAt: now,
    },
  ]
}

export function countMindMapNodes(maps: MindMap[]): number {
  return maps.reduce((sum, map) => sum + (map.nodes?.length ?? 0), 0)
}

export function createEmptyMindMap(title: string, folderId?: string | null): MindMap {
  const now = new Date()
  return {
    id: newId(),
    title,
    nodes: [],
    saved: true,
    folderId: folderId ?? null,
    createdAt: now,
    updatedAt: now,
  }
}

export function createEmptyMindMapFolder(title: string): MindMapFolder {
  const now = new Date()
  return {
    id: newId(),
    title,
    createdAt: now,
    updatedAt: now,
  }
}

export function cloneMindMapsForUser(
  maps: MindMap[],
  folders: MindMapFolder[] = []
): { maps: MindMap[]; folders: MindMapFolder[] } {
  const now = new Date()
  const folderIdMap = new Map<string, string>()
  const clonedFolders = (folders ?? []).map((folder) => {
    const id = newId()
    folderIdMap.set(folder.id, id)
    return {
      ...folder,
      id,
      createdAt: now,
      updatedAt: now,
    }
  })

  const mapIdMap = new Map<string, string>()
  const clonedMaps = (maps ?? []).map((map) => {
    const id = newId()
    mapIdMap.set(map.id, id)
    return { map, id }
  })

  const mapsOut = clonedMaps.map(({ map, id }) => {
    const nodeIdMap = new Map<string, string>()
    const nodes = (map.nodes ?? [])
      .map((n) => {
        const nid = newId()
        nodeIdMap.set(n.id, nid)
        return { ...n, id: nid }
      })
      .map((n) => ({
        ...n,
        parentId:
          n.parentId && nodeIdMap.has(n.parentId) ? nodeIdMap.get(n.parentId)! : null,
        linkedMapId:
          n.linkedMapId && mapIdMap.has(n.linkedMapId)
            ? mapIdMap.get(n.linkedMapId)!
            : null,
      }))

    return {
      ...map,
      id,
      folderId:
        map.folderId && folderIdMap.has(map.folderId)
          ? folderIdMap.get(map.folderId)!
          : null,
      nodes,
      saved: map.saved,
      createdAt: now,
      updatedAt: now,
    }
  })

  return { maps: mapsOut, folders: clonedFolders }
}

export function updateMindMapInList(
  maps: MindMap[],
  mapId: string,
  updater: (map: MindMap) => MindMap
): MindMap[] {
  return maps.map((map) => (map.id === mapId ? updater(map) : map))
}

export function clearLinkedMapReferences(maps: MindMap[], removedMapId: string): MindMap[] {
  return maps.map((map) => ({
    ...map,
    nodes: map.nodes.map((node) =>
      node.linkedMapId === removedMapId ? { ...node, linkedMapId: null } : node
    ),
  }))
}

export function dissolveMindMapFolder(
  maps: MindMap[],
  folderId: string
): MindMap[] {
  return maps.map((map) =>
    map.folderId === folderId ? { ...map, folderId: null, updatedAt: new Date() } : map
  )
}

const ACTIVE_MAP_KEY_PREFIX = "durusi_active_mindmap_"
const EXPANDED_FOLDERS_KEY_PREFIX = "durusi_mindmap_folders_"

export function readActiveMindMapId(lessonId: string): string | null {
  if (typeof window === "undefined") return null
  try {
    return localStorage.getItem(`${ACTIVE_MAP_KEY_PREFIX}${lessonId}`)
  } catch {
    return null
  }
}

export function writeActiveMindMapId(lessonId: string, mapId: string): void {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(`${ACTIVE_MAP_KEY_PREFIX}${lessonId}`, mapId)
  } catch {
    /* ignore */
  }
}

export function readExpandedFolderIds(lessonId: string): string[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(`${EXPANDED_FOLDERS_KEY_PREFIX}${lessonId}`)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : []
  } catch {
    return []
  }
}

export function writeExpandedFolderIds(lessonId: string, ids: string[]): void {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(`${EXPANDED_FOLDERS_KEY_PREFIX}${lessonId}`, JSON.stringify(ids))
  } catch {
    /* ignore */
  }
}

export type MapListEntry = {
  map: MindMap
  folderId: string | null
}

export function filterMapsForSidebar(
  maps: MindMap[],
  searchQuery: string
): MapListEntry[] {
  const q = searchQuery.trim().toLowerCase()
  if (!q) return maps.map((map) => ({ map, folderId: map.folderId ?? null }))
  return maps
    .filter(
      (map) =>
        map.title.toLowerCase().includes(q) ||
        map.nodes.some((node) => node.text.toLowerCase().includes(q))
    )
    .map((map) => ({ map, folderId: map.folderId ?? null }))
}
