<template>
  <FontAwesomeIcon class="fa-icon" :icon="icon" aria-hidden="true" />
</template>

<script setup lang="ts">
import { computed } from "vue";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import { appIcons, type AppIconName } from "~/utils/icons";

const props = defineProps<{
  name: AppIconName;
}>();

const icon = computed(() => appIcons[props.name] ?? appIcons.close);
</script>
