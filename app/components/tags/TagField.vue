<template>
  <div class="field tag-field" :class="fieldClasses" :title="title">
    <div v-if="label || showHistoryButtons" class="tag-field__header">
      <span v-if="label" :id="labelId" class="tag-field__label">{{ label }}</span>
      <div v-if="showHistoryButtons" class="tag-field__actions">
        <AppIconButton
          class="tag-field__history-btn"
          icon="undo"
          title="Undo editor draft change."
          aria-label="Undo editor draft change"
          :disabled="!canUndoDraft"
          @mousedown.prevent
          @click="undoDraft"
        />
        <AppIconButton
          class="tag-field__history-btn"
          icon="redo"
          title="Redo editor draft change."
          aria-label="Redo editor draft change"
          :disabled="!canRedoDraft"
          @mousedown.prevent
          @click="redoDraft"
        />
      </div>
    </div>

    <div
      ref="editorHost"
      class="tag-field__editor"
      :class="editorClasses"
      :style="editorStyle"
      :aria-labelledby="label ? labelId : undefined"
    />

    <div
      v-if="showSelected"
      class="tag-field__selected"
      :title="selectedTagText ? `Selected tag: ${selectedTagText}` : 'Place the caret inside a tag to select it.'"
    >
      <span class="tag-field__selected-label">{{ selectedLabel }}</span>
      <strong>{{ selectedTagText || "No selected tag" }}</strong>
    </div>
  </div>
</template>

<script setup lang="ts">
import { autocompletion, completionKeymap, type Completion, type CompletionContext } from "@codemirror/autocomplete";
import { defaultKeymap, history, historyKeymap, redo, redoDepth, undo, undoDepth } from "@codemirror/commands";
import { Compartment, EditorState, Transaction, type Extension } from "@codemirror/state";
import { type DecorationSet, drawSelection, EditorView, keymap, placeholder as editorPlaceholder, ViewPlugin, type ViewUpdate } from "@codemirror/view";
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from "vue";
import AppIconButton from "~/components/core/AppIconButton.vue";
import type { TagTextFieldMode, TagTextStyleRule } from "~/types/imageTagger";
import {
  buildTagTextDecorations,
  getActiveTokenRange,
  getCompletionToken,
  getSelectedToken,
  normalizeSingleLineValue,
  valueString
} from "~/utils/tagTextEditor";

const props = withDefaults(defineProps<{
  label?: string;
  rows?: number;
  placeholder?: string;
  title?: string;
  mode?: TagTextFieldMode;
  autocomplete?: boolean;
  autocompleteItems?: string[];
  styleRules?: TagTextStyleRule[];
  selectable?: boolean;
  showSelected?: boolean;
  showHistoryButtons?: boolean;
  selectedLabel?: string;
}>(), {
  label: "",
  rows: 4,
  placeholder: "",
  title: "",
  mode: "tags",
  autocomplete: true,
  autocompleteItems: () => [],
  styleRules: () => [],
  selectable: false,
  showSelected: false,
  showHistoryButtons: false,
  selectedLabel: "Selected"
});

const model = defineModel<string>({ required: true });
const selectedTag = defineModel<string>("selectedTag", { default: "" });
const emit = defineEmits<{
  input: [value: string];
  focus: [];
  blur: [];
  commit: [];
  selectedChange: [value: string];
}>();

const editorHost = ref<HTMLElement | null>(null);
const editorView = shallowRef<EditorView | null>(null);
const canUndoDraft = ref(false);
const canRedoDraft = ref(false);
const focused = ref(false);
const selectedTagText = ref(valueString(selectedTag.value));
const labelId = `tag-field-${Math.random().toString(36).slice(2)}`;
let selectedTagActivated = false;

const styleCompartment = new Compartment();
const autocompleteCompartment = new Compartment();
const placeholderCompartment = new Compartment();
const keymapCompartment = new Compartment();
const lineWrappingCompartment = new Compartment();

