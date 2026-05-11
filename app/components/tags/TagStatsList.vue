<template>
  <details ref="statsRoot" class="tag-stats" :class="{ 'tag-stats--tab': tab }" open>
    <summary class="tag-stats__header">
      <h3>Tag Statistics</h3>
      <input
        v-model="statsSearch"
        class="control tag-stats__search"
        type="search"
        placeholder="Search tags"
        title="Search tag statistics. Results update while typing."
        autocomplete="off"
        @click.stop
        @keydown.stop
      >
    </summary>
    <div class="tag-stats__row tag-stats__row--new">
      <div class="tag-stats__name" title="Double-click to add a new tag to the start of every image." @dblclick="startEditing('')">
        <textarea
          v-if="editingTag === ''"
          v-model="editingValue"
          class="control tag-stats__edit"
          placeholder="Enter new tag"
          aria-label="New tag"
          rows="3"
          @blur="commitEditing"
          @keydown.enter.prevent="commitEditing"
          @keydown.esc.prevent="cancelEditing"
        />
        <span v-else class="tag-stats__token tag-stats__token--empty" aria-label="Empty new tag">Click here to add a tag to all images</span>
      </div>
      <span class="tag-stats__count" :title="`${images.length} loaded images.`">{{ images.length }}</span>
      <div class="tag-stats__actions" aria-hidden="true" />
    </div>

    <div v-for="item in visibleTagStats" :key="item.tag" class="tag-stats__row">
      <div class="tag-stats__name" :title="`Double-click to rename '${item.tag}' across loaded images.`" @dblclick="startEditing(item.tag)">
        <textarea
          v-if="editingTag === item.tag"
          v-model="editingValue"
          class="control tag-stats__edit"
          :aria-label="`Rename ${item.tag}`"
          rows="3"
          @blur="commitEditing"
          @keydown.enter.prevent="commitEditing"
          @keydown.esc.prevent="cancelEditing"
        />
        <span v-else class="tag-stats__token" :class="tagClass(item.tag)">
          <span v-for="part in tagTextParts(item.tag)" :key="part.key" :class="{ 'tag-token--fragment-highlighted': part.highlighted }">{{ part.text }}</span>
        </span>
      </div>
      <span class="tag-stats__count" :title="`${item.count} images contain this tag.`">{{ item.count }}</span>
      <div class="tag-stats__actions">
        <AppIconButton class="tag-stats__action" icon="filter" title="Filter dataset by this tag." :aria-label="`Filter dataset by ${item.tag}`" @click="filterByTag(item.tag)" />
        <div class="tag-stats__menu">
          <AppIconButton class="tag-stats__action" icon="more" title="More tag actions." :aria-label="`More actions for ${item.tag}`" @click="toggleMoreMenu(item.tag)" />
          <div v-if="openMenuTag === item.tag" class="tag-stats__menu-popover">
            <AppIconButton class="tag-stats__action" icon="filterAdd" title="Append this tag to the current filter." :aria-label="`Add ${item.tag} to filter`" @click="appendTagToFilter(item.tag)" />
            <AppIconButton class="tag-stats__action" icon="common" title="Add this tag to common tags." :aria-label="`Add ${item.tag} to common tags`" @click="addConfigTagAndClose('commonTagsText', item.tag)" />
            <AppIconButton class="tag-stats__action" icon="known" title="Add this tag to known tags." :aria-label="`Add ${item.tag} to known tags`" @click="addConfigTagAndClose('knownTagsText', item.tag)" />
            <AppIconButton class="tag-stats__action" icon="highlight" title="Add this tag to highlighted tags." :aria-label="`Add ${item.tag} to highlighted tags`" @click="addConfigTagAndClose('highlightTagsText', item.tag)" />
            <AppIconButton class="tag-stats__action" icon="text" title="Add this tag to highlighted text fragments." :aria-label="`Add ${item.tag} to highlighted text`" @click="addConfigTagAndClose('highlightText', item.tag)" />
            <AppIconButton class="tag-stats__action" icon="arrowUp" title="Move this tag to the start of every prompt where it appears. Undoable." :aria-label="`Move ${item.tag} to prompt start`" @click="moveTagAndClose(item.tag, 'start')" />
            <AppIconButton class="tag-stats__action" icon="arrowDown" title="Move this tag to the end of every prompt where it appears. Undoable." :aria-label="`Move ${item.tag} to prompt end`" @click="moveTagAndClose(item.tag, 'end')" />
            <AppIconButton class="tag-stats__action" icon="removeItem" title="Remove this tag only from currently visible images. Undoable." :aria-label="`Remove ${item.tag} from visible images`" danger @click="removeVisibleAndClose(item.tag)" />
          </div>
        </div>
        <AppIconButton class="tag-stats__action" icon="removeItem" title="Remove this tag across loaded images and keep it restorable per image. Undoable." :aria-label="`Remove ${item.tag} from loaded images`" danger @click="removeTagEverywhere(item.tag)" />
      </div>
    </div>
    <div v-if="!visibleTagStats.length" class="empty-inline">{{ statsSearch.trim() ? "No matching tags." : "No tags loaded." }}</div>
  </details>
