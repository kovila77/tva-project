<template>
  <button
    class="tag-chip"
    :class="[
      stateClasses,
      `tag-chip--${variant}`,
      { 'tag-chip--active': active }
    ]"
    type="button"
    :title="title"
    @click="emit('click')"
  >
    <AppIcon :name="icon" class="icon" />
    <span class="tag-chip__text">
      <span
        v-for="part in tagTextParts(tag)"
        :key="part.key"
        :class="{ 'tag-token--fragment-highlighted': part.highlighted }"
      >
        {{ part.text }}
      </span>
    </span>
  </button>
</template>

<script setup lang="ts">
import { computed } from "vue";
import AppIcon from "~/components/AppIcon.vue";
import { useImageTaggerContext } from "~/composables/useImageTagger";
import type { AppIconName } from "~/utils/icons";

const props = withDefaults(defineProps<{
  tag: string;
  icon: AppIconName;
  title: string;
  active?: boolean;
  variant?: "default" | "common" | "removed";
  decorateStates?: boolean;
}>(), {
  active: false,
  variant: "default",
  decorateStates: true
});

const emit = defineEmits<{
  click: [];
}>();

const {
  tagClass,
  tagTextParts
} = useImageTaggerContext();

const stateClasses = computed(() => (props.decorateStates ? tagClass(props.tag) : {}));
</script>

<style scoped lang="scss">
.tag-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  max-width: 100%;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: var(--button-bg);
  color: var(--text);
  padding: 4px 7px;
  font-size: 12px;
  line-height: 1.2;
  overflow-wrap: anywhere;

  &__text {
    min-width: 0;
  }

  &--common {
    background: var(--surface-soft);
    font-style: italic;
  }

  &--removed {
    border-color: #f59e0b;
    background: var(--yellow-soft);
  }

  &--active {
    border-color: #86efac;
    background: var(--green-soft);
    color: #14532d;
  }

  &--common#{&}--active {
    border-color: var(--border);
    background: var(--surface-soft);
    color: var(--text);
  }
}
</style>