const selectionEnabled = computed(() => props.selectable || props.showSelected);
const multiline = computed(() => props.mode !== "single-tag" && props.rows > 1);
const editorStyle = computed(() => ({
  "--tag-field-rows": String(Math.max(1, props.rows))
}));
const fieldClasses = computed(() => ({
  "tag-field--focused": focused.value,
  "tag-field--single-line": !multiline.value
}));
const editorClasses = computed(() => ({
  "tag-field__editor--single-line": !multiline.value,
  "tag-field__editor--focused": focused.value
}));
const autocompleteOptions = computed<Completion[]>(() => {
  const seen = new Set<string>();
  const options: Completion[] = [];

  for (const item of props.autocompleteItems) {
    const label = String(item ?? "").trim();
    const key = label.toLowerCase();
    if (!label || seen.has(key)) {
      continue;
    }

    seen.add(key);
    options.push({ label, type: "keyword" });
  }

  return options.sort((left, right) => left.label.localeCompare(right.label));
});

onMounted(() => {
  if (!editorHost.value) {
    return;
  }

  const state = EditorState.create({
    doc: valueString(model.value),
    extensions: [
      history(),
      drawSelection(),
      EditorState.tabSize.of(2),
      EditorView.contentAttributes.of({
        spellcheck: "false",
        autocorrect: "off",
        autocapitalize: "off"
      }),
      placeholderCompartment.of(createPlaceholderExtension()),
      lineWrappingCompartment.of(createLineWrappingExtension()),
      autocompleteCompartment.of(createAutocompleteExtension()),
      styleCompartment.of(createStyleExtension()),
      keymapCompartment.of(createKeymapExtension()),
      EditorView.updateListener.of(handleEditorUpdate),
      EditorView.domEventHandlers({
        blur: () => {
          focused.value = false;
          emit("blur");
        },
        focus: () => {
          focused.value = true;
          emit("focus");
        },
        pointerup: () => activateSelectedTagFromView(),
        keyup: (event) => {
          if (event.key !== "Tab") {
            activateSelectedTagFromView();
          }
        }
      })
    ]
  });

  editorView.value = new EditorView({
    state,
    parent: editorHost.value
  });
  updateDraftHistoryState();
});

onBeforeUnmount(() => {
  editorView.value?.destroy();
  editorView.value = null;
});

watch(
  () => model.value,
  (value) => {
    const view = editorView.value;
    if (!view) {
      return;
    }

    const nextValue = valueString(value);
    const currentValue = view.state.doc.toString();
    if (nextValue === currentValue) {
      return;
    }

    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: nextValue },
      annotations: Transaction.addToHistory.of(false)
    });
  }
);

watch(
  () => selectedTag.value,
  (value) => {
    selectedTagText.value = valueString(value);
  }
);

watch(
  () => [
    props.placeholder,
    props.mode,
    props.rows,
    props.autocomplete,
    props.autocompleteItems,
    props.styleRules
  ],
  () => reconfigureEditor(),
  { deep: true }
);

function createKeymapExtension(): Extension {
  return keymap.of([
    {
      key: "Mod-Enter",
      run: () => {
        emit("commit");
        return true;
      }
    },
    {
      key: "Enter",
      run: () => {
        if (multiline.value) {
          return false;
        }

        emit("commit");
        return true;
      }
    },
    ...completionKeymap,
    ...historyKeymap,
    ...defaultKeymap
  ]);
}

function createLineWrappingExtension(): Extension {
  return multiline.value ? EditorView.lineWrapping : [];
}

function createPlaceholderExtension(): Extension {
  return props.placeholder ? editorPlaceholder(props.placeholder) : [];
}

function createAutocompleteExtension(): Extension {
  if (!props.autocomplete) {
    return [];
  }

  return autocompletion({
    activateOnTyping: true,
    override: [completeTag]
  });
}

function createStyleExtension(): Extension {
  return ViewPlugin.fromClass(class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = buildDecorations(view);
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged || update.selectionSet) {
        this.decorations = buildDecorations(update.view);
      }
    }
  }, {
    decorations: (plugin) => plugin.decorations
  });
}

