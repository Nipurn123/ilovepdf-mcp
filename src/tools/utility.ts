import { ToolDefinition, ILovePDFClient } from "../types.js";

export const utilityTools: ToolDefinition[] = [
  {
    name: "check_credits",
    description: "Check remaining API credits/quota for your iLovePDF account.",
    inputSchema: {
      type: "object",
      properties: {
        public_key: { type: "string", description: "iLovePDF public key" },
        secret_key: { type: "string", description: "iLovePDF secret key" },
      },
      required: ["public_key", "secret_key"],
    },
    handler: async (args, client) => {
      const credits = await client.getRemainingCredits();
      return {
        content: [{ type: "text", text: `Remaining credits: ${credits}` }],
      };
    },
  },

  {
    name: "validate_pdfa",
    description: "Validate PDF/A compliance for a PDF file.",
    inputSchema: {
      type: "object",
      properties: {
        public_key: { type: "string", description: "iLovePDF public key" },
        secret_key: { type: "string", description: "iLovePDF secret key" },
        file: { type: "string", description: "Path to PDF file or URL" },
        output: { type: "string", description: "Output report file path" },
        conformance: {
          type: "string",
          enum: [
            "pdfa-1b",
            "pdfa-1a",
            "pdfa-2b",
            "pdfa-2u",
            "pdfa-2a",
            "pdfa-3b",
            "pdfa-3u",
            "pdfa-3a",
          ],
          default: "pdfa-2b",
        },
      },
      required: ["public_key", "secret_key", "file", "output"],
    },
    handler: async (args, client) => {
      const path = await import("path");
      const taskInfo = await client.startTask("validatepdfa");
      const isUrl = args.file!.toString().startsWith("http");

      const uploaded = isUrl
        ? await client.uploadUrl(
            taskInfo.server,
            taskInfo.task,
            args.file!.toString(),
          )
        : await client.uploadFile(
            taskInfo.server,
            taskInfo.task,
            args.file!.toString(),
          );

      await client.processFiles(
        taskInfo.server,
        taskInfo.task,
        "validatepdfa",
        [
          {
            server_filename: uploaded.server_filename,
            filename: path.basename(args.file!.toString()),
          },
        ],
        { conformance: args.conformance || "pdfa-2b" },
      );

      await client.downloadResult(
        taskInfo.server,
        taskInfo.task,
        args.output!.toString(),
      );
      await client.deleteTask(taskInfo.server, taskInfo.task);

      return {
        content: [
          {
            type: "text",
            text: `PDF/A validation complete!\nOutput: ${args.output}`,
          },
        ],
      };
    },
  },
];
