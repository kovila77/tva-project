# Coding Guidelines

## Product Rules

- Keep the app static-only. Do not add server routes, Nitro server handlers, API endpoints, or functions.
- Treat local files as user-owned data. Import them as browser-owned copies, optionally cache those copies in IndexedDB for reload restore, and make every user-visible write an explicit download; never imply that source files are edited in place.
- Optimize for dataset editing speed: dense controls, low visual noise, lazy image loading, and bounded rendering for large folders.
- Every destructive or batch dataset mutation must be reversible through the shared undo/redo history.

## Architecture

- Use TypeScript for app code. Vue files must use `<script setup lang="ts">`; utilities, composables, and shared models should be `.ts`.
- Keep `ImageTaggerApp.client.vue` as the layout/provider shell only. It should provide the image tagger context, render the major app regions, and avoid owning feature logic.
- Put reusable UI in focused domain folders under `app/components`. Current folder boundaries are:
  - `app/` for the provider/layout shell, sticky app chrome, side/header panel toggles, and global undo/redo controls.
  - `core/` for the Font Awesome icon layer and reusable icon-only button primitive.
  - `dataset/` for the main dataset panel, image rows, row tag chips, and image viewer.
  - `filter/` for the sticky filter controls.
  - `settings/` for the settings modal, folder/config import/export, layout sizing, and section placement controls.
  - `tags/` for `TagField.vue`, tag-set fields, and tag statistics.
  - `tools/` for batch tools and other side/tab tools that mutate many images.
- Keep shared app contracts in `app/types/imageTagger.ts`; update those types before widening component or composable APIs.
- Keep the injected app context in `app/composables/useImageTagger.ts`. Components should consume that context with `useImageTaggerContext()` instead of duplicating state.
- Keep stateful action groups under `app/composables/imageTagger`:
  - `datasetActions.ts` for folder/config loading and image metadata lines.
  - `historyActions.ts` for snapshots, undo/redo, and reversible image removal.
  - `rowTagActions.ts` for per-row editor/tag-chip behavior.
  - `batchActions.ts` for multi-image mutations.
  - `filterActions.ts` for filter and render-window controls.
  - `exportActions.ts` for config, dataset ZIP, and image URL export actions.
  - `viewerActions.ts` for zoom/pan modal state transitions.
  - `settingModalActions.ts` for settings modal state and body scroll locking.
- Keep pure tag/dataset logic in `app/utils/tagDataset.ts`; add helpers there when logic can be tested without DOM APIs.
- Keep CodeMirror tag-editor token parsing, selection, completion, and decoration helpers in `app/utils/tagTextEditor.ts`.
- Keep browser file/image helpers in `app/utils/imageFiles.ts`; components should call typed composable actions instead of touching DOM file APIs directly.
- Keep config normalization in `app/utils/config.ts`, IndexedDB workspace persistence in `app/utils/datasetPersistence.ts`, the Font Awesome icon registry in `app/utils/icons.ts`, and ZIP assembly in `app/utils/zipWriter.ts`.
- Store only the lightweight editor config snapshot in `localStorage`.
- Persist the active uploaded-folder workspace in IndexedDB so a page reload restores current progress. Store image `File` blobs only in the IndexedDB file store, recreate object URLs after restore, and keep frequently changing tag/draft state separate from the blob cache.
- Do not persist object URLs or prompt text history across sessions.
- Use `shallowRef` for large image collections and call `refreshImages()` after mutating image records.
- Avoid large files. Prefer extracting a component, utility, or action factory when a file grows beyond a single focused responsibility.

## Editing Model

- `image.tags` is the committed state.
- `image.editText` is the tag editor draft.
- `image.draftDirty` is persisted for reload restoration, but it is not an undoable committed field; history application resets it after committed mutations.
- `commitOperation()` is the only path for committed tag/file mutations that should support undo/redo.
- `TagField.vue` owns editor-only draft history, selection detection, autocomplete, and token styling. This local history must not replace committed dataset undo/redo through `commitOperation()`.
- Batch tools should build a list of image snapshots first, then commit one operation.
- Keep record, persistence, and history types aligned by responsibility. If a field should survive reloads, update `PersistedImageState` and `datasetPersistence.ts`; if a field is undoable, update `ImageSnapshot`, `DatasetOperation`, and `historyActions.ts` together.
- Recalculate derived tag stats/autocomplete after committed dataset changes, and reset the visible render limit when filter inputs change.

## UI

- Prefer native controls and compact labels over custom widgets.
- Use Font Awesome via `AppIcon.vue` and `AppIconButton.vue` for icons. Add icon names to `app/utils/icons.ts` before using them, and do not add raw glyph/symbol icons directly in templates.
- Image-row action buttons and simple repeated actions such as undo, redo, clear, zoom, and close should be icon-only with `title` and `aria-label`.
- Keep image row sizing centralized in layout config. Image width modes are `compact` for the default thumbnail column, `fixed` for slider/manual width, and `flexible` for mouse-drag resizing that updates the shared row image width.
- Reuse `TagField.vue` for every tag-like text editor, including image tags, common/known/highlight/order tag sets, filters, and batch regex/tag lists.
- Configure `TagField.vue` with typed `TagTextStyleRule` rules for known/common/highlight/unknown/regex styling instead of hard-coding new editor-specific token styling.
- Prefer dataset-backed `autocompleteTags` for `TagField.vue` autocomplete. Disable autocomplete only when the field is not tag-completion friendly, such as regex-only inputs.
- Keep row actions explicit and icon-only: selected-tag filter/config actions, selected-tag removal, undo, redo, revert to original, and remove from memory.
- Keep visible instructional copy rare and concise. It is acceptable for destructive batch/export safety and empty states; otherwise prefer labels, placeholders, and button titles for context.
- Keep mobile and desktop layouts usable without overlapping controls.
- Use SCSS for styling.
- Keep global SCSS minimal. `app/assets/scss/base.scss` is for theme tokens, reset/body styles, accessibility helpers, app-wide density/corner modes, CodeMirror globals, and truly shared primitives such as buttons, controls, icons, pills, empty-inline text, and reusable tag-token state classes.
- Put component-owned styles in the owning Vue component with `<style scoped lang="scss">`.
- Use BEM class names for component styles. The block should match the component domain, such as `image-row`, `dataset-panel`, or `quick-controls`; use `__element` and `--modifier` classes for internal structure and state.
- Avoid adding new unscoped global selectors for component layout or view-specific styling unless they support an app-wide mode such as spacing or square corners. Use `:deep()` only when a scoped component must style child component internals, and `:global()` only for third-party DOM or generated classes such as CodeMirror token/tooltip classes.
- Update `nuxt.config.ts` only when adding or removing global SCSS entry files. Component-scoped SCSS should stay imported implicitly through the Vue component.

## Build And Deploy

- Use `npm run build` before deployment checks.
- For behavior refactors, run `npm run build` before handing off. Documentation-only changes do not need a build.
- Production output must be `.output/public`.
- `.nuxt`, `.vite`, `dist`, and `node_modules` must stay out of git.
