import { ToolDefinition, ILovePDFClient } from "../types.js";
import * as path from "path";

export const editTools: ToolDefinition[] = [
  {
    name: "watermark_pdf",
    description:
      "Add text or image watermark to PDF. Supports positioning, rotation, transparency, and font options.",
    inputSchema: {
      type: "object",
      properties: {
        public_key: { type: "string", description: "iLovePDF public key" },
        secret_key: { type: "string", description: "iLovePDF secret key" },
        file: { type: "string", description: "Path to PDF file or URL" },
        output: { type: "string", description: "Output file path" },
        text: { type: "string", description: "Watermark text" },
        mode: { type: "string", enum: ["text", "image"], default: "text" },
        pages: {
          type: "string",
          default: "all",
          description: "Pages to watermark: 'all', '1-5', '1,3,5'",
        },
        position: {
          type: "string",
          enum: ["center", "top", "bottom", "middle"],
          default: "center",
        },
        rotation: {
          type: "number",
          default: 0,
          description: "Rotation angle 0-360",
        },
        font_size: { type: "number", default: 14 },
        font_color: {
          type: "string",
          default: "#000000",
          description: "Hex color",
        },
        transparency: {
          type: "number",
          default: 100,
          description: "Opacity 1-100",
        },
      },
      required: ["public_key", "secret_key", "file", "output", "text"],
    },
    handler: async (args, client) => {
      const taskInfo = await client.startTask("watermark");
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
        "watermark",
        [
          {
            server_filename: uploaded.server_filename,
            filename: path.basename(args.file!.toString()),
          },
        ],
        {
          mode: args.mode || "text",
          text: args.text,
          pages: args.pages || "all",
          vertical_position: args.position || "middle",
          horizontal_position: "center",
          rotation: args.rotation || 0,
          font_size: args.font_size || 14,
          font_color: args.font_color || "#000000",
          transparency: args.transparency || 100,
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
            text: `Watermark added successfully!\nOutput: ${args.output}`,
          },
        ],
      };
    },
  },

  {
    name: "page_numbers",
    description:
      "Add page numbers to PDF with customizable position, font, and formatting.",
    inputSchema: {
      type: "object",
      properties: {
        public_key: { type: "string", description: "iLovePDF public key" },
        secret_key: { type: "string", description: "iLovePDF secret key" },
        file: { type: "string", description: "Path to PDF file or URL" },
        output: { type: "string", description: "Output file path" },
        pages: {
          type: "string",
          default: "all",
          description: "Pages to number: 'all', '3-end', '1,3,5-9'",
        },
        starting_number: { type: "number", default: 1 },
        vertical_position: {
          type: "string",
          enum: ["top", "bottom"],
          default: "bottom",
        },
        horizontal_position: {
          type: "string",
          enum: ["left", "center", "right"],
          default: "center",
        },
        font_size: { type: "number", default: 14 },
        font_color: {
          type: "string",
          default: "#000000",
          description: "Hex color",
        },
        text: {
          type: "string",
          default: "{n}",
          description: "Use {n} for page number, {p} for total pages",
        },
      },
      required: ["public_key", "secret_key", "file", "output"],
    },
    handler: async (args, client) => {
      const taskInfo = await client.startTask("pagenumber");
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
        "pagenumber",
        [
          {
            server_filename: uploaded.server_filename,
            filename: path.basename(args.file!.toString()),
          },
        ],
        {
          pages: args.pages || "all",
          starting_number: args.starting_number || 1,
          vertical_position: args.vertical_position || "bottom",
          horizontal_position: args.horizontal_position || "center",
          font_size: args.font_size || 14,
          font_color: args.font_color || "#000000",
          text: args.text || "{n}",
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
            text: `Page numbers added successfully!\nOutput: ${args.output}`,
          },
        ],
      };
    },
  },

  {
    name: "ocr_pdf",
    description:
      "Apply OCR to make scanned PDFs searchable and selectable. Supports 100+ languages.",
    inputSchema: {
      type: "object",
      properties: {
        public_key: { type: "string", description: "iLovePDF public key" },
        secret_key: { type: "string", description: "iLovePDF secret key" },
        file: { type: "string", description: "Path to PDF file or URL" },
        output: { type: "string", description: "Output file path" },
        languages: {
          type: "array",
          items: { type: "string" },
          default: ["eng"],
          description: "OCR languages: eng, spa, fra, deu, chi_sim, jpn, etc.",
        },
      },
      required: ["public_key", "secret_key", "file", "output"],
    },
    handler: async (args, client) => {
      const taskInfo = await client.startTask("pdfocr");
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
        "pdfocr",
        [
          {
            server_filename: uploaded.server_filename,
            filename: path.basename(args.file!.toString()),
          },
        ],
        { ocr_languages: args.languages || ["eng"] },
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
            text: `OCR applied successfully!\nOutput: ${args.output}`,
          },
        ],
      };
    },
  },

  {
    name: "extract_text",
    description:
      "Extract text content from PDF. Returns extracted text with optional position details.",
    inputSchema: {
      type: "object",
      properties: {
        public_key: { type: "string", description: "iLovePDF public key" },
        secret_key: { type: "string", description: "iLovePDF secret key" },
        file: { type: "string", description: "Path to PDF file or URL" },
        output: { type: "string", description: "Output TXT file path" },
        detailed: {
          type: "boolean",
          default: false,
          description: "Include position details",
        },
      },
      required: ["public_key", "secret_key", "file", "output"],
    },
    handler: async (args, client) => {
      const taskInfo = await client.startTask("extract");
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
        "extract",
        [
          {
            server_filename: uploaded.server_filename,
            filename: path.basename(args.file!.toString()),
          },
        ],
        { detailed: args.detailed || false },
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
            text: `Text extracted successfully!\nOutput: ${args.output}`,
          },
        ],
      };
    },
  },
];
