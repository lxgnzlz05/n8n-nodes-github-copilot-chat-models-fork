/**
 * Local test that simulates what n8n does when calling loadOptions.
 * 
 * n8n instantiates the node class, then calls:
 *   node.methods.loadOptions.getEmbeddingModels.call(context)
 * 
 * where `context` is an ILoadOptionsFunctions object.
 * We mock that context with real API calls to verify the flow.
 */

import { execSync } from "child_process";

// Get a real token from gh CLI
const token = execSync("gh auth token", { encoding: "utf-8" }).trim();
console.log(`Token prefix: ${token.substring(0, 8)}...`);

// ============================================================
// Step 1: Direct API call (baseline — we know this works)
// ============================================================
console.log("\n=== Step 1: Direct API call ===");
try {
  const res = await fetch("https://api.githubcopilot.com/models", {
    headers: {
      Authorization: `Bearer ${token}`,
      "Copilot-Integration-Id": "vscode-chat",
      "x-initiator": "user",
    },
  });
  const json = await res.json();
  const allModels = json.data || json.models || [];
  const embeddingModels = allModels.filter(
    (m) => m.capabilities?.type?.toLowerCase() === "embeddings"
  );
  console.log(`HTTP ${res.status} — Total models: ${allModels.length}, Embedding models: ${embeddingModels.length}`);
  embeddingModels.forEach((m) => console.log(`  - ${m.id} (${m.name})`));
} catch (err) {
  console.error("Direct API call failed:", err.message);
}

// ============================================================
// Step 2: Load the compiled node and test loadOptions
// ============================================================
console.log("\n=== Step 2: Load compiled node class ===");
let NodeClass;
try {
  const mod = await import("./dist/nodes/EmbeddingsGitHubCopilot/EmbeddingsGitHubCopilot.node.js");
  NodeClass = mod.EmbeddingsGitHubCopilot;
  console.log("Node class loaded successfully:", NodeClass.name);
} catch (err) {
  console.error("FAILED to load node class:", err.message);
  console.error(err.stack);
  process.exit(1);
}

// ============================================================
// Step 3: Instantiate and check methods exist
// ============================================================
console.log("\n=== Step 3: Instantiate node ===");
let node;
try {
  node = new NodeClass();
  console.log("description.name:", node.description?.name);
  console.log("description.displayName:", node.description?.displayName);
  console.log("Has methods?", !!node.methods);
  console.log("Has methods.loadOptions?", !!node.methods?.loadOptions);
  console.log("Has getEmbeddingModels?", !!node.methods?.loadOptions?.getEmbeddingModels);
  console.log("typeof getEmbeddingModels:", typeof node.methods?.loadOptions?.getEmbeddingModels);
} catch (err) {
  console.error("FAILED to instantiate node:", err.message);
  console.error(err.stack);
  process.exit(1);
}

// ============================================================
// Step 4: Call getEmbeddingModels with mocked context
// ============================================================
console.log("\n=== Step 4: Call getEmbeddingModels with mock context ===");

// Mock ILoadOptionsFunctions context (what n8n provides as `this`)
const mockContext = {
  getCredentials: async (name) => {
    console.log(`  [mock] getCredentials("${name}") called`);
    return {
      token: token,
      enterpriseUrl: "",
      clientId: "",
    };
  },
  helpers: {
    httpRequest: async (options) => {
      console.log(`  [mock] httpRequest called:`, JSON.stringify({ method: options.method, url: options.url }));
      // Actually make the real HTTP request
      const res = await fetch(options.url, {
        method: options.method,
        headers: options.headers,
      });
      const body = await res.json();
      console.log(`  [mock] httpRequest response: HTTP ${res.status}, keys: ${Object.keys(body)}`);
      return body;
    },
  },
  getNode: () => ({
    name: "test-node",
    type: "embeddingsGitHubCopilot",
    typeVersion: 1,
    position: [0, 0],
    parameters: {},
  }),
};

try {
  const getEmbeddingModels = node.methods.loadOptions.getEmbeddingModels;
  console.log("Calling getEmbeddingModels.call(mockContext)...");
  const result = await getEmbeddingModels.call(mockContext);
  console.log(`\nResult: ${result.length} models returned`);
  result.forEach((m) => console.log(`  - ${m.name} (value: ${m.value})`));
  
  if (result.length === 0) {
    console.error("\n*** PROBLEM: getEmbeddingModels returned 0 models! ***");
  } else {
    console.log("\n*** SUCCESS: Models loaded correctly! ***");
  }
} catch (err) {
  console.error("\ngetEmbeddingModels THREW an error:", err.message);
  console.error(err.stack);
}

// ============================================================
// Step 5: Also test the chat model's getModels for comparison
// ============================================================
console.log("\n=== Step 5: Test chat model's getModels for comparison ===");
try {
  const chatMod = await import("./dist/nodes/LmChatGitHubCopilot/LmChatGitHubCopilot.node.js");
  const chatNode = new chatMod.LmChatGitHubCopilot();
  console.log("Chat node has getModels?", !!chatNode.methods?.loadOptions?.getModels);
  
  const chatResult = await chatNode.methods.loadOptions.getModels.call(mockContext);
  console.log(`Chat getModels result: ${chatResult.length} models`);
  chatResult.slice(0, 3).forEach((m) => console.log(`  - ${m.name} (value: ${m.value})`));
} catch (err) {
  console.error("Chat getModels failed:", err.message);
}
