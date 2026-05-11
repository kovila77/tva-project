<template>
  <div class="image-dimension-control">
    <label class="field compact">
      <span>{{ label }}</span>
      <select v-model="mode" class="control" :title="modeTitle">
        <option :value="defaultMode">{{ defaultOptionLabel }}</option>
        <option v-for="option in extraModes" :key="option.value" :value="option.value">{{ option.label }}</option>
        <option value="fixed">Fixed</option>
      </select>
    </label>

    <template v-if="mode === 'fixed'">
      <label class="field image-dimension-control__slider">
        <span>{{ fixedLabel }} {{ value }}px</span>
        <input
          v-model.number="sliderValue"
          class="image-dimension-control__range"
          type="range"
          :min="sliderMin"
          :max="sliderMax"
          :step="sliderStep"
          :title="sliderTitle"
        >
      </label>

      <label class="field image-dimension-control__manual">
        <span>px</span>
        <input
          class="control"
          type="number"
          :value="value"
          title="Manual pixel value. This field is not limited by the slider range."
          @input="setManualValue"
        >
      </label>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";

const props = withDefaults(defineProps<{
  label: string;
  defaultMode: string;
  defaultOptionLabel: string;
  fixedLabel: string;
  sliderMin: number;
  sliderMax: number;
  sliderStep?: number;
  extraModes?: Array<{ value: string; label: string }>;
  modeTitle: string;
  sliderTitle: string;
}>(), {
  sliderStep: 10,
  extraModes: () => []
});

const mode = defineModel<string>("mode", { required: true });
const value = defineModel<number>("value", { required: true });

const sliderValue = computed({
  get: () => Math.min(props.sliderMax, Math.max(props.sliderMin, value.value)),
  set: (nextValue: number) => {
    value.value = Math.min(props.sliderMax, Math.max(props.sliderMin, Math.round(Number(nextValue) || props.sliderMin)));
  }
});

function setManualValue(event: Event): void {
  const input = event.target as HTMLInputElement | null;
  const nextValue = Number(input?.value);
  if (Number.isFinite(nextValue)) {
    value.value = Math.round(nextValue);
  }
}
</script>

<style scoped lang="scss">
.image-dimension-control {
  display: contents;

  &__slider {
    width: min(260px, 100%);
  }

  &__manual {
    width: 92px;
  }

  &__range {
    width: 100%;
    accent-color: var(--blue);
  }
}
</style>