function reconfigureEditor(): void {
  const view = editorView.value;
  if (!view) {
    return;
  }

  view.dispatch({
    effects: [
      placeholderCompartment.reconfigure(createPlaceholderExtension()),
      lineWrappingCompartment.reconfigure(createLineWrappingExtension()),
      autocompleteCompartment.reconfigure(createAutocompleteExtension()),
      styleCompartment.reconfigure(createStyleExtension()),
      keymapCompartment.reconfigure(createKeymapExtension())
    ],
    annotations: Transaction.addToHistory.of(false)
  });
}

function handleEditorUpdate(update: ViewUpdate): void {
  const view = update.view;

  if (update.docChanged) {
    const nextValue = normalizeValueForMode(view.state.doc.toString());
    if (nextValue !== view.state.doc.toString()) {
      replaceEditorValue(nextValue, true);
      return;
    }

    if (model.value !== nextValue) {
      model.value = nextValue;
      emit("input", nextValue);
    }
  }

  if (update.docChanged || update.selectionSet) {
    updateSelectedTagFromView();
  }

  updateDraftHistoryState();
}

function replaceEditorValue(value: string, addToHistory: boolean): void {
  const view = editorView.value;
  if (!view) {
    return;
  }

  view.dispatch({
    changes: { from: 0, to: view.state.doc.length, insert: value },
    annotations: Transaction.addToHistory.of(addToHistory)
  });
}

function completeTag(context: CompletionContext) {
  const options = autocompleteOptions.value;
  if (!props.autocomplete || !options.length) {
    return null;
  }

  const token = getCompletionToken(context.state.doc.toString(), context.pos);
  if (!context.explicit && !token.text.trim()) {
    return null;
  }

  return {
    from: token.from,
    to: context.pos,
    options,
    validFor: /^[^,\n]*$/
  };
}

function updateDraftHistoryState(): void {
  const view = editorView.value;
  canUndoDraft.value = Boolean(view && undoDepth(view.state) > 0);
  canRedoDraft.value = Boolean(view && redoDepth(view.state) > 0);
}

function activateSelectedTagFromView(): void {
  const wasActivated = selectedTagActivated;
  selectedTagActivated = true;
  if (!wasActivated) {
    refreshStyleDecorations();
  }
  updateSelectedTagFromView();
}

function refreshStyleDecorations(): void {
  editorView.value?.dispatch({
    effects: styleCompartment.reconfigure(createStyleExtension())
  });
}

function updateSelectedTagFromView(): void {
  const view = editorView.value;
  if (!view || !selectionEnabled.value) {
    return;
  }

  if (!selectedTagActivated && !valueString(selectedTag.value)) {
    return;
  }

  const nextSelectedTag = getSelectedToken(view.state);
  if (selectedTagText.value !== nextSelectedTag) {
    selectedTagText.value = nextSelectedTag;
  }
  if (selectedTag.value !== nextSelectedTag) {
    selectedTag.value = nextSelectedTag;
    emit("selectedChange", nextSelectedTag);
  }
}

function undoDraft(): void {
  const view = editorView.value;
  if (view) {
    undo(view);
    updateDraftHistoryState();
    updateSelectedTagFromView();
  }
}

function redoDraft(): void {
  const view = editorView.value;
  if (view) {
    redo(view);
    updateDraftHistoryState();
    updateSelectedTagFromView();
  }
}

function focus(): void {
  editorView.value?.focus();
}

defineExpose({
  focus,
  undoDraft,
  redoDraft
});

function buildDecorations(view: EditorView): DecorationSet {
  const documentText = view.state.doc.toString();
  const activeRange = selectionEnabled.value && selectedTagActivated ? getActiveTokenRange(view.state) : null;
  return buildTagTextDecorations(documentText, activeRange, props.styleRules);
}

