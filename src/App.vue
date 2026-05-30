<script setup lang="ts">
import { ref, computed } from "vue";
import type { SlideLayout } from "@mulmocast/deck";
import { sampleDeck, defaultTheme } from "./data/sampleDeck";
import DeckList from "./components/DeckList.vue";
import SlidePreview from "./components/SlidePreview.vue";
import Inspector from "./components/Inspector.vue";

const slides = ref<SlideLayout[]>(sampleDeck);
const selectedIndex = ref(0);
const theme = ref(defaultTheme);

const selectedSlide = computed<SlideLayout | undefined>(() => slides.value[selectedIndex.value]);

const updateSlide = (next: SlideLayout) => {
  const i = selectedIndex.value;
  if (i >= 0 && i < slides.value.length) {
    slides.value.splice(i, 1, next);
  }
};

const addSlide = () => {
  slides.value.push({ layout: "title", title: "New slide" });
  selectedIndex.value = slides.value.length - 1;
};

const removeSlide = (i: number) => {
  if (slides.value.length <= 1) return;
  slides.value.splice(i, 1);
  if (selectedIndex.value >= slides.value.length) {
    selectedIndex.value = slides.value.length - 1;
  }
};
</script>

<template>
  <div class="flex h-screen w-screen overflow-hidden bg-stone-50 text-stone-900">
    <aside class="w-64 shrink-0 border-r border-stone-200 bg-white">
      <DeckList :slides="slides" :selected-index="selectedIndex" @select="(i: number) => (selectedIndex = i)" @add="addSlide" @remove="removeSlide" />
    </aside>
    <main class="flex-1 min-w-0 bg-stone-100">
      <SlidePreview v-if="selectedSlide" :slide="selectedSlide" :theme="theme" />
      <div v-else class="flex h-full items-center justify-center text-stone-400">No slide selected</div>
    </main>
    <aside class="w-80 shrink-0 border-l border-stone-200 bg-white overflow-y-auto">
      <Inspector v-if="selectedSlide" :slide="selectedSlide" @update="updateSlide" />
    </aside>
  </div>
</template>
