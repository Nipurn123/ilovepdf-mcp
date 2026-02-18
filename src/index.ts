#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { ILovePDFClient, ToolDefinition } from "./types.js";

import { coreTools } from "./tools/core.js";
import { convertTools } from "./tools/convert.js";
import { editTools } from "./tools/edit.js";
import { securityTools } from "./tools/security.js";
import { imageTools } from "./tools/image.js";
import { utilityTools } from "./tools/utility.js";

const allTools: ToolDefinition[] = [
  ...coreTools,
  ...convertTools,
  ...editTools,
  ...securityTools,
  ...imageTools,
  ...utilityTools,
];

const server = new Server(
  { name: "ilovepdf-mcp", version: "2.0.0" },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: allTools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
    })),
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const toolName = request.params.name;
  const args = request.params.arguments || {};

  const tool = allTools.find((t) => t.name === toolName);
  if (!tool) {
    return {
      content: [{ type: "text", text: `Unknown tool: ${toolName}` }],
      isError: true,
    };
  }

  const publicKey = args.public_key as string;
  const secretKey = args.secret_key as string;

  if (!publicKey || !secretKey) {
    return {
      content: [
        {
          type: "text",
          text: "Error: public_key and secret_key are required. Get free API keys from https://developer.ilovepdf.com",
        },
      ],
      isError: true,
    };
  }

  const client = new ILovePDFClient(publicKey, secretKey);

  try {
    return await tool.handler(args, client);
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
