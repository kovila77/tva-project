<template>
  <div v-if="settingsModal.open === true" class="settings-modal" @click.self="closeSettingsModal">
    <section
      class="settings-modal__panel"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-modal-title"
      @click.self="closeSettingsModal"
    >
      <header class="settings-modal__header">
        <strong id="settings-modal-title" class="settings-modal__title">Settings</strong>
        <AppIconButton
          class="settings-modal__close"
          icon="close"
          title="Close settings."
          aria-label="Close settings"
          danger
          @click="closeSettingsModal"
        />
      </header>

      <div class="settings-modal__body">
        <section class="settings-modal__section" aria-labelledby="settings-modal-files">
          <h3 id="settings-modal-files" class="settings-modal__section-title">Config and image folders</h3>
          <FileManagementControls />
        </section>

        <section class="settings-modal__section" aria-labelledby="settings-modal-layout">
          <h3 id="settings-modal-layout" class="settings-modal__section-title">Layout config</h3>
          <LayoutConfigControls />
        </section>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import AppIconButton from "~/components/AppIconButton.vue";
import FileManagementControls from "~/components/FileManagementControls.vue";
import LayoutConfigControls from "~/components/LayoutConfigControls.vue";
import { useImageTaggerContext } from "~/composables/useImageTagger";

const {
  settingsModal,
  closeSettingsModal,
} = useImageTaggerContext();
</script>

<style scoped lang="scss">
.settings-modal {
  position: fixed;
  inset: 0;
  z-index: 2000;
  display: grid;
  place-items: center;
  padding: var(--app-space-page);
  background: rgba(8, 11, 18, 0.72);
  backdrop-filter: blur(4px);

  &__panel {
    width: min(1100px, 100%);
    max-height: calc(100vh - 24px);
    display: flex;
    flex-direction: column;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: var(--surface);
    box-shadow: var(--shadow);
    color: var(--text);
  }

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--app-space-gap);
    padding: var(--app-space-page);
    border-bottom: 1px solid var(--border);
    background: linear-gradient(180deg, color-mix(in srgb, var(--surface) 94%, white 6%), var(--surface));
  }

  &__title {
    font-size: 16px;
    line-height: 1.2;
  }

  &__close {
    flex: 0 0 auto;
  }

  &__body {
    flex: 1 1 auto;
    min-height: 0;
    display: flex;
    flex-direction: column;
    gap: var(--app-space-gap);
    padding: var(--app-space-page);
    overflow: auto;
  }

  &__section {
    display: flex;
    flex-direction: column;
    gap: var(--app-space-gap);
    padding: var(--app-space-page);
    border: 1px solid var(--border);
    border-radius: max(0px, calc(var(--radius) - 2px));
    background: var(--surface-soft);
  }

  &__section-title {
    margin: 0;
    font-size: 14px;
    line-height: 1.2;
  }

  :deep(.file-management-controls),
  :deep(.layout-config-controls) {
    display: flex;
    flex-wrap: wrap;
    align-items: end;
    gap: var(--app-space-gap);
  }

  :deep(.field.compact) {
    flex: 1 1 160px;
    width: auto;
  }

  :deep(.file-management-controls__name) {
    flex: 2 1 220px;
  }

  :deep(.file-management-controls > .btn) {
    flex: 0 1 auto;
  }
}

@media (max-width: 860px) {
  .settings-modal {
    padding: var(--app-space-panel);

    &__panel {
      max-height: calc(100vh - 16px);
    }

    &__header,
    &__body {
      padding-left: var(--app-space-page);
      padding-right: var(--app-space-page);
    }
  }
}
</style>
