<template>
  <div class="tag-set-fields">
    <TagField
      v-for="field in fields"
      :key="field.key"
      v-model="config[field.key]"
      :label="field.label"
      :rows="field.rows"
      :mode="field.mode"
      :placeholder="field.placeholder"
      :title="field.title"
      :autocomplete="field.autocomplete"
      :autocomplete-items="autocompleteTags"
      :style-rules="field.decorate ? tagTextStyleRules : []"
      show-history-buttons
    />
  </div>
</template>

<script setup lang="ts">
import TagField from "~/components/TagField.vue";
import { useImageTaggerContext } from "~/composables/useImageTagger";
import type { ConfigTextKey, TagTextFieldMode } from "~/types/imageTagger";

interface TagSetField {
  key: ConfigTextKey;
  label: string;
  rows: number;
  mode: TagTextFieldMode;
  placeholder: string;
  title: string;
  autocomplete: boolean;
  decorate: boolean;
}

const {
  config,
  autocompleteTags,
  tagTextStyleRules
} = useImageTaggerContext();

const fields: TagSetField[] = [
  {
    key: "commonTagsText",
    label: "Common tags",
    rows: 5,
    mode: "tags",
    placeholder: "masterpiece, best quality",
    title: "Tags shown as quick toggle chips on every image row.",
    autocomplete: true,
    decorate: true
  },
  {
    key: "knownTagsText",
    label: "Known tags",
    rows: 5,
    mode: "tags",
    placeholder: "Tags treated as expected",
    title: "Known tags are not underlined as unknown.",
    autocomplete: true,
    decorate: false
  },
  {
    key: "highlightTagsText",
    label: "Highlight tags",
    rows: 4,
    mode: "tags",
    placeholder: "Tags to emphasize",
    title: "Exact tags to visually highlight in chips and statistics.",
    autocomplete: true,
    decorate: true
  },
  {
    key: "highlightText",
    label: "Highlight text",
    rows: 3,
    mode: "text",
    placeholder: "Text fragments to emphasize",
    title: "Text fragments to highlight inside tags or natural-language prompt fragments.",
    autocomplete: true,
    decorate: true
  },
  {
    key: "orderTagsText",
    label: "Order tags",
    rows: 4,
    mode: "tags",
    placeholder: "Tags that should be first",
    title: "Preferred tag order. Use Apply Tag Order To Visible to apply it as an undoable edit.",
    autocomplete: true,
    decorate: true
  }
];
</script>

<style scoped lang="scss">
.tag-set-fields {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 8px;
}
</style>
