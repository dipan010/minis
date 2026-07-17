export const DEFAULT_OLLAMA_URL = "http://localhost:11434";
export const DEFAULT_MODEL = "llama3.1:8b";

export interface OllamaCallOptions {
  ollamaUrl?: string;
  model?: string;
  temperature?: number;
  timeoutMs?: number;
}

/** Structured-output call to Ollama's /api/generate with a JSON schema in
 * `format` and an AbortController timeout. */
export async function callOllamaStructured<T>(
  prompt: string,
  schema: object,
  options?: OllamaCallOptions
): Promise<T> {
  const ollamaUrl = options?.ollamaUrl ?? DEFAULT_OLLAMA_URL;
  const model = options?.model ?? DEFAULT_MODEL;
  const timeoutMs = options?.timeoutMs ?? 120_000;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetch(`${ollamaUrl}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        prompt,
        stream: false,
        format: schema,
        options: { temperature: options?.temperature ?? 0.3 },
      }),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error(`Ollama call timed out after ${timeoutMs / 1000}s.`);
    }
    if (message.includes("fetch failed") || message.includes("ECONNREFUSED")) {
      throw new Error(
        `Could not reach Ollama at ${ollamaUrl}. Make sure Ollama is running (hint: run \`ollama serve\`).`
      );
    }
    throw new Error(`Network error contacting Ollama: ${message}`);
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const body = await response.text().catch(() => "(no body)");
    throw new Error(`Ollama returned HTTP ${response.status}: ${body}`);
  }

  const data = await response.json();

  try {
    return JSON.parse(data.response) as T;
  } catch {
    throw new Error(
      `Failed to parse Ollama response as JSON. Raw response: ${data.response}`
    );
  }
}
