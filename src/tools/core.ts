import { ToolDefinition, ILovePDFClient } from "../types.js";
import * as path from "path";
import * as fs from "fs";

const commonPdfProps = {
  public_key: { type: "string", description: "iLovePDF public key" },
  secret_key: { type: "string", description: "iLovePDF secret key" },
  keep_task: {
    type: "boolean",
    default: false,
    description: "Keep task alive for chaining (task auto-expires in 2 hours)",
  },
};

export const coreTools: ToolDefinition[] = [
  {
    name: "compress_pdf",
    description:
      "Compress a PDF file to reduce its size. Compression levels: low, recommended, extreme.",
    inputSchema: {
      type: "object",
      properties: {
        ...commonPdfProps,
        file: { type: "string", description: "Path to PDF file or URL" },
        output: { type: "string", description: "Output file path" },
        compression_level: {
          type: "string",
          enum: ["low", "recommended", "extreme"],
          default: "recommended",
        },
      },
      required: ["public_key", "secret_key", "file", "output"],
    },
    handler: async (args, client) => {
      const taskInfo = await client.startTask("compress");
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
        "compress",
        [
          {
            server_filename: uploaded.server_filename,
            filename: path.basename(args.file!.toString()),
          },
        ],
        { compression_level: args.compression_level || "recommended" },
      );

      if (args.keep_task) {
        return {
          content: [
            {
              type: "text",
              text: `PDF compressed (task kept for chaining)!\nTask ID: ${taskInfo.task}\nServer: ${taskInfo.server}\nRemaining credits: ${taskInfo.remaining_credits}\n\nNext: Use chain_tasks to apply another tool, then download the result.`,
            },
          ],
        };
      }

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
            text: `PDF compressed successfully!\nOutput: ${args.output}\nRemaining credits: ${taskInfo.remaining_credits}`,
          },
        ],
      };
    },
  },

  {
    name: "merge_pdf",
    description:
      "Merge multiple PDF files into one. Files are merged in the order provided.",
    inputSchema: {
      type: "object",
      properties: {
        public_key: { type: "string", description: "iLovePDF public key" },
        secret_key: { type: "string", description: "iLovePDF secret key" },
        files: {
          type: "array",
          items: { type: "string" },
          description: "Paths to PDF files (in merge order)",
        },
        output: { type: "string", description: "Output file path" },
      },
      required: ["public_key", "secret_key", "files", "output"],
    },
    handler: async (args, client) => {
      const taskInfo = await client.startTask("merge");
      const files = args.files as string[];
      const uploadedFiles = [];

      for (const file of files) {
        const isUrl = file.startsWith("http");
        const uploaded = isUrl
          ? await client.uploadUrl(taskInfo.server, taskInfo.task, file)
          : await client.uploadFile(taskInfo.server, taskInfo.task, file);
        uploadedFiles.push({
          server_filename: uploaded.server_filename,
          filename: path.basename(file),
        });
      }

      await client.processFiles(
        taskInfo.server,
        taskInfo.task,
        "merge",
        uploadedFiles,
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
            text: `PDFs merged successfully!\nOutput: ${args.output}\nFiles merged: ${files.length}`,
          },
        ],
      };
    },
  },

  {
    name: "split_pdf",
    description:
      "Split a PDF into multiple files by page ranges, fixed intervals, or by removing pages.",
    inputSchema: {
      type: "object",
      properties: {
        public_key: { type: "string", description: "iLovePDF public key" },
        secret_key: { type: "string", description: "iLovePDF secret key" },
        file: { type: "string", description: "Path to PDF file or URL" },
        output: { type: "string", description: "Output ZIP file path" },
        mode: {
          type: "string",
          enum: ["ranges", "fixed_range", "remove_pages", "filesize"],
          default: "ranges",
        },
        ranges: {
          type: "string",
          description: "Page ranges e.g., '1-5,6-10,11-15'",
        },
        fixed_range: { type: "number", description: "Pages per split" },
        remove_pages: {
          type: "string",
          description: "Pages to remove e.g., '1,3,5-7'",
        },
      },
      required: ["public_key", "secret_key", "file", "output"],
    },
    handler: async (args, client) => {
      const taskInfo = await client.startTask("split");
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

      const options: Record<string, unknown> = {
        split_mode: args.mode || "ranges",
      };
      if (args.ranges) options.ranges = args.ranges;
      if (args.fixed_range) options.fixed_range = args.fixed_range;
      if (args.remove_pages) options.remove_pages = args.remove_pages;

      await client.processFiles(
        taskInfo.server,
        taskInfo.task,
        "split",
        [
          {
            server_filename: uploaded.server_filename,
            filename: path.basename(args.file!.toString()),
          },
        ],
        options,
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
            text: `PDF split successfully!\nOutput: ${args.output}`,
          },
        ],
      };
    },
  },

  {
    name: "rotate_pdf",
    description: "Rotate PDF pages by 90, 180, or 270 degrees.",
    inputSchema: {
      type: "object",
      properties: {
        public_key: { type: "string", description: "iLovePDF public key" },
        secret_key: { type: "string", description: "iLovePDF secret key" },
        file: { type: "string", description: "Path to PDF file or URL" },
        output: { type: "string", description: "Output file path" },
        rotation: {
          type: "integer",
          enum: [0, 90, 180, 270],
          default: 90,
          description: "Rotation in degrees",
        },
      },
      required: ["public_key", "secret_key", "file", "output"],
    },
    handler: async (args, client) => {
      const taskInfo = await client.startTask("rotate");
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

      await client.processFiles(taskInfo.server, taskInfo.task, "rotate", [
        {
          server_filename: uploaded.server_filename,
          filename: path.basename(args.file!.toString()),
          rotate: args.rotation as number,
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
            text: `PDF rotated successfully!\nOutput: ${args.output}`,
          },
        ],
      };
    },
  },

  {
    name: "repair_pdf",
    description: "Repair a damaged or corrupt PDF file.",
    inputSchema: {
      type: "object",
      properties: {
        public_key: { type: "string", description: "iLovePDF public key" },
        secret_key: { type: "string", description: "iLovePDF secret key" },
        file: { type: "string", description: "Path to PDF file or URL" },
        output: { type: "string", description: "Output file path" },
      },
      required: ["public_key", "secret_key", "file", "output"],
    },
    handler: async (args, client) => {
      const taskInfo = await client.startTask("repair");
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

      await client.processFiles(taskInfo.server, taskInfo.task, "repair", [
        {
          server_filename: uploaded.server_filename,
          filename: path.basename(args.file!.toString()),
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
            text: `PDF repaired successfully!\nOutput: ${args.output}`,
          },
        ],
      };
    },
  },
];
