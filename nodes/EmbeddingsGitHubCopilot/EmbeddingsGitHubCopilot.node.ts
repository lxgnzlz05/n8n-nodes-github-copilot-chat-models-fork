import type {
  ISupplyDataFunctions,
  INodeType,
  INodeTypeDescription,
  SupplyData,
  ILoadOptionsFunctions,
  INodePropertyOptions,
} from "n8n-workflow";
import { NodeConnectionTypes, NodeApiError } from "n8n-workflow";
import {
  createGitHubCopilotEmbeddings,
} from "./GitHubCopilotEmbeddings";

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

function getBaseUrl(enterpriseUrl?: string): string {
  if (!enterpriseUrl || enterpriseUrl.trim() === "") {
    return "https://api.githubcopilot.com";
  }
  const domain = enterpriseUrl
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "");
  return `https://copilot-api.${domain}`;
}

function getCopilotHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    "Copilot-Integration-Id": "vscode-chat",
    "x-initiator": "user",
  };
}

export class EmbeddingsGitHubCopilot implements INodeType {
  description: INodeTypeDescription = {
    displayName: "GitHub Copilot Embeddings",
    name: "embeddingsGitHubCopilot",
    icon: "file:github-copilot.svg",
    group: ["transform"],
    version: 1,
    description:
      "Use GitHub Copilot embedding models to generate vector embeddings for text",
    defaults: {
      name: "GitHub Copilot Embeddings",
    },
    codex: {
      categories: ["AI"],
      subcategories: {
        AI: ["Embeddings"],
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
    // No inputs — this node is a sub-node that supplies an embeddings model
    inputs: [],
    // Output type is AiEmbedding so it can be connected to vector stores, etc.
    outputs: [NodeConnectionTypes.AiEmbedding],
    outputNames: ["Embeddings"],
    properties: [
      {
        displayName: "Model",
        name: "model",
        type: "options",
        description:
          "The GitHub Copilot embedding model to use. Models are fetched from the Copilot API.",
        default: "",
        typeOptions: {
          loadOptionsMethod: "getEmbeddingModels",
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
            displayName: "Dimensions",
            name: "dimensions",
            type: "options",
            default: 1536,
            description:
              "The number of dimensions for the output embeddings. " +
              "Only supported by text-embedding-3-* models.",
            options: [
              { name: "256", value: 256 },
              { name: "512", value: 512 },
              { name: "1024", value: 1024 },
              { name: "1536", value: 1536 },
              { name: "3072", value: 3072 },
            ],
          },
          {
            displayName: "Batch Size",
            name: "batchSize",
            type: "number",
            default: 512,
            typeOptions: { maxValue: 2048, minValue: 1 },
            description:
              "Maximum number of documents to send in each request to the API.",
          },
          {
            displayName: "Strip New Lines",
            name: "stripNewLines",
            type: "boolean",
            default: true,
            description:
              "Whether to strip new lines from the input text before generating embeddings.",
          },
        ],
      },
    ],
  };

  methods = {
    loadOptions: {
      async getEmbeddingModels(
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
              return capType === "embeddings";
            })
            .map((m) => ({
              name: m.name ?? m.id,
              value: m.id,
            }))
            .sort((a, b) => a.name.localeCompare(b.name));
        } catch (error) {
          throw new NodeApiError(this.getNode(), error instanceof Error
            ? { message: error.message }
            : { message: String(error) }, {
            message: "Failed to load embedding models from GitHub Copilot API",
          });
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

    const model = this.getNodeParameter(
      "model",
      itemIndex,
      "text-embedding-3-small",
    ) as string;
    const options = this.getNodeParameter("options", itemIndex, {}) as {
      dimensions?: number;
      batchSize?: number;
      stripNewLines?: boolean;
    };

    const embeddings = createGitHubCopilotEmbeddings({
      token,
      baseUrl,
      model,
      dimensions: options.dimensions,
      batchSize: options.batchSize,
      stripNewLines: options.stripNewLines,
    });

    return {
      response: embeddings,
    };
  }
}
