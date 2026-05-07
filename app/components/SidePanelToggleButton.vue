<template>
  <button
    class="side-panel-toggle"
    type="button"
    :title="title"
    :aria-label="title"
    @click="toggleSidePanel"
  >
    <AppIcon v-if="showArrowBefore" :name="arrowIcon" class="icon side-panel-toggle__icon" />
    <AppIcon name="bars" class="icon side-panel-toggle__icon side-panel-toggle__bars" />
    <AppIcon v-if="!showArrowBefore" :name="arrowIcon" class="icon side-panel-toggle__icon" />
    <span>{{ label }}</span>
  </button>
</template>

<script setup lang="ts">
import { computed } from "vue";
import AppIcon from "~/components/AppIcon.vue";
import { useImageTaggerContext } from "~/composables/useImageTagger";

const { config } = useImageTaggerContext();

const isHidden = computed(() => config.sidePanelMode === "hidden");
const isRight = computed(() => config.sidePanelPosition === "right");
const label = computed(() => isHidden.value ? "Show side" : "Hide side");
const title = computed(() => `${label.value} panel`);
const showArrowBefore = computed(() => !isHidden.value);
const arrowIcon = computed(() => {
  if (isHidden.value) {
    return isRight.value ? "arrowLeft" : "arrowRight";
  }

  return isRight.value ? "arrowRight" : "arrowLeft";
});

function toggleSidePanel(): void {
  config.sidePanelMode = isHidden.value ? "open" : "hidden";
}
</script>

<style scoped lang="scss">
.side-panel-toggle {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-height: 28px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--muted);
  padding: 2px 4px;
  font-size: 13px;
  font-weight: 800;
  line-height: 1;

  &:hover,
  &:focus-visible {
    color: var(--text);
  }

  &__icon {
    width: 1em;
    min-width: 1em;
  }

  &__bars {
    width: 1.1em;
    min-width: 1.1em;
  }

  span {
    white-space: nowrap;
  }
}
</style>
