<template>
  <span class="section-placement-buttons" @click.stop>
    <AppIconButton
      class="section-placement-buttons__btn"
      icon="arrowUp"
      title="Show in header."
      aria-label="Show in header"
      :active="modelValue === headerValue"
      :disabled="modelValue === headerValue"
      @click.prevent="emit('update:modelValue', headerValue)"
    />
    <AppIconButton
      class="section-placement-buttons__btn"
      :icon="sideIcon"
      title="Show in side panel."
      aria-label="Show in side panel"
      :active="modelValue === 'side'"
      :disabled="modelValue === 'side'"
      @click.prevent="emit('update:modelValue', 'side')"
    />
    <AppIconButton
      v-if="allowHidden"
      class="section-placement-buttons__btn"
      icon="close"
      title="Hide."
      aria-label="Hide"
      :active="modelValue === 'hidden'"
      :disabled="modelValue === 'hidden'"
      @click.prevent="emit('update:modelValue', 'hidden')"
    />
  </span>
</template>

<script setup lang="ts">
import { computed } from "vue";
import AppIconButton from "~/components/core/AppIconButton.vue";
import { useImageTaggerContext } from "~/composables/useImageTagger";
import type { AppIconName } from "~/utils/icons";

withDefaults(defineProps<{
  modelValue: "header" | "top" | "side" | "hidden";
  headerValue?: "header" | "top";
  allowHidden?: boolean;
}>(), {
  headerValue: "header",
  allowHidden: false
});

const emit = defineEmits<{
  "update:modelValue": [value: "header" | "top" | "side" | "hidden"];
}>();

const { config } = useImageTaggerContext();
const sideIcon = computed<AppIconName>(() => config.sidePanelPosition === "right" ? "arrowRight" : "arrowLeft");
</script>

<style scoped lang="scss">
.section-placement-buttons {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  gap: min(var(--app-space-layout), 3px);

  &__btn {
    --app-icon-button-size: 22px;
    --app-icon-button-radius: 4px;
    --app-icon-button-active-bg: var(--surface-soft);
    --app-icon-size: 12px;

    &:disabled {
      pointer-events: none;
    }
  }
}
</style>
