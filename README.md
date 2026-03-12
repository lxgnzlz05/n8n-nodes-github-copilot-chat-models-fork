# n8n-nodes-github-copilot-models

An [n8n](https://n8n.io) community node that lets you use [GitHub Copilot](https://github.com/features/copilot) chat models and [GitHub Models](https://docs.github.com/en/github-models) embeddings in n8n AI workflows.

> **Note:** This is a vibe-coded fork of [kk17/n8n-nodes-github-copilot-chat-models](https://github.com/kk17/n8n-nodes-github-copilot-chat-models) by [@kk17](https://github.com/kk17). The original package provides the chat model node; this fork adds an embeddings node powered by the official GitHub Models API.

## Features

- **Chat Model** — Connect n8n AI Agent nodes to GitHub Copilot models via `api.githubcopilot.com`
- **Embeddings** — Generate vector embeddings using the official [GitHub Models API](https://models.github.ai) (`text-embedding-3-small`, `text-embedding-3-large`, etc.)
- Dynamically fetch available models from the API (both chat and embedding)
- Support for both github.com and GitHub Enterprise (chat model)
- Single shared credential for both nodes

## Prerequisites

- An active [GitHub Copilot](https://github.com/features/copilot) subscription
- n8n instance (self-hosted or cloud)

## Installation

### Via n8n Community Nodes (recommended)

1. In n8n, go to **Settings > Community Nodes**
2. Click **Install**
3. Enter `n8n-nodes-github-copilot-models`
4. Click **Install**

### Manual / Development

See [docs/DEVELOPMENT.md](./docs/DEVELOPMENT.md)

## Setup

### 1. Create a Credential

See [docs/CREDENTIALS.md](./docs/CREDENTIALS.md)

The same **GitHub Copilot API** credential is used by both the chat model and embeddings nodes. The OAuth token obtained through the device flow works with both APIs.

### 2. Chat Model Node

1. Open an AI Agent node
2. Click the **Language Model** input
3. Search for **GitHub Copilot Chat Model**
4. Select your credential
5. Choose a model from the **Model** dropdown (loaded dynamically)
6. Optionally configure **Temperature** and **Maximum Tokens**

| Option | Description | Default |
|--------|-------------|---------|
| **Model** | GitHub Copilot model to use (loaded dynamically) | — |
| **Temperature** | Controls response randomness (0–2) | `0.7` |
| **Maximum Tokens** | Max tokens to generate. `-1` = no limit | `-1` |

### 3. Embeddings Node

1. In any node that accepts an **Embedding** input (e.g. vector stores, retrievers)
2. Search for **GitHub Copilot Embeddings**
3. Select your credential
4. Choose a model from the **Model** dropdown (loaded dynamically from the [GitHub Models catalog](https://github.com/marketplace/models))

| Option | Description | Default |
|--------|-------------|---------|
| **Model** | Embedding model to use (loaded dynamically) | — |
| **Dimensions** | Output embedding dimensions (256–3072). Only for text-embedding-3 models. | `1536` |
| **Batch Size** | Max documents per API request | `512` |
| **Strip New Lines** | Remove newlines from input before embedding | `true` |

## Troubleshooting

See [docs/TOUBLESHOOTING.md](./docs/TOUBLESHOOTING.md)

## GitHub Enterprise Support

Set the **Enterprise URL** field in your credential to your GitHub Enterprise domain (without `https://`), for example:

```
company.ghe.com
```

The chat model node will automatically route requests to `https://copilot-api.company.ghe.com`. The embeddings node always uses the public GitHub Models API.

## Credits

- Original package by [@kk17](https://github.com/kk17): [n8n-nodes-github-copilot-chat-models](https://github.com/kk17/n8n-nodes-github-copilot-chat-models)
- Embeddings node and fork by [@lxgnzlz05](https://github.com/lxgnzlz05)

## License

MIT
