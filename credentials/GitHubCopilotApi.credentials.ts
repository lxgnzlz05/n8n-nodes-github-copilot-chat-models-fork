import type {
  ICredentialTestRequest,
  ICredentialType,
  INodeProperties,
} from "n8n-workflow";

export class GitHubCopilotApi implements ICredentialType {
  name = "gitHubCopilotApi";

  displayName = "GitHub Copilot API";

  documentationUrl =
    "https://docs.github.com/en/copilot/using-github-copilot/using-github-copilot-in-your-ide";

  properties: INodeProperties[] = [
    {
      displayName: "OAuth Token",
      name: "token",
      type: "string",
      typeOptions: { password: true },
      default: "",
      required: true,
      description:
        "GitHub OAuth token (ghu_...) obtained via the Copilot device authorization flow. " +
        "Personal Access Tokens (PAT) and fine-grained tokens are NOT supported — the Copilot API rejects them with HTTP 400. " +
        "See the docs for how to obtain a valid token.",
      placeholder: "ghu_xxxxxxxxxxxx",
    },
    {
      displayName: "Enterprise Server Domain",
      name: "enterpriseUrl",
      type: "string",
      default: "",
      description:
        "For GitHub Enterprise Server (GHES) with a custom domain only — e.g. company.ghe.com. " +
        "Leave empty for github.com AND GitHub Enterprise Cloud (github.com/enterprises/...). " +
        "Do NOT enter the full URL — just the hostname.",
      placeholder: "company.ghe.com",
    },
  ];

  test: ICredentialTestRequest = {
    request: {
      baseURL:
        '={{$credentials.enterpriseUrl ? "https://copilot-api." + $credentials.enterpriseUrl : "https://api.githubcopilot.com"}}',
      url: "/models",
      method: "GET",
      headers: {
        Authorization: '={{"Bearer " + $credentials.token}}',
        "Copilot-Integration-Id": "vscode-chat",
        "x-initiator": "user",
      },
    },
  };
}
