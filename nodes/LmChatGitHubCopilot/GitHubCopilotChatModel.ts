import {
  BaseChatModel,
  type BaseChatModelParams,
  type BindToolsInput,
} from "@langchain/core/language_models/chat_models";
import { CallbackManagerForLLMRun } from "@langchain/core/callbacks/manager";
import {
  BaseMessage,
  AIMessage,
  HumanMessage,
  SystemMessage,
} from "@langchain/core/messages";
import { ChatResult } from "@langchain/core/outputs";
import type { Runnable } from "@langchain/core/runnables";

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

export interface GitHubCopilotChatModelInput extends BaseChatModelParams {
  token: string;
  baseUrl: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
}

interface OpenAIMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface OpenAIChoice {
  message: {
    role: string;
    content: string;
  };
  finish_reason: string;
  index: number;
}

interface OpenAIResponse {
  choices: OpenAIChoice[];
  model: string;
  id: string;
}

export class GitHubCopilotChatModel extends BaseChatModel {
  token: string;
  baseUrl: string;
  model: string;
  temperature?: number;
  maxTokens?: number;

  constructor(fields: GitHubCopilotChatModelInput) {
    super(fields);
    this.token = fields.token;
    this.baseUrl = fields.baseUrl;
    this.model = fields.model;
    this.temperature = fields.temperature;
    this.maxTokens = fields.maxTokens;
  }

  _llmType(): string {
    return "github-copilot";
  }

  get supportsToolCalling(): boolean {
    return true;
  }

  bindTools(
    _tools: BindToolsInput[],
    _kwargs?: Partial<this["ParsedCallOptions"]>,
  ): Runnable {
    return this as unknown as Runnable;
  }

  private convertMessages(messages: BaseMessage[]): OpenAIMessage[] {
    return messages.map((msg) => {
      const content =
        typeof msg.content === "string"
          ? msg.content
          : msg.content
              .filter((part): part is { type: "text"; text: string } => {
                return (
                  typeof part === "object" &&
                  part !== null &&
                  "type" in part &&
                  part.type === "text" &&
                  "text" in part
                );
              })
              .map((part) => part.text)
              .join("");

      if (msg instanceof SystemMessage) {
        return { role: "system", content };
      } else if (msg instanceof HumanMessage) {
        return { role: "user", content };
      } else if (msg instanceof AIMessage) {
        return { role: "assistant", content };
      } else {
        // Fallback: treat as user message
        return { role: "user", content };
      }
    });
  }

  async _generate(
    messages: BaseMessage[],
    _options: this["ParsedCallOptions"],
    runManager?: CallbackManagerForLLMRun,
  ): Promise<ChatResult> {
    const openAiMessages = this.convertMessages(messages);

    const body: Record<string, unknown> = {
      model: this.model,
      messages: openAiMessages,
      stream: false,
    };

    if (this.temperature !== undefined) {
      body.temperature = this.temperature;
    }
    if (this.maxTokens !== undefined && this.maxTokens !== -1) {
      body.max_tokens = this.maxTokens;
    }

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.token}`,
        "Copilot-Integration-Id": "vscode-chat",
        "x-initiator": "user",
        "Openai-Intent": "conversation-edits",
        "User-Agent": `n8n-github-copilot/${VERSION}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `GitHub Copilot API error (${response.status}): ${errorText}`,
      );
    }

    const data = (await response.json()) as OpenAIResponse;

    if (!data.choices || data.choices.length === 0) {
      throw new Error("GitHub Copilot API returned no choices");
    }

    const responseText = data.choices[0].message.content ?? "";

    if (runManager) {
      await runManager.handleLLMNewToken(responseText);
    }

    return {
      generations: [
        {
          text: responseText,
          message: new AIMessage(responseText),
        },
      ],
    };
  }
}
