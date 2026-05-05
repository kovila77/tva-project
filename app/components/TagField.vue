<template>
  <label class="field">
    <span>{{ label }}</span>
    <textarea
      v-model="model"
      class="control textarea"
      :rows="rows"
      :placeholder="placeholder"
      :title="title"
    />
  </label>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  label: string;
  rows?: number;
  placeholder?: string;
  title?: string;
}>(), {
  rows: 4,
  placeholder: "",
  title: ""
});

const model = defineModel<string>({ required: true });
</script>
