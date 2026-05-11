<template>
  <button
    class="app-icon-button"
    :class="{
      'app-icon-button--active': active,
      'app-icon-button--danger': danger
    }"
    type="button"
    :title="title"
    :aria-label="ariaLabel || title"
  >
    <AppIcon :name="icon" class="icon app-icon-button__icon" />
  </button>
</template>

<script setup lang="ts">
import AppIcon from "~/components/core/AppIcon.vue";
import type { AppIconName } from "~/utils/icons";

defineProps<{
  icon: AppIconName;
  title: string;
  ariaLabel?: string;
  active?: boolean;
  danger?: boolean;
}>();
</script>

<style scoped lang="scss">
.app-icon-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: var(--app-icon-button-width, var(--app-icon-button-size, 34px));
  min-width: var(--app-icon-button-width, var(--app-icon-button-size, 34px));
  height: var(--app-icon-button-height, var(--app-icon-button-size, 34px));
  min-height: var(--app-icon-button-height, var(--app-icon-button-size, 34px));
  border: 0;
  border-radius: var(--app-icon-button-radius, var(--control-radius));
  background: transparent;
  color: var(--muted);
  outline: 0;
  padding: 0;
  line-height: 1;
  transition: color 0.12s ease, transform 0.12s ease;

  &:hover:not(:disabled),
  &:focus-visible {
    color: var(--text);
  }

  &:hover:not(:disabled) {
    transform: var(--app-icon-button-hover-transform, none);
  }

  &--active {
    background: var(--app-icon-button-active-bg, transparent);
    color: var(--text);
    cursor: default;
  }

  &--danger {
    color: var(--red);
  }

  &__icon {
    width: var(--app-icon-size, 1.1em);
    height: var(--app-icon-size, 1em);
    min-width: var(--app-icon-size, 1.1em);
  }
}
</style>
