import { Font } from "@react-pdf/renderer";

/**
 * Word breaking policy for generated PDFs.
 *
 * react-pdf ships with an en-US hyphenation dictionary enabled by default,
 * which is what turns "Workflow" into "Work-flow", "Resend" into "Re-send" and
 * "Webhooks" into "Web-hooks" whenever a line happens to end near those words.
 * Registering our own callback replaces that dictionary: a word is returned as
 * a single part, so the line breaker has nowhere to split it and wraps the
 * whole word to the next line instead.
 *
 * The one exception is a token too long to ever fit on a line — in practice a
 * URL. Those are split after their natural separators so they wrap cleanly.
 * react-pdf does not insert a hyphen glyph at a break point, so this never
 * introduces a hyphen that was not in the source text.
 */

/** Beyond this length a token is assumed to be a URL rather than a real word. */
const MAX_UNBROKEN_CHARS = 32;

/** Characters a long token may wrap after, kept with the preceding part. */
const BREAK_AFTER = new Set(["/", ".", "_", "-", "?", "&", "=", ":", ",", ";"]);

function splitLongToken(token: string): string[] {
  const parts: string[] = [];
  let start = 0;

  for (let i = 0; i < token.length; i += 1) {
    // Never break on a run of separators ("https://"), only after the last one.
    if (BREAK_AFTER.has(token[i]) && !BREAK_AFTER.has(token[i + 1])) {
      parts.push(token.slice(start, i + 1));
      start = i + 1;
    }
  }
  if (start < token.length) parts.push(token.slice(start));

  return parts.length > 1 ? parts : [token];
}

let registered = false;

/**
 * Idempotent — the callback is global to react-pdf's font store, so every
 * document shares the same policy.
 */
export function configureWordWrapping(): void {
  if (registered) return;
  Font.registerHyphenationCallback((word) =>
    word.length > MAX_UNBROKEN_CHARS ? splitLongToken(word) : [word],
  );
  registered = true;
}
