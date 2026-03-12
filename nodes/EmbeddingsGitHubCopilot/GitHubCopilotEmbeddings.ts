import { OpenAIEmbeddings } from "@langchain/openai";

const VERSION = "0.1.0";

export interface GitHubCopilotEmbeddingsInput {
  token: string;
  baseUrl: string;
  model: string;
  dimensions?: number;
  batchSize?: number;
  stripNewLines?: boolean;
}

/**
 * Creates an OpenAIEmbeddings instance configured to use the GitHub Copilot API.
 *
 * The Copilot API exposes an OpenAI-compatible embeddings endpoint at
 * POST /embeddings. Available embedding models include:
 *   - text-embedding-3-small       (supports dimensions)
 *   - text-embedding-3-small-inference (supports dimensions)
 *   - text-embedding-ada-002
 *
 * We reuse OpenAIEmbeddings from @langchain/openai, overriding the base URL
 * and injecting the required Copilot headers — the same pattern used by the
 * chat model node.
 */
export function createGitHubCopilotEmbeddings(
  input: GitHubCopilotEmbeddingsInput,
): OpenAIEmbeddings {
  const embeddingsArgs: ConstructorParameters<typeof OpenAIEmbeddings>[0] = {
    apiKey: input.token,
    model: input.model,
    configuration: {
      baseURL: input.baseUrl,
      defaultHeaders: {
        "Copilot-Integration-Id": "vscode-chat",
        "x-initiator": "user",
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
