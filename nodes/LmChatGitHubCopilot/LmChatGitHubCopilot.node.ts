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
  createGitHubCopilotChatModel,
  getBaseUrl,
} from "./GitHubCopilotChatModel";
import { DEFAULT_CLIENT_ID } from "../../credentials/GitHubCopilotApi.credentials";

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

function getGitHubDomain(enterpriseUrl?: string): string {
  if (!enterpriseUrl || enterpriseUrl.trim() === "") return "github.com";
  return enterpriseUrl.trim();
}

async function startDeviceFlow(
  helpers: ICredentialTestFunctions,
  clientId: string,
  githubDomain: string,
): Promise<INodeCredentialTestResult> {
  let data: Record<string, string>;
  try {
    data = (await helpers.helpers.request({
      method: "POST",
      uri: `https://${githubDomain}/login/device/code`,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: { client_id: clientId, scope: "read:user" },
      json: true,
    })) as Record<string, string>;
  } catch (error) {
    return {
      status: "Error",
      message: `Failed to start device authorization: ${error instanceof Error ? error.message : String(error)}`,
    };
  }

  if (!data.device_code || !data.user_code || !data.verification_uri) {
    return {
      status: "Error",
      message: `Unexpected response from GitHub: ${JSON.stringify(data)}`,
    };
  }

  return {
    status: "Error",
    message:
      `GitHub Copilot Device Authorization\n\n` +
      `Step 1 — Open this URL in your browser:\n` +
      `  ${data.verification_uri}\n\n` +
      `Step 2 — Enter this code when prompted:\n` +
      `  ${data.user_code}\n\n` +
      `Step 3 — After authorizing, paste the following into the "OAuth Token" field and click "Save" again:\n` +
      `  PENDING:${data.device_code}`,
  };
}

async function pollForToken(
  helpers: ICredentialTestFunctions,
  clientId: string,
  githubDomain: string,
  deviceCode: string,
): Promise<INodeCredentialTestResult> {
  const maxAttempts = 6;
  const intervalMs = 5000;

  for (let i = 0; i < maxAttempts; i++) {
    if (i > 0) {
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }

    let data: Record<string, string>;
    try {
      data = (await helpers.helpers.request({
        method: "POST",
        uri: `https://${githubDomain}/login/oauth/access_token`,
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: {
          client_id: clientId,
          device_code: deviceCode,
          grant_type: "urn:ietf:params:oauth:grant-type:device_code",
        },
        json: true,
      })) as Record<string, string>;
    } catch (error) {
      return {
        status: "Error",
        message: `Error polling for token: ${error instanceof Error ? error.message : String(error)}`,
      };
    }

    if (data.error === "authorization_pending" || data.error === "slow_down") {
      continue;
    }

    if (data.error) {
      return {
        status: "Error",
        message:
          `Authorization failed: ${data.error_description ?? data.error}\n\n` +
          `Please clear the "OAuth Token" field and click "Save" to start over.`,
      };
    }

    if (data.access_token) {
      return {
        status: "Error",
        message:
          `Authorization successful!\n\n` +
          `Your GitHub Copilot OAuth token:\n\n` +
          `  ${data.access_token}\n\n` +
          `Copy this token, paste it into the "OAuth Token" field (replacing the "PENDING:..." text), ` +
          `and click "Save" again to validate.`,
      };
    }
  }

  return {
    status: "Error",
    message:
      `Still waiting for authorization. Please make sure you:\n` +
      `  1. Opened the verification URL in your browser\n` +
      `  2. Entered the user code\n` +
      `  3. Clicked "Authorize"\n\n` +
      `Then click "Save" again.`,
  };
}

async function validateToken(
  helpers: ICredentialTestFunctions,
  token: string,
  baseUrl: string,
): Promise<INodeCredentialTestResult> {
  try {
    await helpers.helpers.request({
      method: "GET",
      uri: `${baseUrl}/models`,
      headers: {
        Authorization: `Bearer ${token}`,
        "Copilot-Integration-Id": "vscode-chat",
        "x-initiator": "user",
      },
      json: true,
    });

    return {
      status: "OK",
      message: "Connection successful! GitHub Copilot API is accessible.",
    };
  } catch (error: unknown) {
    const err = error as { statusCode?: number; message?: string };
    const statusCode = err?.statusCode;

    if (statusCode === 401 || statusCode === 403) {
      return {
        status: "Error",
        message:
          `Authentication failed (HTTP ${statusCode}). ` +
          `Ensure the token is a valid OAuth token (gho_...) from the device authorization flow. ` +
          `Personal Access Tokens (PATs) are NOT supported.`,
      };
    }

    if (statusCode === 400) {
      return {
        status: "Error",
        message:
          `HTTP 400: The Copilot API rejected the token. ` +
          `This usually means the token is a PAT or fine-grained token — only OAuth tokens (gho_...) are accepted. ` +
          `Clear the token field and click "Save" to start the device authorization flow.`,
      };
    }

    return {
      status: "Error",
      message: `Connection failed: ${err?.message ?? String(error)}`,
    };
  }
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
        testedBy: "testGitHubCopilotCredential",
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

    credentialTest: {
      async testGitHubCopilotCredential(
        this: ICredentialTestFunctions,
        credential: ICredentialsDecrypted<ICredentialDataDecryptedObject>,
      ): Promise<INodeCredentialTestResult> {
        const data = credential.data ?? {};
        const token = (data.token as string | undefined) ?? "";
        const enterpriseUrl =
          (data.enterpriseUrl as string | undefined) ?? "";
        const clientId = (data.clientId as string | undefined) ?? "";
        const effectiveClientId = clientId.trim() || DEFAULT_CLIENT_ID;
        const githubDomain = getGitHubDomain(enterpriseUrl);

        // Phase 1: No token — start device code flow
        if (!token.trim()) {
          return startDeviceFlow(this, effectiveClientId, githubDomain);
        }

        // Phase 2: PENDING:device_code — poll for authorization
        if (token.startsWith("PENDING:")) {
          const deviceCode = token.slice("PENDING:".length);
          return pollForToken(
            this,
            effectiveClientId,
            githubDomain,
            deviceCode,
          );
        }

        // Phase 3: Real token — validate against Copilot API
        const baseUrl = getBaseUrl(enterpriseUrl);
        return validateToken(this, token, baseUrl);
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

    const chatModel = createGitHubCopilotChatModel({
      token,
      baseUrl,
      model,
      temperature: options.temperature,
      maxTokens: options.maxTokens,
    });

    // Dynamic import — resolved at runtime by n8n's module loader
    const { logWrapper } = await import("@n8n/ai-utilities");

    return {
      response: logWrapper(chatModel as any, this),
    };
  }
}
