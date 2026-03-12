/**
 * GitHub Models Embeddings — uses the official GitHub Models API
 * at https://models.github.ai/inference/embeddings
 *
 * This module lazy-imports OpenAIEmbeddings from @langchain/openai to avoid
 * module-resolution failures when n8n loads community nodes (the package
 * lives in n8n's own node_modules, not the community node's).
 *
 * The GitHub Models inference API is OpenAI-compatible, so OpenAIEmbeddings
 * works perfectly with a baseURL override.
 */

const VERSION = "0.2.0";

/** Base URL for the GitHub Models inference API */
export const GITHUB_MODELS_INFERENCE_URL =
  "https://models.github.ai/inference";

export interface GitHubModelsEmbeddingsInput {
  token: string;
  model: string;
  dimensions?: number;
  batchSize?: number;
  stripNewLines?: boolean;
}

/**
 * Creates an OpenAIEmbeddings instance configured to use the GitHub Models API.
 *
 * Uses a dynamic import so the module is resolved at runtime (when n8n's
 * module loader has the full search path available) instead of at load time.
 */
export async function createGitHubModelsEmbeddings(
  input: GitHubModelsEmbeddingsInput,
): Promise<InstanceType<typeof import("@langchain/openai").OpenAIEmbeddings>> {
  // Dynamic import — resolved at runtime by n8n's module loader
  const { OpenAIEmbeddings } = await import("@langchain/openai");

  const embeddingsArgs: ConstructorParameters<typeof OpenAIEmbeddings>[0] = {
    openAIApiKey: input.token,
    model: input.model,
    configuration: {
      baseURL: GITHUB_MODELS_INFERENCE_URL,
      defaultHeaders: {
        "X-GitHub-Api-Version": "2026-03-10",
        "User-Agent": `n8n-github-copilot/${VERSION}`,
      },
    },
  };

  if (input.dimensions !== undefined) {
    embeddingsArgs.dimensions = input.dimensions;
  }

  if (input.batchSize !== undefined) {
    embeddingsArgs.batchSize = input.batchSize;
  }

  if (input.stripNewLines !== undefined) {
    embeddingsArgs.stripNewLines = input.stripNewLines;
  }

  return new OpenAIEmbeddings(embeddingsArgs);
}