function normalizeValueForMode(value: string): string {
  if (multiline.value) {
    return value;
  }

  return normalizeSingleLineValue(value);
}
</script>

<style scoped lang="scss">
.tag-field {
  min-width: 0;

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--app-space-gap);
    min-width: 0;
  }

  &__label {
    min-width: 0;
    color: var(--muted);
    font-size: 12px;
    font-weight: 700;
    overflow-wrap: anywhere;
  }

  &__actions {
    display: inline-flex;
    align-items: center;
    gap: var(--app-space-layout);
    flex: 0 0 auto;
  }

  &__history-btn {
    --app-icon-button-size: 28px;
  }

  &__editor {
    width: 100%;
    min-height: 34px;
    overflow: hidden;
    border: 1px solid var(--border);
    border-radius: var(--control-radius);
    background: var(--surface-raised);
    color: var(--text);

    &:focus-within,
    &--focused {
      border-color: var(--blue);
      box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.14);
    }

    :deep(.cm-editor) {
      height: 100%;
      background: transparent;
      color: var(--text);
      outline: none;
    }

    :deep(.cm-focused) {
      outline: none;
    }

    :deep(.cm-scroller) {
      min-height: 34px;
      max-height: min(46vh, calc((var(--tag-field-rows, 4) * 1.45em) + 18px));
      overflow: auto;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
      font-size: 13px;
      line-height: 1.45;
    }

    :deep(.cm-content) {
      min-height: calc((var(--tag-field-rows, 4) * 1.45em) + 16px);
      padding: var(--app-space-panel);
      caret-color: var(--text);
    }

    :deep(.cm-line) {
      padding: 0;
    }

    :deep(.cm-placeholder) {
      color: var(--muted);
      opacity: 0.78;
    }

    &--single-line {
      :deep(.cm-scroller) {
        max-height: 34px;
        overflow: hidden;
      }

      :deep(.cm-content) {
        min-height: 32px;
        padding: var(--app-space-control-y) var(--app-space-control-x);
        white-space: pre;
      }
    }
  }

  &__selected {
    display: flex;
    align-items: center;
    gap: var(--app-space-gap);
    min-height: 30px;
    margin-top: 0;
    overflow: hidden;
    border: 1px solid var(--border);
    border-radius: var(--control-radius);
    background: var(--surface-soft);
    padding: min(var(--app-space-control-y), 5px) var(--app-space-control-x);

    strong {
      min-width: 0;
      overflow-wrap: anywhere;
      font-size: 12px;
    }
  }

  &__selected-label {
    color: var(--muted);
    font-size: 11px;
    font-weight: 800;
  }
}

:global(.tag-text-selected) {
  border-radius: calc(var(--control-radius) / 2);
  background: rgba(56, 189, 248, 0.22);
  box-shadow: 0 0 0 1px rgba(56, 189, 248, 0.3);
}

:global(.tag-text-common) {
  font-style: italic;
}

:global(.tag-text-unknown) {
  text-decoration-line: underline;
  text-decoration-style: wavy;
  text-decoration-color: var(--red);
  text-underline-offset: 3px;
}

:global(.tag-text-highlighted) {
  border-radius: calc(var(--control-radius) / 2);
  box-shadow: 0 0 0 2px var(--green);
}

:global(.tag-text-fragment-highlighted) {
  color: var(--amber) !important;
  font-weight: 850 !important;
}

:global(.tag-text-regex) {
  color: #c4b5fd;
}

:global(.tag-text-filtered-blink) {
  border-radius: calc(var(--control-radius) / 2);
  animation: filtered-tag-blink 0.48s ease-in-out 6;
}

:global(.cm-tooltip) {
  border: 1px solid var(--border-strong);
  background: var(--surface-raised);
  color: var(--text);
  box-shadow: var(--shadow);
}

:global(.cm-tooltip-autocomplete ul) {
  max-height: 240px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
}

:global(.cm-tooltip-autocomplete ul li[aria-selected]) {
  background: var(--blue);
  color: #fff;
}
</style>
