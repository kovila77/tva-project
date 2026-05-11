<template>
  <div v-if="settingsModal.open === true" class="settings-modal" @click.self="closeSettingsModal">
    <section class="settings-modal__panel" role="dialog" aria-modal="true" aria-labelledby="settings-modal-title" @click.self="closeSettingsModal">
      <header class="settings-modal__header">
        <div class="settings-modal__titles">
          <strong id="settings-modal-title" class="settings-modal__title">Settings</strong>
        </div>
        <button
          class="btn danger icon-btn settings-modal__close"
          type="button"
          title="Close settings."
          aria-label="Close settings"
          @click="closeSettingsModal"
        >
          <AppIcon name="close" class="icon" />
        </button>
      </header>

      <div class="settings-modal__body">
        <section class="settings-modal__section" aria-labelledby="settings-modal-files">
          <header class="settings-modal__section-header">
            <strong id="settings-modal-files">Config and image folders</strong>
          </header>
          <FileManagementControls />
        </section>

        <section class="settings-modal__section" aria-labelledby="settings-modal-layout">
          <header class="settings-modal__section-header">
            <strong id="settings-modal-layout">Layout config</strong>
          </header>
          <LayoutConfigControls />
        </section>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import AppIcon from "~/components/AppIcon.vue";
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
  padding: 12px;
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
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    padding: 14px 16px 12px;
    border-bottom: 1px solid var(--border);
    background: linear-gradient(180deg, color-mix(in srgb, var(--surface) 94%, white 6%), var(--surface));
  }

  &__titles {
    display: grid;
    gap: 2px;
    min-width: 0;
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
    display: grid;
    gap: 12px;
    padding: 16px;
    overflow: auto;
  }

  &__section {
    display: grid;
    gap: 10px;
    padding: 14px;
    border: 1px solid var(--border);
    border-radius: calc(var(--radius) - 2px);
    background: var(--surface-soft);
  }

  &__section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    min-width: 0;
  }
}

@media (max-width: 860px) {
  .settings-modal {
    padding: 8px;

    &__panel {
      max-height: calc(100vh - 16px);
    }

    &__header,
    &__body {
      padding-left: 12px;
      padding-right: 12px;
    }
  }
}
</style>
