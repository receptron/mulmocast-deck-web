<script setup lang="ts">
import type { SlideLayout } from "@mulmocast/deck";

defineProps<{
  slides: SlideLayout[];
  selectedIndex: number;
}>();

const emit = defineEmits<{
  select: [index: number];
  add: [];
  remove: [index: number];
}>();

const labelOf = (s: SlideLayout, i: number): string => {
  if ("title" in s && typeof s.title === "string" && s.title) return s.title;
  if (s.layout === "bigQuote" && s.quote) return s.quote.slice(0, 40);
  return `Slide ${i + 1}`;
};
</script>

<template>
  <div class="flex h-full flex-col">
    <header class="flex items-center justify-between border-b border-stone-200 px-4 py-3">
      <h2 class="text-sm font-semibold tracking-wide text-stone-700">Deck</h2>
      <button type="button" class="rounded-md bg-stone-900 px-2.5 py-1 text-xs font-medium text-white hover:bg-stone-800" @click="emit('add')">+ Add</button>
    </header>
    <ul class="flex-1 overflow-y-auto py-2">
      <li
        v-for="(s, i) in slides"
        :key="i"
        :class="[
          'group flex items-center justify-between gap-2 border-l-2 px-3 py-2 text-sm cursor-pointer',
          i === selectedIndex ? 'border-stone-900 bg-stone-100 text-stone-900' : 'border-transparent text-stone-600 hover:bg-stone-50',
        ]"
        @click="emit('select', i)"
      >
        <div class="min-w-0 flex-1">
          <div class="truncate font-medium">{{ labelOf(s, i) }}</div>
          <div class="text-[10px] uppercase tracking-wider text-stone-400">{{ s.layout }}</div>
        </div>
        <button
          v-if="slides.length > 1"
          type="button"
          class="invisible rounded px-1.5 text-xs text-stone-400 hover:bg-stone-200 hover:text-stone-700 group-hover:visible"
          @click.stop="emit('remove', i)"
        >
          ×
        </button>
      </li>
    </ul>
  </div>
</template>
