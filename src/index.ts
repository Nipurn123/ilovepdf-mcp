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
import { signatureTools } from "./tools/signature.js";
import { chainTools } from "./tools/chain.js";

const allTools: ToolDefinition[] = [
  ...coreTools,
  ...convertTools,
  ...editTools,
  ...securityTools,
  ...imageTools,
  ...utilityTools,
  ...signatureTools,
  ...chainTools,
];

const IMAGE_TOOL_NAMES = new Set([
  "compress_image",
  "resize_image",
  "convert_image",
  "remove_background",
  "upscale_image",
  "watermark_image",
]);

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

  const isImageTool = IMAGE_TOOL_NAMES.has(toolName);

  let publicKey = isImageTool
    ? (args.image_public_key as string) || (args.public_key as string)
    : (args.public_key as string);
  let secretKey = args.secret_key as string;

  if (!publicKey || !secretKey) {
    publicKey = process.env.ILOVEPDF_PUBLIC_KEY || process.env.PUBLIC_KEY || "";
    secretKey = process.env.ILOVEPDF_SECRET_KEY || process.env.SECRET_KEY || "";
  }

  if (!publicKey || !secretKey) {
    const helpText = isImageTool
      ? "Image tools require an iLoveIMG project. Create one at https://www.iloveapi.com/user/projects and use image_public_key parameter. Or set ILOVEPDF_PUBLIC_KEY and ILOVEPDF_SECRET_KEY environment variables."
      : "public_key and secret_key are required. Get free API keys from https://www.iloveapi.com/user/projects or set ILOVEPDF_PUBLIC_KEY and ILOVEPDF_SECRET_KEY environment variables.";
    return {
      content: [{ type: "text", text: `Error: ${helpText}` }],
      isError: true,
    };
  }

  const client = new ILovePDFClient(publicKey, secretKey, isImageTool);

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
