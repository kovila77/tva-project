import type {  SettingsModalState } from "~/types/imageTagger";

interface SettingsModalActionOptions {
  settingsModal: SettingsModalState;
}

export function createSettingsModalActions({ settingsModal }: SettingsModalActionOptions) {
  function openSettingsModal(): void {
    settingsModal.open = true;
    document.body.style.overflow = "hidden";
  }

  function closeSettingsModal(): void {
    settingsModal.open = false;
    document.body.style.overflow = "";
  }

  return {
    openSettingsModal,
    closeSettingsModal,
  };
}
