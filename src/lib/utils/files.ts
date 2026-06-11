/** OS/system files that should never be uploaded (Windows, macOS, etc.). */
const SYSTEM_FILE_NAMES = new Set([
  'desktop.ini', 'thumbs.db', 'thumbs.db:encryptable',
  '.ds_store', '.localized', '.spotlight-v100', '.trashes',
  '.fseventsd', '.temporaryitems', '.apdisk',
])

/** Returns true for OS/system files that should never be uploaded. */
export function isSystemFile(name: string): boolean {
  const lower = name.toLowerCase()
  if (SYSTEM_FILE_NAMES.has(lower)) return true
  // Mac resource forks (._filename) and hidden dot-files
  if (lower.startsWith('._') || lower.startsWith('.')) return true
  return false
}

/** Extracts the logical file extension.
 *  Handles compound extensions: .atlas.txt → atlas, .skel.bytes → skel. */
export function getExtension(filename: string): string {
  const parts = filename.split('.')
  if (parts.length < 2) return 'bin'
  if (parts.length >= 3 && ['txt', 'bytes'].includes(parts[parts.length - 1])) {
    return parts[parts.length - 2].toLowerCase()
  }
  return parts.pop()?.toLowerCase() ?? 'bin'
}

/** Recursively collects all File objects from a FileSystemEntry (file or directory). */
export async function collectFromEntry(entry: FileSystemEntry): Promise<File[]> {
  if (entry.isFile) {
    return new Promise<File[]>((resolve) => {
      ;(entry as FileSystemFileEntry).file(
        (f) => resolve([f]),
        () => resolve([]),
      )
    })
  }
  if (entry.isDirectory) {
    const reader = (entry as FileSystemDirectoryEntry).createReader()
    const entries = await new Promise<FileSystemEntry[]>((resolve) => {
      reader.readEntries(resolve, () => resolve([]))
    })
    const nested = await Promise.all(entries.map(collectFromEntry))
    return nested.flat()
  }
  return []
}
