import type { ImageRecord, ViewerState } from "~/types/imageTagger";

interface ViewerActionOptions {
  viewer: ViewerState;
}

export function createViewerActions({ viewer }: ViewerActionOptions) {
  function openViewer(image: ImageRecord): void {
    viewer.image = image;
    resetViewer();
    document.body.style.overflow = "hidden";
  }

  function closeViewer(): void {
    viewer.image = null;
    document.body.style.overflow = "";
  }

  function zoomViewer(multiplier: number): void {
    viewer.scale = Math.min(8, Math.max(0.2, viewer.scale * multiplier));
  }

  function resetViewer(): void {
    viewer.scale = 1;
    viewer.x = 0;
    viewer.y = 0;
    viewer.dragging = false;
    viewer.pointerId = null;
  }

  function onViewerWheel(event: WheelEvent): void {
    zoomViewer(event.deltaY < 0 ? 1.12 : 1 / 1.12);
  }

  function startViewerDrag(event: PointerEvent): void {
    viewer.dragging = true;
    viewer.pointerId = event.pointerId;
    viewer.dragStartX = event.clientX - viewer.x;
    viewer.dragStartY = event.clientY - viewer.y;
  }

  function moveViewerDrag(event: PointerEvent): void {
    if (!viewer.dragging || viewer.pointerId !== event.pointerId) {
      return;
    }

    viewer.x = event.clientX - viewer.dragStartX;
    viewer.y = event.clientY - viewer.dragStartY;
  }

  function stopViewerDrag(): void {
    viewer.dragging = false;
    viewer.pointerId = null;
  }

  return {
    openViewer,
    closeViewer,
    zoomViewer,
    resetViewer,
    onViewerWheel,
    startViewerDrag,
    moveViewerDrag,
    stopViewerDrag
  };
}
