# Coding Guidelines

## Product Rules

- Keep the app static-only. Do not add server routes, Nitro server handlers, API endpoints, or Vercel functions.
- Treat local files as user-owned data. Load files into memory and export explicit downloads; never imply that source files are edited in place.
- Optimize for dataset editing speed: dense controls, low visual noise, lazy image loading, and bounded rendering for large folders.
- Every destructive or batch dataset mutation must be reversible through the shared undo/redo history.

## Architecture

- Use TypeScript for app code. Vue files must use `<script setup lang="ts">`; utilities, composables, and shared models should be `.ts`.
- Keep `ImageTaggerApp.client.vue` as the layout/provider shell only. It should provide the image tagger context, render the major app regions, and avoid owning feature logic.
- Put reusable UI in focused components under `app/components`. Current component boundaries are:
  - `AppHeader.vue` for file/config import and export buttons.
  - `QuickControls.vue` for filters, layout controls, and top summary metrics.
  - `SidePanel.vue`, `BatchTools.vue`, and `HistoryPanel.vue` for side-panel tools.
  - `DatasetPanel.vue`, `ImageRow.vue`, `TagStatsList.vue`, and `ImageViewer.vue` for the main dataset experience.
  - `TagField.vue` and `TagSetFields.vue` for reusable tag-list textareas.
- Keep shared app contracts in `app/types/imageTagger.ts`; update those types before widening component or composable APIs.
- Keep the injected app context in `app/composables/useImageTagger.ts`. Components should consume that context with `useImageTaggerContext()` instead of duplicating state.
- Keep stateful action groups under `app/composables/imageTagger`:
  - `datasetActions.ts` for folder/config loading and image metadata lines.
  - `historyActions.ts` for snapshots, undo/redo, and reversible image removal.
  - `rowTagActions.ts` for per-row editor/tag-chip behavior.
  - `batchActions.ts` for multi-image mutations.
  - `filterActions.ts` for filter and render-window controls.
  - `exportActions.ts` for config, tag ZIP, resized ZIP, and image URL export actions.
  - `viewerActions.ts` for zoom/pan modal state transitions.
- Keep pure tag/dataset logic in `app/utils/tagDataset.ts`; add helpers there when logic can be tested without DOM APIs.
- Keep browser file/image helpers in `app/utils/imageFiles.ts`; components should call typed composable actions instead of touching DOM file APIs directly.
- Keep config normalization in `app/utils/config.ts` and ZIP assembly in `app/utils/zipWriter.ts`.
- Store only lightweight config in `localStorage`. Do not persist images, blobs, object URLs, or prompt text history across sessions.
- Use `shallowRef` for large image collections and call `refreshImages()` after mutating image records.
- Avoid large files. Prefer extracting a component, utility, or action factory when a file grows beyond a single focused responsibility.

## Editing Model

- `image.tags` is the committed state.
- `image.editText` is the textarea draft.
- `commitOperation()` is the only path for committed tag/file mutations that should support undo/redo.
- Batch tools should build a list of image snapshots first, then commit one operation.
- Keep `ImageRecord`, `ImageSnapshot`, and `DatasetOperation` changes aligned. If a persisted or undoable field changes, update the snapshot type and history application logic together.
- Recalculate derived tag stats/autocomplete after committed dataset changes, and reset the visible render limit when filter inputs change.

## UI

- Prefer native controls and compact labels over custom widgets.
- Use Font Awesome via `AppIcon.vue` for icons. Do not add raw glyph/symbol icons directly in templates.
- Image-row action buttons and simple repeated actions such as undo, redo, clear, zoom, and close should be icon-only with `title` and `aria-label`.
- Reuse `TagField.vue` for tag-list textareas and `TagSetFields.vue` for the standard tag-set group.
- Keep row actions explicit: apply, undo, redo, original, remove.
- Avoid visible instructional copy in the app; use labels, placeholders, and button titles for context.
- Keep mobile and desktop layouts usable without overlapping controls.
- Keep CSS separated by concern in `app/assets/css`; update `nuxt.config.ts` when adding or removing stylesheet files. Current stylesheets are:
  - `base.css` for tokens, reset, body, and accessibility helpers.
  - `controls.css` for shared buttons, fields, pills, icons, and inline utility controls.
  - `layout.css` for app shell, topbar, quickbar, side panel, and dataset panel layout.
  - `stats.css` for tag-stat rows.
  - `image-rows.css` for image rows, editors, chips, and inline history.
  - `viewer.css` for the image preview overlay.
  - `responsive.css` for breakpoint-specific overrides.

## Build And Deploy

- Use `npm run build` before deployment checks.
- For behavior refactors, run `npm run build` before handing off. Documentation-only changes do not need a build.
- Production output must be `.output/public`.
- `.vercel`, `.output`, `.nuxt`, `dist`, and `node_modules` must stay out of git.
