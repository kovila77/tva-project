<template>
  <div class="tag-sets-panel">
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
      :style-rules="tagTextStyleRules"
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
    autocomplete: true
  },
  {
    key: "knownTagsText",
    label: "Known tags",
    rows: 5,
    mode: "tags",
    placeholder: "Tags treated as expected",
    title: "Known tags are not underlined as unknown.",
    autocomplete: true
  },
  {
    key: "highlightTagsText",
    label: "Highlight tags",
    rows: 4,
    mode: "tags",
    placeholder: "Tags to emphasize",
    title: "Exact tags to visually highlight in chips and statistics.",
    autocomplete: true
  },
  {
    key: "highlightText",
    label: "Highlight text",
    rows: 3,
    mode: "text",
    placeholder: "Text fragments to emphasize",
    title: "Text fragments to highlight inside tags or natural-language prompt fragments.",
    autocomplete: true
  },
  {
    key: "orderTagsText",
    label: "Order tags",
    rows: 4,
    mode: "tags",
    placeholder: "Tags that should be first",
    title: "Preferred tag order. Use Apply Tag Order To Visible to apply it as an undoable edit.",
    autocomplete: true
  }
];
</script>
