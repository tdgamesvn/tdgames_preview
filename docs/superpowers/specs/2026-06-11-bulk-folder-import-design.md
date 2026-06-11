# Bulk Folder Import — Design Spec

**Date:** 2026-06-11  
**Status:** Approved  
**Scope:** Internal dashboard only (`internal` role)

---

## Problem

Uploading 30–50 characters to a project currently requires two manual steps per character:
1. Type the character name in TaskManager
2. Navigate to the character page and upload Spine files

For large projects this is extremely tedious. Users need a single drag-and-drop action to create all characters and upload their files at once.

---

## Solution

A **BulkFolderImport** component on the project detail Characters tab. The user drops a set of folders (one per character); the component reads each folder name as the character name and uploads all files inside as `animation` assets for that character.

---

## Data Model

No schema changes. Reuses existing tables and endpoints:

| Step | Mechanism |
|------|-----------|
| Create characters | `createTasksBatch` server action (existing) |
| Upload files | `POST /api/upload` route handler (existing) |

---

## Component: `BulkFolderImport`

**Location:** `src/components/dashboard/bulk-folder-import.tsx`  
**Props:** `projectId: string`, `clientId: string`

### UI States

1. **Idle** — Drop zone with instruction text. Accepts multiple folders via drag-and-drop or a folder picker button.
2. **Preview** — Scrollable list of detected folders: character name + file count. Two action buttons: [Cancel] [Import N characters].
3. **Uploading** — Per-character progress rows: character name, "X / Y files", current file name. Cannot cancel mid-upload (simplicity).
4. **Done** — Success summary: "N characters imported, M files uploaded." Button to dismiss.
5. **Error** — Inline error badge per character. Other characters are not blocked. Errors shown after full run completes.

### Drop Detection

Uses `DataTransferItem.webkitGetAsEntry()` to read the file system tree. Only **top-level entries** are treated as character folders. Sub-folder contents are flattened (collected recursively) into a single file list for that character.

```
Drop target receives:
  Knight/          → character "Knight"
    Knight.json
    Knight.atlas
    Knight.png
  Mage/            → character "Mage"
    Mage.json
    Mage.atlas
    Mage.png
```

### File Filtering

Reuses the shared `isSystemFile` utility (see below). Files matching system patterns (`.DS_Store`, `desktop.ini`, `._*`, etc.) are silently skipped before preview and upload.

### Upload Sequencing

Characters are uploaded **sequentially** (one at a time) to avoid overwhelming the server. Within each character, files are uploaded sequentially too. This gives a clear, predictable progress UX.

### service_type

All files in an imported folder are uploaded as `animation`. The primary use case is Spine bundles (`.json` + `.atlas` + texture PNGs). Users who need art or VFX assets use the existing per-character AssetUpload component.

---

## Shared File Utilities

**Location:** `src/lib/utils/files.ts`  
**Exports:** `isSystemFile`, `getExtension`, `collectFromEntry`

These three functions are currently duplicated inside `asset-upload.tsx`. Extracting them into a shared module eliminates duplication and makes them available to `BulkFolderImport` without coupling the two components.

`asset-upload.tsx` will be updated to import from `@/lib/utils/files` instead.

---

## Integration Point

**File:** `src/app/(dashboard)/dashboard/clients/[id]/projects/[pid]/page.tsx`  
**Tab:** Characters  
**Position:** Below the `<TaskManager>` component, above the character card grid.

The `BulkFolderImport` component is conditionally rendered only on the Characters tab — it does not appear on other tabs.

---

## Error Handling

| Scenario | Behaviour |
|----------|-----------|
| Folder with 0 valid files | Skipped silently in preview |
| `createTasksBatch` fails | Error shown, upload phase never starts |
| Individual file upload fails | Error badge on that character row; other characters continue |
| Duplicate character name | Task created with duplicate name (same behaviour as existing TaskManager) |
| Drop contains files (not folders) | Files ignored; only top-level directory entries are processed |

---

## Files Changed

| File | Change |
|------|--------|
| `src/lib/utils/files.ts` | **New** — shared `isSystemFile`, `getExtension`, `collectFromEntry` |
| `src/components/dashboard/asset-upload.tsx` | Import utilities from `@/lib/utils/files` |
| `src/components/dashboard/bulk-folder-import.tsx` | **New** — full component |
| `src/app/(dashboard)/dashboard/clients/[id]/projects/[pid]/page.tsx` | Add `<BulkFolderImport>` to Characters tab |

No new API routes. No DB migrations. No test changes required (component is client-side UI with no server logic to unit-test independently).

---

## Out of Scope

- Auto-detecting service_type from file extension inside folders
- Cancelling an in-progress upload
- Deduplication against existing characters by name
- Progress persistence across page refreshes
