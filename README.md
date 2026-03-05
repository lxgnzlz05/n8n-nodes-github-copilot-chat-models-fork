# n8n-nodes-github-copilot-chat-models

An [n8n](https://n8n.io) community node that lets you use [GitHub Copilot](https://github.com/features/copilot) language models in n8n AI Agent workflows.

## Features

- Connect n8n AI Agent nodes to GitHub Copilot models
- Dynamically fetch available models from the Copilot API
- Support for both github.com and GitHub Enterprise
- Configure temperature and max token options

## Prerequisites

- An active [GitHub Copilot](https://github.com/features/copilot) subscription
- n8n instance (self-hosted or cloud)

## Installation

### Via n8n Community Nodes (recommended)

1. In n8n, go to **Settings → Community Nodes**
2. Click **Install**
3. Enter `n8n-nodes-github-copilot-chat-models`
4. Click **Install**

### Manual / Development
See [docs/DEVELOPMENT.md](./docs/DEVELOPMENT.md)

## Setup

### 1. Create a Credential
Check [docs/CREDENTIALS.md](./docs/CREDENTIALS.md)

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
| **Model** | GitHub Copilot model to use (loaded dynamically) | — |
| **Temperature** | Controls response randomness (0–2) | `0.7` |
| **Maximum Tokens** | Max tokens to generate. `-1` = no limit | `-1` |

## GitHub Enterprise Support

Set the **Enterprise URL** field in your credential to your GitHub Enterprise domain (without `https://`), for example:

```
company.ghe.com
```

The node will automatically route requests to `https://copilot-api.company.ghe.com`.


## License

MIT