</template>

<script setup lang="ts">
import { computed, nextTick, ref } from "vue";
import AppIconButton from "~/components/core/AppIconButton.vue";
import { useImageTaggerContext } from "~/composables/useImageTagger";
import type { ConfigTextKey } from "~/types/imageTagger";

withDefaults(defineProps<{
  tab?: boolean;
}>(), {
  tab: false
});

const {
  images,
  config,
  tagStats,
  tagClass,
  tagTextParts,
  filterByTag,
  applyFilter,
  appendConfigTag,
  renameTagEverywhereTo,
  addTagToAllAtStart,
  moveTagEverywhere,
  removeTagEverywhere,
  removeTagFromVisible
} = useImageTaggerContext();

const editingTag = ref<string | null>(null);
const editingValue = ref("");
const openMenuTag = ref<string | null>(null);
const statsRoot = ref<HTMLElement | null>(null);
const statsSearch = ref("");
const visibleTagStats = computed(() => {
  const query = statsSearch.value.trim().toLowerCase();
  const matches = query
    ? tagStats.value.filter((item) => item.tag.toLowerCase().includes(query))
    : tagStats.value;

  return matches.slice(0, 160);
});

function startEditing(tag: string): void {
  editingTag.value = tag;
  editingValue.value = tag;
  void nextTick(() => {
    const input = statsRoot.value?.querySelector<HTMLTextAreaElement>(".tag-stats__edit");
    input?.focus();
    input?.select();
  });
}

function commitEditing(): void {
  if (editingTag.value === null) {
    return;
  }

  const originalTag = editingTag.value;
  const nextTag = editingValue.value.replace(/\s+/g, " ").trim();
  editingTag.value = null;
  editingValue.value = "";

  if (!nextTag) {
    return;
  }

  if (originalTag) {
    renameTagEverywhereTo(originalTag, nextTag);
    return;
  }

  addTagToAllAtStart(nextTag);
}

function cancelEditing(): void {
  editingTag.value = null;
  editingValue.value = "";
}

function appendTagToFilter(tag: string): void {
  config.filterText = config.filterText.trim()
    ? `${config.filterText}, ${tag}`
    : tag;
  applyFilter();
  openMenuTag.value = null;
}

function toggleMoreMenu(tag: string): void {
  openMenuTag.value = openMenuTag.value === tag ? null : tag;
}

function addConfigTagAndClose(key: ConfigTextKey, tag: string): void {
  appendConfigTag(key, tag);
  openMenuTag.value = null;
}

function moveTagAndClose(tag: string, placement: "start" | "end"): void {
  moveTagEverywhere(tag, placement);
  openMenuTag.value = null;
}

function removeVisibleAndClose(tag: string): void {
  removeTagFromVisible(tag);
  openMenuTag.value = null;
}
</script>

<style scoped lang="scss">
.tag-stats {
  display: flex;
  flex-direction: column;
  gap: min(var(--app-space-layout), 1px);

  &__header {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    gap: var(--app-space-gap);
    align-items: center;
    margin-bottom: var(--app-space-gap);
    cursor: pointer;
    list-style: none;

    &::-webkit-details-marker {
      display: none;
    }

    h3 {
      margin: 0;
      font-size: 15px;
      line-height: 1;
      white-space: nowrap;
    }
  }

  &__search {
    min-width: 0;
  }

  &__row {
    display: grid;
    grid-template-columns: minmax(160px, 1fr) 42px auto;
    gap: var(--app-space-layout);
    align-items: center;
    padding: var(--app-space-layout);
    border: 1px solid var(--border);
    border-radius: var(--control-radius);
    background: var(--surface-raised);
  }

  &__name {
    min-width: 0;
    white-space: normal;
    overflow-wrap: anywhere;
    line-height: 1.35;
  }

  &__token {
    cursor: text;
  }

  &__token--empty {
    display: inline-block;
    min-width: 160px;
    min-height: 1.35em;
    color: var(--muted);
    font-size: 12px;
    opacity: 0.8;
  }

  &__edit {
    width: 100%;
    min-height: 72px;
    resize: vertical;
    white-space: pre-wrap;
  }

  &__count {
    color: var(--muted);
    text-align: right;
    font-variant-numeric: tabular-nums;
  }

  &__actions {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: var(--app-space-layout);
  }

  &__menu {
    position: relative;
    display: inline-flex;
    width: 24px;
    height: 24px;
    margin: 0;
    padding: 0;
  }

  &__menu-popover {
    position: absolute;
    top: calc(100% + var(--app-space-layout));
    right: 0;
    z-index: 6;
    display: flex;
    gap: var(--app-space-layout);
    padding: var(--app-space-layout);
    border: 1px solid var(--border);
    border-radius: var(--control-radius);
    background: var(--surface);
    box-shadow: var(--shadow);
  }

  &__action {
    --app-icon-button-size: 24px;
    --app-icon-button-radius: 4px;
    --app-icon-size: 13px;
  }
}
</style>
