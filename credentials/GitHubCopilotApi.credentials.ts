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
      displayName: "GitHub Token",
      name: "token",
      type: "string",
      typeOptions: { password: true },
      default: "",
      required: true,
      description:
        "GitHub Personal Access Token (PAT) or OAuth token with GitHub Copilot access",
      placeholder: "ghp_xxxxxxxxxxxx",
    },
    {
      displayName: "Enterprise URL",
      name: "enterpriseUrl",
      type: "string",
      default: "",
      description:
        "GitHub Enterprise domain (e.g. company.ghe.com). Leave empty for github.com.",
      placeholder: "company.ghe.com",
    },
  ];

  test: ICredentialTestRequest = {
    request: {
      baseURL:
        '={{$credentials.enterpriseUrl ? "https://copilot-api." + $credentials.enterpriseUrl.replace(/^https?:\\/\\//, "").replace(/\\/$/, "") : "https://api.githubcopilot.com"}}',
      url: "/models",
      method: "GET",
      headers: {
        Authorization: "=Bearer {{$credentials.token}}",
        "Copilot-Integration-Id": "vscode-chat",
        "x-initiator": "user",
      },
    },
  };
}
