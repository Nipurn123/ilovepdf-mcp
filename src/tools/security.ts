import { ToolDefinition, ILovePDFClient } from "../types.js";
import * as path from "path";

export const securityTools: ToolDefinition[] = [
  {
    name: "protect_pdf",
    description:
      "Add password protection to PDF. Encrypt PDF to prevent unauthorized access.",
    inputSchema: {
      type: "object",
      properties: {
        public_key: { type: "string", description: "iLovePDF public key" },
        secret_key: { type: "string", description: "iLovePDF secret key" },
        file: { type: "string", description: "Path to PDF file or URL" },
        output: { type: "string", description: "Output file path" },
        password: { type: "string", description: "Password to set" },
      },
      required: ["public_key", "secret_key", "file", "output", "password"],
    },
    handler: async (args, client) => {
      const taskInfo = await client.startTask("protect");
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
        "protect",
        [
          {
            server_filename: uploaded.server_filename,
            filename: path.basename(args.file!.toString()),
          },
        ],
        { password: args.password },
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
            text: `PDF protected successfully!\nOutput: ${args.output}`,
          },
        ],
      };
    },
  },

  {
    name: "unlock_pdf",
    description:
      "Remove password protection from PDF. Unlock encrypted PDF files.",
    inputSchema: {
      type: "object",
      properties: {
        public_key: { type: "string", description: "iLovePDF public key" },
        secret_key: { type: "string", description: "iLovePDF secret key" },
        file: { type: "string", description: "Path to PDF file or URL" },
        output: { type: "string", description: "Output file path" },
        password: { type: "string", description: "Current PDF password" },
      },
      required: ["public_key", "secret_key", "file", "output"],
    },
    handler: async (args, client) => {
      const taskInfo = await client.startTask("unlock");
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

      await client.processFiles(taskInfo.server, taskInfo.task, "unlock", [
        {
          server_filename: uploaded.server_filename,
          filename: path.basename(args.file!.toString()),
          password: args.password as string,
        },
      ]);

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
            text: `PDF unlocked successfully!\nOutput: ${args.output}`,
          },
        ],
      };
    },
  },
];
