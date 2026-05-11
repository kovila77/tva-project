<template>
  <div class="tag-set-fields">
    <template v-for="field in visibleFields" :key="field.key">
      <details v-if="collapsible" class="tag-set-fields__section">
        <summary>
          <span class="tag-set-fields__heading">
            <AppIcon v-if="field.icon" :name="field.icon" class="icon" />
            <span>{{ field.label }}</span>
          </span>
          <span class="tag-set-fields__placement">
            <SectionPlacementButtons v-model="config[field.placementKey]" header-value="top" />
          </span>
        </summary>
        <TagField
          v-model="config[field.key]"
          :rows="field.rows"
          :mode="field.mode"
          :placeholder="field.placeholder"
          :title="field.title"
          :autocomplete="field.autocomplete"
          :autocomplete-items="autocompleteTags"
          :style-rules="field.decorate ? tagTextStyleRules : []"
          show-history-buttons
        />
      </details>
      <section v-else class="tag-set-fields__section">
        <div class="tag-set-fields__header">
          <span class="tag-set-fields__heading">
            <AppIcon v-if="field.icon" :name="field.icon" class="icon" />
            <span>{{ field.label }}</span>
          </span>
          <span class="tag-set-fields__placement">
            <SectionPlacementButtons v-model="config[field.placementKey]" header-value="top" />
          </span>
        </div>
        <TagField
          v-model="config[field.key]"
          :rows="field.rows"
          :mode="field.mode"
          :placeholder="field.placeholder"
          :title="field.title"
          :autocomplete="field.autocomplete"
          :autocomplete-items="autocompleteTags"
          :style-rules="field.decorate ? tagTextStyleRules : []"
          show-history-buttons
        />
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import AppIcon from "~/components/AppIcon.vue";
import SectionPlacementButtons from "~/components/SectionPlacementButtons.vue";
import TagField from "~/components/TagField.vue";
import { useImageTaggerContext } from "~/composables/useImageTagger";
import type { AppIconName } from "~/utils/icons";
import type { ConfigTextKey, TagSetsPlacement, TagTextFieldMode } from "~/types/imageTagger";

type TagSetPlacementKey =
  | "commonTagsPlacement"
  | "knownTagsPlacement"
  | "highlightTagsPlacement"
  | "highlightTextPlacement"
  | "orderTagsPlacement";

interface TagSetField {
  key: ConfigTextKey;
  placementKey: TagSetPlacementKey;
  label: string;
  icon: AppIconName | "";
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
    placementKey: "commonTagsPlacement",
    label: "Common tags",
    icon: "common",
    rows: 5,
    mode: "tags",
    placeholder: "masterpiece, best quality",
    title: "Tags shown as quick toggle chips on every image row.",
    autocomplete: true,
    decorate: true
  },
  {
    key: "knownTagsText",
    placementKey: "knownTagsPlacement",
    label: "Known tags",
    icon: "known",
    rows: 5,
    mode: "tags",
    placeholder: "Tags treated as expected",
    title: "Known tags are not underlined as unknown.",
    autocomplete: true,
    decorate: false
  },
  {
    key: "highlightTagsText",
    placementKey: "highlightTagsPlacement",
    label: "Highlight tags",
    icon: "highlight",
    rows: 4,
    mode: "tags",
    placeholder: "Tags to emphasize",
    title: "Exact tags to visually highlight in chips and statistics.",
    autocomplete: true,
    decorate: true
  },
  {
    key: "highlightText",
    placementKey: "highlightTextPlacement",
    label: "Highlight text",
    icon: "text",
    rows: 3,
    mode: "text",
    placeholder: "Text fragments to emphasize",
    title: "Text fragments to highlight inside tags or natural-language prompt fragments.",
    autocomplete: true,
    decorate: true
  },
  {
    key: "orderTagsText",
    placementKey: "orderTagsPlacement",
    label: "Order tags",
    icon: "",
    rows: 4,
    mode: "tags",
    placeholder: "Tags that should be first",
    title: "Preferred tag order. Use Apply Tag Order To Visible to apply it as an undoable edit.",
    autocomplete: true,
    decorate: true
  }
];

const props = withDefaults(defineProps<{
  collapsible?: boolean;
  placement?: TagSetsPlacement;
}>(), {
  collapsible: false,
  placement: "side"
});

const visibleFields = computed(() => fields.filter((field) => config[field.placementKey] === props.placement));
</script>

<style scoped lang="scss">
.tag-set-fields {
  display: flex;
  flex-direction: column;
  gap: var(--app-space-gap);

  &__section {
    min-width: 0;

    summary,
    .tag-set-fields__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--app-space-gap);
      margin-bottom: var(--app-space-panel);
      cursor: pointer;
      font-weight: 750;
      list-style: none;

      &::-webkit-details-marker {
        display: none;
      }
    }
  }

  &__heading {
    display: inline-flex;
    min-width: 0;
    align-items: center;
    gap: var(--app-space-gap);
  }

  &__placement {
    flex: 0 0 auto;
  }
}
</style>
