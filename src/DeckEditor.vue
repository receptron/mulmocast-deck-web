<script setup lang="ts">
import { ref, computed, watch } from "vue";
import type { SlideLayout, SlideTheme } from "@mulmocast/deck";
import { defaultTheme } from "./data/sampleDeck";
import { makeSlide, clone, moveInArray } from "./editorHelpers";
import DeckList from "./components/DeckList.vue";
import SlidePreview from "./components/SlidePreview.vue";
import Inspector from "./components/Inspector.vue";

const props = withDefaults(
  defineProps<{
    slides: SlideLayout[];
    theme?: SlideTheme;
    selectedIndex?: number;
    /**
     * "split"   — 3-pane: DeckList | SlidePreview | Inspector (default, original behavior).
     * "compact" — top toolbar (prev/next + add/dup/del + inspector toggle) | SlidePreview | Inspector (collapsible).
     *             Frees up the 256px DeckList column for the preview, useful when embedded in
     *             a narrower host (e.g. the mulmoclaude canvas) where every pixel matters.
     */
    layout?: "split" | "compact";
  }>(),
  { selectedIndex: 0, theme: () => defaultTheme, layout: "split" },
);

const emit = defineEmits<{
  "update:slides": [slides: SlideLayout[]];
  "update:selectedIndex": [index: number];
}>();

const internalIndex = ref(props.selectedIndex ?? 0);
watch(
  () => props.selectedIndex,
  (v) => {
    if (typeof v === "number") internalIndex.value = v;
  },
);
const setIndex = (i: number) => {
  internalIndex.value = i;
  emit("update:selectedIndex", i);
};

const selectedSlide = computed<SlideLayout | undefined>(() => props.slides[internalIndex.value]);

const emitSlides = (next: SlideLayout[]) => emit("update:slides", next);

const updateSlide = (next: SlideLayout) => {
  const i = internalIndex.value;
  if (i < 0 || i >= props.slides.length) return;
  const copy = props.slides.slice();
  copy.splice(i, 1, next);
  emitSlides(copy);
};

const addSlide = (layout: SlideLayout["layout"]) => {
  const next = props.slides.concat([makeSlide(layout)]);
  emitSlides(next);
  setIndex(next.length - 1);
};

const removeSlide = (i: number) => {
  if (props.slides.length <= 1) return;
  const next = props.slides.slice();
  next.splice(i, 1);
  emitSlides(next);
  if (internalIndex.value >= next.length) setIndex(next.length - 1);
};

const duplicateSlide = (i: number) => {
  const next = props.slides.slice();
  next.splice(i + 1, 0, clone(props.slides[i]));
  emitSlides(next);
  setIndex(i + 1);
};

const moveSlide = (i: number, delta: number) => {
  const next = moveInArray(props.slides, i, delta);
  emitSlides(next);
  const newIndex = Math.max(0, Math.min(next.length - 1, i + delta));
  setIndex(newIndex);
};

const reorderSlide = (from: number, to: number) => {
  if (from === to) return;
  const next = props.slides.slice();
  const [el] = next.splice(from, 1);
  next.splice(to, 0, el);
  emitSlides(next);
  setIndex(to);
};

// compact-layout state
const inspectorOpen = ref(true);
const toggleInspector = () => {
  inspectorOpen.value = !inspectorOpen.value;
};
const goPrev = () => {
  if (internalIndex.value > 0) setIndex(internalIndex.value - 1);
};
const goNext = () => {
  if (internalIndex.value < props.slides.length - 1) setIndex(internalIndex.value + 1);
};
// Default-add a title-layout slide; matches DeckList's "+ Add slide" default.
const addDefaultSlide = () => addSlide("title");
const duplicateCurrent = () => duplicateSlide(internalIndex.value);
const removeCurrent = () => removeSlide(internalIndex.value);
const canPrev = computed(() => internalIndex.value > 0);
const canNext = computed(() => internalIndex.value < props.slides.length - 1);
const canRemove = computed(() => props.slides.length > 1);
</script>

