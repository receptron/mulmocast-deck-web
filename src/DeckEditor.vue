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
  }>(),
  { selectedIndex: 0, theme: () => defaultTheme },
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
  // Follow the moved slide so the user stays focused on it.
  const newIndex = Math.max(0, Math.min(next.length - 1, i + delta));
  setIndex(newIndex);
};
</script>

<template>
  <div class="flex h-full w-full overflow-hidden bg-stone-50 text-stone-900">
    <aside class="w-64 shrink-0 border-r border-stone-200 bg-white">
      <DeckList
        :slides="slides"
        :selected-index="internalIndex"
        @select="setIndex"
        @add="addSlide"
        @remove="removeSlide"
        @duplicate="duplicateSlide"
        @move="moveSlide"
      />
    </aside>
    <main class="flex-1 min-w-0 bg-stone-100">
      <SlidePreview v-if="selectedSlide" :slide="selectedSlide" :theme="theme" />
      <div v-else class="flex h-full items-center justify-center text-stone-400">No slide selected</div>
    </main>
    <aside class="w-96 shrink-0 border-l border-stone-200 bg-white overflow-y-auto">
      <Inspector v-if="selectedSlide" :slide="selectedSlide" @update="updateSlide" />
    </aside>
  </div>
</template>
