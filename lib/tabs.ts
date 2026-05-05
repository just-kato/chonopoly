import { type Tab } from "@/components/ChapterView";

export const TAB_TO_SLUG: Record<Tab, string> = {
  "Overview": "overview",
  "Course Content": "content",
  "Core Concepts": "concepts",
  "Key Terms": "terms",
  "Practice Questions": "questions",
  "Quick Reference": "reference",
  "Resources": "resources",
};

export const SLUG_TO_TAB: Record<string, Tab> = Object.fromEntries(
  Object.entries(TAB_TO_SLUG).map(([tab, slug]) => [slug, tab as Tab])
);