<template>
  <!-- "split" layout: original 3-pane DeckList | Preview | Inspector. -->
  <div v-if="layout === 'split'" class="flex h-full w-full overflow-hidden bg-stone-50 text-stone-900">
    <aside class="w-64 shrink-0 border-r border-stone-200 bg-white">
      <DeckList
        :slides="slides"
        :selected-index="internalIndex"
        @select="setIndex"
        @add="addSlide"
        @remove="removeSlide"
        @duplicate="duplicateSlide"
        @move="moveSlide"
        @reorder="reorderSlide"
      />
    </aside>
    <main class="flex-1 min-w-0 bg-stone-100">
      <SlidePreview v-if="selectedSlide" :slide="selectedSlide" :theme="theme" @update="updateSlide" />
      <div v-else class="flex h-full items-center justify-center text-stone-400">No slide selected</div>
    </main>
    <aside class="w-96 shrink-0 border-l border-stone-200 bg-white overflow-y-auto">
      <Inspector v-if="selectedSlide" :slide="selectedSlide" @update="updateSlide" />
    </aside>
  </div>

  <!-- "compact" layout: DeckList replaced by top toolbar (prev/next + slide ops);
       Inspector right-pane collapsible via toolbar toggle. Preview gets the freed width. -->
  <div v-else class="flex h-full w-full flex-col overflow-hidden bg-stone-50 text-stone-900">
    <div class="flex h-9 shrink-0 items-center gap-1 border-b border-stone-200 bg-white px-2 text-sm">
      <button
        type="button"
        :disabled="!canPrev"
        class="flex h-7 items-center gap-1 rounded px-2 text-stone-700 hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-30"
        @click="goPrev"
      >
        <span aria-hidden="true">◀</span>
        <span>Prev</span>
      </button>
      <div class="min-w-[5rem] text-center tabular-nums text-stone-600">{{ slides.length === 0 ? "0 / 0" : `${internalIndex + 1} / ${slides.length}` }}</div>
      <button
        type="button"
        :disabled="!canNext"
        class="flex h-7 items-center gap-1 rounded px-2 text-stone-700 hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-30"
        @click="goNext"
      >
        <span>Next</span>
        <span aria-hidden="true">▶</span>
      </button>
      <div class="mx-2 h-5 w-px bg-stone-200" />
      <button type="button" class="flex h-7 items-center gap-1 rounded px-2 text-stone-700 hover:bg-stone-100" title="Add slide" @click="addDefaultSlide">
        <span aria-hidden="true">＋</span>
        <span>Add</span>
      </button>
      <button
        type="button"
        :disabled="!selectedSlide"
        class="flex h-7 items-center gap-1 rounded px-2 text-stone-700 hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-30"
        title="Duplicate current slide"
        @click="duplicateCurrent"
      >
        <span aria-hidden="true">⧉</span>
        <span>Dup</span>
      </button>
      <button
        type="button"
        :disabled="!canRemove"
        class="flex h-7 items-center gap-1 rounded px-2 text-rose-600 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-30"
        title="Delete current slide"
        @click="removeCurrent"
      >
        <span aria-hidden="true">🗑</span>
        <span>Del</span>
      </button>
      <div class="ml-auto">
        <button
          type="button"
          class="flex h-7 items-center gap-1 rounded px-2 text-stone-700 hover:bg-stone-100"
          :title="inspectorOpen ? 'Hide inspector' : 'Show inspector'"
          @click="toggleInspector"
        >
          <span aria-hidden="true">{{ inspectorOpen ? "▶" : "◀" }}</span>
          <span>Inspector</span>
        </button>
      </div>
    </div>
    <div class="flex min-h-0 flex-1">
      <main class="flex-1 min-w-0 bg-stone-100">
        <SlidePreview v-if="selectedSlide" :slide="selectedSlide" :theme="theme" @update="updateSlide" />
        <div v-else class="flex h-full items-center justify-center text-stone-400">No slide selected</div>
      </main>
      <aside v-if="inspectorOpen" class="w-96 shrink-0 overflow-y-auto border-l border-stone-200 bg-white">
        <Inspector v-if="selectedSlide" :slide="selectedSlide" @update="updateSlide" />
      </aside>
    </div>
  </div>
</template>
