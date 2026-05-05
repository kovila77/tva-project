<template>
  <FontAwesomeIcon class="fa-icon" :icon="appIcons[name]" aria-hidden="true" />
</template>

<script setup lang="ts">
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import { appIcons, type AppIconName } from "~/utils/icons";

defineProps<{
  name: AppIconName;
}>();
</script>
