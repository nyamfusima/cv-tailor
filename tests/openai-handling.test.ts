import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createOpenAICompleteJson } from "../src/lib/cv/openai";
import { IncompleteModelOutputError, ModelJsonParseError } from "../src/lib/cv/types";
import { parseModelJson } from "../src/lib/cv/json";
import { EXTRACT_PROMPT_VERSION } from "../src/lib/cv/prompts";

function completion(partial: {
  content?: string | null;
  finish_reason?: string;
  refusal?: string;
  model?: string;
}) {
  return {
    usage: { prompt_tokens: 9, completion_tokens: 4 },
    choices: [
      {
        finish_reason: partial.finish_reason ?? "stop",
        message: { content: partial.content ?? "", refusal: partial.refusal },
      },
    ],
  };
}

describe("OpenAI response handling", () => {
  it("rejects an incomplete repair response", async () => {
    const completeJson = createOpenAICompleteJson({
      chat: {
        completions: {
          create: async () => completion({ content: '{"summary":', finish_reason: "length" }),
        },
      },
    } as never);
    await assert.rejects(
      () => completeJson({ purpose: "repair", user: "{}", promptVersion: "tailor-v2" }),
      IncompleteModelOutputError,
    );
  });

  it("rejects output-limit termination", async () => {
    const completeJson = createOpenAICompleteJson({
      chat: {
        completions: {
          create: async () => completion({ content: '{"name":', finish_reason: "length" }),
        },
      },
    } as never);
    await assert.rejects(
      () => completeJson({ purpose: "extract", user: "{}", promptVersion: EXTRACT_PROMPT_VERSION }),
      IncompleteModelOutputError,
    );
  });

  it("rejects incomplete finish reasons even if JSON looks parseable", () => {
    assert.throws(() => parseModelJson('{"name":"Alex"}', "incomplete"));
    assert.throws(() => parseModelJson('{"name":"Alex"}', "content_filter"));
  });

  it("accepts model JSON with trailing commas before ] or }", () => {
    const parsed = parseModelJson(`{
      "paragraphs": ["Built APIs for school headers.", ],
      "sign_off": "Kind regards,",
      "name": "Alex"
    }`);
    assert.deepEqual(parsed, {
      paragraphs: ["Built APIs for school headers."],
      sign_off: "Kind regards,",
      name: "Alex",
    });
  });

  it("rejects malformed fallback JSON", async () => {
    const completeJson = createOpenAICompleteJson({
      chat: {
        completions: {
          create: async () => completion({ content: "not-json", finish_reason: "stop" }),
        },
      },
    } as never);
    await assert.rejects(
      () => completeJson({ purpose: "tailor", user: "{}", promptVersion: "tailor-v2" }),
      ModelJsonParseError,
    );
  });

  it("uses the fallback model after primary overload", async () => {
    let calls = 0;
    const completeJson = createOpenAICompleteJson({
      chat: {
        completions: {
          create: async (req: { model: string }) => {
            calls += 1;
            if (req.model === "gpt-5.1") {
              const err = new Error("overloaded") as Error & { status: number };
              err.status = 429;
              throw err;
            }
            return completion({ content: '{"ok":true}', finish_reason: "stop" });
          },
        },
      },
    } as never, { retryDelayMs: 0 });
    const result = await completeJson({ purpose: "tailor", user: "{}", promptVersion: "tailor-v2" });
    assert.equal(result.model, "gpt-5-mini");
    assert.ok(calls >= 2);
  });

  it("uses the fallback model after a primary 404 instead of aborting the request", async () => {
    let calls = 0;
    const completeJson = createOpenAICompleteJson({
      chat: {
        completions: {
          create: async (req: { model: string }) => {
            calls += 1;
            if (req.model === "gpt-5.1") {
              const err = new Error("The model `gpt-5.1` does not exist") as Error & { status: number };
              err.status = 404;
              throw err;
            }
            return completion({ content: '{"ok":true}', finish_reason: "stop" });
          },
        },
      },
    } as never, { retryDelayMs: 0 });
    const result = await completeJson({ purpose: "tailor", user: "{}", promptVersion: "tailor-v2" });
    assert.equal(result.model, "gpt-5-mini");
    assert.ok(calls >= 2);
  });

  it("fails when both models fail", async () => {
    const completeJson = createOpenAICompleteJson({
      chat: {
        completions: {
          create: async () => {
            const err = new Error("down") as Error & { status: number };
            err.status = 503;
            throw err;
          },
        },
      },
    } as never, { retryDelayMs: 0 });
    await assert.rejects(
      () => completeJson({ purpose: "tailor", user: "{}", promptVersion: "tailor-v2" }),
    );
  });
});
