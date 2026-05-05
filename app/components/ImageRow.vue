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
        @input="onEditorInput(image, $event)"
        @focus="updateSelectedTagFromEditor(image, $event)"
        @click="updateSelectedTagFromEditor(image, $event)"
        @select="updateSelectedTagFromEditor(image, $event)"
        @blur="commitEditor(image, 'edit')"
        @pointerup="updateSelectedTagFromEditor(image, $event)"
        @keyup="updateSelectedTagFromEditor(image, $event)"
        @keydown.ctrl.enter.prevent="commitEditor(image, 'edit')"
        @keydown.meta.enter.prevent="commitEditor(image, 'edit')"
      />

      <div class="selected-tag-bar" :title="image.selectedTag ? `Selected tag: ${image.selectedTag}` : 'Place the caret inside a tag in the editor to select it.'">
        <span class="selected-label">Selected</span>
        <strong>{{ image.selectedTag || "No selected tag" }}</strong>
      </div>

      <div class="row-actions context-actions">
        <button class="btn icon-btn" type="button" :title="`Preview ${image.fileName} with zoom and pan.`" :aria-label="`Preview ${image.fileName}`" @click="openViewer(image)"><AppIcon name="preview" class="icon" /></button>
        <button class="btn icon-btn" type="button" :title="`Copy temporary browser object URL for ${image.fileName}.`" :aria-label="`Copy temporary URL for ${image.fileName}`" @click="copyImageUrl(image)"><AppIcon name="copy" class="icon" /></button>
        <button class="btn success icon-btn" type="button" :title="`Apply the current text draft for ${image.fileName}. Creates one undoable history entry.`" :aria-label="`Apply tag draft for ${image.fileName}`" :disabled="!image.draftDirty" @click="commitEditor(image, 'edit')"><AppIcon name="apply" class="icon" /></button>
        <button class="btn warn icon-btn" type="button" :title="imageUndoTitle(image)" :aria-label="`Undo operation for ${image.fileName}`" :disabled="!canUndoImage(image)" @click="undoImage(image)"><AppIcon name="undo" class="icon" /></button>
        <button class="btn warn icon-btn" type="button" :title="imageRedoTitle(image)" :aria-label="`Redo operation for ${image.fileName}`" :disabled="!canRedoImage(image)" @click="redoImage(image)"><AppIcon name="redo" class="icon" /></button>
        <button class="btn icon-btn" type="button" :title="imageHistoryTitle(image)" :aria-label="`Toggle history for ${image.fileName}`" @click="toggleImageHistory(image)"><AppIcon name="history" class="icon" /></button>
        <button class="btn icon-btn" type="button" :title="`Restore ${image.fileName} to the tags loaded from disk. This is undoable.`" :aria-label="`Restore original tags for ${image.fileName}`" :disabled="tagsEqual(image.tags, image.originalTags)" @click="revertImage(image)"><AppIcon name="revert" class="icon" /></button>
        <button class="btn danger icon-btn" type="button" :title="`Hide ${image.fileName} from this in-memory session. Source files are not deleted and global Undo restores this row.`" :aria-label="`Remove ${image.fileName} from memory`" @click="removeImage(image)"><AppIcon name="removeItem" class="icon" /></button>
      </div>

      <div class="row-actions context-actions">
        <button class="btn icon-btn" type="button" title="Filter the dataset by the selected tag." aria-label="Filter by selected tag" :disabled="!image.selectedTag" @click="filterByTag(image.selectedTag)"><AppIcon name="filter" class="icon" /></button>
        <button class="btn icon-btn" type="button" title="Append the selected tag to the current filter." aria-label="Add selected tag to filter" :disabled="!image.selectedTag" @click="addSelectedToFilter(image)"><AppIcon name="filterAdd" class="icon" /></button>
        <button class="btn icon-btn" type="button" title="Add selected tag to common tags, making it available as a row chip." aria-label="Add selected tag to common tags" :disabled="!image.selectedTag" @click="appendConfigTag('commonTagsText', image.selectedTag)"><AppIcon name="common" class="icon" /></button>
        <button class="btn icon-btn" type="button" title="Add selected tag to known tags so it is no longer marked unknown." aria-label="Add selected tag to known tags" :disabled="!image.selectedTag" @click="appendConfigTag('knownTagsText', image.selectedTag)"><AppIcon name="known" class="icon" /></button>
        <button class="btn icon-btn" type="button" title="Add selected tag to highlighted tags." aria-label="Add selected tag to highlighted tags" :disabled="!image.selectedTag" @click="appendConfigTag('highlightTagsText', image.selectedTag)"><AppIcon name="highlight" class="icon" /></button>
        <button class="btn icon-btn" type="button" title="Add selected text/tag to highlighted text fragments." aria-label="Add selected tag to highlighted text" :disabled="!image.selectedTag" @click="appendConfigTag('highlightText', image.selectedTag)"><AppIcon name="text" class="icon" /></button>
        <button class="btn danger icon-btn" type="button" title="Remove the selected tag from this image and keep it restorable in Deleted tags." aria-label="Remove selected tag" :disabled="!image.selectedTag" @click="removeTagFromImage(image, image.selectedTag)"><AppIcon name="remove" class="icon" /></button>
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
          <AppIcon :name="hasTag(image, tag) ? 'remove' : 'add'" class="icon" /> {{ tag }}
        </button>
      </div>

      <div class="chip-group tags">
        <button
          v-for="tag in nonCommonTags(image)"
          :key="`${image.id}-tag-${tag}`"
          class="tag-chip"
          :class="tagClass(tag)"
          type="button"
          :title="`Remove tag '${tag}' and store it in Deleted tags. Undoable.`"
          @click="removeTagFromImage(image, tag, false)"
        >
          <AppIcon name="remove" class="icon" /> {{ tag }}
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
          <AppIcon name="add" class="icon" /> {{ tag }}
        </button>
        <span v-if="!image.removedTags.length" class="empty-inline">No deleted tags.</span>
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
import AppIcon from "~/components/AppIcon.vue";
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
  onEditorInput,
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
