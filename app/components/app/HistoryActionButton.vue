<template>
  <AppIconButton
    class="history-action-button"
    :class="buttonClasses"
    :icon="iconName"
    :title="title"
    :aria-label="label"
    :disabled="disabled"
    @click="runAction"
  />
</template>

<script setup lang="ts">
import { computed } from "vue";
import AppIconButton from "~/components/core/AppIconButton.vue";
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
  --app-icon-button-width: 34px;
  --app-icon-button-height: 32px;
  --app-icon-size: 1.25em;
  --app-icon-button-hover-transform: translateY(-1px);
  color: var(--text);

  :deep(.app-icon-button__icon) {
    height: 1.15em;
    stroke: currentColor;
    stroke-width: 18;
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
    color: var(--muted);
  }
}
</style>
