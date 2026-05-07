<template>
  <div class="tag-stats" :class="{ 'tag-stats--tab': tab }">
    <div v-for="item in topTagStats" :key="item.tag" class="tag-stats__row">
      <button class="link-button tag-stats__name" type="button" :title="`Filter dataset by '${item.tag}'.`" @click="filterByTag(item.tag)">
        <span :class="tagClass(item.tag)">
          <span v-for="part in tagTextParts(item.tag)" :key="part.key" :class="{ 'tag-token--fragment-highlighted': part.highlighted }">{{ part.text }}</span>
        </span>
      </button>
      <span class="tag-stats__count" :title="`${item.count} images contain this tag.`">{{ item.count }}</span>
      <button class="mini-btn" type="button" title="Add this tag to common tags." @click="appendConfigTag('commonTagsText', item.tag)"><AppIcon name="common" class="icon" /> Common</button>
      <button class="mini-btn" type="button" title="Rename this tag across loaded images. Undoable." @click="renameTagEverywhere(item.tag)"><AppIcon name="rename" class="icon" /> Rename</button>
      <button class="mini-btn danger" type="button" title="Remove this tag across loaded images and keep it restorable per image. Undoable." @click="removeTagEverywhere(item.tag)"><AppIcon name="removeItem" class="icon" /> Remove</button>
    </div>
    <div v-if="!topTagStats.length" class="empty-inline">No tags loaded.</div>
  </div>
</template>

<script setup lang="ts">
import AppIcon from "~/components/AppIcon.vue";
import { useImageTaggerContext } from "~/composables/useImageTagger";

withDefaults(defineProps<{
  tab?: boolean;
}>(), {
  tab: false
});

const {
  topTagStats,
  tagClass,
  tagTextParts,
  filterByTag,
  appendConfigTag,
  renameTagEverywhere,
  removeTagEverywhere
} = useImageTaggerContext();
</script>

<style scoped lang="scss">
.tag-stats {
  display: flex;
  flex-direction: column;
  gap: 1px;

  &__row {
    display: grid;
    grid-template-columns: minmax(160px, 1fr) 42px auto auto auto;
    gap: 1px;
    align-items: center;
    padding: 1px;
    border: 1px solid var(--border);
    border-radius: 6px;
    background: var(--surface-raised);
  }

  &__name {
    min-width: 0;
    white-space: normal;
    overflow-wrap: anywhere;
    line-height: 1.35;
  }

  &__count {
    color: var(--muted);
    text-align: right;
    font-variant-numeric: tabular-nums;
  }
}
</style>
