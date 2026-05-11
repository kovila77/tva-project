<template>
  <button
    ref="chipElement"
    class="tag-chip"
    :class="[
      stateClasses,
      `tag-chip--${variant}`,
      {
        'tag-chip--active': active,
        'tag-chip--dragging': dragging
      }
    ]"
    type="button"
    :title="title"
    :style="dragStyle"
    :data-tag-value="tag"
    :data-tag-dragging="dragging ? 'true' : undefined"
    @click="onClick"
    @pointerdown="startChipPress"
    @pointerup="stopChipPress"
    @pointercancel="stopChipPress"
    @pointermove="moveDraggedChip"
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
import { computed, onBeforeUnmount, ref } from "vue";
import AppIcon from "~/components/AppIcon.vue";
import { useImageTaggerContext } from "~/composables/useImageTagger";
import type { AppIconName } from "~/utils/icons";

const props = withDefaults(defineProps<{
  tag: string;
  icon: AppIconName;
  title: string;
  imageId?: string;
  dragSource?: "active" | "deleted";
  active?: boolean;
  variant?: "default" | "common" | "removed";
  decorateStates?: boolean;
}>(), {
  imageId: "",
  dragSource: "active",
  active: false,
  variant: "default",
  decorateStates: true
});

const emit = defineEmits<{
  click: [];
  tagDrop: [event: { clientX: number; clientY: number; source: "active" | "deleted"; tag: string }];
  tagDragMove: [event: { clientX: number; clientY: number; source: "active" | "deleted"; tag: string }];
  tagDragEnd: [];
}>();

const {
  tagClass,
  tagTextParts
} = useImageTaggerContext();

const stateClasses = computed(() => (props.decorateStates ? tagClass(props.tag) : {}));
const dragStartDistance = 5;
const chipElement = ref<HTMLElement | null>(null);
const dragging = ref(false);
const clickSuppressed = ref(false);
const dragX = ref(0);
const dragY = ref(0);
let dragPointerId: number | null = null;
let dragOffsetX = 0;
let dragOffsetY = 0;
let dragOriginLeft = 0;
let dragOriginTop = 0;
let pointerStartX = 0;
let pointerStartY = 0;

const dragStyle = computed(() => dragging.value
  ? {
      transform: `translate3d(${dragX.value}px, ${dragY.value}px, 0)`
    }
  : undefined);

function startChipPress(event: PointerEvent): void {
  if (event.button !== 0) {
    return;
  }

  stopChipPress();
  clickSuppressed.value = false;
  dragPointerId = event.pointerId;
  pointerStartX = event.clientX;
  pointerStartY = event.clientY;
  chipElement.value?.setPointerCapture?.(event.pointerId);
}

function stopChipPress(event?: PointerEvent): void {
  const wasDragging = dragging.value;

  if (wasDragging && event) {
    emit("tagDrop", {
      clientX: event.clientX,
      clientY: event.clientY,
      source: props.dragSource,
      tag: props.tag
    });
  }

  endDrag();
  if (wasDragging) {
    emit("tagDragEnd");
  }
}

function beginDrag(clientX: number, clientY: number): void {
  const element = chipElement.value;
  if (!element || dragPointerId === null) {
    return;
  }

  const rect = element.getBoundingClientRect();
  dragOffsetX = clientX - rect.left;
  dragOffsetY = clientY - rect.top;
  dragOriginLeft = rect.left;
  dragOriginTop = rect.top;
  dragX.value = 0;
  dragY.value = 0;
  dragging.value = true;
  clickSuppressed.value = true;
  element.setPointerCapture?.(dragPointerId);
  document.body.style.userSelect = "none";
}

function moveDraggedChip(event: PointerEvent): void {
  if (event.pointerId !== dragPointerId) {
    return;
  }

  if (!dragging.value) {
    const movedX = event.clientX - pointerStartX;
    const movedY = event.clientY - pointerStartY;
    if (Math.hypot(movedX, movedY) < dragStartDistance) {
      return;
    }

    beginDrag(pointerStartX, pointerStartY);
  }

  if (!dragging.value) {
    return;
  }

  dragX.value = event.clientX - dragOffsetX - dragOriginLeft;
  dragY.value = event.clientY - dragOffsetY - dragOriginTop;
  emit("tagDragMove", {
    clientX: event.clientX,
    clientY: event.clientY,
    source: props.dragSource,
    tag: props.tag
  });
}

function endDrag(): void {
  if (dragPointerId !== null) {
    chipElement.value?.releasePointerCapture?.(dragPointerId);
  }
  dragPointerId = null;
  dragging.value = false;
  dragX.value = 0;
  dragY.value = 0;
  document.body.style.userSelect = "";
  window.setTimeout(() => {
    clickSuppressed.value = false;
  }, 0);
}

function onClick(): void {
  if (clickSuppressed.value) {
    return;
  }

  emit("click");
}

onBeforeUnmount(stopChipPress);
</script>

<style scoped lang="scss">
.tag-chip {
  display: inline-flex;
  align-items: center;
  gap: min(var(--app-space-layout), 2px);
  max-width: 100%;
  border: 1px solid var(--border);
  border-radius: var(--pill-radius);
  background: var(--button-bg);
  color: var(--text);
  padding: min(var(--app-space-control-y), 1px) min(var(--app-space-control-x), 1px);
  font-size: 12px;
  line-height: 1.2;
  overflow-wrap: anywhere;
  touch-action: none;

  &--dragging {
    position: relative;
    z-index: 3000;
    pointer-events: none;
  }

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
