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
        <button class="tag-stats__action" type="button" title="Filter dataset by this tag." :aria-label="`Filter dataset by ${item.tag}`" @click="filterByTag(item.tag)"><AppIcon name="filter" class="icon" /></button>
        <div class="tag-stats__menu">
          <button class="tag-stats__action" type="button" title="More tag actions." :aria-label="`More actions for ${item.tag}`" @click="toggleMoreMenu(item.tag)">
            <AppIcon name="bars" class="icon" />
          </button>
          <div v-if="openMenuTag === item.tag" class="tag-stats__menu-popover">
            <button class="tag-stats__action" type="button" title="Append this tag to the current filter." :aria-label="`Add ${item.tag} to filter`" @click="appendTagToFilter(item.tag)"><AppIcon name="filterAdd" class="icon" /></button>
            <button class="tag-stats__action" type="button" title="Add this tag to common tags." :aria-label="`Add ${item.tag} to common tags`" @click="addConfigTagAndClose('commonTagsText', item.tag)"><AppIcon name="common" class="icon" /></button>
            <button class="tag-stats__action" type="button" title="Add this tag to known tags." :aria-label="`Add ${item.tag} to known tags`" @click="addConfigTagAndClose('knownTagsText', item.tag)"><AppIcon name="known" class="icon" /></button>
            <button class="tag-stats__action" type="button" title="Add this tag to highlighted tags." :aria-label="`Add ${item.tag} to highlighted tags`" @click="addConfigTagAndClose('highlightTagsText', item.tag)"><AppIcon name="highlight" class="icon" /></button>
            <button class="tag-stats__action" type="button" title="Add this tag to highlighted text fragments." :aria-label="`Add ${item.tag} to highlighted text`" @click="addConfigTagAndClose('highlightText', item.tag)"><AppIcon name="text" class="icon" /></button>
            <button class="tag-stats__action" type="button" title="Move this tag to the start of every prompt where it appears. Undoable." :aria-label="`Move ${item.tag} to prompt start`" @click="moveTagAndClose(item.tag, 'start')"><AppIcon name="arrowUp" class="icon" /></button>
            <button class="tag-stats__action" type="button" title="Move this tag to the end of every prompt where it appears. Undoable." :aria-label="`Move ${item.tag} to prompt end`" @click="moveTagAndClose(item.tag, 'end')"><AppIcon name="arrowDown" class="icon" /></button>
            <button class="tag-stats__action tag-stats__action--danger" type="button" title="Remove this tag only from currently visible images. Undoable." :aria-label="`Remove ${item.tag} from visible images`" @click="removeVisibleAndClose(item.tag)"><AppIcon name="removeItem" class="icon" /></button>
          </div>
        </div>
        <button class="tag-stats__action tag-stats__action--danger" type="button" title="Remove this tag across loaded images and keep it restorable per image. Undoable." :aria-label="`Remove ${item.tag} from loaded images`" @click="removeTagEverywhere(item.tag)"><AppIcon name="removeItem" class="icon" /></button>
      </div>
    </div>
    <div v-if="!visibleTagStats.length" class="empty-inline">{{ statsSearch.trim() ? "No matching tags." : "No tags loaded." }}</div>
  </details>
</template>

<script setup lang="ts">
import { computed, nextTick, ref } from "vue";
import AppIcon from "~/components/AppIcon.vue";
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
  gap: 1px;

  &__header {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    gap: 8px;
    align-items: center;
    margin-bottom: 6px;
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
    gap: 4px;
    align-items: center;
    padding: 4px;
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
    gap: 4px;
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
    top: calc(100% + 4px);
    right: 0;
    z-index: 6;
    display: flex;
    gap: 4px;
    padding: 5px;
    border: 1px solid var(--border);
    border-radius: 6px;
    background: var(--surface);
    box-shadow: var(--shadow);
  }

  &__action {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    min-width: 24px;
    height: 24px;
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

    &--danger {
      color: var(--red);
    }

    .icon {
      width: 13px;
      height: 13px;
    }
  }
}
</style>
