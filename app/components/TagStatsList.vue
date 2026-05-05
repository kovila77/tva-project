<template>
  <div class="stats-list" :class="{ 'stats-tab-list': tab }">
    <div v-for="item in topTagStats" :key="item.tag" class="stat-row">
      <button class="link-button tag-name" type="button" :title="`Filter dataset by '${item.tag}'.`" @click="filterByTag(item.tag)">
        <span :class="tagClass(item.tag)">{{ item.tag }}</span>
      </button>
      <span class="count" :title="`${item.count} images contain this tag.`">{{ item.count }}</span>
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
  filterByTag,
  appendConfigTag,
  renameTagEverywhere,
  removeTagEverywhere
} = useImageTaggerContext();
</script>
