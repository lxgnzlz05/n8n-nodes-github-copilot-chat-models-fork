import type {
  ISupplyDataFunctions,
  INodeType,
  INodeTypeDescription,
  SupplyData,
  ILoadOptionsFunctions,
  INodePropertyOptions,
} from "n8n-workflow";
import { NodeConnectionTypes } from "n8n-workflow";
import {
  GitHubCopilotChatModel,
  getBaseUrl,
} from "./GitHubCopilotChatModel";

interface CopilotModel {
  id: string;
  name?: string;
  capabilities?: {
    type?: string;
    family?: string;
    supports?: Record<string, boolean>;
  };
}

interface CopilotModelsResponse {
  data?: CopilotModel[];
  models?: CopilotModel[];
}

function getCopilotHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    "Copilot-Integration-Id": "vscode-chat",
    "x-initiator": "user",
  };
}

export class LmChatGitHubCopilot implements INodeType {
  description: INodeTypeDescription = {
    displayName: "GitHub Copilot Chat Model",
    name: "lmChatGitHubCopilot",
    icon: "file:github-copilot.svg",
    group: ["transform"],
    version: 1,
    description: "Use GitHub Copilot models as a chat model in n8n AI agents",
    defaults: {
      name: "GitHub Copilot Chat Model",
    },
    codex: {
      categories: ["AI"],
      subcategories: {
        AI: ["Language Models", "Agents"],
      },
      resources: {
        primaryDocumentation: [
          {
            url: "https://docs.github.com/en/copilot",
          },
        ],
      },
    },
    credentials: [
      {
        name: "gitHubCopilotApi",
        required: true,
      },
    ],
    inputs: [],
    outputs: [NodeConnectionTypes.AiLanguageModel],
    outputNames: ["Model"],
    properties: [
      {
        displayName: "Model",
        name: "model",
        type: "options",
        description:
          "The GitHub Copilot model to use. Models are fetched from the Copilot API.",
        default: "",
        typeOptions: {
          loadOptionsMethod: "getModels",
        },
      },
      {
        displayName: "Options",
        name: "options",
        type: "collection",
        default: {},
        placeholder: "Add Option",
        options: [
          {
            displayName: "Temperature",
            name: "temperature",
            type: "number",
            default: 0.7,
            typeOptions: {
              maxValue: 2,
              minValue: 0,
              numberPrecision: 2,
            },
            description:
              "Controls randomness in the response. Lower values make output more focused and deterministic.",
          },
          {
            displayName: "Maximum Tokens",
            name: "maxTokens",
            type: "number",
            default: -1,
            description:
              "Maximum number of tokens to generate. -1 means no limit.",
          },
        ],
      },
    ],
  };

  methods = {
    loadOptions: {
      async getModels(
        this: ILoadOptionsFunctions,
      ): Promise<INodePropertyOptions[]> {
        const credentials = await this.getCredentials("gitHubCopilotApi");
        const token = credentials.token as string;
        const enterpriseUrl = credentials.enterpriseUrl as string | undefined;
        const baseUrl = getBaseUrl(enterpriseUrl);

        try {
          const response = await this.helpers.httpRequest({
            method: "GET",
            url: `${baseUrl}/models`,
            headers: getCopilotHeaders(token),
          });

          const data = response as CopilotModelsResponse;
          // API may return { data: [...] } or { models: [...] } or an array directly
          const models: CopilotModel[] = Array.isArray(response)
            ? response
            : (data.data ?? data.models ?? []);

          return models
            .filter((m) => {
              const capType = m.capabilities?.type?.toLowerCase() ?? "";
              // Include models that are chat-capable or have no type restriction
              return capType === "chat" || capType === "" || capType === "llm";
            })
            .map((m) => ({
              name: m.name ?? m.id,
              value: m.id,
            }))
            .sort((a, b) => a.name.localeCompare(b.name));
        } catch (error) {
          console.warn(
            "Failed to load models from GitHub Copilot API:",
            error instanceof Error ? error.message : String(error),
          );
          return [];
        }
      },
    },
  };

  async supplyData(
    this: ISupplyDataFunctions,
    itemIndex: number,
  ): Promise<SupplyData> {
    const credentials = await this.getCredentials("gitHubCopilotApi");
    const token = credentials.token as string;
    const enterpriseUrl = credentials.enterpriseUrl as string | undefined;
    const baseUrl = getBaseUrl(enterpriseUrl);

    const model = this.getNodeParameter("model", itemIndex) as string;
    const options = this.getNodeParameter("options", itemIndex, {}) as {
      temperature?: number;
      maxTokens?: number;
    };

    const chatModel = new GitHubCopilotChatModel({
      token,
      baseUrl,
      model,
      temperature: options.temperature,
      maxTokens: options.maxTokens !== -1 ? options.maxTokens : undefined,
    });

    return {
      response: chatModel,
    };
  }
}
