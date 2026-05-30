// Public API for @mulmocast/deck-web
// Composable Vue 3 components for editing @mulmocast/deck SlideLayout decks live in the browser.

export { default as DeckEditor } from "./DeckEditor.vue";
export { default as DeckList } from "./components/DeckList.vue";
export { default as SlidePreview } from "./components/SlidePreview.vue";
export { default as Inspector } from "./components/Inspector.vue";

export { defaultTheme, sampleDeck } from "./data/sampleDeck";

// Re-export deck types for convenience so consumers don't have to add @mulmocast/deck just for types.
export type { SlideLayout, SlideTheme } from "@mulmocast/deck";
