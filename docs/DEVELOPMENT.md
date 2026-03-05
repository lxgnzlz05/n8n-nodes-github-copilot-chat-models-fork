# Development Guide

Guide for developing and testing the GitHub Copilot Chat Model n8n node locally.

## Prerequisites

- Node.js 18+
- npm
- An active GitHub Copilot subscription
- A GitHub token with Copilot access (PAT or OAuth token)

## Getting Your GitHub Token

1. Go to [GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)](https://github.com/settings/tokens)
2. Click **Generate new token (classic)**
3. Give it a name (e.g. `n8n-copilot`)
4. No specific scopes are required for Copilot API access — just generate it
5. Copy the token (starts with `ghp_`)

> **Note**: The token must belong to an account with an active GitHub Copilot subscription.

## Setup

### 1. Clone and Build

```bash
git clone https://github.com/kk17/n8n-nodes-github-copilot-chat-models
cd n8n-nodes-github-copilot-chat-models
npm install
npm run build
```

### 2. Verify the API Works

Before testing in n8n, confirm your token has Copilot access:

```bash
# List available models
curl -s https://api.githubcopilot.com/models \
  -H "Authorization: ${GITHUB_TOKEN}" \
  -H "Copilot-Integration-Id: vscode-chat" \
  -H "x-initiator: user" | jq '.data[].id'

# Test a chat completion
curl -s https://api.githubcopilot.com/chat/completions \
  -H "Authorization: ${GITHUB_TOKEN}" \
  -H "Copilot-Integration-Id: vscode-chat" \
  -H "x-initiator: user" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4o",
    "messages": [{"role": "user", "content": "Say hello in one word."}],
    "stream": false
  }' | jq '.choices[0].message.content'
```

For GitHub Enterprise, replace `https://api.githubcopilot.com` with `https://copilot-api.your-domain.ghe.com`.

## Installing in n8n Locally

n8n discovers community nodes installed in `~/.n8n/nodes/`. The recommended approach is to install your local package directly into that directory.

### Option A: Install into `~/.n8n/nodes/` (recommended)

This mirrors how n8n installs community nodes from npm, so it's the most reliable method.

```bash
# Build first
npm run build

# Install the local package into n8n's nodes directory
cd ~/.n8n/nodes
npm install /path/to/n8n-nodes-github-copilot-chat-models

# Start n8n
n8n start
# N8N_LOG_LEVEL=debug n8n start # to check debug log
```

After making code changes:

```bash
# In the node package directory
npm run build

# Reinstall to pick up the new dist/
cd ~/.n8n/nodes
npm install /path/to/n8n-nodes-github-copilot-chat-models

# Restart n8n
```

### Option B: Use N8N_CUSTOM_EXTENSIONS env
```bash
N8N_CUSTOM_EXTENSIONS="/path/to/n8n-nodes-github-copilot-chat-models" n8n start
```

After making code changes, rebuild and restart n8n:

```bash
npm run build
# restart n8n
```

n8n UI will be at `http://localhost:5678`.

## Configuring Credentials in n8n

1. Open n8n at `http://localhost:5678`
2. Go to **Credentials → New Credential**
3. Search for **GitHub Copilot API**
4. Fill in:
   - **GitHub Token**: your token (`ghp_...`)
   - **Enterprise URL**: leave empty for github.com
5. Click **Test credential** — you should see a success message
6. Click **Save**

## Creating a Test Workflow

### Minimal test

1. Add a **Chat Trigger** node (creates a chat interface)
2. Add a **AI Agent** node
3. Add a **GitHub Copilot Chat Model** node
   - Select your credential
   - Choose a model (e.g. `gpt-4o` or `claude-3.5-sonnet`)
4. Connect **GitHub Copilot Chat Model** → AI Agent's **Language Model** input
5. Connect **Chat Trigger** → **AI Agent**
6. Click **Test workflow** → **Open chat**
7. Send a message and verify a response is returned

### Minimal workflow JSON

You can import this JSON directly into n8n (Workflows → Import):

```json
{
  "name": "Copilot Test",
  "nodes": [
    {
      "name": "Chat Trigger",
      "type": "@n8n/n8n-nodes-langchain.chatTrigger",
      "position": [0, 0],
      "parameters": {}
    },
    {
      "name": "AI Agent",
      "type": "@n8n/n8n-nodes-langchain.agent",
      "position": [200, 0],
      "parameters": {
        "promptType": "define",
        "text": "={{ $json.chatInput }}"
      }
    },
    {
      "name": "GitHub Copilot Chat Model",
      "type": "lmChatGitHubCopilot",
      "position": [200, 150],
      "parameters": {
        "model": "gpt-4o"
      },
      "credentials": {
        "gitHubCopilotApi": { "name": "GitHub Copilot API" }
      }
    }
  ],
  "connections": {
    "Chat Trigger": { "main": [[{ "node": "AI Agent", "type": "main", "index": 0 }]] },
    "GitHub Copilot Chat Model": { "ai_languageModel": [[{ "node": "AI Agent", "type": "ai_languageModel", "index": 0 }]] }
  }
}
```

## Development Workflow

```bash
# Watch mode — rebuilds on file changes
npm run dev

# After each rebuild, restart n8n to pick up the new dist/
# (with Option A you also need to re-run npm install in ~/.n8n/nodes/)
```

### Useful commands

```bash
npm run build        # compile TypeScript to dist/
npm run dev          # watch mode
npm run type-check   # type-check without emitting
npm run lint         # run ESLint
npm run lintfix      # auto-fix lint issues
```

## Troubleshooting

### Node doesn't appear in n8n

- Rebuild: `npm run build`
- Restart n8n completely
- Check that the `n8n.nodes` path in `package.json` points to the correct file
- Check n8n startup logs for errors loading the node

### "401 Unauthorized" from Copilot API

- Verify your token is valid: run the `curl` commands above
- Confirm your GitHub account has an active Copilot subscription
- Token scopes don't matter — but the account must have Copilot access

### No models in the dropdown

- Open browser DevTools and check the network request to `/models`
- The API may return models under `data` or `models` key depending on the version
- Verify the credential test passes before checking the dropdown

### "403 Forbidden" on Enterprise

- Confirm the enterprise domain is correct (e.g. `company.ghe.com`, not `https://company.ghe.com`)
- Contact your GitHub Enterprise admin to confirm Copilot API is enabled

### n8n shows "Unknown credential"

- Make sure the credential class name (`gitHubCopilotApi`) matches the string used in `node.credentials[].name`
- Rebuild and restart n8n

## File Overview

```
├── credentials/
│   └── GitHubCopilotApi.credentials.ts   # Credential type (token + enterprise URL)
├── nodes/
│   └── LmChatGitHubCopilot/
│       ├── GitHubCopilotChatModel.ts      # LangChain BaseChatModel implementation
│       ├── LmChatGitHubCopilot.node.ts   # n8n node definition + loadOptions
│       └── github-copilot.svg            # Node icon
├── dist/                                  # Compiled output (generated)
├── package.json
└── tsconfig.json
```

## API Reference

- **Base URL (github.com)**: `https://api.githubcopilot.com`
- **Base URL (enterprise)**: `https://copilot-api.<domain>`
- **Models**: `GET /models`
- **Chat completions**: `POST /chat/completions` (OpenAI-compatible)
- **Required headers**: `Authorization: Bearer <token>`, `Copilot-Integration-Id: vscode-chat`, `x-initiator: user`
