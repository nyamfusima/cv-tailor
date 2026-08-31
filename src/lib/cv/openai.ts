import OpenAI from "openai";
import { parseModelJson } from "./json";
import {
  FALLBACK_TAILOR_MODEL,
  IncompleteModelOutputError,
  PRIMARY_TAILOR_MODEL,
  type CompleteJsonFn,
  type CompleteJsonRequest,
  type CompleteJsonResponse,
} from "./types";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isOverloaded(err: unknown): boolean {
  const status = (err as { status?: number })?.status;
  return status === 429 || status === 500 || status === 503;
}

function isSchemaUnsupported(err: unknown): boolean {
  const message = String((err as { message?: string })?.message ?? err ?? "");
  return /response_format|json_schema|unsupported|invalid_request/i.test(message);
}

function usageOf(completion: OpenAI.Chat.Completions.ChatCompletion) {
  return {
    promptTokens: completion.usage?.prompt_tokens,
    completionTokens: completion.usage?.completion_tokens,
  };
}

export function logTailorTelemetry(event: Record<string, unknown>) {
  const safe = {
    promptVersion: event.promptVersion,
    model: event.model,
    purpose: event.purpose,
    usedFallback: event.usedFallback,
    finishReason: event.finishReason,
    promptTokens: event.promptTokens,
    completionTokens: event.completionTokens,
    validationValid: event.validationValid,
    retryCount: event.retryCount,
    missingItemCounts: event.missingItemCounts,
    latencyMs: event.latencyMs,
    repairAttempts: event.repairAttempts,
    repairSucceeded: event.repairSucceeded,
    extractionWarningCount: event.extractionWarningCount,
    claimStrengthWarningCount: event.claimStrengthWarningCount,
    customSectionCount: event.customSectionCount,
    creditStatus: event.creditStatus,
  };
  console.info("[tailor]", JSON.stringify(safe));
}

export function createOpenAICompleteJson(
  client = new OpenAI(),
  options: { retryDelayMs?: number } = {},
): CompleteJsonFn {
  const primary = process.env.OPENAI_TAILOR_MODEL || PRIMARY_TAILOR_MODEL;
  const fallback = process.env.OPENAI_TAILOR_FALLBACK_MODEL || FALLBACK_TAILOR_MODEL;

  return async function completeJson(req: CompleteJsonRequest): Promise<CompleteJsonResponse> {
    const started = Date.now();
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = req.system
      ? [
          { role: "system", content: req.system },
          { role: "user", content: req.user },
        ]
      : [{ role: "user", content: req.user }];

    const models = [primary, fallback];
    let lastError: unknown;
    let retryCount = 0;

    for (let modelIndex = 0; modelIndex < models.length; modelIndex++) {
      const model = models[modelIndex];
      const formats: Array<OpenAI.Chat.Completions.ChatCompletionCreateParams["response_format"]> = [];
      if (req.jsonSchema) {
        formats.push({
          type: "json_schema",
          json_schema: {
            name: String((req.jsonSchema as { name?: string }).name ?? req.purpose),
            strict: true,
            schema: ((req.jsonSchema as { schema?: Record<string, unknown> }).schema ??
              req.jsonSchema) as Record<string, unknown>,
          },
        });
      }
      formats.push({ type: "json_object" });

      for (const responseFormat of formats) {
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            const completion = await client.chat.completions.create({
              model,
              max_completion_tokens: req.maxOutputTokens ?? 16384,
              messages,
              response_format: responseFormat,
            });
            const choice = completion.choices[0];
            const finishReason = String(choice?.finish_reason ?? "unknown");
            const raw = choice?.message?.content ?? "";
            const refusal = (choice?.message as { refusal?: string } | undefined)?.refusal;
            if (refusal) {
              throw new IncompleteModelOutputError("Model refused to produce the requested JSON.", "refusal", model);
            }
            if (finishReason === "length" || finishReason === "incomplete" || finishReason === "content_filter") {
              throw new IncompleteModelOutputError(
                "Model output was incomplete and cannot be accepted as a tailored CV.",
                finishReason,
                model,
              );
            }
            const parsed = parseModelJson(raw, finishReason);
            const usage = usageOf(completion);
            return {
              parsed,
              raw,
              model,
              finishReason,
              promptTokens: usage.promptTokens,
              completionTokens: usage.completionTokens,
              latencyMs: Date.now() - started,
              retryCount,
              promptVersion: req.promptVersion,
            };
          } catch (err) {
            lastError = err;
            if (err instanceof IncompleteModelOutputError) throw err;
            if (isSchemaUnsupported(err) && responseFormat?.type === "json_schema") {
              break;
            }
            if (isOverloaded(err) && attempt < 2) {
              retryCount++;
              await sleep(options.retryDelayMs ?? 2000 * Math.pow(2, attempt));
              continue;
            }
            if (isOverloaded(err)) break;
            throw err;
          }
        }
      }
    }

    throw lastError instanceof Error
      ? lastError
      : new Error("AI service unavailable after retries. Please try again in a moment.");
  };
}
