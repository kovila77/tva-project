<template>
  <div class="tag-sets-panel">
    <TagField
      v-for="field in fields"
      :key="field.key"
      v-model="config[field.key]"
      :label="field.label"
      :rows="field.rows"
      :placeholder="field.placeholder"
      :title="field.title"
    />
  </div>
</template>

<script setup lang="ts">
import TagField from "~/components/TagField.vue";
import { useImageTaggerContext } from "~/composables/useImageTagger";
import type { ConfigTextKey } from "~/types/imageTagger";

interface TagSetField {
  key: ConfigTextKey;
  label: string;
  rows: number;
  placeholder: string;
  title: string;
}

const { config } = useImageTaggerContext();

const fields: TagSetField[] = [
  {
    key: "commonTagsText",
    label: "Common tags",
    rows: 5,
    placeholder: "masterpiece, best quality",
    title: "Tags shown as quick toggle chips on every image row."
  },
  {
    key: "knownTagsText",
    label: "Known tags",
    rows: 5,
    placeholder: "Tags treated as expected",
    title: "Known tags are not underlined as unknown."
  },
  {
    key: "highlightTagsText",
    label: "Highlight tags",
    rows: 4,
    placeholder: "Tags to emphasize",
    title: "Exact tags to visually highlight in chips and statistics."
  },
  {
    key: "highlightText",
    label: "Highlight text",
    rows: 3,
    placeholder: "Text fragments to emphasize",
    title: "Text fragments to highlight inside tags or natural-language prompt fragments."
  },
  {
    key: "orderTagsText",
    label: "Order tags",
    rows: 4,
    placeholder: "Tags that should be first",
    title: "Preferred tag order. Use Apply Tag Order To Visible to apply it as an undoable edit."
  }
];
</script>
