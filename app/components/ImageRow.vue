<template>
  <article class="image-row" :class="{ dirty: image.dirty }">
    <button class="thumb-button" type="button" :title="`Open image viewer for ${image.fileName}. Source file is not modified.`" @click="openViewer(image)">
      <img :src="image.objectUrl" :alt="image.fileName" loading="lazy" decoding="async">
    </button>

    <div class="editor-column">
      <div class="row-title">
        <div>
          <h3>{{ image.fileName }}</h3>
          <span>{{ imageMetadataLine(image) }}</span>
        </div>
        <span v-if="image.dirty" class="pill warn">changed</span>
      </div>

      <textarea
        v-model="image.editText"
        class="tag-editor"
        spellcheck="false"
        list="known-tags-list"
        title="Edit comma- or newline-separated tags. Ctrl+Enter applies the draft. Blur also applies the draft."
        @input="markDraftDirty(image)"
        @blur="commitEditor(image, 'edit')"
        @mouseup="updateSelectedTagFromEditor(image, $event)"
        @keyup="updateSelectedTagFromEditor(image, $event)"
        @keydown.ctrl.enter.prevent="commitEditor(image, 'edit')"
        @keydown.meta.enter.prevent="commitEditor(image, 'edit')"
      />

      <div class="selected-tag-bar" :title="image.selectedTag ? `Selected tag: ${image.selectedTag}` : 'Click a tag chip or place the caret inside a tag in the editor to select it.'">
        <span class="selected-label">Selected</span>
        <strong>{{ image.selectedTag || "No selected tag" }}</strong>
      </div>

      <div class="row-actions context-actions">
        <button class="btn icon-btn" type="button" :title="`Preview ${image.fileName} with zoom and pan.`" @click="openViewer(image)"><span class="icon">◎</span></button>
        <button class="btn icon-btn" type="button" :title="`Copy temporary browser object URL for ${image.fileName}.`" @click="copyImageUrl(image)"><span class="icon">⧉</span></button>
        <button class="btn success" type="button" :title="`Apply the current text draft for ${image.fileName}. Creates one undoable history entry.`" :disabled="!image.draftDirty" @click="commitEditor(image, 'edit')"><span class="icon">✓</span> Apply</button>
        <button class="btn warn" type="button" :title="imageUndoTitle(image)" :disabled="!canUndoImage(image)" @click="undoImage(image)"><span class="icon">↶</span> Undo</button>
        <button class="btn warn" type="button" :title="imageRedoTitle(image)" :disabled="!canRedoImage(image)" @click="redoImage(image)"><span class="icon">↷</span> Redo</button>
        <button class="btn" type="button" :title="imageHistoryTitle(image)" @click="toggleImageHistory(image)"><span class="icon">◷</span> History</button>
        <button class="btn" type="button" :title="`Restore ${image.fileName} to the tags loaded from disk. This is undoable.`" :disabled="tagsEqual(image.tags, image.originalTags)" @click="revertImage(image)"><span class="icon">⟲</span> Original</button>
        <button class="btn danger" type="button" :title="`Hide ${image.fileName} from this in-memory session. Source files are not deleted and global Undo restores this row.`" @click="removeImage(image)"><span class="icon">×</span> Remove</button>
      </div>

      <div class="row-actions context-actions">
        <button class="btn" type="button" title="Filter the dataset by the selected tag." :disabled="!image.selectedTag" @click="filterByTag(image.selectedTag)"><span class="icon">⌕</span> Filter Sel</button>
        <button class="btn" type="button" title="Append the selected tag to the current filter." :disabled="!image.selectedTag" @click="addSelectedToFilter(image)"><span class="icon">＋</span> Filter+</button>
        <button class="btn" type="button" title="Add selected tag to common tags, making it available as a row chip." :disabled="!image.selectedTag" @click="appendConfigTag('commonTagsText', image.selectedTag)"><span class="icon">▣</span> Common</button>
        <button class="btn" type="button" title="Add selected tag to known tags so it is no longer marked unknown." :disabled="!image.selectedTag" @click="appendConfigTag('knownTagsText', image.selectedTag)"><span class="icon">◇</span> Known</button>
        <button class="btn" type="button" title="Add selected tag to highlighted tags." :disabled="!image.selectedTag" @click="appendConfigTag('highlightTagsText', image.selectedTag)"><span class="icon">★</span> Highlight</button>
        <button class="btn" type="button" title="Add selected text/tag to highlighted text fragments." :disabled="!image.selectedTag" @click="appendConfigTag('highlightText', image.selectedTag)"><span class="icon">Aa</span> Text</button>
        <button class="btn danger" type="button" title="Remove the selected tag from this image and keep it restorable in Deleted tags." :disabled="!image.selectedTag" @click="removeTagFromImage(image, image.selectedTag)"><span class="icon">−</span> Remove Sel</button>
      </div>

      <div v-if="image.historyOpen" class="inline-history" :title="`Recent undo/redo entries touching ${image.fileName}.`">
        <strong>History preview</strong>
        <div v-for="entry in imageHistory(image)" :key="entry.key" class="history-line">
          {{ entry.text }}
        </div>
        <div v-if="!imageHistory(image).length" class="empty-inline">No committed history for this image yet.</div>
      </div>
    </div>

    <div v-if="config.showTagsColumn" class="tag-column" title="Clickable row tags. Use display controls to hide this column when image/editor width matters more.">
      <div class="chip-group">
        <button
          v-for="tag in commonTags"
          :key="`${image.id}-common-${tag}`"
          class="tag-chip common"
          :class="{ active: hasTag(image, tag) }"
          type="button"
          :title="hasTag(image, tag) ? `Remove common tag '${tag}' from this image. Undoable.` : `Add common tag '${tag}' to this image. Undoable.`"
          @click="toggleTag(image, tag)"
        >
          {{ hasTag(image, tag) ? "-" : "+" }} {{ tag }}
        </button>
      </div>

      <div class="chip-group tags">
        <button
          v-for="tag in nonCommonTags(image)"
          :key="`${image.id}-tag-${tag}`"
          class="tag-chip"
          :class="tagClass(tag)"
          type="button"
          :title="`Select/remove tag '${tag}'. Click removes it and stores it in Deleted tags. Undoable.`"
          @click="removeTagFromImage(image, tag)"
          @mouseenter="image.selectedTag = tag"
        >
          - {{ tag }}
        </button>
      </div>

      <div class="chip-group deleted-tags">
        <span class="chip-heading">Deleted</span>
        <button
          v-for="tag in image.removedTags"
          :key="`${image.id}-removed-${tag}`"
          class="tag-chip removed"
          type="button"
          :title="`Return deleted tag '${tag}' to this image. Undoable.`"
          @click="restoreRemovedTag(image, tag)"
        >
          + {{ tag }}
        </button>
        <span v-if="!image.removedTags.length" class="empty-inline">No deleted tags.</span>
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
import { useImageTaggerContext } from "~/composables/useImageTagger";
import type { ImageRecord } from "~/types/imageTagger";

defineProps<{
  image: ImageRecord;
}>();

const {
  config,
  commonTags,
  imageMetadataLine,
  openViewer,
  copyImageUrl,
  commitEditor,
  markDraftDirty,
  updateSelectedTagFromEditor,
  imageUndoTitle,
  imageRedoTitle,
  imageHistoryTitle,
  canUndoImage,
  canRedoImage,
  undoImage,
  redoImage,
  toggleImageHistory,
  revertImage,
  removeImage,
  filterByTag,
  addSelectedToFilter,
  appendConfigTag,
  removeTagFromImage,
  imageHistory,
  tagsEqual,
  hasTag,
  toggleTag,
  nonCommonTags,
  tagClass,
  restoreRemovedTag
} = useImageTaggerContext();
</script>
