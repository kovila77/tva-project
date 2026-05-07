<template>
  <span class="section-placement-buttons" @click.stop>
    <button
      class="section-placement-buttons__btn"
      type="button"
      :class="{ active: modelValue === headerValue }"
      :disabled="modelValue === headerValue"
      title="Show in header."
      aria-label="Show in header"
      @click.prevent="emit('update:modelValue', headerValue)"
    >
      <AppIcon name="arrowUp" class="icon" />
    </button>
    <button
      class="section-placement-buttons__btn"
      type="button"
      :class="{ active: modelValue === 'side' }"
      :disabled="modelValue === 'side'"
      title="Show in side panel."
      aria-label="Show in side panel"
      @click.prevent="emit('update:modelValue', 'side')"
    >
      <AppIcon name="bars" class="icon" />
    </button>
    <button
      v-if="allowHidden"
      class="section-placement-buttons__btn"
      type="button"
      :class="{ active: modelValue === 'hidden' }"
      :disabled="modelValue === 'hidden'"
      title="Hide."
      aria-label="Hide"
      @click.prevent="emit('update:modelValue', 'hidden')"
    >
      <AppIcon name="close" class="icon" />
    </button>
  </span>
</template>

<script setup lang="ts">
import AppIcon from "~/components/AppIcon.vue";

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
</script>

<style scoped lang="scss">
.section-placement-buttons {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 3px;

  &__btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    min-width: 22px;
    height: 22px;
    border: 0;
    border-radius: 4px;
    background: transparent;
    color: var(--muted);
    padding: 0;
    line-height: 1;

    &:hover:not(:disabled),
    &:focus-visible {
      color: var(--text);
    }

    &.active {
      background: var(--surface-soft);
      color: var(--text);
      cursor: default;
    }

    &:disabled {
      pointer-events: none;
    }

    .icon {
      width: 12px;
      height: 12px;
    }
  }
}
</style>
