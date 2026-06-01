<script setup lang="ts">
import { ACCENT_COLORS } from "../editorHelpers";

defineProps<{
  /** Top-left position in parent-page coordinates. */
  x: number;
  y: number;
  visible: boolean;
}>();

const emit = defineEmits<{
  /** Wrap selection in <strong>. */
  bold: [];
  /** Wrap selection in <em>. */
  emphasis: [];
  /** Wrap selection in <span class="text-d-{color}">. */
  color: [color: (typeof ACCENT_COLORS)[number]];
  /** Remove all inline formatting from selection. */
  clear: [];
}>();
</script>

<template>
  <div
    v-if="visible"
    class="fixed z-50 flex items-center gap-1 rounded-lg border border-stone-300 bg-white px-1.5 py-1 text-xs shadow-lg"
    :style="{ left: `${x}px`, top: `${y}px` }"
    @mousedown.prevent
  >
    <button type="button" class="rounded px-2 py-1 font-bold hover:bg-stone-100" title="Bold (** … **) — click again to remove" @click="emit('bold')">B</button>
    <button
      type="button"
      class="rounded px-2 py-1 font-extrabold text-amber-500 hover:bg-stone-100"
      title="Highlight in amber (* … *) — click again to remove"
      @click="emit('emphasis')"
    >
      ★
    </button>
    <div class="mx-1 h-4 w-px bg-stone-200"></div>
    <button
      v-for="c in ACCENT_COLORS"
      :key="c"
      type="button"
      class="h-5 w-5 rounded-full border border-stone-200 hover:scale-110 transition-transform"
      :class="{
        'bg-sky-500': c === 'primary',
        'bg-violet-500': c === 'accent',
        'bg-emerald-500': c === 'success',
        'bg-amber-500': c === 'warning',
        'bg-rose-500': c === 'danger',
        'bg-cyan-500': c === 'info',
        'bg-fuchsia-500': c === 'highlight',
      }"
      :title="`Color: ${c} ({${c}:...})`"
      @click="emit('color', c)"
    ></button>
    <div class="mx-1 h-4 w-px bg-stone-200"></div>
    <button type="button" class="rounded px-2 py-1 text-stone-500 hover:bg-stone-100" title="Clear all formatting in selection" @click="emit('clear')">
      ×
    </button>
  </div>
</template>
