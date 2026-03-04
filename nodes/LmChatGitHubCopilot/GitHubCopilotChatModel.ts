import { ChatOpenAI } from "@langchain/openai";

const VERSION = "0.1.0";

export function getBaseUrl(enterpriseUrl?: string): string {
  if (!enterpriseUrl || enterpriseUrl.trim() === "") {
    return "https://api.githubcopilot.com";
  }
  const domain = enterpriseUrl
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "");
  return `https://copilot-api.${domain}`;
}

export interface GitHubCopilotChatModelInput {
  token: string;
  baseUrl: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
}

/**
 * Creates a ChatOpenAI instance configured to use the GitHub Copilot API.
 *
 * Using ChatOpenAI as the base gives us full tool-calling support out of the box:
 * - bindTools() correctly serialises tools to OpenAI function-call format
 * - _generate() / invoke() parses tool_calls from the response
 * - Multi-turn tool-call conversations are handled correctly
 *
 * The Copilot API is OpenAI-compatible; we only need to override the base URL
 * and inject the required Copilot headers.
 */
export function createGitHubCopilotChatModel(
  input: GitHubCopilotChatModelInput,
): ChatOpenAI {
  const modelArgs: ConstructorParameters<typeof ChatOpenAI>[0] = {
    apiKey: input.token,
    model: input.model,
    temperature: input.temperature,
    configuration: {
      baseURL: input.baseUrl,
      defaultHeaders: {
        "Copilot-Integration-Id": "vscode-chat",
        "x-initiator": "user",
        "Openai-Intent": "conversation-edits",
        "User-Agent": `n8n-github-copilot/${VERSION}`,
      },
    },
    // Copilot API does not support strict tool calling schemas
    supportsStrictToolCalling: false,
  };

  if (input.maxTokens !== undefined && input.maxTokens !== -1) {
    modelArgs.maxTokens = input.maxTokens;
  }

  return new ChatOpenAI(modelArgs);
}
