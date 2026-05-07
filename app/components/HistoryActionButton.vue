<template>
  <button
    class="history-action-button"
    :class="buttonClasses"
    type="button"
    :title="title"
    :aria-label="label"
    :disabled="disabled"
    @click="runAction"
  >
    <AppIcon :name="iconName" class="icon history-action-button__icon" />
  </button>
</template>

<script setup lang="ts">
import { computed } from "vue";
import AppIcon from "~/components/AppIcon.vue";
import { useImageTaggerContext } from "~/composables/useImageTagger";
import type { AppIconName } from "~/utils/icons";

type HistoryAction = "undo" | "redo";
type HistoryButtonVariant = "filled" | "plain";

const props = withDefaults(defineProps<{
  action: HistoryAction;
  variant?: HistoryButtonVariant;
}>(), {
  variant: "filled"
});

const {
  history,
  undoTitle,
  redoTitle,
  undoDataset,
  redoDataset
} = useImageTaggerContext();

const isUndo = computed(() => props.action === "undo");
const label = computed(() => isUndo.value ? "Undo" : "Redo");
const iconName = computed<AppIconName>(() => isUndo.value ? "undo" : "redo");
const title = computed(() => isUndo.value ? undoTitle.value : redoTitle.value);
const disabled = computed(() => isUndo.value ? !history.past.length : !history.future.length);
const buttonClasses = computed(() => ({
  "history-action-button--filled": props.variant === "filled",
  "history-action-button--plain": props.variant === "plain"
}));

function runAction(): void {
  if (isUndo.value) {
    undoDataset();
    return;
  }

  redoDataset();
}
</script>

<style scoped lang="scss">
.history-action-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  min-width: 34px;
  height: 32px;
  padding: 0;
  border-radius: 6px;
  color: var(--text);
  line-height: 1;
  transition: background 0.12s ease, border-color 0.12s ease, color 0.12s ease, transform 0.12s ease;

  &__icon {
    width: 1.25em;
    height: 1.15em;
    min-width: 1.25em;
    stroke: currentColor;
    stroke-width: 18;
  }

  &:hover:not(:disabled) {
    transform: translateY(-1px);
  }

  &--filled {
    border: 1px solid #f59e0b;
    background: var(--yellow-soft);
    color: #7c2d12;

    &:hover:not(:disabled) {
      border-color: var(--amber);
    }
  }

  &--plain {
    border: 0;
    background: transparent;
    color: var(--muted);

    &:hover:not(:disabled),
    &:focus-visible {
      color: var(--text);
    }
  }
}
</style>
