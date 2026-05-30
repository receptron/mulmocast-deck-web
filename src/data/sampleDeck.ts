import type { SlideLayout, SlideTheme } from "@mulmocast/deck";

export const defaultTheme: SlideTheme = {
  colors: {
    bg: "FFFBEB",
    bgCard: "FFFFFF",
    bgCardAlt: "FEF3C7",
    text: "1C1917",
    textMuted: "57534E",
    textDim: "A8A29E",
    primary: "EA580C",
    accent: "D946EF",
    success: "16A34A",
    warning: "CA8A04",
    danger: "DC2626",
    info: "0284C7",
    highlight: "E11D48",
  },
  fonts: { title: "Georgia", body: "Calibri", mono: "Consolas" },
};

export const sampleDeck: SlideLayout[] = [
  {
    layout: "title",
    title: "MulmoCast Deck Editor",
    subtitle: "Live-preview a SlideLayout DSL in the browser",
  },
  {
    layout: "stats",
    title: "Quarterly Highlights",
    subtitle: "FY2026 Q1",
    stats: [
      { value: "+42%", label: "Revenue YoY", color: "success" },
      { value: "1.8M", label: "Active Users", color: "primary" },
      { value: "4.6", label: "Avg NPS", color: "info" },
      { value: "98%", label: "Uptime", color: "accent" },
    ],
  },
  {
    layout: "comparison",
    title: "Before vs After",
    left: {
      title: "Before",
      accentColor: "danger",
      content: [{ type: "bullets", items: ["Slow CI", "Manual deploys", "No alerts"] }],
    },
    right: {
      title: "After",
      accentColor: "success",
      content: [{ type: "bullets", items: ["Fast CI", "One-click deploys", "Live alerts"] }],
    },
  },
  {
    layout: "bigQuote",
    quote: "Stay hungry. Stay foolish.",
    author: "Steve Jobs",
  },
];
