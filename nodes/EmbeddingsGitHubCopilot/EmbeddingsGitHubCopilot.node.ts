import type {
  ISupplyDataFunctions,
  INodeType,
  INodeTypeDescription,
  SupplyData,
  ILoadOptionsFunctions,
  INodePropertyOptions,
  ICredentialTestFunctions,
  ICredentialsDecrypted,
  ICredentialDataDecryptedObject,
  INodeCredentialTestResult,
} from "n8n-workflow";
import { NodeConnectionTypes } from "n8n-workflow";
import {
  createGitHubModelsEmbeddings,
} from "./GitHubCopilotEmbeddings";

/** GitHub Models catalog API — returns available models with metadata */
const GITHUB_MODELS_CATALOG_URL = "https://models.github.ai/catalog/models";

/** API version header required by GitHub Models */
const GITHUB_API_VERSION = "2026-03-10";

interface GitHubModel {
  id: string;
  name?: string;
  rate_limit_tier?: string;
  supported_output_modalities?: string[];
}

function getGitHubModelsHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": GITHUB_API_VERSION,
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
      "Use GitHub Models embedding models to generate vector embeddings for text",
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
            url: "https://docs.github.com/en/github-models",
          },
        ],
      },
    },
    credentials: [
      {
        name: "gitHubCopilotApi",
        required: true,
        testedBy: "testGitHubModelsEmbeddingsCredential",
      },
    ],
    inputs: [],
    outputs: [NodeConnectionTypes.AiEmbedding],
    outputNames: ["Embeddings"],
    properties: [
      {
        displayName: "Model",
        name: "model",
        type: "options",
        description:
          "The embedding model to use. Models are fetched dynamically from the GitHub Models catalog.",
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
              "Only supported by text-embedding-3 models.",
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

        try {
          const response = await this.helpers.httpRequest({
            method: "GET",
            url: GITHUB_MODELS_CATALOG_URL,
            headers: getGitHubModelsHeaders(token),
          });

          const models: GitHubModel[] = Array.isArray(response)
            ? response
            : [];

          return models
            .filter((m) => {
              // Filter to embedding models only
              return (
                m.rate_limit_tier === "embeddings" ||
                m.supported_output_modalities?.includes("embeddings")
              );
            })
            .map((m) => ({
              name: m.name ?? m.id,
              value: m.id,
            }))
            .sort((a, b) => a.name.localeCompare(b.name));
        } catch {
          // Return empty so dropdown renders; n8n swallows errors in loadOptions
          return [];
        }
      },
    },

    credentialTest: {
      async testGitHubModelsEmbeddingsCredential(
        this: ICredentialTestFunctions,
        credential: ICredentialsDecrypted<ICredentialDataDecryptedObject>,
      ): Promise<INodeCredentialTestResult> {
        const data = credential.data ?? {};
        const token = (data.token as string | undefined) ?? "";

        if (!token.trim()) {
          return {
            status: "Error",
            message:
              "No token provided. Please configure the credential via the Chat Model node first.",
          };
        }

        try {
          // Test connectivity by calling the GitHub Models catalog endpoint
          await this.helpers.request({
            method: "GET",
            uri: GITHUB_MODELS_CATALOG_URL,
            headers: getGitHubModelsHeaders(token),
            json: true,
          });

          return {
            status: "OK",
            message:
              "Connection successful! GitHub Models API is accessible.",
          };
        } catch (error: unknown) {
          const err = error as { statusCode?: number; message?: string };
          return {
            status: "Error",
            message: `Connection failed (HTTP ${err?.statusCode ?? "?"}): ${err?.message ?? String(error)}`,
          };
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

    const model = this.getNodeParameter(
      "model",
      itemIndex,
      "openai/text-embedding-3-small",
    ) as string;
    const options = this.getNodeParameter("options", itemIndex, {}) as {
      dimensions?: number;
      batchSize?: number;
      stripNewLines?: boolean;
    };

    const embeddings = await createGitHubModelsEmbeddings({
      token,
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
