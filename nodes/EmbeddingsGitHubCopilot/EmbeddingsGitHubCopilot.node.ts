import type {
  ISupplyDataFunctions,
  INodeType,
  INodeTypeDescription,
  SupplyData,
} from "n8n-workflow";
import { NodeConnectionTypes } from "n8n-workflow";
import {
  createGitHubCopilotEmbeddings,
} from "./GitHubCopilotEmbeddings";
import { getBaseUrl } from "../LmChatGitHubCopilot/GitHubCopilotChatModel";

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
          "The GitHub Copilot embedding model to use.",
        default: "text-embedding-3-small",
        options: [
          {
            name: "Embedding V3 small",
            value: "text-embedding-3-small",
          },
          {
            name: "Embedding V3 small (Inference)",
            value: "text-embedding-3-small-inference",
          },
          {
            name: "Embedding V2 Ada",
            value: "text-embedding-ada-002",
          },
        ],
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
