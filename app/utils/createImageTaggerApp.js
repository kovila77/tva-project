export function createImageTaggerApp(appRoot) {
            "use strict";

            if (!appRoot) {
                throw new Error("createImageTaggerApp requires a mount element.");
            }

            const managedEventListeners = [];
            let disposed = false;

            function addManagedEventListener(target, type, listener, options) {
                target.addEventListener(type, listener, options);
                managedEventListeners.push(() => target.removeEventListener(type, listener, options));
            }
            const storageKeys = {
                configCache: "simpleVersion.configCache",
                lastConfigName: "simpleVersion.lastConfigName",
                lastImagesName: "simpleVersion.lastImagesName",
                configBackupsAuto: "simpleVersion.configBackups.auto",
                configBackupsBtn: "simpleVersion.configBackups.btn"
            };
            const handleKeys = {
                configFile: "configFile",
                imagesDirectory: "imagesDirectory",
                configPickerStart: "configPickerStart",
                imagesPickerStart: "imagesPickerStart"
            };
            const originalTagsBackupRootName = "temp";
            const originalTagsBackupFolderName = "original_tags";
            const originalTagsBackupPath = `${originalTagsBackupRootName}/${originalTagsBackupFolderName}`;
            const tempConfigFolderName = "temp";
            const tempConfigFileName = "config-autosave.json";
            const tempConfigPath = `${tempConfigFolderName}/${tempConfigFileName}`;
            let logPersistTimer = 0;
            let logPersistPromise = Promise.resolve();

            const resizeResolutions = [
                "704x1408",
                "704x1344",
                "768x1344",
                "768x1280",
                "832x1216",
                "832x1152",
                "896x1152",
                "896x1088",
                "960x1088",
                "960x1024",
                "1024x960",
                "1024x1024",
                "1088x960",
                "1088x896",
                "1152x896",
                "1152x832",
                "1216x832",
                "1280x768",
                "1344x768",
                "1344x704",
                "1408x704",
                "1472x704",
                "1536x640",
                "1600x640",
                "1664x576"
            ].map((value) => {
                const parts = value.split("x").map(Number);
                return { width: parts[0], height: parts[1] };
            });

            const defaultHeaderSectionOrder = [
                "config",
                "filter",
                "common",
                "known",
                "highlighted-tags",
                "highlighted-text",
                "order",
                "scripts",
                "status"
            ];

            const state = {
                configFileHandle: null,
                configPickerHandle: null,
                imagesDirHandle: null,
                imagesPickerHandle: null,
                headerDragSectionId: "",
                configFilePath: "",
                configFileHandleName: "",
                imagesPath: "",
                imagesHandleName: "",
                images: [],
                tagFilter: "",
                commonTagsText: "",
                commonTags: [],
                commonTagsSet: new Set(),
                highlightedTagsText: "",
                highlightedTags: [],
                highlightedTagsSet: new Set(),
                knownTagsText: "",
                knownTags: [],
                knownTagsSet: new Set(),
                highlightedText: "",
                highlightedTexts: [],
                highlightedTextsSet: new Set(),
                orderOfTagsText: "",
                orderOfTags: [],
                isHeaderVisible: true,
                tagCounts: [],
                formattedTagsMap: new Map(),
                tagCountsGoodCount: 0,
                imageNumber: 0,
                autocompleteTags: [],
                scriptAddTagText: "",
                scriptRemoveTagsText: "",
                scriptRemoveTags: [],
                isConfigCollapsed1: false,
                isFilterCollapsed2: true,
                isCommonTagsCollapsed3: true,
                isKnownTagsCollapsed4: true,
                isHighlightedTagsCollapsed5: true,
                isHighlightedTextsCollapsed6: true,
                isOrderOfTagsCollapsed7: true,
                isStatusCollapsed8: false,
                isCollapsedAll: false,
                isFilterRegex: false,
                filterIgnoreCase: false,
                isCollapsedImages: false,
                isCollapsedTagStat: true,
                isCollapsedScripts: true,
                headerSectionOrder: [...defaultHeaderSectionOrder],
                configBackupCount: 10,
                backupFolderForTagsCount: 5,
                tagsStatisticsTableColumnsCount: 3,
                lastRecalc: 0,
                logs: [],
                logSessionFileName: "",
                logFilePath: "",
                tempConfigLoaded: false,
                statusMessage: "Ready",
                supportsFsAccess: typeof window.showDirectoryPicker === "function" && typeof window.showOpenFilePicker === "function",
                supportsSavePicker: typeof window.showSaveFilePicker === "function",
                supportsOpfs: Boolean(navigator.storage?.getDirectory),
                popupVisible: false,
                working: false,
                viewer: {
                    isOpen: false,
                    imageId: "",
                    scale: 1,
                    offsetX: 0,
                    offsetY: 0,
                    dragging: false,
                    dragStartX: 0,
                    dragStartY: 0,
                    pointerId: null
                }
            };

            const autocomplete = {
                activeEditor: null,
                activeImageId: null,
                suggestions: [],
                selectedIndex: 0,
                lastCommaPosition: 0,
                lastCaretPosition: 0
            };

            function getHeaderSectionDefinitions() {
                return [
                    { id: "config", label: "Cfg", icon: "gear", title: "Toggle configuration panel", action: "toggle-config", stateKey: "isConfigCollapsed1" },
                    { id: "filter", label: "Flt", icon: "filter", title: "Toggle filter settings panel", action: "toggle-filter-panel", stateKey: "isFilterCollapsed2" },
                    { id: "common", label: "Com", icon: "stack", title: "Toggle common tags panel", action: "toggle-common-panel", stateKey: "isCommonTagsCollapsed3" },
                    { id: "known", label: "Kno", icon: "bookmark", title: "Toggle known tags panel", action: "toggle-known-panel", stateKey: "isKnownTagsCollapsed4" },
                    { id: "highlighted-tags", label: "Hi", icon: "spark", title: "Toggle highlighted tags panel", action: "toggle-highlighted-tags-panel", stateKey: "isHighlightedTagsCollapsed5" },
                    { id: "highlighted-text", label: "Txt", icon: "type", title: "Toggle highlighted text panel", action: "toggle-highlighted-text-panel", stateKey: "isHighlightedTextsCollapsed6" },
                    { id: "order", label: "Ord", icon: "sort", title: "Toggle tag ordering panel", action: "toggle-order-panel", stateKey: "isOrderOfTagsCollapsed7" },
                    { id: "scripts", label: "Scr", icon: "wrench", title: "Toggle scripts panel", action: "toggle-scripts-panel", stateKey: "isCollapsedScripts" },
                    { id: "status", label: "Log", icon: "chart", title: "Toggle status and logs panel", action: "toggle-status-panel", stateKey: "isStatusCollapsed8" }
                ];
            }

            function normalizeHeaderSectionOrder(order) {
                const validIds = new Set(defaultHeaderSectionOrder);
                const result = [];
                for (const item of Array.isArray(order) ? order : []) {
                    if (validIds.has(item) && !result.includes(item)) {
                        result.push(item);
                    }
                }

                for (const item of defaultHeaderSectionOrder) {
                    if (!result.includes(item)) {
                        result.push(item);
                    }
                }

                return result;
            }

            function getHeaderSectionMeta(sectionId) {
                return getHeaderSectionDefinitions().find((section) => section.id === sectionId) ?? null;
            }

            function isHeaderSectionCollapsed(sectionId) {
                const section = getHeaderSectionMeta(sectionId);
                if (!section) {
                    return true;
                }

                return Boolean(state[section.stateKey]);
            }

            function setHeaderSectionCollapsed(sectionId, collapsed) {
                const section = getHeaderSectionMeta(sectionId);
                if (!section) {
                    return;
                }

                state[section.stateKey] = Boolean(collapsed);
            }

            function syncCollapsedAllState() {
                state.isCollapsedAll = getHeaderSectionDefinitions().every((section) => Boolean(state[section.stateKey]));
            }

            function moveHeaderSection(sectionId, targetId, insertBefore) {
                if (!sectionId || !targetId || sectionId === targetId) {
                    return false;
                }

                const ordered = [...normalizeHeaderSectionOrder(state.headerSectionOrder)];
                const sourceIndex = ordered.indexOf(sectionId);
                const targetIndex = ordered.indexOf(targetId);
                if (sourceIndex < 0 || targetIndex < 0) {
                    return false;
                }

                ordered.splice(sourceIndex, 1);
                const nextTargetIndex = ordered.indexOf(targetId);
                ordered.splice(insertBefore ? nextTargetIndex : nextTargetIndex + 1, 0, sectionId);
                state.headerSectionOrder = ordered;
                return true;
            }

            function clearHeaderDragMarkers() {
                for (const element of document.querySelectorAll(".header-tab.dragging, .header-tab.drop-before, .header-tab.drop-after")) {
                    element.classList.remove("dragging", "drop-before", "drop-after");
                }
            }

            function getEditableText(element) {
                return String(element?.innerText ?? "")
                    .replace(/\u00A0/g, " ")
                    .replace(/\r/g, "")
                    .trim();
            }

            async function commitRichTextField(target) {
                if (!target?.dataset?.textFieldId) {
                    return false;
                }

                const value = getEditableText(target);
                switch (target.dataset.textFieldId) {
                    case "tag-filter":
                        state.tagFilter = value;
                        await saveConfiguration({});
                        render();
                        return true;
                    case "common-tags":
                        await onCommonTagsTextChanged(value);
                        return true;
                    case "known-tags":
                        await onKnownTagsTextChanged(value);
                        return true;
                    case "highlighted-tags":
                        await onHighlightedTagsTextChanged(value);
                        return true;
                    case "highlighted-text":
                        await onHighlightedTextChanged(value);
                        return true;
                    case "order-tags":
                        await onOrderedTagsTextChanged(value);
                        return true;
                    case "script-remove-tags":
                        await onScriptRemoveTagsChanged(value);
                        return true;
                    case "script-add-tag":
                        state.scriptAddTagText = value;
                        render();
                        return true;
                    default:
                        return false;
                }
            }

            function captureSelectedTagForButton(button) {
                const imageId = button?.dataset.imageId ?? "";
                if (!imageId) {
                    return;
                }

                const image = getImageById(imageId);
                const editor = document.querySelector(`[data-editor-image-id="${imageId}"]`);
                if (!image || !editor) {
                    return;
                }

                const selectedTag = getCurrentTagFromEditor(editor);
                if (selectedTag) {
                    image.selectedTag = selectedTag;
                    syncSelectedTagField(imageId);
                }
            }

            function syncImageDraftFromEditor(image) {
                if (!image) {
                    return;
                }

                const editor = document.querySelector(`[data-editor-image-id="${image.id}"]`);
                if (!editor) {
                    return;
                }

                const nextTags = toTags(editor.innerText);
                const nextJoined = nextTags.join("\n");
                const currentJoined = image.tags.join("\n");
                if (nextJoined !== currentJoined) {
                    image.tags = nextTags;
                    image.isChanged = true;
                    image.isSaved = false;
                    highlightTags(image);
                }

                const selectedTag = getCurrentTagFromEditor(editor);
                if (selectedTag) {
                    image.selectedTag = selectedTag;
                }
            }

            function escapeHtml(value) {
                return String(value ?? "")
                    .replace(/&/g, "&amp;")
                    .replace(/</g, "&lt;")
                    .replace(/>/g, "&gt;")
                    .replace(/"/g, "&quot;")
                    .replace(/'/g, "&#39;");
            }

            function includesCI(list, value) {
                const target = String(value ?? "").toLowerCase();
                return list.some((item) => String(item).toLowerCase() === target);
            }

            function distinctCI(list) {
                const seen = new Set();
                const result = [];
                for (const item of list) {
                    const key = item.toLowerCase();
                    if (seen.has(key)) {
                        continue;
                    }
                    seen.add(key);
                    result.push(item);
                }
                return result;
            }

            function toTags(text, distinct = true) {
                if (!text) {
                    return [];
                }

                const tags = String(text)
                    .split(/[,\n]/)
                    .map((tag) => tag.trim())
                    .filter(Boolean);

                return distinct ? distinctCI(tags) : tags;
            }

            function toTagFormat(text, formatter, distinct = true) {
                return toTags(text, distinct).map((tag) => ({
                    tag,
                    formatted: formatter(tag)
                }));
            }

            function setStatus(message) {
                state.statusMessage = message;
                refreshStatusPanel();
            }

            function log(message) {
                const now = new Date();
                const stamp = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
                state.logs.push({ stamp, iso: now.toISOString(), message });
                if (state.logs.length > 400) {
                    state.logs.shift();
                }
                setStatus(message);
                console.log(message);
                scheduleLogPersist();
            }

            function formatFileStamp(date = new Date()) {
                return date
                    .toISOString()
                    .replace(/[:.]/g, "-")
                    .replace("T", "_")
                    .slice(0, 19);
            }

            function firstNonEmptyString(values) {
                for (const value of values) {
                    if (typeof value === "string" && value.trim()) {
                        return value.trim();
                    }
                }

                return "";
            }

            function getPathBaseName(value) {
                return String(value ?? "")
                    .split(/[\\/]/)
                    .filter(Boolean)
                    .pop() ?? "";
            }

            function normalizePathForCompare(value) {
                return String(value ?? "")
                    .trim()
                    .replace(/\//g, "\\")
                    .toLowerCase();
            }

            function isAbsolutePath(value) {
                const text = String(value ?? "").trim();
                if (!text) {
                    return false;
                }

                return /^[A-Za-z]:[\\/]/.test(text) || /^\\\\[^\\]/.test(text) || /^\/(?!\/)/.test(text) || /^file:\/\//i.test(text);
            }

            function pathsMatchForStoredHandle(candidate, target) {
                const candidateText = String(candidate ?? "").trim();
                const targetText = String(target ?? "").trim();
                if (!candidateText || !targetText) {
                    return false;
                }

                if (normalizePathForCompare(candidateText) === normalizePathForCompare(targetText)) {
                    return true;
                }

                if (!isAbsolutePath(targetText)) {
                    return getPathBaseName(candidateText).toLowerCase() === getPathBaseName(targetText).toLowerCase();
                }

                return false;
            }

            function getPathHandleKey(kind, path) {
                const normalized = normalizePathForCompare(path);
                if (!normalized || !isAbsolutePath(path)) {
                    return "";
                }

                return `path:${kind}:${normalized}`;
            }

            function getConfigPathValidationErrors() {
                const errors = [];
                if (!isAbsolutePath(state.configFilePath)) {
                    errors.push("Config file path");
                }
                if (!isAbsolutePath(state.imagesPath)) {
                    errors.push("Images folder path");
                }
                return errors;
            }

            function normalizeStoredPathValue(value) {
                const text = String(value ?? "").trim();
                return isAbsolutePath(text) ? text : "";
            }

            function normalizeStoredHandleName(value) {
                return String(value ?? "").trim();
            }

            function getStoredLocationDisplay(path, handleName) {
                const fullPath = String(path ?? "").trim();
                if (fullPath) {
                    return fullPath;
                }

                const label = normalizeStoredHandleName(handleName);
                return label ? `<${label}>` : "-";
            }

            function getPathFieldPlaceholder(handleName, fallbackValue) {
                const label = normalizeStoredHandleName(handleName);
                return label ? `<${label}>` : fallbackValue;
            }

            function getPathFieldTitle(handleName) {
                const label = normalizeStoredHandleName(handleName);
                return label
                    ? `Enter full path here to store it in the config. Browser label: ${label}`
                    : "Enter full path here to store it in the config.";
            }

            function handleNameMatchesStoredLabel(handle, desiredHandleName) {
                const target = normalizeStoredHandleName(desiredHandleName).toLowerCase();
                if (!target) {
                    return false;
                }

                return String(handle?.name ?? "").trim().toLowerCase() === target;
            }

            async function getHandleDisplayPath(handle) {
                if (!handle) {
                    return "";
                }

                const directPath = firstNonEmptyString([
                    handle.path,
                    handle.fullPath,
                    handle.relativePath
                ]);
                if (directPath) {
                    return directPath;
                }

                if (handle.kind === "file" && typeof handle.getFile === "function") {
                    try {
                        const file = await handle.getFile();
                        const filePath = firstNonEmptyString([
                            file.path,
                            file.fullPath,
                            file.webkitRelativePath
                        ]);
                        if (filePath) {
                            return filePath;
                        }
                    } catch (error) {
                        console.warn("Could not resolve file display path", error);
                    }
                }

                return String(handle.name ?? "");
            }

            async function syncConfigPathFromHandle(handle, preserveTypedPath = false) {
                if (!handle) {
                    state.configFileHandleName = "";
                    state.configFilePath = "";
                    return;
                }

                state.configFileHandleName = normalizeStoredHandleName(handle.name);
                const resolvedPath = normalizeStoredPathValue(await getHandleDisplayPath(handle));
                const currentPath = normalizeStoredPathValue(state.configFilePath);
                const currentBaseName = getPathBaseName(currentPath);
                if (resolvedPath) {
                    state.configFilePath = resolvedPath;
                    return;
                }

                if (preserveTypedPath && currentPath && currentBaseName.toLowerCase() === state.configFileHandleName.toLowerCase()) {
                    state.configFilePath = currentPath;
                    return;
                }

                state.configFilePath = "";
            }

            async function syncImagesPathFromHandle(handle, preserveTypedPath = false) {
                if (!handle) {
                    state.imagesHandleName = "";
                    state.imagesPath = "";
                    return;
                }

                state.imagesHandleName = normalizeStoredHandleName(handle.name);
                const resolvedPath = normalizeStoredPathValue(await getHandleDisplayPath(handle));
                const currentPath = normalizeStoredPathValue(state.imagesPath);
                const currentBaseName = getPathBaseName(currentPath);
                if (resolvedPath) {
                    state.imagesPath = resolvedPath;
                    return;
                }

                if (preserveTypedPath && currentPath && currentBaseName.toLowerCase() === state.imagesHandleName.toLowerCase()) {
                    state.imagesPath = currentPath;
                    return;
                }

                state.imagesPath = "";
            }

            function resetLogSessionForCurrentFolder() {
                if (!state.imagesDirHandle) {
                    state.logSessionFileName = "";
                    state.logFilePath = "";
                    return;
                }

                state.logSessionFileName = `session_${formatFileStamp()}.log`;
                state.logFilePath = `_logs/${state.logSessionFileName}`;
            }

            function buildLogFileText() {
                return [
                    `Generated: ${new Date().toISOString()}`,
                    `Config: ${getStoredLocationDisplay(state.configFilePath, state.configFileHandleName)}`,
                    `Images: ${getStoredLocationDisplay(state.imagesPath, state.imagesHandleName)}`,
                    `Status: ${state.statusMessage || "-"}`,
                    "",
                    ...state.logs.map((entry) => `[${entry.iso ?? entry.stamp ?? ""}] ${entry.message}`)
                ].join("\n");
            }

            async function hasGrantedPermission(handle, mode = "readwrite") {
                if (!handle || typeof handle.queryPermission !== "function") {
                    return false;
                }

                try {
                    return await handle.queryPermission({ mode }) === "granted";
                } catch (error) {
                    return false;
                }
            }

            async function ensureLogFileHandle() {
                if (!state.imagesDirHandle) {
                    return null;
                }

                if (!await hasGrantedPermission(state.imagesDirHandle, "readwrite")) {
                    return null;
                }

                if (!state.logSessionFileName) {
                    resetLogSessionForCurrentFolder();
                }

                if (!state.logSessionFileName) {
                    return null;
                }

                const logsDir = await state.imagesDirHandle.getDirectoryHandle("_logs", { create: true });
                return await logsDir.getFileHandle(state.logSessionFileName, { create: true });
            }

            async function persistLogsNow() {
                try {
                    const logHandle = await ensureLogFileHandle();
                    if (!logHandle) {
                        return;
                    }

                    await writeToFileHandle(logHandle, buildLogFileText());
                } catch (error) {
                    console.warn("Could not persist session logs", error);
                }
            }

            function scheduleLogPersist() {
                if (logPersistTimer) {
                    return;
                }

                logPersistTimer = window.setTimeout(() => {
                    logPersistTimer = 0;
                    logPersistPromise = logPersistPromise
                        .catch(() => undefined)
                        .then(() => persistLogsNow());
                }, 250);
            }

            function getPreferredConfigPickerHandle() {
                return state.configFileHandle ?? state.configPickerHandle ?? state.imagesDirHandle ?? state.imagesPickerHandle ?? null;
            }

            function getPreferredImagesPickerHandle() {
                return state.imagesDirHandle ?? state.imagesPickerHandle ?? state.configFileHandle ?? state.configPickerHandle ?? null;
            }

            async function runPicker(pickerFn, options, startHandle = null) {
                const optionsWithStart = startHandle ? { ...options, startIn: startHandle } : options;

                try {
                    return await pickerFn(optionsWithStart);
                } catch (error) {
                    if (startHandle && error && (error.name === "DataError" || error.name === "NotFoundError" || error.name === "TypeError")) {
                        return await pickerFn(options);
                    }
                    throw error;
                }
            }

            function getActionStartMessage(action, button, image, tag) {
                switch (action) {
                    case "select-config-file":
                        return "Opening configuration file picker...";
                    case "load-config":
                        return "Loading configuration file...";
                    case "save-config":
                        return "Saving configuration to the original file...";
                    case "download-config":
                        return "Preparing config download...";
                    case "unload-all":
                        return "Unloading current configuration and dataset...";
                    case "select-folder":
                        return "Opening images folder picker...";
                    case "load-images":
                        return "Loading images folder...";
                    case "filter-images":
                        return "Applying image filter...";
                    case "anti-filter-images":
                        return "Applying inverse image filter...";
                    case "show-all-images":
                        return "Showing all loaded images...";
                    case "clear-filter":
                        return "Clearing current filter...";
                    case "open-stat-panel":
                        return "Recalculating tag statistics...";
                    case "recalc-tags":
                        return "Rebuilding autocomplete tags...";
                    case "save-tags":
                        return image ? `Saving tags for ${image.fileName}...` : "Saving tags...";
                    case "undo-tags":
                        return image ? `Restoring original tags for ${image.fileName}...` : "Restoring original tags...";
                    case "open-image":
                        return image ? `Opening ${image.fileName} in the page viewer...` : "Opening image in the page viewer...";
                    case "copy-image-url":
                        return image ? `Copying temporary viewer URL for ${image.fileName}...` : "Copying temporary viewer URL...";
                    case "remove-image":
                        return image ? `Moving ${image.fileName} to __removed...` : "Removing selected image...";
                    case "replace-artist":
                        return "Replacing artist:* tags across loaded prompts...";
                    case "add-tag-to-filtered":
                        return "Adding tag to visible prompts...";
                    case "execute-tags-filter":
                        return "Running regex cleanup across loaded prompts...";
                    case "rename-files":
                        return "Renaming files in the current order...";
                    case "image-process":
                        return "Creating resized images in __output...";
                    case "filter-tag":
                        return tag ? `Filtering by tag "${tag}"...` : "Filtering by selected tag...";
                    case "add-to-filter":
                        return tag ? `Adding "${tag}" to the filter...` : "Adding selected tag to the filter...";
                    case "add-to-common":
                        return tag ? `Adding "${tag}" to common tags...` : "Adding selected tag to common tags...";
                    case "add-to-known":
                        return tag ? `Adding "${tag}" to known tags...` : "Adding selected tag to known tags...";
                    case "add-to-highlighted-tags":
                        return tag ? `Adding "${tag}" to highlighted tags...` : "Adding selected tag to highlighted tags...";
                    case "add-to-highlighted-texts":
                        return tag ? `Adding "${tag}" to highlighted text filters...` : "Adding selected tag to highlighted text filters...";
                    case "remove-from-all":
                        return tag ? `Removing "${tag}" from all loaded prompts...` : "Removing selected tag from all loaded prompts...";
                    default:
                        return button?.title ? `${button.title}.` : "";
                }
            }

            function createImageId(index) {
                return `image-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`;
            }

            function getImageById(id) {
                return state.images.find((image) => image.id === id) ?? null;
            }

            function clamp(value, min, max) {
                return Math.min(max, Math.max(min, value));
            }

            function getViewerImage() {
                return getImageById(state.viewer.imageId);
            }

            function syncViewerTransform() {
                const image = document.getElementById("image-viewer-image");
                const viewport = document.getElementById("image-viewer-viewport");
                const scaleLabel = document.getElementById("image-viewer-scale");
                if (!image || !viewport || !state.viewer.isOpen) {
                    document.body.style.overflow = "";
                    return;
                }

                image.style.transform = `translate(${state.viewer.offsetX}px, ${state.viewer.offsetY}px) scale(${state.viewer.scale})`;
                viewport.classList.toggle("dragging", state.viewer.dragging);
                if (scaleLabel) {
                    scaleLabel.textContent = `${Math.round(state.viewer.scale * 100)}%`;
                }
                document.body.style.overflow = "hidden";
            }

            function resetViewerTransform() {
                state.viewer.scale = 1;
                state.viewer.offsetX = 0;
                state.viewer.offsetY = 0;
                syncViewerTransform();
            }

            function closeImageViewer() {
                state.viewer.isOpen = false;
                state.viewer.imageId = "";
                state.viewer.dragging = false;
                state.viewer.pointerId = null;
                document.body.style.overflow = "";
                render();
            }

            function openImageViewer(image) {
                if (!image) {
                    return;
                }

                state.viewer.isOpen = true;
                state.viewer.imageId = image.id;
                state.viewer.scale = 1;
                state.viewer.offsetX = 0;
                state.viewer.offsetY = 0;
                state.viewer.dragging = false;
                state.viewer.pointerId = null;
                log(`Opened ${image.fileName} in the page viewer.`);
                render();
                syncViewerTransform();
            }

            function zoomImageViewer(multiplier, clientX, clientY) {
                if (!state.viewer.isOpen) {
                    return;
                }

                const viewport = document.getElementById("image-viewer-viewport");
                if (!viewport) {
                    return;
                }

                const oldScale = state.viewer.scale;
                const newScale = clamp(oldScale * multiplier, 0.2, 12);
                if (newScale === oldScale) {
                    return;
                }

                const rect = viewport.getBoundingClientRect();
                const pointX = clientX === undefined ? 0 : clientX - rect.left - rect.width / 2;
                const pointY = clientY === undefined ? 0 : clientY - rect.top - rect.height / 2;
                const ratio = newScale / oldScale;

                state.viewer.offsetX = pointX - (pointX - state.viewer.offsetX) * ratio;
                state.viewer.offsetY = pointY - (pointY - state.viewer.offsetY) * ratio;
                state.viewer.scale = newScale;
                syncViewerTransform();
            }

            function startViewerDrag(event) {
                if (!state.viewer.isOpen || event.button !== 0) {
                    return;
                }

                state.viewer.dragging = true;
                state.viewer.pointerId = event.pointerId ?? null;
                state.viewer.dragStartX = event.clientX - state.viewer.offsetX;
                state.viewer.dragStartY = event.clientY - state.viewer.offsetY;
                syncViewerTransform();
            }

            function updateViewerDrag(event) {
                if (!state.viewer.dragging) {
                    return;
                }

                if (state.viewer.pointerId !== null && event.pointerId !== undefined && state.viewer.pointerId !== event.pointerId) {
                    return;
                }

                state.viewer.offsetX = event.clientX - state.viewer.dragStartX;
                state.viewer.offsetY = event.clientY - state.viewer.dragStartY;
                syncViewerTransform();
            }

            function stopViewerDrag() {
                if (!state.viewer.dragging) {
                    return;
                }

                state.viewer.dragging = false;
                state.viewer.pointerId = null;
                syncViewerTransform();
            }

            function getOrderedTagsList(tags) {
                if (!state.orderOfTags.length) {
                    return [...tags];
                }

                const ordered = [];
                const used = new Set();

                for (const preferred of state.orderOfTags) {
                    const found = tags.find((tag) => tag.toLowerCase() === preferred.toLowerCase());
                    if (found) {
                        ordered.push(found);
                        used.add(found.toLowerCase());
                    }
                }

                for (const tag of tags) {
                    if (!used.has(tag.toLowerCase())) {
                        ordered.push(tag);
                    }
                }

                return ordered;
            }

            function syncSelectedTagField(imageId) {
                const image = getImageById(imageId);
                const field = document.querySelector(`[data-selected-tag-image-id="${imageId}"]`);
                if (!image || !field) {
                    return;
                }

                field.innerHTML = highlightEditorText(image.selectedTag ?? "");
                field.classList.toggle("collapsed", !image.selectedTag);
            }

            function getSelectedTextWithin(element) {
                const selection = window.getSelection();
                if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
                    return "";
                }

                const range = selection.getRangeAt(0);
                if (!element.contains(range.commonAncestorContainer)) {
                    return "";
                }

                return selection.toString().replace(/\s+/g, " ").trim();
            }

            function normalizeSelectedTagText(text) {
                return String(text ?? "")
                    .replace(/^,\s*/, "")
                    .replace(/\s*,?\s*$/, "")
                    .trim();
            }

            function getCurrentTagFromEditor(editor) {
                const selectedText = normalizeSelectedTagText(getSelectedTextWithin(editor));
                if (selectedText && !selectedText.includes(",")) {
                    return selectedText;
                }

                const caretPosition = getCaretPosition(editor);
                return getWordAtCaret(editor, caretPosition);
            }

            function renderIcon(name) {
                const icons = {
                    gear: '<svg viewBox="0 0 24 24" class="icon-svg" aria-hidden="true"><path d="M12 3v3"></path><path d="M12 18v3"></path><path d="m4.93 4.93 2.12 2.12"></path><path d="m16.95 16.95 2.12 2.12"></path><path d="M3 12h3"></path><path d="M18 12h3"></path><path d="m4.93 19.07 2.12-2.12"></path><path d="m16.95 7.05 2.12-2.12"></path><circle cx="12" cy="12" r="4"></circle></svg>',
                    filter: '<svg viewBox="0 0 24 24" class="icon-svg" aria-hidden="true"><path d="M4 5h16"></path><path d="M7 12h10"></path><path d="M10 19h4"></path></svg>',
                    stack: '<svg viewBox="0 0 24 24" class="icon-svg" aria-hidden="true"><path d="m12 4 8 4-8 4-8-4 8-4Z"></path><path d="m4 12 8 4 8-4"></path><path d="m4 16 8 4 8-4"></path></svg>',
                    bookmark: '<svg viewBox="0 0 24 24" class="icon-svg" aria-hidden="true"><path d="M7 4h10v16l-5-3-5 3V4Z"></path></svg>',
                    spark: '<svg viewBox="0 0 24 24" class="icon-svg" aria-hidden="true"><path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z"></path></svg>',
                    type: '<svg viewBox="0 0 24 24" class="icon-svg" aria-hidden="true"><path d="M4 7V5h16v2"></path><path d="M12 5v14"></path><path d="M8 19h8"></path></svg>',
                    sort: '<svg viewBox="0 0 24 24" class="icon-svg" aria-hidden="true"><path d="M7 6h10"></path><path d="M7 12h7"></path><path d="M7 18h4"></path></svg>',
                    grid: '<svg viewBox="0 0 24 24" class="icon-svg" aria-hidden="true"><rect x="4" y="4" width="6" height="6"></rect><rect x="14" y="4" width="6" height="6"></rect><rect x="4" y="14" width="6" height="6"></rect><rect x="14" y="14" width="6" height="6"></rect></svg>',
                    chart: '<svg viewBox="0 0 24 24" class="icon-svg" aria-hidden="true"><path d="M4 20V10"></path><path d="M10 20V4"></path><path d="M16 20v-7"></path><path d="M22 20v-11"></path></svg>',
                    wrench: '<svg viewBox="0 0 24 24" class="icon-svg" aria-hidden="true"><path d="m14 7 3-3 3 3-3 3"></path><path d="M4 20 14 10"></path><path d="m11 13 3 3"></path></svg>',
                    file: '<svg viewBox="0 0 24 24" class="icon-svg" aria-hidden="true"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z"></path><path d="M14 3v5h5"></path></svg>',
                    folder: '<svg viewBox="0 0 24 24" class="icon-svg" aria-hidden="true"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z"></path></svg>',
                    save: '<svg viewBox="0 0 24 24" class="icon-svg" aria-hidden="true"><path d="M5 4h11l3 3v13H5Z"></path><path d="M9 4v5h6"></path><path d="M9 20v-6h6v6"></path></svg>',
                    load: '<svg viewBox="0 0 24 24" class="icon-svg" aria-hidden="true"><path d="M12 3v12"></path><path d="m7 10 5 5 5-5"></path><path d="M5 20h14"></path></svg>',
                    regex: '<svg viewBox="0 0 24 24" class="icon-svg" aria-hidden="true"><path d="M6 18 18 6"></path><path d="m8 8 3-3"></path><path d="m13 19 3-3"></path></svg>',
                    case: '<svg viewBox="0 0 24 24" class="icon-svg" aria-hidden="true"><path d="M5 19 9 5l4 14"></path><path d="M6.5 14h5"></path><path d="M17 18c-1.7 0-3-1.3-3-3s1.3-3 3-3 3 1.3 3 3-1.3 3-3 3Z"></path></svg>',
                    search: '<svg viewBox="0 0 24 24" class="icon-svg" aria-hidden="true"><circle cx="11" cy="11" r="6"></circle><path d="m20 20-4.2-4.2"></path></svg>',
                    eye: '<svg viewBox="0 0 24 24" class="icon-svg" aria-hidden="true"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"></path><circle cx="12" cy="12" r="2.5"></circle></svg>',
                    eyeOff: '<svg viewBox="0 0 24 24" class="icon-svg" aria-hidden="true"><path d="m3 3 18 18"></path><path d="M10.6 10.6A2 2 0 0 0 10 12a2 2 0 0 0 3.4 1.4"></path><path d="M9.9 5.1A11.2 11.2 0 0 1 12 5c6.5 0 10 7 10 7a18.9 18.9 0 0 1-3 3.8"></path><path d="M6.2 6.2C3.5 8 2 12 2 12a19.1 19.1 0 0 0 8.3 5.7"></path></svg>',
                    refresh: '<svg viewBox="0 0 24 24" class="icon-svg" aria-hidden="true"><path d="M21 12a9 9 0 1 1-2.64-6.36"></path><path d="M21 3v6h-6"></path></svg>',
                    undo: '<svg viewBox="0 0 24 24" class="icon-svg" aria-hidden="true"><path d="M9 9 4 12l5 3"></path><path d="M20 18a7 7 0 0 0-7-7H4"></path></svg>',
                    jump: '<svg viewBox="0 0 24 24" class="icon-svg" aria-hidden="true"><path d="M5 12h14"></path><path d="m13 6 6 6-6 6"></path></svg>',
                    hide: '<svg viewBox="0 0 24 24" class="icon-svg" aria-hidden="true"><path d="M4 12h16"></path><path d="M12 4v16"></path></svg>',
                    show: '<svg viewBox="0 0 24 24" class="icon-svg" aria-hidden="true"><path d="M4 12h16"></path></svg>',
                    plus: '<svg viewBox="0 0 24 24" class="icon-svg" aria-hidden="true"><path d="M12 5v14"></path><path d="M5 12h14"></path></svg>',
                    minus: '<svg viewBox="0 0 24 24" class="icon-svg" aria-hidden="true"><path d="M5 12h14"></path></svg>',
                    open: '<svg viewBox="0 0 24 24" class="icon-svg" aria-hidden="true"><path d="M14 4h6v6"></path><path d="M10 14 20 4"></path><path d="M20 14v6H4V4h6"></path></svg>',
                    trash: '<svg viewBox="0 0 24 24" class="icon-svg" aria-hidden="true"><path d="M4 7h16"></path><path d="M10 11v6"></path><path d="M14 11v6"></path><path d="M6 7l1 13h10l1-13"></path><path d="M9 7V4h6v3"></path></svg>',
                    pencil: '<svg viewBox="0 0 24 24" class="icon-svg" aria-hidden="true"><path d="m4 20 4.5-1 9-9-3.5-3.5-9 9L4 20Z"></path><path d="m13.5 6.5 3.5 3.5"></path></svg>',
                    replace: '<svg viewBox="0 0 24 24" class="icon-svg" aria-hidden="true"><path d="M4 7h11"></path><path d="m11 3 4 4-4 4"></path><path d="M20 17H9"></path><path d="m13 21-4-4 4-4"></path></svg>',
                    image: '<svg viewBox="0 0 24 24" class="icon-svg" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"></rect><circle cx="9" cy="10" r="1.5"></circle><path d="m21 16-5-5-7 7"></path></svg>',
                    resize: '<svg viewBox="0 0 24 24" class="icon-svg" aria-hidden="true"><path d="M4 9V4h5"></path><path d="M20 15v5h-5"></path><path d="M4 4l7 7"></path><path d="m20 20-7-7"></path></svg>',
                    wand: '<svg viewBox="0 0 24 24" class="icon-svg" aria-hidden="true"><path d="m4 20 10-10"></path><path d="m14 4 1 3"></path><path d="m19 9 3 1"></path><path d="m17 2 1 2"></path><path d="m20 5 2 1"></path></svg>',
                    check: '<svg viewBox="0 0 24 24" class="icon-svg" aria-hidden="true"><path d="m5 12 4 4 10-10"></path></svg>',
                    x: '<svg viewBox="0 0 24 24" class="icon-svg" aria-hidden="true"><path d="m6 6 12 12"></path><path d="M18 6 6 18"></path></svg>'
                };

                return icons[name] ?? icons.check;
            }

            function renderActionButton({ action, title, icon, label = "", variant = "", small = false, iconOnly = false, active = false, disabled = false, draggable = false, data = {}, extraClass = "" }) {
                const attrs = Object.entries(data)
                    .filter(([, value]) => value !== undefined && value !== null && value !== "")
                    .map(([key, value]) => {
                        const attrName = key.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`);
                        return `data-${attrName}="${escapeHtml(String(value))}"`;
                    })
                    .join(" ");
                const classes = ["btn", variant, small ? "btn-sm" : "", iconOnly ? "btn-icon" : "", active ? "active" : "", extraClass]
                    .filter(Boolean)
                    .join(" ");

                return `
                    <button
                        type="button"
                        class="${classes}"
                        data-action="${escapeHtml(action)}"
                        title="${escapeHtml(title)}"
                        aria-label="${escapeHtml(title)}"
                        ${draggable ? 'draggable="true"' : ""}
                        ${attrs}
                        ${disabled ? "disabled" : ""}
                    >
                        ${renderIcon(icon)}
                        ${label ? `<span class="btn-label">${escapeHtml(label)}</span>` : ""}
                    </button>
                `;
            }

            function renderRichTextField({ id = "", value = "", placeholder = "", fieldKey = "", imageId = "", small = false, singleLine = false, readonly = false, extraClass = "" }) {
                const classes = ["rich-text-field", small ? "small" : "", singleLine ? "single-line" : "", readonly ? "readonly-display" : "", extraClass]
                    .filter(Boolean)
                    .join(" ");
                const attrs = [
                    id ? `id="${escapeHtml(id)}"` : "",
                    fieldKey ? `data-text-field-id="${escapeHtml(fieldKey)}"` : "",
                    imageId ? `data-selected-tag-image-id="${escapeHtml(imageId)}"` : "",
                    `data-placeholder="${escapeHtml(placeholder)}"`,
                    readonly ? 'data-readonly-field="true"' : "",
                    readonly ? 'tabindex="0"' : 'contenteditable="true" spellcheck="false"'
                ].filter(Boolean).join(" ");

                return `
                    <div class="${classes}" ${attrs}>${readonly ? (value || '<span class="dim">No tags.</span>') : value}</div>
                `;
            }

            function setMainSection(section) {
                state.isCollapsedImages = section !== "images";
                state.isCollapsedTagStat = section !== "stats";
            }

            function reconcileMainSectionsFromConfig(config) {
                const hasStats = config.isCollapsedTagStat === false;
                const hasImages = config.isCollapsedImages === false;

                if (hasStats) {
                    setMainSection("stats");
                    return;
                }
                if (hasImages) {
                    setMainSection("images");
                    return;
                }

                setMainSection("images");
            }

            function configSnapshot() {
                return {
                    imagesPath: state.imagesPath,
                    imagesFolderPath: state.imagesPath,
                    imagesFolderName: state.imagesHandleName || getPathBaseName(state.imagesPath),
                    imagesFolderHandleName: state.imagesHandleName,
                    tagFilter: state.tagFilter,
                    commonTagsText: state.commonTagsText,
                    highlightedTagsText: state.highlightedTagsText,
                    knownTagsText: state.knownTagsText,
                    highlightedText: state.highlightedText,
                    orderOfTags: state.orderOfTagsText,
                    scriptRemoveTags: state.scriptRemoveTagsText,
                    configFilePath: state.configFilePath,
                    configFileName: state.configFileHandleName || getPathBaseName(state.configFilePath),
                    configFileHandleName: state.configFileHandleName,
                    isConfigCollapsed1: state.isConfigCollapsed1,
                    isFilterCollapsed2: state.isFilterCollapsed2,
                    isCommonTagsCollapsed3: state.isCommonTagsCollapsed3,
                    isKnownTagsCollapsed4: state.isKnownTagsCollapsed4,
                    isHighlightedTagsCollapsed5: state.isHighlightedTagsCollapsed5,
                    isHighlightedTextsCollapsed6: state.isHighlightedTextsCollapsed6,
                    isOrderOfTagsCollapsed7: state.isOrderOfTagsCollapsed7,
                    isStatusCollapsed8: state.isStatusCollapsed8,
                    isCollapsedAll: state.isCollapsedAll,
                    isCollapsedImages: state.isCollapsedImages,
                    isCollapsedTagStat: state.isCollapsedTagStat,
                    isCollapsedScripts: state.isCollapsedScripts,
                    headerSectionOrder: state.headerSectionOrder,
                    isFilterRegex: state.isFilterRegex,
                    filterIgnoreCase: state.filterIgnoreCase,
                    tagsStatisticsTableColumnsCount: state.tagsStatisticsTableColumnsCount,
                    backupFolderForTagsCount: state.backupFolderForTagsCount
                };
            }

            function refreshKnownSets() {
                state.commonTagsSet = new Set(state.commonTags.map((item) => item.tag.toLowerCase()));
                state.highlightedTagsSet = new Set(state.highlightedTags.map((item) => item.toLowerCase()));
                state.knownTagsSet = new Set(state.knownTags.map((item) => item.toLowerCase()));
                state.highlightedTextsSet = new Set(state.highlightedTexts.map((item) => item.toLowerCase()));
            }

            function refreshFormattedCache() {
                state.formattedTagsMap = new Map();
            }

            function highlightTextInTag(tag, highlightedTextSet) {
                for (const text of highlightedTextSet) {
                    if (!text) {
                        continue;
                    }

                    const lowerTag = tag.toLowerCase();
                    const lowerText = text.toLowerCase();
                    const index = lowerTag.indexOf(lowerText);

                    if (index >= 0) {
                        const before = escapeHtml(tag.slice(0, index));
                        const match = escapeHtml(tag.slice(index, index + text.length));
                        const after = escapeHtml(tag.slice(index + text.length));
                        return `${before}<span class="highlight-text">${match}</span>${after}`;
                    }
                }

                return escapeHtml(tag);
            }

            function formatHighlight(tag) {
                const isHighlightedTag = state.highlightedTagsSet.has(tag.toLowerCase());
                const isHighlightedText = state.highlightedTexts.some((text) => text && tag.toLowerCase().includes(text.toLowerCase()));

                if (isHighlightedTag && isHighlightedText) {
                    return `<span class="highlight-tag-shell">${highlightTextInTag(tag, state.highlightedTexts)}</span>`;
                }

                if (isHighlightedTag) {
                    return `<span class="highlight-tag-shell">${escapeHtml(tag)}</span>`;
                }

                if (isHighlightedText) {
                    return highlightTextInTag(tag, state.highlightedTexts);
                }

                return escapeHtml(tag);
            }

            function formatTag(tag) {
                if (!tag) {
                    return "";
                }

                const highlighted = formatHighlight(tag);
                const formatted = state.knownTagsSet.has(tag.toLowerCase())
                    ? highlighted
                    : `<span class="unknown-tag">${highlighted}</span>`;

                state.formattedTagsMap.set(tag, formatted);
                return formatted;
            }

            function highlightEditorText(text) {
                if (!text) {
                    return "";
                }

                const tagsCleaned = String(text)
                    .split(",")
                    .map((item) => item.trim())
                    .filter(Boolean);

                return tagsCleaned.map((tag) => formatTag(tag)).join(", ");
            }

            function highlightTags(image) {
                image.formattedTags = image.tags
                    .filter(Boolean)
                    .map((tag) => formatTag(tag));

                for (const removedTag of image.removedTags) {
                    formatTag(removedTag);
                }

                image.formattedTagsText = image.formattedTags.join(", ");
            }

            function updateCommonTagsFormatAndOrder() {
                state.commonTags = state.commonTags.map((item) => ({
                    tag: item.tag,
                    formatted: formatTag(item.tag)
                }));
                orderCommonTags();
                refreshKnownSets();
            }

            function orderCommonTags() {
                if (!state.orderOfTags.length) {
                    return;
                }

                const ordered = [];
                const added = new Set();

                for (const item of state.orderOfTags) {
                    const found = state.commonTags.find((commonTag) => commonTag.tag.toLowerCase() === item.toLowerCase());
                    if (found && !added.has(found.tag.toLowerCase())) {
                        ordered.push(found);
                        added.add(found.tag.toLowerCase());
                    }
                }

                for (const item of state.commonTags) {
                    if (!added.has(item.tag.toLowerCase())) {
                        ordered.push(item);
                    }
                }

                state.commonTags = ordered;
            }

            function getTagFormatImage(tag) {
                if (!tag) {
                    return "";
                }

                if (state.formattedTagsMap.has(tag)) {
                    return state.formattedTagsMap.get(tag);
                }

                return formatTag(tag);
            }

            async function applyConfig(config) {
                const legacyImagesValue = String(config.imagesFolderName ?? config.imagesPath ?? "").trim();
                const legacyConfigValue = String(config.configFileName ?? "").trim();

                state.imagesPath = normalizeStoredPathValue(config.imagesFolderPath ?? config.imagesPath ?? legacyImagesValue);
                state.configFilePath = normalizeStoredPathValue(config.configFilePath ?? legacyConfigValue);
                state.imagesHandleName = normalizeStoredHandleName(
                    config.imagesFolderHandleName
                    ?? (!state.imagesPath && legacyImagesValue && !isAbsolutePath(legacyImagesValue) ? legacyImagesValue : "")
                );
                state.configFileHandleName = normalizeStoredHandleName(
                    config.configFileHandleName
                    ?? (!state.configFilePath && legacyConfigValue && !isAbsolutePath(legacyConfigValue) ? legacyConfigValue : "")
                );
                state.tagFilter = config.tagFilter ?? "";
                state.commonTagsText = config.commonTagsText ?? "";
                state.highlightedTagsText = config.highlightedTagsText ?? "";
                state.knownTagsText = config.knownTagsText ?? "";
                state.highlightedText = config.highlightedText ?? "";
                state.orderOfTagsText = config.orderOfTags ?? "";
                state.scriptRemoveTagsText = config.scriptRemoveTags ?? "";

                state.isConfigCollapsed1 = config.isConfigCollapsed1 ?? false;
                state.isFilterCollapsed2 = config.isFilterCollapsed2 ?? true;
                state.isCommonTagsCollapsed3 = config.isCommonTagsCollapsed3 ?? true;
                state.isKnownTagsCollapsed4 = config.isKnownTagsCollapsed4 ?? true;
                state.isHighlightedTagsCollapsed5 = config.isHighlightedTagsCollapsed5 ?? true;
                state.isHighlightedTextsCollapsed6 = config.isHighlightedTextsCollapsed6 ?? true;
                state.isOrderOfTagsCollapsed7 = config.isOrderOfTagsCollapsed7 ?? true;
                state.isStatusCollapsed8 = config.isStatusCollapsed8 ?? false;
                state.isCollapsedAll = config.isCollapsedAll ?? true;
                state.isFilterRegex = config.isFilterRegex ?? false;
                state.filterIgnoreCase = config.filterIgnoreCase ?? false;
                state.tagsStatisticsTableColumnsCount = config.tagsStatisticsTableColumnsCount ?? 3;
                state.backupFolderForTagsCount = config.backupFolderForTagsCount ?? 5;
                state.headerSectionOrder = normalizeHeaderSectionOrder(config.headerSectionOrder);

                reconcileMainSectionsFromConfig(config);
                syncCollapsedAllState();
                await invalidateDerivedState();
            }

            async function invalidateDerivedState() {
                refreshFormattedCache();
                state.commonTags = toTagFormat(state.commonTagsText, formatTag);
                state.highlightedTags = toTags(state.highlightedTagsText);
                state.knownTags = toTags(state.knownTagsText);
                state.highlightedTexts = toTags(state.highlightedText);
                state.orderOfTags = toTags(state.orderOfTagsText);
                state.scriptRemoveTags = toTags(state.scriptRemoveTagsText);
                refreshKnownSets();
                updateCommonTagsFormatAndOrder();

                for (const image of state.images) {
                    highlightTags(image);
                }

                await filterImages(false);
                recalculateAutoComplete(true);
            }

            async function openHandleDb() {
                return await new Promise((resolve, reject) => {
                    const request = indexedDB.open("simpleVersionImageViewer", 1);
                    request.onupgradeneeded = () => {
                        request.result.createObjectStore("handles");
                    };
                    request.onsuccess = () => resolve(request.result);
                    request.onerror = () => reject(request.error);
                });
            }

            async function saveHandle(key, handle) {
                try {
                    const db = await openHandleDb();
                    await new Promise((resolve, reject) => {
                        const tx = db.transaction("handles", "readwrite");
                        tx.objectStore("handles").put(handle, key);
                        tx.oncomplete = () => resolve();
                        tx.onerror = () => reject(tx.error);
                    });
                    db.close();
                } catch (error) {
                    console.warn("Could not persist handle", error);
                }
            }

            async function rememberHandleForPath(kind, handle, path) {
                const key = getPathHandleKey(kind, path);
                if (!handle || !key) {
                    return;
                }

                const pathBaseName = getPathBaseName(path).toLowerCase();
                const handleName = String(handle.name ?? "").trim().toLowerCase();
                if (pathBaseName && handleName && pathBaseName !== handleName) {
                    return;
                }

                await saveHandle(key, handle);
            }

            async function readHandle(key) {
                try {
                    const db = await openHandleDb();
                    const value = await new Promise((resolve, reject) => {
                        const tx = db.transaction("handles", "readonly");
                        const request = tx.objectStore("handles").get(key);
                        request.onsuccess = () => resolve(request.result ?? null);
                        request.onerror = () => reject(request.error);
                    });
                    db.close();
                    return value;
                } catch (error) {
                    console.warn("Could not read handle", error);
                    return null;
                }
            }

            async function readHandleForPath(kind, path) {
                const key = getPathHandleKey(kind, path);
                if (!key) {
                    return null;
                }

                return await readHandle(key);
            }

            async function deleteHandle(key) {
                try {
                    const db = await openHandleDb();
                    await new Promise((resolve, reject) => {
                        const tx = db.transaction("handles", "readwrite");
                        tx.objectStore("handles").delete(key);
                        tx.oncomplete = () => resolve();
                        tx.onerror = () => reject(tx.error);
                    });
                    db.close();
                } catch (error) {
                    console.warn("Could not delete handle", error);
                }
            }

            async function resolveHandleForStoredPath(kind, desiredPath, desiredHandleName = "", currentHandle = null) {
                const targetPath = String(desiredPath ?? "").trim();
                const targetHandleName = normalizeStoredHandleName(desiredHandleName);
                if (!targetPath && !targetHandleName) {
                    return currentHandle ?? null;
                }

                if (currentHandle) {
                    const currentPath = await getHandleDisplayPath(currentHandle);
                    if (pathsMatchForStoredHandle(currentPath || currentHandle.name, targetPath)) {
                        return currentHandle;
                    }
                    if (!targetPath && handleNameMatchesStoredLabel(currentHandle, targetHandleName)) {
                        return currentHandle;
                    }
                }

                if (targetPath) {
                    return await readHandleForPath(kind, targetPath);
                }

                return null;
            }

            async function rememberCurrentHandlePaths() {
                await rememberHandleForPath("config", state.configFileHandle, state.configFilePath);
                await rememberHandleForPath("images", state.imagesDirHandle, state.imagesPath);
            }

            async function activatePersistedConfigHandle(desiredPath, desiredHandleName = "") {
                const nextPath = String(desiredPath ?? "").trim();
                const nextHandleName = normalizeStoredHandleName(desiredHandleName);
                const resolvedHandle = await resolveHandleForStoredPath("config", nextPath, nextHandleName, state.configFileHandle);

                state.configFileHandle = resolvedHandle;
                if (!resolvedHandle) {
                    await deleteHandle(handleKeys.configFile);
                    state.configFilePath = nextPath;
                    state.configFileHandleName = nextHandleName;
                    if (state.configFilePath) {
                        localStorage.setItem(storageKeys.lastConfigName, state.configFilePath);
                    } else {
                        localStorage.removeItem(storageKeys.lastConfigName);
                    }
                    return false;
                }

                state.configPickerHandle = resolvedHandle;
                await syncConfigPathFromHandle(resolvedHandle, true);
                if (state.configFilePath) {
                    localStorage.setItem(storageKeys.lastConfigName, state.configFilePath);
                } else {
                    localStorage.removeItem(storageKeys.lastConfigName);
                }
                await saveHandle(handleKeys.configFile, resolvedHandle);
                await saveHandle(handleKeys.configPickerStart, resolvedHandle);
                await rememberHandleForPath("config", resolvedHandle, state.configFilePath || nextPath);
                return true;
            }

            async function activatePersistedImagesHandle(desiredPath, desiredHandleName = "") {
                const nextPath = String(desiredPath ?? "").trim();
                const nextHandleName = normalizeStoredHandleName(desiredHandleName);
                const resolvedHandle = await resolveHandleForStoredPath("images", nextPath, nextHandleName, state.imagesDirHandle);

                state.imagesDirHandle = resolvedHandle;
                if (!resolvedHandle) {
                    await deleteHandle(handleKeys.imagesDirectory);
                    state.imagesPath = nextPath;
                    state.imagesHandleName = nextHandleName;
                    resetLogSessionForCurrentFolder();
                    if (state.imagesPath) {
                        localStorage.setItem(storageKeys.lastImagesName, state.imagesPath);
                    } else {
                        localStorage.removeItem(storageKeys.lastImagesName);
                    }
                    return false;
                }

                state.imagesPickerHandle = resolvedHandle;
                await syncImagesPathFromHandle(resolvedHandle, true);
                resetLogSessionForCurrentFolder();
                if (state.imagesPath) {
                    localStorage.setItem(storageKeys.lastImagesName, state.imagesPath);
                } else {
                    localStorage.removeItem(storageKeys.lastImagesName);
                }
                await saveHandle(handleKeys.imagesDirectory, resolvedHandle);
                await saveHandle(handleKeys.imagesPickerStart, resolvedHandle);
                await rememberHandleForPath("images", resolvedHandle, state.imagesPath || nextPath);
                return true;
            }

            async function ensurePermission(handle, mode = "read") {
                if (!handle || typeof handle.queryPermission !== "function") {
                    return false;
                }

                const options = { mode };
                const queried = await handle.queryPermission(options);
                if (queried === "granted") {
                    return true;
                }

                try {
                    const requested = await handle.requestPermission(options);
                    return requested === "granted";
                } catch (error) {
                    return false;
                }
            }

            async function getFileHandleIfExists(dirHandle, name) {
                try {
                    return await dirHandle.getFileHandle(name);
                } catch (error) {
                    return null;
                }
            }

            async function getDirectoryHandleIfExists(dirHandle, name) {
                try {
                    return await dirHandle.getDirectoryHandle(name);
                } catch (error) {
                    return null;
                }
            }

            async function fileExists(dirHandle, name) {
                return Boolean(await getFileHandleIfExists(dirHandle, name));
            }

            async function directoryExists(dirHandle, name) {
                return Boolean(await getDirectoryHandleIfExists(dirHandle, name));
            }

            async function writeToFileHandle(fileHandle, content) {
                const writable = await fileHandle.createWritable();
                await writable.write(content);
                await writable.close();
            }

            async function copyFileToDirectory(sourceHandle, targetDirectoryHandle, targetName) {
                const file = await sourceHandle.getFile();
                const targetHandle = await targetDirectoryHandle.getFileHandle(targetName, { create: true });
                await writeToFileHandle(targetHandle, await file.arrayBuffer());
                return targetHandle;
            }

            async function getTempConfigFileHandle(create = false) {
                if (!state.supportsOpfs) {
                    return null;
                }

                try {
                    const root = await navigator.storage.getDirectory();
                    const tempDir = await root.getDirectoryHandle(tempConfigFolderName, { create });
                    if (!tempDir) {
                        return null;
                    }

                    return create
                        ? await tempDir.getFileHandle(tempConfigFileName, { create: true })
                        : await getFileHandleIfExists(tempDir, tempConfigFileName);
                } catch (error) {
                    console.warn("Could not access temp config file", error);
                    return null;
                }
            }

            async function saveTempConfig(jsonText) {
                localStorage.setItem(storageKeys.configCache, jsonText);

                const tempHandle = await getTempConfigFileHandle(true);
                if (tempHandle) {
                    await writeToFileHandle(tempHandle, jsonText);
                }
            }

            async function readTempConfigText() {
                try {
                    const tempHandle = await getTempConfigFileHandle(false);
                    if (tempHandle) {
                        const file = await tempHandle.getFile();
                        return await file.text();
                    }
                } catch (error) {
                    console.warn("Could not read temp config file", error);
                }

                return localStorage.getItem(storageKeys.configCache) ?? "";
            }

            async function deleteTempConfig() {
                localStorage.removeItem(storageKeys.configCache);

                if (!state.supportsOpfs) {
                    return;
                }

                try {
                    const root = await navigator.storage.getDirectory();
                    const tempDir = await root.getDirectoryHandle(tempConfigFolderName);
                    await tempDir.removeEntry(tempConfigFileName);
                } catch (error) {
                    console.warn("Could not delete temp config file", error);
                }
            }

            function getCurrentConfigDownloadName() {
                const baseName = getPathBaseName(state.configFilePath || state.configFileHandleName || "") || "config";
                const normalized = baseName.toLowerCase().endsWith(".json") ? baseName : `${baseName}.json`;
                return normalized.replace(/[^a-z0-9._-]/gi, "_");
            }

            async function downloadCurrentConfig() {
                await rememberCurrentHandlePaths();
                const jsonText = JSON.stringify(configSnapshot(), null, 2);
                const blob = new Blob([jsonText], { type: "application/json" });
                const url = URL.createObjectURL(blob);

                try {
                    const link = document.createElement("a");
                    link.href = url;
                    link.download = getCurrentConfigDownloadName();
                    document.body.appendChild(link);
                    link.click();
                    link.remove();
                    log(`Downloaded current config as ${link.download}.`);
                } finally {
                    URL.revokeObjectURL(url);
                }
            }

            async function getTagFileInfoForName(imageFileName, create = false) {
                const primaryName = imageFileName.replace(/\.[^.]+$/, ".txt");
                const secondaryName = `${imageFileName}.txt`;

                let tagHandle = await getFileHandleIfExists(state.imagesDirHandle, primaryName);
                if (tagHandle) {
                    return { tagHandle, tagFileName: primaryName };
                }

                tagHandle = await getFileHandleIfExists(state.imagesDirHandle, secondaryName);
                if (tagHandle) {
                    return { tagHandle, tagFileName: secondaryName };
                }

                if (create) {
                    tagHandle = await state.imagesDirHandle.getFileHandle(primaryName, { create: true });
                    return { tagHandle, tagFileName: primaryName };
                }

                return { tagHandle: null, tagFileName: primaryName };
            }

            async function getOriginalTagsDirectoryHandle(create = false) {
                if (!state.imagesDirHandle) {
                    return null;
                }

                const tempDir = create
                    ? await state.imagesDirHandle.getDirectoryHandle(originalTagsBackupRootName, { create: true })
                    : await getDirectoryHandleIfExists(state.imagesDirHandle, originalTagsBackupRootName);
                if (!tempDir) {
                    return null;
                }

                return create
                    ? await tempDir.getDirectoryHandle(originalTagsBackupFolderName, { create: true })
                    : await getDirectoryHandleIfExists(tempDir, originalTagsBackupFolderName);
            }

            async function getOriginalTagsBackupHandle(image, originalTagsDirHandle = null) {
                if (!image) {
                    return null;
                }

                if (!image.tagFileName) {
                    const tagInfo = await getTagFileInfoForName(image.fileName, false);
                    image.tagFileName = tagInfo.tagFileName;
                }

                const originalDir = originalTagsDirHandle ?? await getOriginalTagsDirectoryHandle(false);
                if (!originalDir) {
                    return null;
                }

                const handle = await getFileHandleIfExists(originalDir, image.tagFileName);
                image.hasOriginalTagsBackup = Boolean(handle);
                return handle;
            }

            async function ensureOriginalTagsBackup(image, originalTagsDirHandle = null) {
                if (!image || !state.imagesDirHandle) {
                    return false;
                }

                if (!image.tagFileName) {
                    const tagInfo = await getTagFileInfoForName(image.fileName, false);
                    image.tagFileName = tagInfo.tagFileName;
                }

                const originalDir = originalTagsDirHandle ?? await getOriginalTagsDirectoryHandle(true);
                if (!originalDir) {
                    return false;
                }

                if (await fileExists(originalDir, image.tagFileName)) {
                    image.hasOriginalTagsBackup = true;
                    return false;
                }

                if (image.tagHandle) {
                    await copyFileToDirectory(image.tagHandle, originalDir, image.tagFileName);
                } else {
                    const backupHandle = await originalDir.getFileHandle(image.tagFileName, { create: true });
                    await writeToFileHandle(backupHandle, "");
                }

                image.hasOriginalTagsBackup = true;
                return true;
            }

            async function loadConfigFromLocalStorage() {
                const raw = await readTempConfigText();
                if (!raw) {
                    state.tempConfigLoaded = false;
                    return;
                }

                try {
                    await applyConfig(JSON.parse(raw));
                    if (!state.configFilePath && !state.configFileHandleName) {
                        state.configFilePath = localStorage.getItem(storageKeys.lastConfigName) ?? "";
                    }
                    if (!state.imagesPath && !state.imagesHandleName) {
                        state.imagesPath = localStorage.getItem(storageKeys.lastImagesName) ?? "";
                    }
                    state.tempConfigLoaded = true;
                    log(`Loaded temporary configuration from ${tempConfigPath}.`);
                } catch (error) {
                    console.warn("Could not parse cached config", error);
                    state.tempConfigLoaded = false;
                }
            }

            function pushConfigBackup(mode, jsonText) {
                const storageKey = mode === "btn" ? storageKeys.configBackupsBtn : storageKeys.configBackupsAuto;
                const items = JSON.parse(localStorage.getItem(storageKey) ?? "[]");
                items.push({
                    time: Date.now(),
                    fileName: getStoredLocationDisplay(state.configFilePath, state.configFileHandleName),
                    jsonText
                });
                while (items.length > state.configBackupCount) {
                    items.shift();
                }
                localStorage.setItem(storageKey, JSON.stringify(items));
            }

            async function selectConfigFile() {
                if (!state.supportsFsAccess) {
                    log("This browser cannot open config files directly. Use Edge or Chrome.");
                    render();
                    return;
                }

                try {
                    const [handle] = await runPicker(
                        (options) => window.showOpenFilePicker(options),
                        {
                            id: "simple-version-config-open",
                            multiple: false,
                            types: [
                                {
                                    description: "JSON config",
                                    accept: {
                                        "application/json": [".json"]
                                    }
                                }
                            ]
                        },
                        getPreferredConfigPickerHandle()
                    );

                    state.configFileHandle = handle;
                    state.configPickerHandle = handle;
                    await syncConfigPathFromHandle(handle, true);
                    if (state.configFilePath) {
                        localStorage.setItem(storageKeys.lastConfigName, state.configFilePath);
                    } else {
                        localStorage.removeItem(storageKeys.lastConfigName);
                    }
                    await saveHandle(handleKeys.configFile, handle);
                    await saveHandle(handleKeys.configPickerStart, handle);
                    await rememberHandleForPath("config", handle, state.configFilePath);
                    log(`Selected configuration file: ${getStoredLocationDisplay(state.configFilePath, state.configFileHandleName)}.`);
                    if (!state.configFilePath && state.configFileHandleName) {
                        log(`Browser exposed only the config file name. Enter the full path in the field if you want it stored in the config. Placeholder: <${state.configFileHandleName}>.`);
                    }
                } catch (error) {
                    if (error && error.name !== "AbortError") {
                        log("Configuration file selection failed.");
                    }
                }

                render();
            }

            async function createOrSelectConfigFileForSave() {
                if (state.configFileHandle) {
                    return true;
                }

                if (!state.supportsSavePicker) {
                    log("Save file picker is not available in this browser.");
                    return false;
                }

                try {
                    const handle = await runPicker(
                        (options) => window.showSaveFilePicker(options),
                        {
                            id: "simple-version-config-save",
                            suggestedName: "config.json",
                            types: [
                                {
                                    description: "JSON config",
                                    accept: {
                                        "application/json": [".json"]
                                    }
                                }
                            ]
                        },
                        getPreferredConfigPickerHandle()
                    );

                    state.configFileHandle = handle;
                    state.configPickerHandle = handle;
                    await syncConfigPathFromHandle(handle, true);
                    if (state.configFilePath) {
                        localStorage.setItem(storageKeys.lastConfigName, state.configFilePath);
                    } else {
                        localStorage.removeItem(storageKeys.lastConfigName);
                    }
                    await saveHandle(handleKeys.configFile, handle);
                    await saveHandle(handleKeys.configPickerStart, handle);
                    await rememberHandleForPath("config", handle, state.configFilePath);
                    log(`Selected configuration file for save: ${getStoredLocationDisplay(state.configFilePath, state.configFileHandleName)}.`);
                    if (!state.configFilePath && state.configFileHandleName) {
                        log(`Browser exposed only the config file name. Enter the full path in the field if you want it stored in the config. Placeholder: <${state.configFileHandleName}>.`);
                    }
                    return true;
                } catch (error) {
                    if (error && error.name !== "AbortError") {
                        log("Could not create configuration file.");
                    }
                    return false;
                }
            }

            async function loadConfiguration(btnLoad = false) {
                if (!state.configFileHandle) {
                    log("No configuration file selected. Using browser cache only.");
                    await loadConfigFromLocalStorage();
                    render();
                    return;
                }

                try {
                    const canRead = await ensurePermission(state.configFileHandle, "read");
                    if (!canRead) {
                        log("Configuration file permission was denied.");
                        render();
                        return;
                    }

                    const file = await state.configFileHandle.getFile();
                    const configText = await file.text();

                    if (configText && state.configBackupCount > 0) {
                        pushConfigBackup("auto", configText);
                        if (btnLoad) {
                            pushConfigBackup("btn", configText);
                        }
                    }

                    const config = JSON.parse(configText);
                    await applyConfig(config);
                    state.configPickerHandle = state.configFileHandle;
                    await syncConfigPathFromHandle(state.configFileHandle, true);
                    await rememberHandleForPath("config", state.configFileHandle, state.configFilePath);
                    if (state.configFilePath) {
                        localStorage.setItem(storageKeys.lastConfigName, state.configFilePath);
                    } else {
                        localStorage.removeItem(storageKeys.lastConfigName);
                    }
                    const hasImagesHandle = await activatePersistedImagesHandle(state.imagesPath, state.imagesHandleName);
                    await saveTempConfig(JSON.stringify(configSnapshot(), null, 2));
                    state.tempConfigLoaded = true;

                    if (hasImagesHandle) {
                        await loadImages(false);
                    } else {
                        await revokeImageUrls();
                        state.images = [];
                        await invalidateDerivedState();
                        if (state.imagesPath || state.imagesHandleName) {
                            log(`Configuration expects images folder ${getStoredLocationDisplay(state.imagesPath, state.imagesHandleName)}. Pick this folder once if browser access is not cached yet.`);
                        }
                    }

                    log(`Loaded configuration from ${getStoredLocationDisplay(state.configFilePath, state.configFileHandleName || state.configFileHandle?.name)}.`);
                } catch (error) {
                    console.error(error);
                    log("Could not load configuration file.");
                }

                render();
            }

            async function saveConfiguration(options = {}) {
                const { promptIfMissing = false, saveToOriginal = false } = options;
                if (!state.configFileHandle && promptIfMissing) {
                    const selected = await createOrSelectConfigFileForSave();
                    if (!selected) {
                        render();
                        return;
                    }
                }

                await rememberCurrentHandlePaths();

                const snapshot = configSnapshot();
                const jsonText = JSON.stringify(snapshot, null, 2);

                await saveTempConfig(jsonText);
                state.tempConfigLoaded = true;
                if (state.configFilePath) {
                    localStorage.setItem(storageKeys.lastConfigName, state.configFilePath);
                } else {
                    localStorage.removeItem(storageKeys.lastConfigName);
                }
                if (state.imagesPath) {
                    localStorage.setItem(storageKeys.lastImagesName, state.imagesPath);
                } else {
                    localStorage.removeItem(storageKeys.lastImagesName);
                }

                if (!saveToOriginal) {
                    recalculateAutoComplete(false);
                    render();
                    return;
                }

                if (state.configFileHandle) {
                    try {
                        const canWrite = await ensurePermission(state.configFileHandle, "readwrite");
                        if (!canWrite) {
                            log(`Configuration file write permission was denied. Saved only to ${tempConfigPath}.`);
                            render();
                            return;
                        }

                        await writeToFileHandle(state.configFileHandle, jsonText);
                        state.configPickerHandle = state.configFileHandle;
                        await syncConfigPathFromHandle(state.configFileHandle, true);
                        if (state.configFilePath) {
                            localStorage.setItem(storageKeys.lastConfigName, state.configFilePath);
                        } else {
                            localStorage.removeItem(storageKeys.lastConfigName);
                        }
                        await saveHandle(handleKeys.configFile, state.configFileHandle);
                        await saveHandle(handleKeys.configPickerStart, state.configFileHandle);
                        await rememberHandleForPath("config", state.configFileHandle, state.configFilePath);
                        await rememberHandleForPath("images", state.imagesDirHandle, state.imagesPath);
                    } catch (error) {
                        console.error(error);
                        log(`Could not write configuration file. The latest state is still stored in ${tempConfigPath}.`);
                    }
                }

                recalculateAutoComplete(false);
                render();
            }

            async function openFolderPicker() {
                if (!state.supportsFsAccess) {
                    log("Folder access needs Edge or Chrome.");
                    render();
                    return;
                }

                try {
                    const handle = await runPicker(
                        (options) => window.showDirectoryPicker(options),
                        {
                            id: "simple-version-images-folder",
                            mode: "readwrite"
                        },
                        getPreferredImagesPickerHandle()
                    );
                    state.imagesDirHandle = handle;
                    state.imagesPickerHandle = handle;
                    await syncImagesPathFromHandle(handle, true);
                    resetLogSessionForCurrentFolder();
                    if (state.imagesPath) {
                        localStorage.setItem(storageKeys.lastImagesName, state.imagesPath);
                    } else {
                        localStorage.removeItem(storageKeys.lastImagesName);
                    }
                    await saveHandle(handleKeys.imagesDirectory, handle);
                    await saveHandle(handleKeys.imagesPickerStart, handle);
                    await rememberHandleForPath("images", handle, state.imagesPath);
                    await loadImages(false);
                    await saveConfiguration({});
                    log(`Selected images folder: ${getStoredLocationDisplay(state.imagesPath, state.imagesHandleName)}.`);
                    if (!state.imagesPath && state.imagesHandleName) {
                        log(`Browser exposed only the folder name. Enter the full folder path in the field if you want it stored in the config. Placeholder: <${state.imagesHandleName}>.`);
                    }
                } catch (error) {
                    if (error && error.name !== "AbortError") {
                        log("Folder selection failed.");
                    }
                    render();
                }
            }

            async function backupCurrentTags(kind) {
                if (!state.imagesDirHandle || state.backupFolderForTagsCount <= 0) {
                    return;
                }

                const canWrite = await ensurePermission(state.imagesDirHandle, "readwrite");
                if (!canWrite) {
                    return;
                }

                const backupRoot = await state.imagesDirHandle.getDirectoryHandle("backup", { create: true });
                const stamp = new Date().toISOString().replace(/[:.]/g, "-");
                const prefix = kind === "btn" ? "_bk_btnLoad_" : "_bk_autoLoad_";
                const folderName = `${prefix}${stamp}`;
                const targetDirectory = await backupRoot.getDirectoryHandle(folderName, { create: true });

                for (const image of state.images) {
                    if (!image.tagHandle) {
                        continue;
                    }

                    await copyFileToDirectory(image.tagHandle, targetDirectory, image.tagFileName);
                }

                const childDirectories = [];
                for await (const [name, entry] of backupRoot.entries()) {
                    if (entry.kind === "directory" && name.startsWith(prefix)) {
                        childDirectories.push(name);
                    }
                }

                childDirectories.sort();
                while (childDirectories.length > state.backupFolderForTagsCount) {
                    const oldest = childDirectories.shift();
                    await backupRoot.removeEntry(oldest, { recursive: true });
                }

                log(`Created tags backup: backup/${folderName}`);
            }

            async function revokeImageUrls() {
                for (const image of state.images) {
                    if (image.objectUrl) {
                        URL.revokeObjectURL(image.objectUrl);
                    }
                }
            }

            async function loadImages(btnLoad = false) {
                if (!state.imagesDirHandle) {
                    log("No images folder selected.");
                    render();
                    return;
                }

                try {
                    const canRead = await ensurePermission(state.imagesDirHandle, "readwrite");
                    if (!canRead) {
                        log("Images folder permission was denied.");
                        render();
                        return;
                    }

                    await revokeImageUrls();

                    const fileEntries = [];
                    for await (const [name, entry] of state.imagesDirHandle.entries()) {
                        if (entry.kind !== "file") {
                            continue;
                        }

                        const lower = name.toLowerCase();
                        if (!lower.endsWith(".jpg") && !lower.endsWith(".png")) {
                            continue;
                        }

                        fileEntries.push({ name, handle: entry });
                    }

                    fileEntries.sort((a, b) => a.name.localeCompare(b.name));
                    state.images = [];
                    const originalTagsDir = fileEntries.length ? await getOriginalTagsDirectoryHandle(true) : null;
                    let createdOriginalBackups = 0;

                    for (let index = 0; index < fileEntries.length; index += 1) {
                        const item = fileEntries[index];
                        const file = await item.handle.getFile();
                        const objectUrl = URL.createObjectURL(file);
                        const tagInfo = await getTagFileInfoForName(item.name, false);

                        let tags = [];
                        if (tagInfo.tagHandle) {
                            const tagText = await (await tagInfo.tagHandle.getFile()).text();
                            tags = toTags(tagText);
                        }

                        state.images.push({
                            id: createImageId(index),
                            fileName: item.name,
                            fileHandle: item.handle,
                            objectUrl,
                            tagHandle: tagInfo.tagHandle,
                            tagFileName: tagInfo.tagFileName,
                            tags,
                            removedTags: [],
                            formattedTags: [],
                            formattedTagsText: "",
                            visible: true,
                            isChanged: false,
                            isSaved: false,
                            selectedTag: "",
                            hasOriginalTagsBackup: false
                        });

                        if (await ensureOriginalTagsBackup(state.images[state.images.length - 1], originalTagsDir)) {
                            createdOriginalBackups += 1;
                        }
                    }

                    if (state.images.length && state.backupFolderForTagsCount > 0) {
                        await backupCurrentTags("auto");
                        if (btnLoad) {
                            await backupCurrentTags("btn");
                        }
                    }

                    await syncImagesPathFromHandle(state.imagesDirHandle, true);
                    if (state.imagesPath) {
                        localStorage.setItem(storageKeys.lastImagesName, state.imagesPath);
                    } else {
                        localStorage.removeItem(storageKeys.lastImagesName);
                    }
                    await rememberHandleForPath("images", state.imagesDirHandle, state.imagesPath);
                    await invalidateDerivedState();
                    if (createdOriginalBackups > 0) {
                        log(`Stored ${createdOriginalBackups} original tag backups in ${originalTagsBackupPath}.`);
                    }
                    log(`Loaded ${state.images.length} images from ${getStoredLocationDisplay(state.imagesPath, state.imagesHandleName)}.`);
                } catch (error) {
                    console.error(error);
                    log("Could not load images from the selected folder.");
                }

                render();
            }

            async function fullyUnloadAll() {
                await persistLogsNow();
                await revokeImageUrls();

                hideSuggestions();
                state.configFileHandle = null;
                state.imagesDirHandle = null;
                state.configFilePath = "";
                state.configFileHandleName = "";
                state.imagesPath = "";
                state.imagesHandleName = "";
                state.images = [];
                state.tagFilter = "";
                state.commonTagsText = "";
                state.commonTags = [];
                state.commonTagsSet = new Set();
                state.highlightedTagsText = "";
                state.highlightedTags = [];
                state.highlightedTagsSet = new Set();
                state.knownTagsText = "";
                state.knownTags = [];
                state.knownTagsSet = new Set();
                state.highlightedText = "";
                state.highlightedTexts = [];
                state.highlightedTextsSet = new Set();
                state.orderOfTagsText = "";
                state.orderOfTags = [];
                state.tagCounts = [];
                state.formattedTagsMap = new Map();
                state.tagCountsGoodCount = 0;
                state.imageNumber = 0;
                state.autocompleteTags = [];
                state.scriptAddTagText = "";
                state.scriptRemoveTagsText = "";
                state.scriptRemoveTags = [];
                state.lastRecalc = 0;
                state.popupVisible = false;
                state.logSessionFileName = "";
                state.logFilePath = "";
                state.tempConfigLoaded = false;
                state.viewer.isOpen = false;
                state.viewer.imageId = "";
                state.viewer.scale = 1;
                state.viewer.offsetX = 0;
                state.viewer.offsetY = 0;
                state.viewer.dragging = false;
                state.viewer.dragStartX = 0;
                state.viewer.dragStartY = 0;
                state.viewer.pointerId = null;

                setMainSection("images");

                if (logPersistTimer) {
                    window.clearTimeout(logPersistTimer);
                    logPersistTimer = 0;
                }

                await deleteTempConfig();
                localStorage.removeItem(storageKeys.lastConfigName);
                localStorage.removeItem(storageKeys.lastImagesName);
                await deleteHandle(handleKeys.configFile);
                await deleteHandle(handleKeys.imagesDirectory);

                setStatus("Fully unloaded. Pick a configuration file or images folder to start again.");
                render();
            }

            function getRegexListFromFilter() {
                const patterns = toTags(state.tagFilter);
                try {
                    return patterns.map((pattern) => new RegExp(pattern, state.filterIgnoreCase ? "i" : ""));
                } catch (error) {
                    log(`Invalid regex filter: ${error.message}`);
                    return null;
                }
            }

            async function filterImages(saveConfig = true) {
                if (saveConfig) {
                    await saveConfiguration({});
                }

                if (!state.tagFilter.trim()) {
                    for (const image of state.images) {
                        image.visible = true;
                    }
                    return;
                }

                if (state.isFilterRegex) {
                    const patterns = getRegexListFromFilter();
                    if (!patterns) {
                        return;
                    }

                    for (const image of state.images) {
                        image.visible = image.tags.some((tag) => patterns.some((pattern) => pattern.test(tag)));
                    }
                    return;
                }

                const filterTags = toTags(state.tagFilter);
                for (const image of state.images) {
                    image.visible = filterTags.every((tag) => includesCI(image.tags, tag));
                }
            }

            async function antiFilterImages() {
                await saveConfiguration({});

                if (!state.tagFilter.trim()) {
                    for (const image of state.images) {
                        image.visible = true;
                    }
                    render();
                    return;
                }

                if (state.isFilterRegex) {
                    const patterns = getRegexListFromFilter();
                    if (!patterns) {
                        render();
                        return;
                    }

                    for (const image of state.images) {
                        image.visible = !image.tags.some((tag) => patterns.some((pattern) => pattern.test(tag)));
                    }
                } else {
                    const filterTags = toTags(state.tagFilter);
                    for (const image of state.images) {
                        image.visible = !filterTags.every((tag) => includesCI(image.tags, tag));
                    }
                }

                render();
            }

            function showAllImages() {
                for (const image of state.images) {
                    image.visible = true;
                }
            }

            function clearFilter() {
                state.tagFilter = "";
                showAllImages();
            }

            async function saveTags(image) {
                if (!image || !state.imagesDirHandle) {
                    return;
                }

                try {
                    const canWrite = await ensurePermission(state.imagesDirHandle, "readwrite");
                    if (!canWrite) {
                        log("Folder write permission was denied.");
                        render();
                        return;
                    }

                    await ensureOriginalTagsBackup(image);

                    if (!image.tagHandle) {
                        const tagInfo = await getTagFileInfoForName(image.fileName, true);
                        image.tagHandle = tagInfo.tagHandle;
                        image.tagFileName = tagInfo.tagFileName;
                    }

                    await writeToFileHandle(image.tagHandle, image.tags.join(", "));
                    image.isChanged = false;
                    image.isSaved = true;
                    window.setTimeout(() => {
                        image.isSaved = false;
                        render();
                    }, 900);

                    recalculateAutoComplete(true);
                    log(`Saved tags for ${image.fileName}.`);
                } catch (error) {
                    console.error(error);
                    log(`Could not save tags for ${image.fileName}.`);
                }
            }

            async function restoreOriginalTags(image) {
                if (!image || !state.imagesDirHandle) {
                    return;
                }

                try {
                    const canWrite = await ensurePermission(state.imagesDirHandle, "readwrite");
                    if (!canWrite) {
                        log("Folder write permission was denied.");
                        render();
                        return;
                    }

                    const originalHandle = await getOriginalTagsBackupHandle(image);
                    if (!originalHandle) {
                        log(`No original tags backup found for ${image.fileName} in ${originalTagsBackupPath}.`);
                        return;
                    }

                    const originalText = await (await originalHandle.getFile()).text();
                    image.tags = toTags(originalText);
                    image.removedTags = [];
                    image.selectedTag = "";
                    highlightTags(image);
                    await saveTags(image);
                    log(`Restored original tags for ${image.fileName} from ${originalTagsBackupPath}.`);
                } catch (error) {
                    console.error(error);
                    log(`Could not restore original tags for ${image.fileName}.`);
                }
            }

            async function openImageInBrowser(image) {
                if (!image) {
                    return;
                }

                openImageViewer(image);
            }

            async function copyImageUrl(image) {
                if (!image?.objectUrl) {
                    return;
                }

                try {
                    if (navigator.clipboard?.writeText) {
                        await navigator.clipboard.writeText(image.objectUrl);
                    } else {
                        const textarea = document.createElement("textarea");
                        textarea.value = image.objectUrl;
                        textarea.style.position = "fixed";
                        textarea.style.opacity = "0";
                        document.body.appendChild(textarea);
                        textarea.focus();
                        textarea.select();
                        document.execCommand("copy");
                        textarea.remove();
                    }
                    log(`Copied viewer URL for ${image.fileName}.`);
                } catch (error) {
                    console.error(error);
                    log(`Could not copy viewer URL for ${image.fileName}.`);
                }
            }

            async function filterTag(tag) {
                state.tagFilter = tag ?? "";
                await filterImages(true);
                setMainSection("images");
                render();
            }

            async function addToFilter(tag) {
                if (!tag || !String(tag).trim()) {
                    return;
                }

                state.tagFilter = state.tagFilter.trim() ? `${state.tagFilter}, ${tag}` : String(tag);
                await filterImages(true);
                render();
            }

            async function orderTags(image) {
                if (!image || !state.orderOfTags.length) {
                    return;
                }

                image.tags = getOrderedTagsList(image.tags);
                await saveTags(image);
            }

            async function onTagsChanged(image) {
                if (!image?.isChanged) {
                    return;
                }

                await orderTags(image);
                highlightTags(image);
                await saveTags(image);
            }

            async function onCommonTagsTextChanged(value) {
                state.commonTagsText = value;
                refreshFormattedCache();
                state.commonTags = toTagFormat(state.commonTagsText, formatTag);
                orderCommonTags();
                refreshKnownSets();

                for (const image of state.images) {
                    highlightTags(image);
                }

                await saveConfiguration({});
                render();
            }

            async function onHighlightedTagsTextChanged(value) {
                state.highlightedTagsText = value;
                state.highlightedTags = toTags(state.highlightedTagsText);
                refreshFormattedCache();
                refreshKnownSets();
                updateCommonTagsFormatAndOrder();

                for (const image of state.images) {
                    highlightTags(image);
                }

                await saveConfiguration({});
                render();
            }

            async function onKnownTagsTextChanged(value) {
                state.knownTagsText = value;
                state.knownTags = toTags(state.knownTagsText);
                refreshFormattedCache();
                refreshKnownSets();
                updateCommonTagsFormatAndOrder();

                for (const image of state.images) {
                    highlightTags(image);
                }

                await saveConfiguration({});
                render();
            }

            async function onHighlightedTextChanged(value) {
                state.highlightedText = value;
                state.highlightedTexts = toTags(state.highlightedText);
                refreshFormattedCache();
                refreshKnownSets();
                updateCommonTagsFormatAndOrder();

                for (const image of state.images) {
                    highlightTags(image);
                }

                await saveConfiguration({});
                render();
            }

            async function onOrderedTagsTextChanged(value) {
                state.orderOfTagsText = value;
                state.orderOfTags = toTags(state.orderOfTagsText);
                refreshFormattedCache();
                updateCommonTagsFormatAndOrder();

                for (const image of state.images) {
                    highlightTags(image);
                }

                await saveConfiguration({});
                render();
            }

            async function onScriptRemoveTagsChanged(value) {
                state.scriptRemoveTagsText = value;
                state.scriptRemoveTags = toTags(state.scriptRemoveTagsText);
                await saveConfiguration({});
                render();
            }

            async function toggleCommonTag(image, tag) {
                if (!image || !tag) {
                    return;
                }

                const existingIndex = image.tags.findIndex((item) => item.toLowerCase() === tag.toLowerCase());
                if (existingIndex >= 0) {
                    image.tags.splice(existingIndex, 1);
                } else {
                    image.tags.unshift(tag);
                    await orderTags(image);
                }

                image.isChanged = true;
                highlightTags(image);
                await saveTags(image);
                render();
            }

            async function removeTagFromImage(image, tag) {
                if (!image || !tag) {
                    return;
                }

                const index = image.tags.findIndex((item) => item.toLowerCase() === tag.toLowerCase());
                if (index < 0) {
                    return;
                }

                const [removed] = image.tags.splice(index, 1);
                image.removedTags.push(removed);
                image.isChanged = true;
                highlightTags(image);
                await saveTags(image);
                render();
            }

            async function addBackTagToImage(image, tag) {
                if (!image || !tag) {
                    return;
                }

                if (includesCI(image.tags, tag)) {
                    return;
                }

                const removedIndex = image.removedTags.findIndex((item) => item.toLowerCase() === tag.toLowerCase());
                if (removedIndex < 0) {
                    return;
                }

                const [restored] = image.removedTags.splice(removedIndex, 1);
                image.tags.push(restored);
                await orderTags(image);
                image.isChanged = true;
                highlightTags(image);
                await saveTags(image);
                render();
            }

            async function countTags(openPanel = true) {
                const tagMap = new Map();
                for (const image of state.images) {
                    for (const tag of image.tags) {
                        tagMap.set(tag, (tagMap.get(tag) ?? 0) + 1);
                    }
                }

                state.tagCounts = Array.from(tagMap.entries())
                    .map(([tag, count]) => ({
                        num: 0,
                        tag,
                        tagFormatted: formatTag(tag),
                        count
                    }))
                    .sort((left, right) => right.count - left.count);

                const goodCount = Math.ceil(state.tagCounts.length / state.tagsStatisticsTableColumnsCount) * state.tagsStatisticsTableColumnsCount;
                while (state.tagCounts.length < goodCount) {
                    state.tagCounts.push({ num: 0, tag: "", tagFormatted: "", count: 0 });
                }

                state.tagCounts.forEach((tag, index) => {
                    tag.num = index + 1;
                });

                state.tagCountsGoodCount = goodCount;
                if (openPanel) {
                    setMainSection("stats");
                }
            }

            function recalculateAutoComplete(force = false) {
                const now = Date.now();
                if (!force && now - state.lastRecalc < 3000) {
                    return;
                }

                state.lastRecalc = now;
                state.autocompleteTags = distinctCI([
                    ...state.images.flatMap((image) => image.tags),
                    ...state.commonTags.map((item) => item.tag),
                    ...state.knownTags,
                    ...state.highlightedTags
                ]);
            }

            async function removeImage(image) {
                if (!image || !state.imagesDirHandle) {
                    return;
                }

                try {
                    const removedDir = await state.imagesDirHandle.getDirectoryHandle("__removed", { create: true });
                    const imageExists = await fileExists(removedDir, image.fileName);
                    const tagExists = image.tagHandle ? await fileExists(removedDir, image.tagFileName) : false;

                    if (imageExists || tagExists) {
                        log(`Remove aborted because target file already exists for ${image.fileName}.`);
                        render();
                        return;
                    }

                    await copyFileToDirectory(image.fileHandle, removedDir, image.fileName);
                    if (image.tagHandle) {
                        await copyFileToDirectory(image.tagHandle, removedDir, image.tagFileName);
                    }

                    await state.imagesDirHandle.removeEntry(image.fileName);
                    if (image.tagHandle) {
                        await state.imagesDirHandle.removeEntry(image.tagFileName);
                    }

                    URL.revokeObjectURL(image.objectUrl);
                    state.images = state.images.filter((item) => item.id !== image.id);
                    log(`Moved ${image.fileName} to __removed.`);
                } catch (error) {
                    console.error(error);
                    log(`Could not remove ${image.fileName}.`);
                }

                render();
            }

            async function addToCommon(tag) {
                if (!tag || !String(tag).trim()) {
                    return;
                }

                state.commonTagsText = state.commonTagsText.trim() ? `${state.commonTagsText}, ${tag}` : String(tag);
                await onCommonTagsTextChanged(state.commonTagsText);
            }

            async function addToKnown(tag) {
                if (!tag || !String(tag).trim()) {
                    return;
                }

                state.knownTagsText = state.knownTagsText.trim() ? `${state.knownTagsText}, ${tag}` : String(tag);
                await onKnownTagsTextChanged(state.knownTagsText);
            }

            async function addToHighlightedTags(tag) {
                if (!tag || !String(tag).trim()) {
                    return;
                }

                state.highlightedTagsText = state.highlightedTagsText.trim() ? `${state.highlightedTagsText}, ${tag}` : String(tag);
                await onHighlightedTagsTextChanged(state.highlightedTagsText);
            }

            async function addToHighlightedTexts(tag) {
                if (!tag || !String(tag).trim()) {
                    return;
                }

                state.highlightedText = state.highlightedText.trim() ? `${state.highlightedText}, ${tag}` : String(tag);
                await onHighlightedTextChanged(state.highlightedText);
            }

            async function removeFromAllTags(tag) {
                if (!tag || !String(tag).trim()) {
                    return;
                }

                for (const image of state.images) {
                    const index = image.tags.findIndex((item) => item.toLowerCase() === tag.toLowerCase());
                    if (index < 0) {
                        continue;
                    }

                    image.tags.splice(index, 1);
                    image.isChanged = true;
                    highlightTags(image);
                    await saveTags(image);
                }

                await countTags();
                render();
            }

            async function addTagToFilteredImages(tag) {
                const normalizedTag = String(tag ?? "").trim();
                if (!normalizedTag) {
                    return;
                }

                let changedCount = 0;
                for (const image of state.images.filter((item) => item.visible)) {
                    if (includesCI(image.tags, normalizedTag)) {
                        continue;
                    }

                    image.tags.push(normalizedTag);
                    image.tags = getOrderedTagsList(image.tags);
                    image.isChanged = true;
                    highlightTags(image);
                    await saveTags(image);
                    changedCount += 1;
                }

                if (changedCount > 0) {
                    log(`Added "${normalizedTag}" to ${changedCount} visible image prompts.`);
                    await countTags(false);
                } else {
                    log(`No visible prompts needed "${normalizedTag}".`);
                }

                render();
            }

            async function renameTagAcrossImages(oldTag, newTag) {
                const from = String(oldTag ?? "").trim();
                const to = String(newTag ?? "").trim();

                if (!from || !to || from.toLowerCase() === to.toLowerCase()) {
                    return;
                }

                let changedCount = 0;
                for (const image of state.images) {
                    let imageChanged = false;
                    image.tags = image.tags.map((tag) => {
                        if (tag.toLowerCase() === from.toLowerCase()) {
                            imageChanged = true;
                            return to;
                        }
                        return tag;
                    });

                    if (!imageChanged) {
                        continue;
                    }

                    image.tags = distinctCI(getOrderedTagsList(image.tags));
                    image.isChanged = true;
                    highlightTags(image);
                    await saveTags(image);
                    changedCount += 1;
                }

                if (changedCount > 0) {
                    log(`Renamed "${from}" to "${to}" in ${changedCount} prompts.`);
                    await countTags(false);
                } else {
                    log(`Tag "${from}" was not found in loaded prompts.`);
                }

                render();
            }

            async function promptRenameTag(oldTag) {
                if (!oldTag || !String(oldTag).trim()) {
                    return;
                }

                const replacement = window.prompt(`Rename tag "${oldTag}" to:`, oldTag);
                if (replacement === null) {
                    return;
                }

                await renameTagAcrossImages(oldTag, replacement);
            }

            async function scrollToImage() {
                if (!state.imageNumber || state.imageNumber <= 0) {
                    return;
                }

                let targetNumber = Math.min(state.imageNumber, state.images.length);
                while (targetNumber > 0 && !state.images[targetNumber - 1].visible) {
                    targetNumber -= 1;
                }

                if (targetNumber <= 0) {
                    return;
                }

                const element = document.getElementById(`image-anton-id-${targetNumber}`);
                if (element) {
                    element.scrollIntoView({ behavior: "smooth", block: "start" });
                }
            }

            function removeTagsMatchingRegex(imageName, tags, regexPatterns) {
                const removedTags = [];
                const compiled = [];

                for (const pattern of regexPatterns) {
                    try {
                        compiled.push(new RegExp(pattern));
                    } catch (error) {
                        log(`Invalid script regex "${pattern}" skipped.`);
                    }
                }

                const filtered = tags.filter((tag) => {
                    const matches = compiled.some((pattern) => pattern.test(tag));
                    if (matches) {
                        removedTags.push(tag);
                    }
                    return !matches;
                });

                if (removedTags.length) {
                    log(`Image ${imageName}: removed tags: ${removedTags.join(", ")}`);
                }

                return filtered;
            }

            async function executeTagsFilter() {
                for (let index = 0; index < state.images.length; index += 1) {
                    const image = state.images[index];
                    log(`ExecuteTagsFilter ${index + 1}/${state.images.length}`);
                    image.tags = removeTagsMatchingRegex(image.fileName, image.tags, state.scriptRemoveTags);
                    highlightTags(image);
                    await saveTags(image);
                }

                render();
            }

            async function replaceArtist() {
                for (let index = 0; index < state.images.length; index += 1) {
                    const image = state.images[index];
                    log(`ReplaceArtist ${index + 1}/${state.images.length}`);
                    image.tags = image.tags.map((tag) => tag.replace(/^artist:(.*)$/i, "by $1"));
                    highlightTags(image);
                    await saveTags(image);
                }

                render();
            }

            async function renameFiles() {
                if (!state.imagesDirHandle) {
                    return;
                }

                try {
                    const conflicts = [];
                    const originalTagsDir = await getOriginalTagsDirectoryHandle(false);

                    for (let index = 0; index < state.images.length; index += 1) {
                        const image = state.images[index];
                        const newImageName = `${index + 1}${image.fileName.slice(image.fileName.lastIndexOf("."))}`;
                        const newTagName = `${index + 1}${image.tagFileName.slice(image.tagFileName.lastIndexOf("."))}`;
                        const originalBackupHandle = await getOriginalTagsBackupHandle(image, originalTagsDir);

                        if (newImageName !== image.fileName && await fileExists(state.imagesDirHandle, newImageName)) {
                            conflicts.push(newImageName);
                        }

                        if (image.tagHandle && newTagName !== image.tagFileName && await fileExists(state.imagesDirHandle, newTagName)) {
                            conflicts.push(newTagName);
                        }

                        if (originalBackupHandle && originalTagsDir && newTagName !== image.tagFileName && await fileExists(originalTagsDir, newTagName)) {
                            conflicts.push(`${originalTagsBackupPath}/${newTagName}`);
                        }
                    }

                    if (conflicts.length) {
                        log(`Rename aborted. Existing files: ${conflicts.join(", ")}`);
                        render();
                        return;
                    }

                    for (let index = 0; index < state.images.length; index += 1) {
                        const image = state.images[index];
                        const newImageName = `${index + 1}${image.fileName.slice(image.fileName.lastIndexOf("."))}`;
                        const newTagName = `${index + 1}${image.tagFileName.slice(image.tagFileName.lastIndexOf("."))}`;
                        const originalBackupHandle = await getOriginalTagsBackupHandle(image, originalTagsDir);

                        if (newImageName !== image.fileName) {
                            await copyFileToDirectory(image.fileHandle, state.imagesDirHandle, newImageName);
                            await state.imagesDirHandle.removeEntry(image.fileName);
                        }

                        if (image.tagHandle && newTagName !== image.tagFileName) {
                            await copyFileToDirectory(image.tagHandle, state.imagesDirHandle, newTagName);
                            await state.imagesDirHandle.removeEntry(image.tagFileName);
                        }

                        if (originalBackupHandle && originalTagsDir && newTagName !== image.tagFileName) {
                            await copyFileToDirectory(originalBackupHandle, originalTagsDir, newTagName);
                            await originalTagsDir.removeEntry(image.tagFileName);
                        }
                    }

                    log("Renamed files using the current image order.");
                    await loadImages(false);
                } catch (error) {
                    console.error(error);
                    log("Rename files failed.");
                    render();
                }
            }

            async function getBitmapFromBlob(blob) {
                if (typeof createImageBitmap === "function") {
                    return await createImageBitmap(blob);
                }

                return await new Promise((resolve, reject) => {
                    const image = new Image();
                    image.onload = () => resolve(image);
                    image.onerror = reject;
                    image.src = URL.createObjectURL(blob);
                });
            }

            function getBestResolution(width, height) {
                const aspectRatio = width / height;
                let bestResolution = resizeResolutions[11];
                let bestDiff = Number.POSITIVE_INFINITY;

                for (const resolution of resizeResolutions) {
                    const diff = Math.abs(aspectRatio - resolution.width / resolution.height);
                    if (diff < bestDiff) {
                        bestResolution = resolution;
                        bestDiff = diff;
                    }
                }

                return bestResolution;
            }

            async function resizeImageFile(file, extension) {
                const bitmap = await getBitmapFromBlob(file);
                const bestResolution = getBestResolution(bitmap.width, bitmap.height);
                const canvas = document.createElement("canvas");
                canvas.width = bestResolution.width;
                canvas.height = bestResolution.height;

                const context = canvas.getContext("2d", { alpha: false });
                context.fillStyle = "#ffffff";
                context.fillRect(0, 0, canvas.width, canvas.height);
                context.imageSmoothingEnabled = true;
                context.imageSmoothingQuality = "high";
                context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

                if (typeof bitmap.close === "function") {
                    bitmap.close();
                }

                const mimeType = extension.toLowerCase() === ".png" ? "image/png" : "image/jpeg";
                return await new Promise((resolve) => {
                    canvas.toBlob((blob) => resolve(blob), mimeType, 0.95);
                });
            }

            async function imageProcess() {
                if (!state.imagesDirHandle) {
                    return;
                }

                if (await directoryExists(state.imagesDirHandle, "__output")) {
                    log("Please remove __output folder before processing. Abort.");
                    render();
                    return;
                }

                const outputDir = await state.imagesDirHandle.getDirectoryHandle("__output", { create: true });

                for (let index = 0; index < state.images.length; index += 1) {
                    const image = state.images[index];
                    log(`ImageProcess ${index + 1}/${state.images.length}`);
                    const sourceFile = await image.fileHandle.getFile();
                    const extension = image.fileName.slice(image.fileName.lastIndexOf("."));
                    const blob = await resizeImageFile(sourceFile, extension);
                    const targetHandle = await outputDir.getFileHandle(image.fileName, { create: true });
                    await writeToFileHandle(targetHandle, blob);
                }

                log("Created resized images inside __output.");
                render();
            }

            function getCaretPosition(element) {
                const selection = window.getSelection();
                let position = 0;

                if (selection && selection.rangeCount > 0) {
                    const range = selection.getRangeAt(0);
                    const preCaretRange = range.cloneRange();
                    preCaretRange.selectNodeContents(element);
                    preCaretRange.setEnd(range.endContainer, range.endOffset);
                    position = preCaretRange.toString().length;
                }

                autocomplete.lastCaretPosition = position;
                return position;
            }

            function getWordAtCaret(element, position, updatePosition = false) {
                const text = element.innerText;
                const leftText = text.substring(0, position);
                const rightText = text.substring(position);

                let start = leftText.lastIndexOf(",");
                let end = rightText.indexOf(",");

                if (updatePosition) {
                    autocomplete.lastCommaPosition = start;
                }

                end = end < 0 ? rightText.length : end;
                const leftPart = start >= 0 ? leftText.substring(start + 1) : leftText;
                return `${leftPart}${rightText.substring(0, end)}`.trim();
            }

            function getTextNodeAtOffset(root, offset) {
                const nodeStack = [root];
                let currentOffset = 0;

                while (nodeStack.length) {
                    const node = nodeStack.pop();
                    if (node.nodeType === Node.TEXT_NODE) {
                        if (currentOffset + node.length >= offset) {
                            return { node, offset: offset - currentOffset };
                        }
                        currentOffset += node.length;
                    } else if (node.nodeType === Node.ELEMENT_NODE && node.childNodes.length > 0) {
                        for (let index = node.childNodes.length - 1; index >= 0; index -= 1) {
                            nodeStack.push(node.childNodes[index]);
                        }
                    }
                }

                return { node: null, offset: 0 };
            }

            function setCaretPosition(element, position) {
                const range = document.createRange();
                const selection = window.getSelection();
                const textNode = getTextNodeAtOffset(element, position);

                if (textNode.node && selection) {
                    range.setStart(textNode.node, textNode.offset);
                    range.setEnd(textNode.node, textNode.offset);
                    selection.removeAllRanges();
                    selection.addRange(range);
                }
            }

            function getCaretCoordinates(element, position) {
                const range = document.createRange();
                const textNode = getTextNodeAtOffset(element, position);
                if (!textNode.node) {
                    const rect = element.getBoundingClientRect();
                    return { left: rect.left, bottom: rect.bottom };
                }

                range.setStart(textNode.node, textNode.offset);
                range.setEnd(textNode.node, textNode.offset);

                const rect = range.getBoundingClientRect();
                return {
                    left: rect.left + window.scrollX,
                    bottom: rect.bottom + window.scrollY
                };
            }

            function hideSuggestions() {
                autocomplete.suggestions = [];
                autocomplete.selectedIndex = 0;
                autocomplete.activeEditor = null;
                autocomplete.activeImageId = null;
                state.popupVisible = false;

                const popup = document.getElementById("autocomplete-popup");
                if (popup) {
                    popup.style.display = "none";
                    popup.innerHTML = "";
                }
            }

            function filterSuggestions(word) {
                autocomplete.selectedIndex = 0;
                if (!word) {
                    autocomplete.suggestions = [];
                    return [];
                }

                autocomplete.suggestions = state.autocompleteTags.filter((tag) => tag.toLowerCase().startsWith(word.toLowerCase()));
                return autocomplete.suggestions;
            }

            function updateSuggestionsPopup() {
                const popup = document.getElementById("autocomplete-popup");
                if (!popup) {
                    return;
                }

                if (!autocomplete.suggestions.length || !autocomplete.activeEditor) {
                    popup.style.display = "none";
                    popup.innerHTML = "";
                    state.popupVisible = false;
                    return;
                }

                popup.innerHTML = autocomplete.suggestions.map((suggestion, index) => `
                    <button
                        type="button"
                        class="autocomplete-item ${index === autocomplete.selectedIndex ? "selected" : ""}"
                        data-action="select-suggestion"
                        data-suggestion="${escapeHtml(suggestion)}"
                        title="${escapeHtml(`Autocomplete: ${suggestion}`)}"
                    >${escapeHtml(suggestion)}</button>
                `).join("");

                popup.style.display = "block";
                state.popupVisible = true;
            }

            function showSuggestions(editor, imageId, suggestions, caretPosition) {
                const popup = document.getElementById("autocomplete-popup");
                if (!popup) {
                    return;
                }

                autocomplete.activeEditor = editor;
                autocomplete.activeImageId = imageId;
                autocomplete.suggestions = suggestions;
                autocomplete.selectedIndex = 0;
                const rect = getCaretCoordinates(editor, caretPosition);
                popup.style.left = `${rect.left}px`;
                popup.style.top = `${rect.bottom + 6}px`;
                updateSuggestionsPopup();
            }

            function getCurrentSuggestion() {
                if (!autocomplete.suggestions.length) {
                    return "";
                }

                return autocomplete.suggestions[autocomplete.selectedIndex] ?? "";
            }

            function findDiffInLength(text) {
                const tags = text
                    .split(",")
                    .map((item) => item.trim())
                    .filter(Boolean);
                return text.length - tags.join(", ").length;
            }

            function setEditorHtml(editor, htmlText) {
                editor.innerHTML = htmlText;
                if (document.activeElement === editor) {
                    const text = editor.textContent;
                    const rightText = text.substring(autocomplete.lastCaretPosition);
                    let end = rightText.indexOf(",");
                    if (end <= 0) {
                        end = rightText.length;
                    }
                    setCaretPosition(editor, autocomplete.lastCaretPosition + end);
                }
            }

            function insertSuggestionIntoEditor(editor, suggestion, image) {
                const text = editor.innerText;
                const caretPosition = autocomplete.lastCommaPosition + 1;
                const leftText = text.substring(0, caretPosition);
                const rightText = text.substring(caretPosition);
                const start = leftText.lastIndexOf(",");
                const end = rightText.indexOf(",");
                const before = start >= 0 ? leftText.substring(0, start + 1) : "";
                const after = end >= 0 ? rightText.substring(end) : "";
                const resultText = `${before}${suggestion}${after}`;
                const formattedText = highlightEditorText(resultText);

                setEditorHtml(editor, formattedText);
                image.formattedTagsText = formattedText;
                image.isChanged = true;
                const diff = findDiffInLength(resultText);
                const position = before.length + suggestion.length - diff;
                autocomplete.lastCaretPosition = position;
                setCaretPosition(editor, position);
                hideSuggestions();
            }

            function insertTextIntoEditor(editor, text) {
                const selection = window.getSelection();
                if (!selection || selection.rangeCount === 0) {
                    return false;
                }

                const range = selection.getRangeAt(0);
                if (!editor.contains(range.commonAncestorContainer)) {
                    return false;
                }

                range.deleteContents();
                const textNode = document.createTextNode(text);
                range.insertNode(textNode);
                range.setStartAfter(textNode);
                range.collapse(true);
                selection.removeAllRanges();
                selection.addRange(range);
                return true;
            }

            function onEditorInput(editor) {
                const image = getImageById(editor.dataset.editorImageId);
                if (!image) {
                    return;
                }

                image.isChanged = true;
                image.isSaved = false;

                const caretPosition = getCaretPosition(editor);
                const word = getWordAtCaret(editor, caretPosition, true);
                const suggestions = filterSuggestions(word);

                if (suggestions.length) {
                    showSuggestions(editor, image.id, suggestions, caretPosition);
                } else {
                    hideSuggestions();
                }
            }

            async function onEditorBlur(editor) {
                const image = getImageById(editor.dataset.editorImageId);
                if (!image) {
                    return;
                }

                const text = editor.innerText;
                image.isChanged = true;
                image.tags = toTags(text);
                image.formattedTagsText = "";
                await onTagsChanged(image);
                hideSuggestions();
                render();
            }

            function updateSelectedSuggestion(direction) {
                const count = autocomplete.suggestions.length;
                if (!count) {
                    autocomplete.selectedIndex = 0;
                    return;
                }

                autocomplete.selectedIndex = (autocomplete.selectedIndex + direction + count) % count;
                updateSuggestionsPopup();
            }

            function setSelectedTagFromEditor(editor) {
                const image = getImageById(editor.dataset.editorImageId);
                if (!image) {
                    return;
                }

                image.selectedTag = getCurrentTagFromEditor(editor);
                syncSelectedTagField(image.id);
            }

            function renderHeaderTabButton(sectionId) {
                const section = getHeaderSectionMeta(sectionId);
                if (!section) {
                    return "";
                }

                return renderActionButton({
                    action: section.action,
                    title: `${section.title}. Drag left or right to reorder tabs.`,
                    icon: section.icon,
                    label: section.label,
                    small: true,
                    active: !isHeaderSectionCollapsed(sectionId),
                    draggable: true,
                    data: { headerSectionId: section.id },
                    extraClass: "header-tab"
                });
            }

            function renderScriptsPanel() {
                return `
                    <div class="toolbar-panel ${state.isCollapsedScripts ? "collapsed" : ""}">
                        <h3 class="toolbar-panel-title">Scripts</h3>
                        <p class="toolbar-panel-subtitle">Batch actions ported from the Blazor tool.</p>
                        <div class="panel-stack">
                            <div class="button-row">
                                ${renderActionButton({ action: "replace-artist", title: 'Replace every "artist:*" tag with "by *" across loaded prompts', icon: "replace", label: 'artist:* -> by *', variant: "btn-primary", small: true })}
                            </div>

                            <div class="field">
                                <label class="field-label" for="script-add-tag">Add tag to current filtered images</label>
                                ${renderRichTextField({ id: "script-add-tag", fieldKey: "script-add-tag", value: highlightEditorText(state.scriptAddTagText), placeholder: "Enter one tag to append to all visible images", singleLine: true })}
                            </div>

                            <div class="button-row">
                                ${renderActionButton({ action: "add-tag-to-filtered", title: "Add the entered tag to all currently visible images", icon: "plus", label: "Add To Visible", variant: "btn-primary", small: true })}
                            </div>

                            <div class="field">
                                <label class="field-label" for="script-remove-tags">RemoveThisTags</label>
                                ${renderRichTextField({ id: "script-remove-tags", fieldKey: "script-remove-tags", value: highlightEditorText(state.scriptRemoveTagsText), placeholder: "Enter regex tags separated by commas" })}
                            </div>

                            <div class="button-row">
                                ${renderActionButton({ action: "execute-tags-filter", title: "Remove tags matching the listed regex rules from all loaded prompts", icon: "filter", label: "Run Regex Cleanup", variant: "btn-primary", small: true })}
                                ${renderActionButton({ action: "rename-files", title: "Rename image files and tag files using the current visible order", icon: "pencil", label: "Rename Files", variant: "btn-primary", small: true })}
                                ${renderActionButton({ action: "image-process", title: "Resize images into the __output folder using the original resolution matching logic", icon: "resize", label: "Resize Images", variant: "btn-primary", small: true })}
                            </div>
                        </div>
                    </div>
                `;
            }

            function renderHeaderSection(sectionId) {
                switch (sectionId) {
                    case "config":
                        return `
                            <div class="toolbar-panel ${state.isConfigCollapsed1 ? "collapsed" : ""}">
                                <h3 class="toolbar-panel-title">Configuration</h3>
                                <p class="toolbar-panel-subtitle">Browser pickers remember the last granted location. If the browser only exposes a file or folder name, it is shown as a gray placeholder like &lt;config.json&gt; until you enter a full path.</p>
                                <div class="config-grid">
                                    <div class="field">
                                        <label class="field-label" for="config-file-name">
                                            <span>Configuration file path</span>
                                            <span class="field-note">${state.configFileHandleName ? `Browser label: ${escapeHtml(state.configFileHandleName)}` : "Browser label appears here when only a name is available."}</span>
                                        </label>
                                        <input id="config-file-name" class="control mono" type="text" placeholder="${escapeHtml(getPathFieldPlaceholder(state.configFileHandleName, "C:\\datasets\\project\\config.json"))}" title="${escapeHtml(getPathFieldTitle(state.configFileHandleName))}" value="${escapeHtml(state.configFilePath || "")}">
                                    </div>
                                    <div class="button-row end">
                                        ${renderActionButton({ action: "select-config-file", title: "Select a configuration JSON file", icon: "file", label: "Pick", variant: "btn-secondary", small: true })}
                                        ${renderActionButton({ action: "load-config", title: "Load configuration from the selected JSON file", icon: "load", label: "Load", variant: "btn-primary", small: true })}
                                        ${renderActionButton({ action: "save-config", title: "Save the current configuration to the original file", icon: "save", label: "Save", variant: "btn-success", small: true })}
                                        ${renderActionButton({ action: "download-config", title: "Download the current configuration JSON", icon: "load", label: "Download", variant: "btn-secondary", small: true })}
                                        ${renderActionButton({ action: "unload-all", title: "Unload the current configuration, folder, and loaded images", icon: "x", label: "Unload", variant: "btn-warning", small: true })}
                                    </div>
                                </div>

                                <div class="config-grid" style="margin-top:8px;">
                                    <div class="field">
                                        <label class="field-label" for="images-folder-name">
                                            <span>Images folder path</span>
                                            <span class="field-note">${state.imagesHandleName ? `Browser label: ${escapeHtml(state.imagesHandleName)}` : "Browser label appears here when only a name is available."}</span>
                                        </label>
                                        <input id="images-folder-name" class="control mono" type="text" placeholder="${escapeHtml(getPathFieldPlaceholder(state.imagesHandleName, "D:\\deep\\dataset\\images"))}" title="${escapeHtml(getPathFieldTitle(state.imagesHandleName))}" value="${escapeHtml(state.imagesPath || "")}">
                                    </div>
                                    <div class="button-row end">
                                        ${renderActionButton({ action: "load-images", title: "Load images and tag files from the selected folder", icon: "load", label: "Load", variant: "btn-primary", small: true })}
                                        ${renderActionButton({ action: "select-folder", title: "Select the images folder", icon: "folder", label: "Pick", variant: "btn-secondary", small: true })}
                                    </div>
                                </div>
                            </div>
                        `;
                    case "filter":
                        return `
                            <div class="toolbar-panel ${state.isFilterCollapsed2 ? "collapsed" : ""}">
                                <div class="field">
                                    <label class="field-label" for="tag-filter">
                                        <span>Filter tags</span>
                                        <span class="field-note">Press Enter to run</span>
                                    </label>
                                    ${renderRichTextField({ id: "tag-filter", fieldKey: "tag-filter", value: highlightEditorText(state.tagFilter), placeholder: "Enter tags separated by commas", small: true })}
                                    <div class="button-row">
                                        ${renderActionButton({ action: "toggle-filter-mode", title: `Switch filter mode. Current mode: ${state.isFilterRegex ? "regex" : "tag"}`, icon: state.isFilterRegex ? "regex" : "filter", label: state.isFilterRegex ? "Regex" : "Tags", variant: "btn-primary", small: true })}
                                        <span class="${state.isFilterRegex ? "" : "collapsed"}">
                                            ${renderActionButton({ action: "toggle-ignore-case", title: `Toggle regex ignore case. Current value: ${state.filterIgnoreCase}`, icon: "case", label: state.filterIgnoreCase ? "Aa" : "Case", variant: "btn-primary", small: true })}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        `;
                    case "common":
                        return `
                            <div class="toolbar-panel ${state.isCommonTagsCollapsed3 ? "collapsed" : ""}">
                                <div class="field">
                                    <label class="field-label" for="common-tags">Common tags</label>
                                    ${renderRichTextField({ id: "common-tags", fieldKey: "common-tags", value: highlightEditorText(state.commonTagsText), placeholder: "Enter common tags separated by commas" })}
                                </div>
                            </div>
                        `;
                    case "known":
                        return `
                            <div class="toolbar-panel ${state.isKnownTagsCollapsed4 ? "collapsed" : ""}">
                                <div class="field">
                                    <label class="field-label" for="known-tags">Known tags</label>
                                    ${renderRichTextField({ id: "known-tags", fieldKey: "known-tags", value: highlightEditorText(state.knownTagsText), placeholder: "Enter known tags separated by commas" })}
                                </div>
                            </div>
                        `;
                    case "highlighted-tags":
                        return `
                            <div class="toolbar-panel ${state.isHighlightedTagsCollapsed5 ? "collapsed" : ""}">
                                <div class="field">
                                    <label class="field-label" for="highlighted-tags">Highlight tags</label>
                                    ${renderRichTextField({ id: "highlighted-tags", fieldKey: "highlighted-tags", value: highlightEditorText(state.highlightedTagsText), placeholder: "Enter highlighted tags separated by commas" })}
                                </div>
                            </div>
                        `;
                    case "highlighted-text":
                        return `
                            <div class="toolbar-panel ${state.isHighlightedTextsCollapsed6 ? "collapsed" : ""}">
                                <div class="field">
                                    <label class="field-label" for="highlighted-text">Highlight text</label>
                                    ${renderRichTextField({ id: "highlighted-text", fieldKey: "highlighted-text", value: highlightEditorText(state.highlightedText), placeholder: "Enter highlighted text separated by commas" })}
                                </div>
                            </div>
                        `;
                    case "order":
                        return `
                            <div class="toolbar-panel ${state.isOrderOfTagsCollapsed7 ? "collapsed" : ""}">
                                <div class="field">
                                    <label class="field-label" for="order-tags">Order of tags</label>
                                    ${renderRichTextField({ id: "order-tags", fieldKey: "order-tags", value: highlightEditorText(state.orderOfTagsText), placeholder: "Enter tags separated by commas that should be placed first" })}
                                </div>
                            </div>
                        `;
                    case "scripts":
                        return renderScriptsPanel();
                    case "status":
                        return renderStatusPanel();
                    default:
                        return "";
                }
            }

            function renderHeader() {
                const orderedSections = normalizeHeaderSectionOrder(state.headerSectionOrder);

                return `
                    <div class="panel-card toolbar" style="${state.isHeaderVisible ? "" : "display:none;"}">
                        <div class="toolbar-top">
                            ${orderedSections.map((sectionId) => renderHeaderTabButton(sectionId)).join("")}
                            ${renderActionButton({ action: "toggle-all-panels", title: "Toggle all header subpanels", icon: "grid", label: "All", small: true, active: !state.isCollapsedAll, extraClass: "header-tab" })}
                        </div>

                        <div class="toolbar-sections">
                            ${orderedSections.map((sectionId) => renderHeaderSection(sectionId)).join("")}

                            <div class="button-row stretch">
                                <div class="button-row">
                                    ${renderActionButton({ action: "filter-images", title: "Show only images matching the current filter", icon: "search", label: "Filter", variant: "btn-primary", small: true })}
                                    ${renderActionButton({ action: "anti-filter-images", title: "Show images that do not match the current filter", icon: "x", label: "Anti", variant: "btn-primary", small: true })}
                                    ${renderActionButton({ action: "show-all-images", title: "Show all loaded images", icon: "eye", label: "All", variant: "btn-secondary", small: true })}
                                    ${renderActionButton({ action: "clear-filter", title: "Clear the current filter and show all images", icon: "minus", label: "Clear", variant: "btn-secondary", small: true })}
                                    ${renderActionButton({ action: "open-images-panel", title: "Open the image list panel", icon: "image", label: "Imgs", small: true, active: !state.isCollapsedImages })}
                                    ${renderActionButton({ action: "open-stat-panel", title: "Open the statistics panel and recalculate tag counts", icon: "chart", label: "Stat", small: true, active: !state.isCollapsedTagStat })}
                                </div>
                                <div class="button-row">
                                    <input id="image-number" class="control count-box" type="number" min="1" placeholder="#" value="${state.imageNumber > 0 ? escapeHtml(String(state.imageNumber)) : ""}">
                                    ${renderActionButton({ action: "scroll-image", title: "Scroll to the numbered visible image", icon: "jump", label: "Jump", variant: "btn-primary", small: true })}
                                    ${renderActionButton({ action: "recalc-tags", title: "Recalculate autocomplete tags from loaded prompts", icon: "refresh", label: "Recalc", variant: "btn-primary", small: true })}
                                    ${renderActionButton({ action: "hide-header", title: "Hide the top control panel", icon: "minus", label: "Hide", variant: "btn-primary", small: true })}
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            }

            function renderStatsSection() {
                const hiddenClass = state.isCollapsedTagStat ? "collapsed" : "";
                const rowsPerColumn = state.tagCountsGoodCount
                    ? state.tagCountsGoodCount / state.tagsStatisticsTableColumnsCount
                    : 0;

                return `
                    <section class="panel-card ${hiddenClass}">
                        <div class="section-heading">
                            <div>
                                <h2 class="section-title">Tag Statistics</h2>
                                <div class="section-subtitle">Grouped across the full loaded image set.</div>
                            </div>
                        </div>
                        <div class="section-body">
                            <div class="field" style="margin-bottom:12px;">
                                <label class="field-label"><span>AllTags</span><span class="field-note">Unique tags across the loaded image set</span></label>
                                ${renderRichTextField({
                                    value: distinctCI(state.images.flatMap((image) => image.tags)).map((tag) => formatTag(tag)).join(", "),
                                    placeholder: "No tags loaded yet.",
                                    readonly: true
                                })}
                            </div>
                            ${state.tagCounts.length ? `
                                <div class="stats-grid">
                                    ${Array.from({ length: state.tagsStatisticsTableColumnsCount }, (_, columnIndex) => {
                                        const slice = state.tagCounts.slice(rowsPerColumn * columnIndex, rowsPerColumn * (columnIndex + 1));
                                        return `
                                            <div class="stats-table-wrap">
                                                <table>
                                                    <thead>
                                                        <tr>
                                                            <th style="width:56px;">Num</th>
                                                            <th>Tag</th>
                                                            <th style="width:72px;">Count</th>
                                                            <th style="width:220px;">Actions</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        ${slice.map((tag) => `
                                                            <tr>
                                                                <td>${tag.tag ? tag.num : ""}</td>
                                                                <td>${tag.tagFormatted || ""}</td>
                                                                <td>${tag.tag ? escapeHtml(String(tag.count)) : ""}</td>
                                                                <td>
                                                                    <div class="stats-actions">
                                                                        ${renderActionButton({ action: "filter-tag", title: `Filter images by tag "${tag.tag}"`, icon: "search", variant: "btn-primary", small: true, iconOnly: true, disabled: !tag.tag, data: { tag: tag.tag } })}
                                                                        ${renderActionButton({ action: "add-to-filter", title: `Append "${tag.tag}" to the current filter`, icon: "plus", variant: "btn-secondary", small: true, iconOnly: true, disabled: !tag.tag, data: { tag: tag.tag } })}
                                                                        ${renderActionButton({ action: "add-to-common", title: `Add "${tag.tag}" to common tags`, icon: "stack", variant: "btn-secondary", small: true, iconOnly: true, disabled: !tag.tag, data: { tag: tag.tag } })}
                                                                        ${renderActionButton({ action: "add-to-known", title: `Add "${tag.tag}" to known tags`, icon: "bookmark", variant: "btn-secondary", small: true, iconOnly: true, disabled: !tag.tag, data: { tag: tag.tag } })}
                                                                        ${renderActionButton({ action: "add-to-highlighted-tags", title: `Add "${tag.tag}" to highlighted tags`, icon: "spark", variant: "btn-secondary", small: true, iconOnly: true, disabled: !tag.tag, data: { tag: tag.tag } })}
                                                                        ${renderActionButton({ action: "add-to-highlighted-texts", title: `Add "${tag.tag}" to highlighted text search`, icon: "type", variant: "btn-secondary", small: true, iconOnly: true, disabled: !tag.tag, data: { tag: tag.tag } })}
                                                                        ${renderActionButton({ action: "rename-tag", title: `Rename tag "${tag.tag}" across all loaded prompts`, icon: "pencil", variant: "btn-primary", small: true, iconOnly: true, disabled: !tag.tag, data: { tag: tag.tag } })}
                                                                        ${renderActionButton({ action: "remove-from-all", title: `Remove tag "${tag.tag}" from all loaded prompts`, icon: "trash", variant: "btn-warning", small: true, iconOnly: true, disabled: !tag.tag, data: { tag: tag.tag } })}
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        `).join("")}
                                                    </tbody>
                                                </table>
                                            </div>
                                        `;
                                    }).join("")}
                                </div>
                            ` : `
                                <div class="empty-state">Open the statistics panel after loading images to calculate tag counts.</div>
                            `}
                        </div>
                    </section>
                `;
            }

            function renderTagChip({ labelHtml, action, tag, imageId, variant, prefix, title }) {
                return `
                    <button
                        type="button"
                        class="tag-chip ${variant || ""}"
                        data-action="${escapeHtml(action)}"
                        data-tag="${escapeHtml(tag)}"
                        ${imageId ? `data-image-id="${escapeHtml(imageId)}"` : ""}
                        title="${escapeHtml(title || "")}"
                    >
                        ${prefix ? `<span class="tag-chip-prefix ${prefix === "+" ? "plus" : "remove"}">${escapeHtml(prefix)}</span>` : ""}
                        <span>${labelHtml}</span>
                    </button>
                `;
            }

            function renderImagesSection() {
                const hiddenClass = state.isCollapsedImages ? "collapsed" : "";
                const rows = state.images.map((image, index) => {
                    if (!image.visible) {
                        return "";
                    }

                    const nonCommonTags = image.tags.filter((tag) => !state.commonTagsSet.has(tag.toLowerCase()));
                    const removedTags = image.removedTags.filter((tag) => !state.commonTagsSet.has(tag.toLowerCase()));
                    const selectedTagHidden = image.selectedTag ? "" : "collapsed";

                    return `
                        <div>
                            <div class="image-row" id="image-anton-id-${index + 1}">
                                <div class="image-index">${index + 1}</div>
                                <div class="thumb-wrap" title="${escapeHtml(image.fileName)}">
                                    <img class="thumb-media" src="${escapeHtml(image.objectUrl)}" alt="${escapeHtml(image.fileName)}" loading="lazy">
                                </div>

                                <div class="image-main">
                                    <div class="field">
                                        <label class="field-label"><span>AllTags</span><span class="field-note">Editable prompt for ${escapeHtml(image.fileName)}</span></label>
                                    </div>
                                    <div
                                        class="editor ${image.isChanged ? "changed" : ""} ${image.isSaved ? "saved" : ""}"
                                        contenteditable="true"
                                        spellcheck="false"
                                        data-editor-image-id="${escapeHtml(image.id)}"
                                    >${image.formattedTagsText || ""}</div>

                                    ${renderRichTextField({
                                        value: highlightEditorText(image.selectedTag || ""),
                                        placeholder: "Selected tag",
                                        imageId: image.id,
                                        small: true,
                                        extraClass: `selected-tag ${selectedTagHidden}`
                                    })}

                                    <div class="image-actions">
                                        ${renderActionButton({ action: "open-image", title: `Open ${image.fileName} in the page viewer with zoom and drag`, icon: "eye", variant: "btn-primary", small: true, iconOnly: true, data: { imageId: image.id } })}
                                        ${renderActionButton({ action: "save-tags", title: `Save tags for ${image.fileName}`, icon: "save", variant: "btn-success", small: true, iconOnly: true, data: { imageId: image.id } })}
                                        ${renderActionButton({ action: "undo-tags", title: `Restore ${image.fileName} tags from ${originalTagsBackupPath}`, icon: "undo", variant: "btn-warning", small: true, iconOnly: true, data: { imageId: image.id } })}
                                        ${renderActionButton({ action: "filter-selected-tag", title: `Filter images by the selected tag in ${image.fileName}`, icon: "search", variant: "btn-primary", small: true, iconOnly: true, data: { imageId: image.id } })}
                                        ${renderActionButton({ action: "add-selected-to-filter", title: `Append the selected tag in ${image.fileName} to the current filter`, icon: "plus", variant: "btn-secondary", small: true, iconOnly: true, data: { imageId: image.id } })}
                                        ${renderActionButton({ action: "copy-image-url", title: `Copy the current temporary viewer URL for ${image.fileName}`, icon: "open", variant: "btn-secondary", small: true, iconOnly: true, data: { imageId: image.id } })}
                                        ${renderActionButton({ action: "add-selected-to-common", title: `Add the selected tag in ${image.fileName} to common tags`, icon: "stack", variant: "btn-secondary", small: true, iconOnly: true, data: { imageId: image.id } })}
                                        ${renderActionButton({ action: "add-selected-to-known", title: `Add the selected tag in ${image.fileName} to known tags`, icon: "bookmark", variant: "btn-secondary", small: true, iconOnly: true, data: { imageId: image.id } })}
                                        ${renderActionButton({ action: "add-selected-to-highlighted-tags", title: `Add the selected tag in ${image.fileName} to highlighted tags`, icon: "spark", variant: "btn-secondary", small: true, iconOnly: true, data: { imageId: image.id } })}
                                        ${renderActionButton({ action: "add-selected-to-highlighted-texts", title: `Add the selected tag in ${image.fileName} to highlighted text search`, icon: "type", variant: "btn-secondary", small: true, iconOnly: true, data: { imageId: image.id } })}
                                        ${renderActionButton({ action: "remove-image", title: `Move ${image.fileName} and its tag file to __removed`, icon: "trash", variant: "btn-danger", small: true, iconOnly: true, data: { imageId: image.id } })}
                                    </div>
                                </div>

                                <div class="tags-column">
                                    <div class="tag-group">
                                        ${state.commonTags.map((commonTag) => {
                                            const hasTag = includesCI(image.tags, commonTag.tag);
                                            return renderTagChip({
                                                labelHtml: commonTag.formatted,
                                                action: "toggle-common-tag",
                                                tag: commonTag.tag,
                                                imageId: image.id,
                                                variant: hasTag ? "on" : "",
                                                prefix: hasTag ? "-" : "+",
                                                title: hasTag ? "Click to remove tag from image tags" : "Click to add tag to image tags"
                                            });
                                        }).join("")}
                                    </div>

                                    <hr class="tag-divider">

                                    <div class="tag-group">
                                        ${nonCommonTags.map((tag) => renderTagChip({
                                            labelHtml: getTagFormatImage(tag),
                                            action: "remove-tag-from-image",
                                            tag,
                                            imageId: image.id,
                                            variant: "",
                                            prefix: "-",
                                            title: "Click to remove tag from image tags"
                                        })).join("") || `<span class="dim">No non-common tags.</span>`}
                                    </div>

                                    <hr class="tag-divider">

                                    <div class="tag-group">
                                        ${removedTags.map((tag) => renderTagChip({
                                            labelHtml: getTagFormatImage(tag),
                                            action: "add-back-tag-to-image",
                                            tag,
                                            imageId: image.id,
                                            variant: "removed",
                                            prefix: "+",
                                            title: "Click to add tag back to image tags"
                                        })).join("") || `<span class="dim">No removed tags.</span>`}
                                    </div>
                                </div>
                            </div>
                        </div>
                    `;
                }).join("");

                return `
                    <section class="panel-card ${hiddenClass}">
                        <div class="section-heading">
                            <div>
                                <h2 class="section-title">Images</h2>
                                <div class="section-subtitle">${state.images.length} loaded. ${state.images.filter((image) => image.visible).length} currently visible.</div>
                            </div>
                        </div>
                        <div class="section-body">
                            ${rows || `<div class="empty-state">Load a folder to view images and tag text files.</div>`}
                        </div>
                    </section>
                `;
            }

            function renderImageViewer() {
                if (!state.viewer.isOpen) {
                    return "";
                }

                const image = getViewerImage();
                if (!image) {
                    return "";
                }

                return `
                    <div class="image-viewer-overlay" data-viewer-overlay="true">
                        <div class="image-viewer-shell" data-viewer-shell="true" role="dialog" aria-modal="true" aria-label="Image viewer">
                            <div class="image-viewer-bar">
                                <div class="image-viewer-info">
                                    <div class="image-viewer-title">${escapeHtml(image.fileName)}</div>
                                    <div class="image-viewer-subtitle">Wheel to zoom, drag to pan, double click to reset.</div>
                                </div>
                                <div class="image-viewer-actions">
                                    ${renderActionButton({ action: "viewer-zoom-out", title: "Zoom out", icon: "minus", variant: "btn-secondary", small: true, iconOnly: true })}
                                    <div id="image-viewer-scale" class="image-viewer-scale">${Math.round(state.viewer.scale * 100)}%</div>
                                    ${renderActionButton({ action: "viewer-zoom-in", title: "Zoom in", icon: "plus", variant: "btn-secondary", small: true, iconOnly: true })}
                                    ${renderActionButton({ action: "viewer-reset", title: "Reset zoom and pan", icon: "refresh", variant: "btn-secondary", small: true, iconOnly: true })}
                                    ${renderActionButton({ action: "close-viewer", title: "Close image viewer", icon: "x", variant: "btn-danger", small: true, iconOnly: true })}
                                </div>
                            </div>
                            <div id="image-viewer-viewport" class="image-viewer-viewport" data-viewer-viewport="true">
                                <div class="image-viewer-canvas">
                                    <img
                                        id="image-viewer-image"
                                        class="image-viewer-image"
                                        src="${escapeHtml(image.objectUrl)}"
                                        alt="${escapeHtml(image.fileName)}"
                                        draggable="false"
                                    >
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            }

            function renderUnsupportedBanner() {
                if (state.supportsFsAccess) {
                    return "";
                }

                return `
                    <div class="banner">
                        <h1 class="banner-title">Browser access is limited</h1>
                        <p>This single-file build uses the File System Access API for folder loading, tag saving, file moves, and resize output. Open this HTML in a Chromium browser such as Edge or Chrome to keep the desktop workflow intact.</p>
                    </div>
                `;
            }

            function renderStatusPanel() {
                return `
                    <div id="status-panel-root" class="toolbar-panel ${state.isStatusCollapsed8 ? "collapsed" : ""}">
                        <div class="status-card">
                            <div class="status-summary">
                                <div>
                                    <div class="status-pill">Status</div>
                                </div>
                                <div>${escapeHtml(state.statusMessage)}</div>
                                <div class="dim">${escapeHtml(`${state.images.length} images loaded`)}</div>
                            </div>
                            <div class="log-list">
                                ${state.logFilePath ? `
                                    <div class="log-line">
                                        <time>_logs</time>
                                        <div>${escapeHtml(`Writing session log to ${state.logFilePath}`)}</div>
                                    </div>
                                ` : ""}
                                ${state.logs.slice(-18).reverse().map((entry) => `
                                    <div class="log-line">
                                        <time>${escapeHtml(entry.stamp)}</time>
                                        <div>${escapeHtml(entry.message)}</div>
                                    </div>
                                `).join("") || `
                                    <div class="log-line">
                                        <time>--:--:--</time>
                                        <div>No activity yet.</div>
                                    </div>
                                `}
                            </div>
                        </div>
                    </div>
                `;
            }

            function refreshStatusPanel() {
                const panel = document.getElementById("status-panel-root");
                if (panel) {
                    panel.outerHTML = renderStatusPanel();
                }
            }

            function render() {
                if (disposed) {
                    return;
                }

                appRoot.innerHTML = `
                    ${renderUnsupportedBanner()}
                    ${renderHeader()}
                    <div class="show-toolbar-wrap ${state.isHeaderVisible ? "collapsed" : ""}">
                        ${renderActionButton({ action: "show-header", title: "Show the top control panel", icon: "show", label: "Show", variant: "btn-primary", small: true })}
                    </div>
                    <main class="page-stack">
                        ${renderStatsSection()}
                        ${renderImagesSection()}
                    </main>
                    ${renderImageViewer()}
                    <div id="autocomplete-popup" class="autocomplete-popup"></div>
                `;

                if (state.popupVisible && autocomplete.activeEditor) {
                    updateSuggestionsPopup();
                }

                if (state.viewer.isOpen) {
                    syncViewerTransform();
                } else {
                    document.body.style.overflow = "";
                }
            }

            async function restoreHandles() {
                const configHandle = await readHandle(handleKeys.configFile);
                const directoryHandle = await readHandle(handleKeys.imagesDirectory);
                const configPickerHandle = await readHandle(handleKeys.configPickerStart);
                const imagesPickerHandle = await readHandle(handleKeys.imagesPickerStart);

                state.configPickerHandle = configPickerHandle ?? configHandle ?? null;
                state.imagesPickerHandle = imagesPickerHandle ?? directoryHandle ?? null;
                state.configFileHandle = configHandle ?? null;
                state.imagesDirHandle = directoryHandle ?? null;

                const desiredConfigPath = state.configFilePath || (!state.configFileHandleName ? (localStorage.getItem(storageKeys.lastConfigName) || "") : "");
                const desiredImagesPath = state.imagesPath || (!state.imagesHandleName ? (localStorage.getItem(storageKeys.lastImagesName) || "") : "");

                await activatePersistedConfigHandle(desiredConfigPath, state.configFileHandleName);
                await activatePersistedImagesHandle(desiredImagesPath, state.imagesHandleName);
            }

            async function warmStartFromHandles() {
                if (state.tempConfigLoaded) {
                    if (state.imagesDirHandle && await ensurePermission(state.imagesDirHandle, "read")) {
                        await loadImages(false);
                    } else {
                        if (state.imagesPath || state.imagesHandleName) {
                            log(`Temporary configuration expects images folder ${getStoredLocationDisplay(state.imagesPath, state.imagesHandleName)}. Pick this folder once if browser access is not cached yet.`);
                        }
                        render();
                    }
                    return;
                }

                if (state.configFileHandle && await ensurePermission(state.configFileHandle, "read")) {
                    await loadConfiguration(false);
                    return;
                }

                if (state.imagesDirHandle && await ensurePermission(state.imagesDirHandle, "read")) {
                    await loadImages(false);
                } else {
                    render();
                }
            }

            async function handleAction(action, button) {
                const imageId = button?.dataset.imageId ?? "";
                const tag = button?.dataset.tag ?? "";
                const image = getImageById(imageId);
                if (image) {
                    syncImageDraftFromEditor(image);
                }
                const startMessage = getActionStartMessage(action, button, image, tag);

                if (startMessage && action !== "select-suggestion") {
                    log(startMessage);
                }

                switch (action) {
                    case "toggle-config":
                        state.isConfigCollapsed1 = !state.isConfigCollapsed1;
                        syncCollapsedAllState();
                        await saveConfiguration({});
                        break;
                    case "toggle-filter-panel":
                        state.isFilterCollapsed2 = !state.isFilterCollapsed2;
                        syncCollapsedAllState();
                        await saveConfiguration({});
                        break;
                    case "toggle-common-panel":
                        state.isCommonTagsCollapsed3 = !state.isCommonTagsCollapsed3;
                        syncCollapsedAllState();
                        await saveConfiguration({});
                        break;
                    case "toggle-known-panel":
                        state.isKnownTagsCollapsed4 = !state.isKnownTagsCollapsed4;
                        syncCollapsedAllState();
                        await saveConfiguration({});
                        break;
                    case "toggle-highlighted-tags-panel":
                        state.isHighlightedTagsCollapsed5 = !state.isHighlightedTagsCollapsed5;
                        syncCollapsedAllState();
                        await saveConfiguration({});
                        break;
                    case "toggle-highlighted-text-panel":
                        state.isHighlightedTextsCollapsed6 = !state.isHighlightedTextsCollapsed6;
                        syncCollapsedAllState();
                        await saveConfiguration({});
                        break;
                    case "toggle-order-panel":
                        state.isOrderOfTagsCollapsed7 = !state.isOrderOfTagsCollapsed7;
                        syncCollapsedAllState();
                        await saveConfiguration({});
                        break;
                    case "toggle-scripts-panel":
                        state.isCollapsedScripts = !state.isCollapsedScripts;
                        syncCollapsedAllState();
                        await saveConfiguration({});
                        break;
                    case "toggle-status-panel":
                        state.isStatusCollapsed8 = !state.isStatusCollapsed8;
                        syncCollapsedAllState();
                        await saveConfiguration({});
                        break;
                    case "toggle-all-panels":
                        if (state.isCollapsedAll) {
                            state.isConfigCollapsed1 = false;
                            state.isFilterCollapsed2 = false;
                            state.isCommonTagsCollapsed3 = false;
                            state.isKnownTagsCollapsed4 = false;
                            state.isHighlightedTagsCollapsed5 = false;
                            state.isHighlightedTextsCollapsed6 = false;
                            state.isOrderOfTagsCollapsed7 = false;
                            state.isCollapsedScripts = false;
                            state.isStatusCollapsed8 = false;
                        } else {
                            state.isConfigCollapsed1 = true;
                            state.isFilterCollapsed2 = true;
                            state.isCommonTagsCollapsed3 = true;
                            state.isKnownTagsCollapsed4 = true;
                            state.isHighlightedTagsCollapsed5 = true;
                            state.isHighlightedTextsCollapsed6 = true;
                            state.isOrderOfTagsCollapsed7 = true;
                            state.isCollapsedScripts = true;
                            state.isStatusCollapsed8 = true;
                        }
                        syncCollapsedAllState();
                        await saveConfiguration({});
                        break;
                    case "select-config-file":
                        await selectConfigFile();
                        break;
                    case "load-config":
                        await loadConfiguration(true);
                        break;
                    case "save-config":
                        await saveConfiguration({ promptIfMissing: true, saveToOriginal: true });
                        break;
                    case "download-config":
                        await downloadCurrentConfig();
                        break;
                    case "unload-all":
                        await fullyUnloadAll();
                        break;
                    case "select-folder":
                        await openFolderPicker();
                        break;
                    case "load-images":
                        await loadImages(true);
                        break;
                    case "toggle-filter-mode":
                        state.isFilterRegex = !state.isFilterRegex;
                        await saveConfiguration({});
                        break;
                    case "toggle-ignore-case":
                        state.filterIgnoreCase = !state.filterIgnoreCase;
                        await saveConfiguration({});
                        break;
                    case "filter-images":
                        await filterImages(true);
                        render();
                        break;
                    case "anti-filter-images":
                        await antiFilterImages();
                        break;
                    case "show-all-images":
                        showAllImages();
                        render();
                        break;
                    case "clear-filter":
                        clearFilter();
                        render();
                        break;
                    case "open-images-panel":
                        setMainSection("images");
                        await saveConfiguration({});
                        break;
                    case "open-stat-panel":
                        await countTags();
                        await saveConfiguration({});
                        break;
                    case "scroll-image":
                        await scrollToImage();
                        break;
                    case "recalc-tags":
                        recalculateAutoComplete(true);
                        render();
                        break;
                    case "hide-header":
                        state.isHeaderVisible = false;
                        render();
                        break;
                    case "show-header":
                        state.isHeaderVisible = true;
                        render();
                        break;
                    case "close-viewer":
                        closeImageViewer();
                        break;
                    case "viewer-zoom-in":
                        zoomImageViewer(1.2);
                        break;
                    case "viewer-zoom-out":
                        zoomImageViewer(1 / 1.2);
                        break;
                    case "viewer-reset":
                        resetViewerTransform();
                        break;
                    case "filter-tag":
                        await filterTag(tag);
                        break;
                    case "add-to-filter":
                        await addToFilter(tag);
                        break;
                    case "add-to-common":
                        await addToCommon(tag);
                        break;
                    case "add-to-known":
                        await addToKnown(tag);
                        break;
                    case "add-to-highlighted-tags":
                        await addToHighlightedTags(tag);
                        break;
                    case "add-to-highlighted-texts":
                        await addToHighlightedTexts(tag);
                        break;
                    case "remove-from-all":
                        await removeFromAllTags(tag);
                        break;
                    case "rename-tag":
                        await promptRenameTag(tag);
                        break;
                    case "save-tags":
                        if (image) {
                            await saveTags(image);
                            render();
                        }
                        break;
                    case "undo-tags":
                        if (image) {
                            await restoreOriginalTags(image);
                            render();
                        }
                        break;
                    case "open-image":
                        if (image) {
                            await openImageInBrowser(image);
                        }
                        break;
                    case "copy-image-url":
                        if (image) {
                            await copyImageUrl(image);
                        }
                        break;
                    case "filter-selected-tag":
                        if (image) {
                            await filterTag(image.selectedTag);
                        }
                        break;
                    case "add-selected-to-filter":
                        if (image) {
                            await addToFilter(image.selectedTag);
                        }
                        break;
                    case "add-selected-to-common":
                        if (image) {
                            await addToCommon(image.selectedTag);
                        }
                        break;
                    case "add-selected-to-known":
                        if (image) {
                            await addToKnown(image.selectedTag);
                        }
                        break;
                    case "add-selected-to-highlighted-tags":
                        if (image) {
                            await addToHighlightedTags(image.selectedTag);
                        }
                        break;
                    case "add-selected-to-highlighted-texts":
                        if (image) {
                            await addToHighlightedTexts(image.selectedTag);
                        }
                        break;
                    case "remove-image":
                        if (image) {
                            await removeImage(image);
                        }
                        break;
                    case "toggle-common-tag":
                        await toggleCommonTag(image, tag);
                        break;
                    case "remove-tag-from-image":
                        await removeTagFromImage(image, tag);
                        break;
                    case "add-back-tag-to-image":
                        await addBackTagToImage(image, tag);
                        break;
                    case "replace-artist":
                        await replaceArtist();
                        break;
                    case "add-tag-to-filtered":
                        await addTagToFilteredImages(state.scriptAddTagText);
                        break;
                    case "execute-tags-filter":
                        await executeTagsFilter();
                        break;
                    case "rename-files":
                        await renameFiles();
                        break;
                    case "image-process":
                        await imageProcess();
                        break;
                    case "select-suggestion":
                        if (autocomplete.activeEditor) {
                            const activeImage = getImageById(autocomplete.activeImageId);
                            if (activeImage) {
                                insertSuggestionIntoEditor(autocomplete.activeEditor, button.dataset.suggestion ?? "", activeImage);
                            }
                        }
                        break;
                    default:
                        break;
                }
            }

            addManagedEventListener(appRoot, "mousedown", (event) => {
                const suggestion = event.target.closest("[data-action='select-suggestion']");
                if (suggestion) {
                    event.preventDefault();
                    return;
                }

                const actionButton = event.target.closest("[data-action]");
                if (actionButton && actionButton.dataset.imageId) {
                    captureSelectedTagForButton(actionButton);
                    event.preventDefault();
                }
            });

            addManagedEventListener(appRoot, "dragstart", (event) => {
                const tab = event.target.closest("[data-header-section-id]");
                if (!tab || !event.dataTransfer) {
                    return;
                }

                state.headerDragSectionId = tab.dataset.headerSectionId ?? "";
                if (!state.headerDragSectionId) {
                    return;
                }

                event.dataTransfer.effectAllowed = "move";
                event.dataTransfer.setData("text/plain", state.headerDragSectionId);
                clearHeaderDragMarkers();
                tab.classList.add("dragging");
            });

            addManagedEventListener(appRoot, "dragover", (event) => {
                const tab = event.target.closest("[data-header-section-id]");
                if (!tab || !state.headerDragSectionId || tab.dataset.headerSectionId === state.headerDragSectionId) {
                    return;
                }

                event.preventDefault();
                clearHeaderDragMarkers();
                const rect = tab.getBoundingClientRect();
                const insertBefore = event.clientX < rect.left + rect.width / 2;
                tab.classList.add(insertBefore ? "drop-before" : "drop-after");
            });

            addManagedEventListener(appRoot, "drop", async (event) => {
                const tab = event.target.closest("[data-header-section-id]");
                if (!tab || !state.headerDragSectionId || tab.dataset.headerSectionId === state.headerDragSectionId) {
                    clearHeaderDragMarkers();
                    state.headerDragSectionId = "";
                    return;
                }

                event.preventDefault();
                const rect = tab.getBoundingClientRect();
                const insertBefore = event.clientX < rect.left + rect.width / 2;
                const moved = moveHeaderSection(state.headerDragSectionId, tab.dataset.headerSectionId ?? "", insertBefore);
                clearHeaderDragMarkers();
                state.headerDragSectionId = "";
                if (moved) {
                    await saveConfiguration({});
                } else {
                    render();
                }
            });

            addManagedEventListener(appRoot, "dragend", () => {
                clearHeaderDragMarkers();
                state.headerDragSectionId = "";
            });

            addManagedEventListener(appRoot, "click", async (event) => {
                const viewerOverlay = event.target.closest("[data-viewer-overlay='true']");
                if (viewerOverlay && !event.target.closest("[data-viewer-shell='true']") && state.viewer.isOpen) {
                    closeImageViewer();
                    return;
                }

                const actionButton = event.target.closest("[data-action]");
                if (actionButton) {
                    event.preventDefault();
                    await handleAction(actionButton.dataset.action, actionButton);
                    return;
                }

                const editor = event.target.closest("[data-editor-image-id]");
                if (editor) {
                    window.setTimeout(() => {
                        setSelectedTagFromEditor(editor);
                    }, 0);
                }
            });

            addManagedEventListener(appRoot, "pointerdown", (event) => {
                const viewerViewport = event.target.closest("[data-viewer-viewport='true']");
                if (viewerViewport) {
                    event.preventDefault();
                    startViewerDrag(event);
                }
            });

            addManagedEventListener(appRoot, "dblclick", (event) => {
                const viewerViewport = event.target.closest("[data-viewer-viewport='true']");
                if (viewerViewport && state.viewer.isOpen) {
                    event.preventDefault();
                    resetViewerTransform();
                }
            });

            addManagedEventListener(appRoot, "mouseup", (event) => {
                const editor = event.target.closest("[data-editor-image-id]");
                if (editor) {
                    window.setTimeout(() => {
                        setSelectedTagFromEditor(editor);
                    }, 0);
                }
            });

            addManagedEventListener(appRoot, "keyup", (event) => {
                const editor = event.target.closest("[data-editor-image-id]");
                if (editor) {
                    setSelectedTagFromEditor(editor);
                }
            });

            addManagedEventListener(appRoot, "input", (event) => {
                const target = event.target;

                if (target.matches("#config-file-name")) {
                    state.configFilePath = target.value;
                    return;
                }

                if (target.matches("#images-folder-name")) {
                    state.imagesPath = target.value;
                    return;
                }

                if (target.matches("[data-text-field-id]")) {
                    const value = getEditableText(target);
                    switch (target.dataset.textFieldId) {
                        case "tag-filter":
                            state.tagFilter = value;
                            return;
                        case "common-tags":
                            state.commonTagsText = value;
                            return;
                        case "known-tags":
                            state.knownTagsText = value;
                            return;
                        case "highlighted-tags":
                            state.highlightedTagsText = value;
                            return;
                        case "highlighted-text":
                            state.highlightedText = value;
                            return;
                        case "order-tags":
                            state.orderOfTagsText = value;
                            return;
                        case "script-remove-tags":
                            state.scriptRemoveTagsText = value;
                            return;
                        case "script-add-tag":
                            state.scriptAddTagText = value;
                            return;
                        default:
                            break;
                    }
                }

                if (target.matches("#tag-filter")) {
                    state.tagFilter = target.value;
                    return;
                }

                if (target.matches("#common-tags")) {
                    state.commonTagsText = target.value;
                    return;
                }

                if (target.matches("#known-tags")) {
                    state.knownTagsText = target.value;
                    return;
                }

                if (target.matches("#highlighted-tags")) {
                    state.highlightedTagsText = target.value;
                    return;
                }

                if (target.matches("#highlighted-text")) {
                    state.highlightedText = target.value;
                    return;
                }

                if (target.matches("#order-tags")) {
                    state.orderOfTagsText = target.value;
                    return;
                }

                if (target.matches("#script-remove-tags")) {
                    state.scriptRemoveTagsText = target.value;
                    return;
                }

                if (target.matches("#script-add-tag")) {
                    state.scriptAddTagText = target.value;
                    return;
                }

                if (target.matches("#image-number")) {
                    state.imageNumber = Number(target.value || 0);
                    return;
                }

                if (target.matches("[data-selected-tag-image-id]")) {
                    const image = getImageById(target.dataset.selectedTagImageId);
                    if (image) {
                        image.selectedTag = getEditableText(target);
                    }
                    return;
                }

                if (target.matches("[data-editor-image-id]")) {
                    onEditorInput(target);
                }
            });

            addManagedEventListener(appRoot, "wheel", (event) => {
                const viewerViewport = event.target.closest("[data-viewer-viewport='true']");
                if (!viewerViewport || !state.viewer.isOpen) {
                    return;
                }

                event.preventDefault();
                const multiplier = event.deltaY < 0 ? 1.12 : 1 / 1.12;
                zoomImageViewer(multiplier, event.clientX, event.clientY);
            }, { passive: false });

            addManagedEventListener(appRoot, "change", async (event) => {
                const target = event.target;

                if (target.matches("#config-file-name")) {
                    state.configFilePath = target.value.trim();
                    await rememberHandleForPath("config", state.configFileHandle, state.configFilePath);
                    await saveConfiguration({});
                    return;
                }

                if (target.matches("#images-folder-name")) {
                    state.imagesPath = target.value.trim();
                    await rememberHandleForPath("images", state.imagesDirHandle, state.imagesPath);
                    await saveConfiguration({});
                    return;
                }

                if (target.matches("#common-tags")) {
                    await onCommonTagsTextChanged(target.value);
                    return;
                }

                if (target.matches("#known-tags")) {
                    await onKnownTagsTextChanged(target.value);
                    return;
                }

                if (target.matches("#highlighted-tags")) {
                    await onHighlightedTagsTextChanged(target.value);
                    return;
                }

                if (target.matches("#highlighted-text")) {
                    await onHighlightedTextChanged(target.value);
                    return;
                }

                if (target.matches("#order-tags")) {
                    await onOrderedTagsTextChanged(target.value);
                    return;
                }

                if (target.matches("#script-remove-tags")) {
                    await onScriptRemoveTagsChanged(target.value);
                }
            });

            addManagedEventListener(appRoot, "keydown", async (event) => {
                const target = event.target;

                if (target.matches("#tag-filter") && event.key === "Enter") {
                    event.preventDefault();
                    state.tagFilter = target.matches("[data-text-field-id]") ? getEditableText(target) : target.value;
                    await filterImages(true);
                    render();
                    return;
                }

                if (target.matches("#script-add-tag") && event.key === "Enter") {
                    event.preventDefault();
                    state.scriptAddTagText = target.matches("[data-text-field-id]") ? getEditableText(target) : target.value;
                    await addTagToFilteredImages(state.scriptAddTagText);
                    return;
                }

                if (!target.matches("[data-editor-image-id]")) {
                    return;
                }

                if (event.key === " " && !event.ctrlKey && !event.altKey && !event.metaKey) {
                    event.preventDefault();

                    let inserted = false;
                    try {
                        if (typeof document.execCommand === "function") {
                            inserted = document.execCommand("insertText", false, " ");
                        }
                    } catch (error) {
                        inserted = false;
                    }

                    if (!inserted) {
                        inserted = insertTextIntoEditor(target, " ");
                    }

                    if (inserted) {
                        onEditorInput(target);
                    }
                    return;
                }

                if (!state.popupVisible) {
                    if (event.key === "Escape") {
                        hideSuggestions();
                    }
                    return;
                }

                if (event.key === "Escape") {
                    hideSuggestions();
                    event.preventDefault();
                    return;
                }

                if (event.key === "ArrowDown") {
                    event.preventDefault();
                    updateSelectedSuggestion(1);
                    return;
                }

                if (event.key === "ArrowUp") {
                    event.preventDefault();
                    updateSelectedSuggestion(-1);
                    return;
                }

                if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
                    hideSuggestions();
                    return;
                }

                if (event.key === "Enter" || event.key === "Tab") {
                    event.preventDefault();
                    const image = getImageById(target.dataset.editorImageId);
                    const suggestion = getCurrentSuggestion();
                    if (image && suggestion) {
                        const caretPosition = getCaretPosition(target);
                        autocomplete.lastCaretPosition = caretPosition;
                        insertSuggestionIntoEditor(target, suggestion, image);
                    }
                }
            });

            addManagedEventListener(appRoot, "blur", async (event) => {
                const target = event.target;
                if (target.matches("[data-editor-image-id]")) {
                    await onEditorBlur(target);
                    return;
                }

                if (target.matches("[data-selected-tag-image-id]")) {
                    const image = getImageById(target.dataset.selectedTagImageId);
                    if (image) {
                        image.selectedTag = getEditableText(target);
                    }
                    render();
                    return;
                }

                if (target.matches("[data-text-field-id]")) {
                    await commitRichTextField(target);
                }
            }, true);

            addManagedEventListener(document, "click", (event) => {
                const popup = document.getElementById("autocomplete-popup");
                if (!popup || !state.popupVisible) {
                    return;
                }

                if (popup.contains(event.target)) {
                    return;
                }

                const editor = autocomplete.activeEditor;
                if (editor && editor.contains(event.target)) {
                    return;
                }

                hideSuggestions();
            });

            addManagedEventListener(document, "pointermove", (event) => {
                updateViewerDrag(event);
            });

            addManagedEventListener(document, "pointerup", () => {
                stopViewerDrag();
            });

            addManagedEventListener(document, "pointercancel", () => {
                stopViewerDrag();
            });

            addManagedEventListener(document, "keydown", (event) => {
                if (!state.viewer.isOpen) {
                    return;
                }

                if (event.key === "Escape") {
                    event.preventDefault();
                    closeImageViewer();
                    return;
                }

                if (event.key === "+" || event.key === "=") {
                    event.preventDefault();
                    zoomImageViewer(1.2);
                    return;
                }

                if (event.key === "-") {
                    event.preventDefault();
                    zoomImageViewer(1 / 1.2);
                    return;
                }

                if (event.key === "0") {
                    event.preventDefault();
                    resetViewerTransform();
                }
            });

            async function boot() {
                state.headerSectionOrder = normalizeHeaderSectionOrder(state.headerSectionOrder);
                syncCollapsedAllState();
                render();
                await loadConfigFromLocalStorage();
                render();
                await restoreHandles();
                render();
                await warmStartFromHandles();
                render();
            }

            void boot();

            return () => {
                disposed = true;
                for (const removeListener of managedEventListeners.splice(0)) {
                    removeListener();
                }

                if (logPersistTimer) {
                    window.clearTimeout(logPersistTimer);
                    logPersistTimer = 0;
                }

                stopViewerDrag();
                document.body.style.overflow = "";
                hideSuggestions();
                void revokeImageUrls();
                appRoot.innerHTML = "";
            };
}
