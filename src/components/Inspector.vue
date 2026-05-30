<script setup lang="ts">
import { computed } from "vue";
import type { SlideLayout } from "@mulmocast/deck";

const props = defineProps<{ slide: SlideLayout }>();
const emit = defineEmits<{ update: [slide: SlideLayout] }>();

const patch = (partial: Partial<SlideLayout>) => {
  emit("update", { ...(props.slide as object), ...partial } as SlideLayout);
};

const setStr = (key: string, value: string) => {
  patch({ [key]: value || undefined } as Partial<SlideLayout>);
};

// Layout-specific helpers for the few layouts we support out of the box.
const isTitle = computed(() => props.slide.layout === "title");
const isStats = computed(() => props.slide.layout === "stats");
const isComparison = computed(() => props.slide.layout === "comparison");
const isBigQuote = computed(() => props.slide.layout === "bigQuote");

const updateStat = (i: number, key: "value" | "label" | "color", v: string) => {
  if (props.slide.layout !== "stats") return;
  const stats = props.slide.stats.map((s, idx) => (idx === i ? { ...s, [key]: v || undefined } : s));
  patch({ stats } as Partial<SlideLayout>);
};
</script>

<template>
  <div class="p-5 space-y-5">
    <header class="flex items-center justify-between border-b border-stone-200 pb-3">
      <h2 class="text-sm font-semibold tracking-wide text-stone-700">Inspector</h2>
      <span class="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] uppercase tracking-wider text-stone-500">{{ slide.layout }}</span>
    </header>

    <!-- common: title / subtitle (where present) -->
    <div v-if="isTitle || isStats || isComparison" class="space-y-3">
      <label class="block text-xs font-medium text-stone-500">
        Title
        <input
          type="text"
          :value="'title' in slide ? slide.title : ''"
          class="mt-1 w-full rounded-md border border-stone-300 bg-white px-2.5 py-1.5 text-sm shadow-sm focus:border-stone-500 focus:outline-none"
          @input="setStr('title', ($event.target as HTMLInputElement).value)"
        />
      </label>
      <label v-if="isTitle || isStats" class="block text-xs font-medium text-stone-500">
        Subtitle
        <input
          type="text"
          :value="('subtitle' in slide ? slide.subtitle : '') ?? ''"
          class="mt-1 w-full rounded-md border border-stone-300 bg-white px-2.5 py-1.5 text-sm shadow-sm focus:border-stone-500 focus:outline-none"
          @input="setStr('subtitle', ($event.target as HTMLInputElement).value)"
        />
      </label>
    </div>

    <!-- stats: per-item editor -->
    <div v-if="isStats && slide.layout === 'stats'" class="space-y-3">
      <h3 class="text-xs font-semibold uppercase tracking-wider text-stone-500">Stats</h3>
      <div v-for="(s, i) in slide.stats" :key="i" class="rounded-md border border-stone-200 p-3 space-y-2">
        <label class="block text-[11px] text-stone-500">
          Value
          <input
            type="text"
            :value="s.value"
            class="mt-0.5 w-full rounded border border-stone-300 px-2 py-1 text-sm"
            @input="updateStat(i, 'value', ($event.target as HTMLInputElement).value)"
          />
        </label>
        <label class="block text-[11px] text-stone-500">
          Label
          <input
            type="text"
            :value="s.label"
            class="mt-0.5 w-full rounded border border-stone-300 px-2 py-1 text-sm"
            @input="updateStat(i, 'label', ($event.target as HTMLInputElement).value)"
          />
        </label>
        <label class="block text-[11px] text-stone-500">
          Color
          <select
            :value="s.color ?? ''"
            class="mt-0.5 w-full rounded border border-stone-300 px-2 py-1 text-sm bg-white"
            @change="updateStat(i, 'color', ($event.target as HTMLSelectElement).value)"
          >
            <option value="">(none)</option>
            <option v-for="c in ['primary', 'accent', 'success', 'warning', 'danger', 'info', 'highlight']" :key="c" :value="c">{{ c }}</option>
          </select>
        </label>
      </div>
    </div>

    <!-- bigQuote -->
    <div v-if="isBigQuote && slide.layout === 'bigQuote'" class="space-y-3">
      <label class="block text-xs font-medium text-stone-500">
        Quote
        <textarea
          :value="slide.quote"
          rows="3"
          class="mt-1 w-full rounded-md border border-stone-300 bg-white px-2.5 py-1.5 text-sm shadow-sm focus:border-stone-500 focus:outline-none"
          @input="patch({ quote: ($event.target as HTMLTextAreaElement).value })"
        />
      </label>
      <label class="block text-xs font-medium text-stone-500">
        Author
        <input
          type="text"
          :value="slide.author ?? ''"
          class="mt-1 w-full rounded-md border border-stone-300 bg-white px-2.5 py-1.5 text-sm shadow-sm focus:border-stone-500 focus:outline-none"
          @input="setStr('author', ($event.target as HTMLInputElement).value)"
        />
      </label>
    </div>

    <p class="text-[11px] leading-snug text-stone-400">
      Only a subset of fields is editable in this MVP (title / subtitle / stats / quote / author). Other layouts render but aren't form-editable yet.
    </p>
  </div>
</template>
