/**
 * AI region proposal contract (typed seam — Func §5 AI assistant).
 *
 * The AI assistant proxy is deferred to its own session; when it ships it will be
 * a key-gated server route that calls Anthropic only when `ANTHROPIC_API_KEY` is
 * set and returns region JSON. That JSON MUST validate against the §2 content
 * schema before anything touches the worksheet — this module is that validator,
 * shipped now (pure + tested) so the route is a thin wrapper with no schema
 * surprises. It is intentionally not wired into any UI or route this pass.
 */
import { z } from "zod";
import { regionSchema, type Region } from "@/lib/worksheet/content";

/** An AI proposal is a bounded list of content regions to insert. */
export const aiProposalSchema = z.object({
  regions: z.array(regionSchema).min(1).max(50),
});

export type AiProposal = z.infer<typeof aiProposalSchema>;

export type AiValidation =
  | { ok: true; regions: Region[] }
  | { ok: false; error: string };

/** Validate untrusted AI output into content regions, in the app's voice. */
export function validateAiRegions(json: unknown): AiValidation {
  const parsed = aiProposalSchema.safeParse(json);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "The AI response wasn't valid worksheet content.",
    };
  }
  return { ok: true, regions: parsed.data.regions as Region[] };
}
