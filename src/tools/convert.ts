import { ToolDefinition, ILovePDFClient } from "../types.js";
import * as path from "path";

export const convertTools: ToolDefinition[] = [
  {
    name: "pdf_to_jpg",
    description:
      "Convert PDF pages to JPG images. Mode 'pages' converts each page, 'extract' extracts embedded images.",
    inputSchema: {
      type: "object",
      properties: {
        public_key: { type: "string", description: "iLovePDF public key" },
        secret_key: { type: "string", description: "iLovePDF secret key" },
        file: { type: "string", description: "Path to PDF file or URL" },
        output: { type: "string", description: "Output ZIP file path" },
        mode: { type: "string", enum: ["pages", "extract"], default: "pages" },
      },
      required: ["public_key", "secret_key", "file", "output"],
    },
    handler: async (args, client) => {
      const taskInfo = await client.startTask("pdfjpg");
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
        "pdfjpg",
        [
          {
            server_filename: uploaded.server_filename,
            filename: path.basename(args.file!.toString()),
          },
        ],
        { pdfjpg_mode: args.mode || "pages" },
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
            text: `PDF converted to JPG!\nOutput: ${args.output}`,
          },
        ],
      };
    },
  },

  {
    name: "jpg_to_pdf",
    description:
      "Convert JPG/PNG images to PDF. Supports orientation, margins, and page size options.",
    inputSchema: {
      type: "object",
      properties: {
        public_key: { type: "string", description: "iLovePDF public key" },
        secret_key: { type: "string", description: "iLovePDF secret key" },
        files: {
          type: "array",
          items: { type: "string" },
          description: "Paths to image files",
        },
        output: { type: "string", description: "Output PDF file path" },
        orientation: {
          type: "string",
          enum: ["portrait", "landscape"],
          default: "portrait",
        },
        margin: { type: "number", default: 0, description: "Margin in pixels" },
        page_size: {
          type: "string",
          enum: ["fit", "A4", "letter"],
          default: "fit",
        },
        merge: {
          type: "boolean",
          default: true,
          description: "Merge all images into one PDF",
        },
      },
      required: ["public_key", "secret_key", "files", "output"],
    },
    handler: async (args, client) => {
      const taskInfo = await client.startTask("imagepdf");
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
        "imagepdf",
        uploadedFiles,
        {
          orientation: args.orientation || "portrait",
          margin: args.margin || 0,
          pagesize: args.page_size || "fit",
          merge_after: args.merge !== false,
        },
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
            text: `Images converted to PDF!\nOutput: ${args.output}`,
          },
        ],
      };
    },
  },

  {
    name: "html_to_pdf",
    description:
      "Convert HTML webpage to PDF. Provide a URL or HTML file path.",
    inputSchema: {
      type: "object",
      properties: {
        public_key: { type: "string", description: "iLovePDF public key" },
        secret_key: { type: "string", description: "iLovePDF secret key" },
        file: { type: "string", description: "URL or path to HTML file" },
        output: { type: "string", description: "Output PDF file path" },
      },
      required: ["public_key", "secret_key", "file", "output"],
    },
    handler: async (args, client) => {
      const taskInfo = await client.startTask("htmlpdf");
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

      await client.processFiles(taskInfo.server, taskInfo.task, "htmlpdf", [
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
            text: `HTML converted to PDF!\nOutput: ${args.output}`,
          },
        ],
      };
    },
  },

  {
    name: "office_to_pdf",
    description:
      "Convert Word (DOC/DOCX), Excel (XLS/XLSX), or PowerPoint (PPT/PPTX) to PDF.",
    inputSchema: {
      type: "object",
      properties: {
        public_key: { type: "string", description: "iLovePDF public key" },
        secret_key: { type: "string", description: "iLovePDF secret key" },
        file: { type: "string", description: "Path to Office file or URL" },
        output: { type: "string", description: "Output PDF file path" },
      },
      required: ["public_key", "secret_key", "file", "output"],
    },
    handler: async (args, client) => {
      const taskInfo = await client.startTask("officepdf");
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

      await client.processFiles(taskInfo.server, taskInfo.task, "officepdf", [
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
            text: `Office file converted to PDF!\nOutput: ${args.output}`,
          },
        ],
      };
    },
  },

  {
    name: "pdf_to_pdfa",
    description:
      "Convert PDF to PDF/A format for long-term archiving. Supports different conformance levels.",
    inputSchema: {
      type: "object",
      properties: {
        public_key: { type: "string", description: "iLovePDF public key" },
        secret_key: { type: "string", description: "iLovePDF secret key" },
        file: { type: "string", description: "Path to PDF file or URL" },
        output: { type: "string", description: "Output file path" },
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
      const taskInfo = await client.startTask("pdfa");
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
        "pdfa",
        [
          {
            server_filename: uploaded.server_filename,
            filename: path.basename(args.file!.toString()),
          },
        ],
        { conformance: args.conformance || "pdfa-2b", allow_downgrade: true },
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
            text: `PDF converted to PDF/A!\nOutput: ${args.output}`,
          },
        ],
      };
    },
  },
];
