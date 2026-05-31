<script setup lang="ts">
import type { SlideLayout } from "@mulmocast/deck";
import { LAYOUT_TYPES } from "../editorHelpers";

defineProps<{
  slides: SlideLayout[];
  selectedIndex: number;
}>();

const emit = defineEmits<{
  select: [index: number];
  add: [layout: SlideLayout["layout"]];
  remove: [index: number];
  duplicate: [index: number];
  move: [index: number, delta: number];
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
      <select
        class="rounded-md bg-stone-900 px-2.5 py-1 text-xs font-medium text-white hover:bg-stone-800"
        @change="
          (e) => {
            const v = (e.target as HTMLSelectElement).value;
            if (v) {
              emit('add', v as SlideLayout['layout']);
              (e.target as HTMLSelectElement).value = '';
            }
          }
        "
      >
        <option value="">+ Add slide</option>
        <option v-for="l in LAYOUT_TYPES" :key="l" :value="l">{{ l }}</option>
      </select>
    </header>
    <ul class="flex-1 overflow-y-auto py-2">
      <li
        v-for="(s, i) in slides"
        :key="i"
        :class="[
          'group flex items-center justify-between gap-1 border-l-2 px-3 py-2 text-sm cursor-pointer',
          i === selectedIndex ? 'border-stone-900 bg-stone-100 text-stone-900' : 'border-transparent text-stone-600 hover:bg-stone-50',
        ]"
        @click="emit('select', i)"
      >
        <div class="min-w-0 flex-1">
          <div class="truncate font-medium">{{ labelOf(s, i) }}</div>
          <div class="text-[10px] uppercase tracking-wider text-stone-400">{{ s.layout }}</div>
        </div>
        <div class="flex shrink-0 items-center gap-0.5 opacity-0 group-hover:opacity-100">
          <button
            type="button"
            class="rounded px-1 text-xs text-stone-500 hover:bg-stone-200 hover:text-stone-700 disabled:opacity-30"
            :disabled="i === 0"
            title="up"
            @click.stop="emit('move', i, -1)"
          >
            ↑
          </button>
          <button
            type="button"
            class="rounded px-1 text-xs text-stone-500 hover:bg-stone-200 hover:text-stone-700 disabled:opacity-30"
            :disabled="i === slides.length - 1"
            title="down"
            @click.stop="emit('move', i, 1)"
          >
            ↓
          </button>
          <button
            type="button"
            class="rounded px-1 text-xs text-stone-500 hover:bg-stone-200 hover:text-stone-700"
            title="duplicate"
            @click.stop="emit('duplicate', i)"
          >
            ⎘
          </button>
          <button
            v-if="slides.length > 1"
            type="button"
            class="rounded px-1 text-xs text-stone-400 hover:bg-rose-100 hover:text-rose-700"
            title="remove"
            @click.stop="emit('remove', i)"
          >
            ×
          </button>
        </div>
      </li>
    </ul>
  </div>
</template>
