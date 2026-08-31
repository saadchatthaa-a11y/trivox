import Anthropic from "@anthropic-ai/sdk";

// Server-only. Never call this from a client component — it needs
// ANTHROPIC_API_KEY, which must stay off the browser.
export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export function stripJsonFences(text: string): string {
  return text.replace(/^```json/i, "").replace(/^```/, "").replace(/```\s*$/, "").trim();
}
