<script setup lang="ts">
import { ref } from "vue";
import type { SlideLayout } from "@mulmocast/deck";
import DeckEditor from "./DeckEditor.vue";
import { sampleDeck, defaultTheme } from "./data/sampleDeck";

const slides = ref<SlideLayout[]>(sampleDeck);
</script>

<template>
  <DeckEditor v-model:slides="slides" :theme="defaultTheme" />
</template>
