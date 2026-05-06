<template>
  <div class="field tag-field" :class="fieldClasses" :title="title">
    <div v-if="label || showHistoryButtons" class="tag-field-header">
      <span v-if="label" :id="labelId" class="tag-field-label">{{ label }}</span>
      <div v-if="showHistoryButtons" class="tag-field-actions">
        <button
          class="btn icon-btn tag-field-history-btn"
          type="button"
          title="Undo editor draft change."
          aria-label="Undo editor draft change"
          :disabled="!canUndoDraft"
          @mousedown.prevent
          @click="undoDraft"
        >
          <AppIcon name="undo" class="icon" />
        </button>
        <button
          class="btn icon-btn tag-field-history-btn"
          type="button"
          title="Redo editor draft change."
          aria-label="Redo editor draft change"
          :disabled="!canRedoDraft"
          @mousedown.prevent
          @click="redoDraft"
        >
          <AppIcon name="redo" class="icon" />
        </button>
      </div>
    </div>

    <div
      ref="editorHost"
      class="tag-field-editor"
      :class="editorClasses"
      :style="editorStyle"
      :aria-labelledby="label ? labelId : undefined"
    />

    <div
      v-if="showSelected"
      class="selected-tag-bar tag-field-selected"
      :title="selectedTagText ? `Selected tag: ${selectedTagText}` : 'Place the caret inside a tag to select it.'"
    >
      <span class="selected-label">{{ selectedLabel }}</span>
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
import AppIcon from "~/components/AppIcon.vue";
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
  "tag-field-focused": focused.value,
  "tag-field-single-line": !multiline.value
}));
const editorClasses = computed(() => ({
  "single-line": !multiline.value,
  "is-focused": focused.value
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
          updateSelectedTagFromView();
          emit("blur");
        },
        focus: () => {
          focused.value = true;
          updateSelectedTagFromView();
          emit("focus");
        },
        pointerup: () => updateSelectedTagFromView(),
        keyup: () => updateSelectedTagFromView()
      })
    ]
  });

  editorView.value = new EditorView({
    state,
    parent: editorHost.value
  });
  updateDraftHistoryState();
  updateSelectedTagFromView();
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

  if (update.docChanged || update.selectionSet || update.focusChanged) {
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

function updateSelectedTagFromView(): void {
  const view = editorView.value;
  if (!view || !selectionEnabled.value) {
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
  const activeRange = selectionEnabled.value ? getActiveTokenRange(view.state) : null;
  return buildTagTextDecorations(documentText, activeRange, props.styleRules);
}

function normalizeValueForMode(value: string): string {
  if (multiline.value) {
    return value;
  }

  return normalizeSingleLineValue(value);
}
</script>
