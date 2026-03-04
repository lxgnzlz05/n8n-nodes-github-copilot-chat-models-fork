# n8n-nodes-github-copilot-chat-models

An [n8n](https://n8n.io) community node that lets you use [GitHub Copilot](https://github.com/features/copilot) language models in your n8n AI Agent workflows.

## Features

- Connect n8n AI Agent nodes to GitHub Copilot's LLM models
- Dynamically fetch available models from the Copilot API
- Support for both github.com and GitHub Enterprise
- Configure temperature and max token options

## Prerequisites

- An active [GitHub Copilot](https://github.com/features/copilot) subscription
- A GitHub Personal Access Token (PAT) or OAuth token with Copilot access
- n8n instance (self-hosted or cloud)

## Installation

### Via n8n Community Nodes (recommended)

1. In n8n, go to **Settings → Community Nodes**
2. Click **Install**
3. Enter `n8n-nodes-github-copilot-chat-models`
4. Click **Install**

### Manual / Development

```bash
git clone https://github.com/kk17/n8n-nodes-github-copilot-chat-models
cd n8n-nodes-github-copilot-chat-models
npm install
npm run build
npm link
```

Then configure n8n to load the node by setting the `N8N_CUSTOM_EXTENSIONS` environment variable to the path of this package.

## Setup

### 1. Create a Credential

1. In n8n, go to **Credentials → New**
2. Search for **GitHub Copilot API**
3. Fill in:
   - **GitHub Token**: Your PAT or OAuth token with Copilot access (e.g. `ghp_xxxx`)
   - **Enterprise URL** *(optional)*: Your GitHub Enterprise domain (e.g. `company.ghe.com`). Leave empty for github.com.
4. Click **Save**

To generate a GitHub token, go to [GitHub Settings → Developer settings → Personal access tokens](https://github.com/settings/tokens).

### 2. Add the Node to a Workflow

1. Open an AI Agent node
2. Click the **Language Model** input
3. Search for **GitHub Copilot Chat Model**
4. Select your credential
5. Choose a model from the **Model** dropdown (models are loaded dynamically from the API)
6. Optionally configure **Temperature** and **Maximum Tokens**

## Node Configuration

| Option | Description | Default |
|--------|-------------|---------|
| **Model** | GitHub Copilot model to use (dynamically loaded) | — |
| **Temperature** | Controls response randomness (0–2) | `0.7` |
| **Maximum Tokens** | Max tokens to generate. `-1` = no limit | `-1` |

## GitHub Enterprise Support

Set the **Enterprise URL** field in your credential to your GitHub Enterprise domain (without `https://`), for example:

```
company.ghe.com
```

The node will automatically route requests to `https://copilot-api.company.ghe.com`.

## Development

```bash
npm run build      # compile TypeScript
npm run dev        # watch mode
npm run lint       # run ESLint
npm run type-check # type-check without emitting
```

## License

MIT
