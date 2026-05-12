import {
  faArrowLeft,
  faArrowRight,
  faArrowDown,
  faArrowUp,
  faArrowRotateLeft,
  faArrowRotateRight,
  faArrowsRotate,
  faBroom,
  faChartColumn,
  faCheck,
  faClockRotateLeft,
  faCopy,
  faDownload,
  faEye,
  faFileArrowDown,
  faFileExport,
  faFileImport,
  faHashtag,
  faImages,
  faEllipsis,
  faList,
  faMagnifyingGlass,
  faMagnifyingGlassMinus,
  faMagnifyingGlassPlus,
  faMinus,
  faPen,
  faPlus,
  faRightLeft,
  faRotateLeft,
  faScrewdriverWrench,
  faSlash,
  faStar,
  faTag,
  faTags,
  faTextHeight,
  faTrash,
  faUpload,
  faXmark,
  faGear
} from "@fortawesome/free-solid-svg-icons";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";

interface LayeredAppIcon {
  base: IconDefinition;
  overlays: Array<{
    icon: IconDefinition;
    transform: string;
  }>;
}

export const appIcons = {
  add: faPlus,
  apply: faCheck,
  arrowDown: faArrowDown,
  arrowLeft: faArrowLeft,
  arrowRight: faArrowRight,
  arrowUp: faArrowUp,
  clean: faBroom,
  clear: faXmark,
  close: faXmark,
  common: faTags,
  copy: faCopy,
  download: faDownload,
  export: faFileExport,
  exportFile: faFileArrowDown,
  settings: faGear,
  filter: faMagnifyingGlass,
  filterAdd: faMagnifyingGlassPlus,
  filterClear: {
    base: faMagnifyingGlass,
    overlays: [
      { icon: faSlash, transform: "shrink-2 right-1" },
      { icon: faSlash, transform: "shrink-2 left-1 flip-h" }
    ]
  },
  filterInvert: {
    base: faMagnifyingGlass,
    overlays: [
      { icon: faRotateLeft, transform: "shrink-5 right-7 down-5" }
    ]
  },
  highlight: faStar,
  history: faClockRotateLeft,
  images: faImages,
  import: faFileImport,
  known: faTag,
  order: faList,
  preview: faEye,
  remove: faMinus,
  removeItem: faTrash,
  rename: faPen,
  replace: faRightLeft,
  reset: faArrowsRotate,
  revert: faRotateLeft,
  showMore: faPlus,
  stats: faChartColumn,
  text: faTextHeight,
  tools: faScrewdriverWrench,
  undo: faArrowRotateLeft,
  upload: faUpload,
  zoomIn: faMagnifyingGlassPlus,
  zoomOut: faMagnifyingGlassMinus,
  redo: faArrowRotateRight,
  hashtag: faHashtag,
  more: faEllipsis
} satisfies Record<string, IconDefinition | LayeredAppIcon>;

export type AppIconName = keyof typeof appIcons;
export type AppIconSpec = (typeof appIcons)[AppIconName];
export type { LayeredAppIcon };
