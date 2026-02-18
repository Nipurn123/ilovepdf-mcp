#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import FormData from "form-data";
import fetch from "node-fetch";
import * as fs from "fs";
import * as path from "path";

const API_BASE = "https://api.ilovepdf.com/v1";

const AuthSchema = z.object({
  public_key: z.string(),
  secret_key: z.string(),
});

type Auth = z.infer<typeof AuthSchema>;

interface TaskInfo {
  server: string;
  task: string;
  remaining_credits: number;
}

interface UploadedFile {
  server_filename: string;
  filename?: string;
}

interface ProcessResult {
  download_filename: string;
  filesize: number;
  output_filesize: number;
  output_filenumber: number;
  output_extensions: string[];
  timer: string;
  status: string;
}

const PDF_TOOLS = [
  "compress",
  "merge",
  "split",
  "pdfocr",
  "pdfjpg",
  "imagepdf",
  "unlock",
  "pagenumber",
  "watermark",
  "officepdf",
  "repair",
  "rotate",
  "protect",
  "pdfa",
  "validatepdfa",
  "htmlpdf",
  "extract",
  "editpdf",
] as const;

const IMAGE_TOOLS = [
  "resizeimage",
  "cropimage",
  "compressimage",
  "upscaleimage",
  "removebackgroundimage",
  "convertimage",
  "watermarkimage",
  "repairimage",
  "rotateimage",
] as const;

type PDFTool = (typeof PDF_TOOLS)[number];
type ImageTool = (typeof IMAGE_TOOLS)[number];

let cachedToken: string | null = null;
let tokenExpiry: number = 0;

async function getToken(auth: Auth): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiry) {
    return cachedToken;
  }

  const response = await fetch(`${API_BASE}/auth`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ public_key: auth.public_key }),
  });

  if (!response.ok) {
    throw new Error(`Auth failed: ${response.status}`);
  }

  const data = (await response.json()) as { token: string };
  cachedToken = data.token;
  tokenExpiry = Date.now() + 2 * 60 * 60 * 1000 - 5 * 60 * 1000; // 2 hours minus 5 min buffer
  return cachedToken;
}

async function startTask(
  tool: PDFTool | ImageTool | "sign",
  token: string,
  region: string = "us",
): Promise<TaskInfo> {
  const response = await fetch(`${API_BASE}/start/${tool}/${region}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error(`Start task failed: ${response.status}`);
  }

  return response.json() as Promise<TaskInfo>;
}

async function uploadFile(
  server: string,
  task: string,
  token: string,
  filePath: string,
): Promise<UploadedFile> {
  const formData = new FormData();
  formData.append("task", task);
  formData.append(
    "file",
    await import("fs").then((fs) => fs.default.createReadStream(filePath)),
  );

  const response = await fetch(`https://${server}/v1/upload`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      ...formData.getHeaders(),
    },
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Upload failed: ${response.status}`);
  }

  return response.json() as Promise<UploadedFile>;
}

async function uploadUrl(
  server: string,
  task: string,
  token: string,
  url: string,
): Promise<UploadedFile> {
  const formData = new FormData();
  formData.append("task", task);
  formData.append("cloud_file", url);

  const response = await fetch(`https://${server}/v1/upload`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      ...formData.getHeaders(),
    },
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Upload failed: ${response.status}`);
  }

  return response.json() as Promise<UploadedFile>;
}

async function processFiles(
  server: string,
  task: string,
  token: string,
  tool: string,
  files: Array<{
    server_filename: string;
    filename: string;
    password?: string;
    rotate?: number;
  }>,
  options: Record<string, unknown> = {},
): Promise<ProcessResult> {
  const body = {
    task,
    tool,
    files: files.map((f) => ({
      server_filename: f.server_filename,
      filename: f.filename,
      password: f.password,
      rotate: f.rotate,
    })),
    ...options,
  };

  const response = await fetch(`https://${server}/v1/process`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Process failed: ${response.status} - ${error}`);
  }

  return response.json() as Promise<ProcessResult>;
}

async function downloadResult(
  server: string,
  task: string,
  token: string,
  outputPath: string,
): Promise<void> {
  const response = await fetch(`https://${server}/v1/download/${task}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error(`Download failed: ${response.status}`);
  }

  const buffer = await response.buffer();
  const fs = await import("fs");
  await fs.promises.writeFile(outputPath, buffer);
}

async function deleteTask(
  server: string,
  task: string,
  token: string,
): Promise<void> {
  await fetch(`https://${server}/v1/task/${task}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
}

const server = new Server(
  { name: "ilovepdf-mcp", version: "1.0.0" },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      // Authentication
      {
        name: "ilovepdf_auth",
        description:
          "Test iLovePDF API authentication. Get your API keys from https://developer.ilovepdf.com/user/projects",
        inputSchema: {
          type: "object",
          properties: {
            public_key: { type: "string", description: "Project public key" },
            secret_key: { type: "string", description: "Project secret key" },
          },
          required: ["public_key", "secret_key"],
        },
      },

      // Compress PDF
      {
        name: "compress_pdf",
        description:
          "Compress a PDF file to reduce its size. Returns the path to the compressed file.",
        inputSchema: {
          type: "object",
          properties: {
            public_key: { type: "string" },
            secret_key: { type: "string" },
            file_path: { type: "string", description: "Path to PDF file" },
            output_path: {
              type: "string",
              description: "Path for output file",
            },
            compression_level: {
              type: "string",
              enum: ["low", "recommended", "extreme"],
              default: "recommended",
            },
          },
          required: ["public_key", "secret_key", "file_path", "output_path"],
        },
      },

      // Merge PDF
      {
        name: "merge_pdf",
        description:
          "Merge multiple PDF files into one. Files will be merged in the order provided.",
        inputSchema: {
          type: "object",
          properties: {
            public_key: { type: "string" },
            secret_key: { type: "string" },
            file_paths: {
              type: "array",
              items: { type: "string" },
              description: "Paths to PDF files in merge order",
            },
            output_path: {
              type: "string",
              description: "Path for output file",
            },
          },
          required: ["public_key", "secret_key", "file_paths", "output_path"],
        },
      },

      // Split PDF
      {
        name: "split_pdf",
        description: "Split a PDF into multiple files by page ranges.",
        inputSchema: {
          type: "object",
          properties: {
            public_key: { type: "string" },
            secret_key: { type: "string" },
            file_path: { type: "string", description: "Path to PDF file" },
            output_path: {
              type: "string",
              description: "Path for output ZIP file",
            },
            mode: {
              type: "string",
              enum: ["ranges", "fixed_range", "remove_pages"],
              default: "ranges",
            },
            ranges: {
              type: "string",
              description: "Page ranges e.g., '1,5,10-14'",
            },
            fixed_range: {
              type: "number",
              description: "Fixed number of pages per split",
            },
            remove_pages: {
              type: "string",
              description: "Pages to remove e.g., '1,4,8-12'",
            },
          },
          required: ["public_key", "secret_key", "file_path", "output_path"],
        },
      },

      // PDF to JPG
      {
        name: "pdf_to_jpg",
        description: "Convert PDF pages to JPG images.",
        inputSchema: {
          type: "object",
          properties: {
            public_key: { type: "string" },
            secret_key: { type: "string" },
            file_path: { type: "string", description: "Path to PDF file" },
            output_path: {
              type: "string",
              description: "Path for output ZIP file",
            },
            mode: {
              type: "string",
              enum: ["pages", "extract"],
              default: "pages",
              description:
                "pages=convert each page, extract=extract embedded images",
            },
          },
          required: ["public_key", "secret_key", "file_path", "output_path"],
        },
      },

      // JPG to PDF
      {
        name: "jpg_to_pdf",
        description: "Convert JPG images to a PDF file.",
        inputSchema: {
          type: "object",
          properties: {
            public_key: { type: "string" },
            secret_key: { type: "string" },
            file_paths: {
              type: "array",
              items: { type: "string" },
              description: "Paths to JPG files",
            },
            output_path: {
              type: "string",
              description: "Path for output PDF file",
            },
            orientation: {
              type: "string",
              enum: ["portrait", "landscape"],
              default: "portrait",
            },
            margin: {
              type: "number",
              default: 0,
              description: "Margin in pixels",
            },
            page_size: {
              type: "string",
              enum: ["fit", "A4", "letter"],
              default: "fit",
            },
          },
          required: ["public_key", "secret_key", "file_paths", "output_path"],
        },
      },

      // Unlock PDF
      {
        name: "unlock_pdf",
        description: "Remove password protection from a PDF.",
        inputSchema: {
          type: "object",
          properties: {
            public_key: { type: "string" },
            secret_key: { type: "string" },
            file_path: { type: "string", description: "Path to PDF file" },
            output_path: {
              type: "string",
              description: "Path for output file",
            },
            password: { type: "string", description: "PDF password" },
          },
          required: ["public_key", "secret_key", "file_path", "output_path"],
        },
      },

      // Protect PDF
      {
        name: "protect_pdf",
        description: "Add password protection to a PDF.",
        inputSchema: {
          type: "object",
          properties: {
            public_key: { type: "string" },
            secret_key: { type: "string" },
            file_path: { type: "string", description: "Path to PDF file" },
            output_path: {
              type: "string",
              description: "Path for output file",
            },
            password: { type: "string", description: "Password to set" },
          },
          required: [
            "public_key",
            "secret_key",
            "file_path",
            "output_path",
            "password",
          ],
        },
      },

      // Rotate PDF
      {
        name: "rotate_pdf",
        description: "Rotate pages in a PDF file.",
        inputSchema: {
          type: "object",
          properties: {
            public_key: { type: "string" },
            secret_key: { type: "string" },
            file_path: { type: "string", description: "Path to PDF file" },
            output_path: {
              type: "string",
              description: "Path for output file",
            },
            rotation: { type: "number", enum: [0, 90, 180, 270], default: 90 },
          },
          required: ["public_key", "secret_key", "file_path", "output_path"],
        },
      },

      // Watermark PDF
      {
        name: "watermark_pdf",
        description: "Add watermark to a PDF file.",
        inputSchema: {
          type: "object",
          properties: {
            public_key: { type: "string" },
            secret_key: { type: "string" },
            file_path: { type: "string", description: "Path to PDF file" },
            output_path: {
              type: "string",
              description: "Path for output file",
            },
            text: { type: "string", description: "Watermark text" },
            mode: { type: "string", enum: ["text", "image"], default: "text" },
            font_size: { type: "number", default: 14 },
            font_color: { type: "string", default: "#000000" },
            transparency: {
              type: "number",
              default: 100,
              description: "Opacity 1-100",
            },
            rotation: { type: "number", default: 0 },
            position: {
              type: "string",
              enum: ["center", "top", "bottom"],
              default: "center",
            },
          },
          required: [
            "public_key",
            "secret_key",
            "file_path",
            "output_path",
            "text",
          ],
        },
      },

      // Page Numbers
      {
        name: "page_numbers",
        description: "Add page numbers to a PDF.",
        inputSchema: {
          type: "object",
          properties: {
            public_key: { type: "string" },
            secret_key: { type: "string" },
            file_path: { type: "string", description: "Path to PDF file" },
            output_path: {
              type: "string",
              description: "Path for output file",
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
            font_color: { type: "string", default: "#000000" },
          },
          required: ["public_key", "secret_key", "file_path", "output_path"],
        },
      },

      // PDF to Word
      {
        name: "pdf_to_word",
        description: "Convert PDF to editable Word document.",
        inputSchema: {
          type: "object",
          properties: {
            public_key: { type: "string" },
            secret_key: { type: "string" },
            file_path: { type: "string", description: "Path to PDF file" },
            output_path: {
              type: "string",
              description: "Path for output DOCX file",
            },
          },
          required: ["public_key", "secret_key", "file_path", "output_path"],
        },
      },

      // Office to PDF
      {
        name: "office_to_pdf",
        description: "Convert Word/Excel/PowerPoint to PDF.",
        inputSchema: {
          type: "object",
          properties: {
            public_key: { type: "string" },
            secret_key: { type: "string" },
            file_path: {
              type: "string",
              description: "Path to Office file (DOCX, XLSX, PPTX)",
            },
            output_path: {
              type: "string",
              description: "Path for output PDF file",
            },
          },
          required: ["public_key", "secret_key", "file_path", "output_path"],
        },
      },

      // PDF OCR
      {
        name: "pdf_ocr",
        description: "Apply OCR to make scanned PDFs searchable.",
        inputSchema: {
          type: "object",
          properties: {
            public_key: { type: "string" },
            secret_key: { type: "string" },
            file_path: { type: "string", description: "Path to PDF file" },
            output_path: {
              type: "string",
              description: "Path for output file",
            },
            languages: {
              type: "array",
              items: { type: "string" },
              default: ["eng"],
              description: "OCR languages e.g., ['eng', 'spa']",
            },
          },
          required: ["public_key", "secret_key", "file_path", "output_path"],
        },
      },

      // Repair PDF
      {
        name: "repair_pdf",
        description: "Repair a damaged or corrupt PDF file.",
        inputSchema: {
          type: "object",
          properties: {
            public_key: { type: "string" },
            secret_key: { type: "string" },
            file_path: { type: "string", description: "Path to PDF file" },
            output_path: {
              type: "string",
              description: "Path for output file",
            },
          },
          required: ["public_key", "secret_key", "file_path", "output_path"],
        },
      },

      // Image Tools
      {
        name: "compress_image",
        description: "Compress JPG, PNG, or GIF images.",
        inputSchema: {
          type: "object",
          properties: {
            public_key: { type: "string" },
            secret_key: { type: "string" },
            file_path: { type: "string", description: "Path to image file" },
            output_path: {
              type: "string",
              description: "Path for output file",
            },
            compression_level: {
              type: "string",
              enum: ["low", "recommended", "extreme"],
              default: "recommended",
            },
          },
          required: ["public_key", "secret_key", "file_path", "output_path"],
        },
      },

      {
        name: "resize_image",
        description: "Resize an image by pixels or percentage.",
        inputSchema: {
          type: "object",
          properties: {
            public_key: { type: "string" },
            secret_key: { type: "string" },
            file_path: { type: "string", description: "Path to image file" },
            output_path: {
              type: "string",
              description: "Path for output file",
            },
            resize_mode: {
              type: "string",
              enum: ["pixels", "percentage"],
              default: "pixels",
            },
            width: { type: "number", description: "Width in pixels" },
            height: { type: "number", description: "Height in pixels" },
            percentage: { type: "number", description: "Resize percentage" },
            maintain_ratio: { type: "boolean", default: true },
          },
          required: ["public_key", "secret_key", "file_path", "output_path"],
        },
      },

      {
        name: "convert_image",
        description: "Convert image to JPG, PNG, GIF, or HEIC.",
        inputSchema: {
          type: "object",
          properties: {
            public_key: { type: "string" },
            secret_key: { type: "string" },
            file_path: { type: "string", description: "Path to image file" },
            output_path: {
              type: "string",
              description: "Path for output file (include extension)",
            },
            to_format: {
              type: "string",
              enum: ["jpg", "png", "gif", "heic"],
              default: "jpg",
            },
          },
          required: ["public_key", "secret_key", "file_path", "output_path"],
        },
      },

      {
        name: "remove_background",
        description: "Remove background from an image.",
        inputSchema: {
          type: "object",
          properties: {
            public_key: { type: "string" },
            secret_key: { type: "string" },
            file_path: { type: "string", description: "Path to image file" },
            output_path: {
              type: "string",
              description: "Path for output PNG file",
            },
          },
          required: ["public_key", "secret_key", "file_path", "output_path"],
        },
      },

      {
        name: "upscale_image",
        description: "Upscale image using AI (2x or 4x).",
        inputSchema: {
          type: "object",
          properties: {
            public_key: { type: "string" },
            secret_key: { type: "string" },
            file_path: { type: "string", description: "Path to image file" },
            output_path: {
              type: "string",
              description: "Path for output file",
            },
            multiplier: { type: "number", enum: [2, 4], default: 2 },
          },
          required: ["public_key", "secret_key", "file_path", "output_path"],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const toolName = request.params.name;
  const args = request.params.arguments || {};

  const getAuth = () => ({
    public_key: args.public_key as string,
    secret_key: args.secret_key as string,
  });

  const processPDF = async (
    tool: PDFTool,
    filePath: string,
    outputPath: string,
    options: Record<string, unknown> = {},
    files?: Array<{ server_filename: string; filename: string }>,
  ) => {
    const auth = getAuth();
    const token = await getToken(auth);
    const taskInfo = await startTask(tool, token);

    let uploadedFiles: UploadedFile[] = [];
    if (!files) {
      const path = await import("path");
      const fs = await import("fs");
      const stats = await fs.promises.stat(filePath);
      const uploaded = await uploadFile(
        taskInfo.server,
        taskInfo.task,
        token,
        filePath,
      );
      uploadedFiles = [
        {
          server_filename: uploaded.server_filename,
          filename: path.basename(filePath),
        },
      ];
    } else {
      uploadedFiles = files.map((f) => ({
        server_filename: f.server_filename,
        filename: f.filename,
      }));
    }

    await processFiles(
      taskInfo.server,
      taskInfo.task,
      token,
      tool,
      uploadedFiles.map((f) => ({
        server_filename: f.server_filename,
        filename: f.filename || "file",
      })),
      options,
    );

    await downloadResult(taskInfo.server, taskInfo.task, token, outputPath);
    await deleteTask(taskInfo.server, taskInfo.task, token);

    return {
      success: true,
      output_path: outputPath,
      remaining_credits: taskInfo.remaining_credits,
    };
  };

  const processImage = async (
    tool: ImageTool,
    filePath: string,
    outputPath: string,
    options: Record<string, unknown> = {},
  ) => {
    return processPDF(
      tool as unknown as PDFTool,
      filePath,
      outputPath,
      options,
    );
  };

  try {
    switch (toolName) {
      case "ilovepdf_auth": {
        const auth = AuthSchema.parse(args);
        const token = await getToken(auth);
        return {
          content: [
            {
              type: "text",
              text: `Authentication successful! Token: ${token.substring(0, 20)}...`,
            },
          ],
        };
      }

      case "compress_pdf": {
        const result = await processPDF(
          "compress",
          args.file_path as string,
          args.output_path as string,
          {
            compression_level: args.compression_level || "recommended",
          },
        );
        return {
          content: [
            {
              type: "text",
              text: `PDF compressed successfully!\nOutput: ${result.output_path}\nRemaining credits: ${result.remaining_credits}`,
            },
          ],
        };
      }

      case "merge_pdf": {
        const auth = getAuth();
        const token = await getToken(auth);
        const taskInfo = await startTask("merge", token);
        const path = await import("path");

        const uploadedFiles = [];
        for (const filePath of args.file_paths as string[]) {
          const uploaded = await uploadFile(
            taskInfo.server,
            taskInfo.task,
            token,
            filePath,
          );
          uploadedFiles.push({
            server_filename: uploaded.server_filename,
            filename: path.basename(filePath),
          });
        }

        await processFiles(
          taskInfo.server,
          taskInfo.task,
          token,
          "merge",
          uploadedFiles,
        );
        await downloadResult(
          taskInfo.server,
          taskInfo.task,
          token,
          args.output_path as string,
        );
        await deleteTask(taskInfo.server, taskInfo.task, token);

        return {
          content: [
            {
              type: "text",
              text: `PDFs merged successfully!\nOutput: ${args.output_path}\nFiles merged: ${(args.file_paths as string[]).length}`,
            },
          ],
        };
      }

      case "split_pdf": {
        const options: Record<string, unknown> = {
          split_mode: args.mode || "ranges",
        };
        if (args.ranges) options.ranges = args.ranges;
        if (args.fixed_range) options.fixed_range = args.fixed_range;
        if (args.remove_pages) options.remove_pages = args.remove_pages;

        const result = await processPDF(
          "split",
          args.file_path as string,
          args.output_path as string,
          options,
        );
        return {
          content: [
            {
              type: "text",
              text: `PDF split successfully!\nOutput: ${result.output_path}`,
            },
          ],
        };
      }

      case "pdf_to_jpg": {
        const result = await processPDF(
          "pdfjpg",
          args.file_path as string,
          args.output_path as string,
          {
            pdfjpg_mode: args.mode || "pages",
          },
        );
        return {
          content: [
            {
              type: "text",
              text: `PDF converted to JPG!\nOutput: ${result.output_path}`,
            },
          ],
        };
      }

      case "jpg_to_pdf": {
        const auth = getAuth();
        const token = await getToken(auth);
        const taskInfo = await startTask("imagepdf", token);
        const path = await import("path");

        const uploadedFiles = [];
        for (const filePath of args.file_paths as string[]) {
          const uploaded = await uploadFile(
            taskInfo.server,
            taskInfo.task,
            token,
            filePath,
          );
          uploadedFiles.push({
            server_filename: uploaded.server_filename,
            filename: path.basename(filePath),
          });
        }

        await processFiles(
          taskInfo.server,
          taskInfo.task,
          token,
          "imagepdf",
          uploadedFiles,
          {
            orientation: args.orientation || "portrait",
            margin: args.margin || 0,
            pagesize: args.page_size || "fit",
            merge_after: true,
          },
        );
        await downloadResult(
          taskInfo.server,
          taskInfo.task,
          token,
          args.output_path as string,
        );
        await deleteTask(taskInfo.server, taskInfo.task, token);

        return {
          content: [
            {
              type: "text",
              text: `Images converted to PDF!\nOutput: ${args.output_path}`,
            },
          ],
        };
      }

      case "unlock_pdf": {
        const files = [
          {
            server_filename: "",
            filename: "",
            password: args.password as string,
          },
        ];
        const result = await processPDF(
          "unlock",
          args.file_path as string,
          args.output_path as string,
          {},
          files,
        );
        return {
          content: [
            {
              type: "text",
              text: `PDF unlocked successfully!\nOutput: ${result.output_path}`,
            },
          ],
        };
      }

      case "protect_pdf": {
        const result = await processPDF(
          "protect",
          args.file_path as string,
          args.output_path as string,
          {
            password: args.password,
          },
        );
        return {
          content: [
            {
              type: "text",
              text: `PDF protected successfully!\nOutput: ${result.output_path}`,
            },
          ],
        };
      }

      case "rotate_pdf": {
        const files = [
          {
            server_filename: "",
            filename: "",
            rotate: args.rotation as number,
          },
        ];
        const result = await processPDF(
          "rotate",
          args.file_path as string,
          args.output_path as string,
          {},
          files,
        );
        return {
          content: [
            {
              type: "text",
              text: `PDF rotated successfully!\nOutput: ${result.output_path}`,
            },
          ],
        };
      }

      case "watermark_pdf": {
        const result = await processPDF(
          "watermark",
          args.file_path as string,
          args.output_path as string,
          {
            mode: args.mode || "text",
            text: args.text,
            font_size: args.font_size || 14,
            font_color: args.font_color || "#000000",
            transparency: args.transparency || 100,
            rotation: args.rotation || 0,
            vertical_position: args.position || "middle",
            horizontal_position: "center",
          },
        );
        return {
          content: [
            {
              type: "text",
              text: `Watermark added successfully!\nOutput: ${result.output_path}`,
            },
          ],
        };
      }

      case "page_numbers": {
        const result = await processPDF(
          "pagenumber",
          args.file_path as string,
          args.output_path as string,
          {
            starting_number: args.starting_number || 1,
            vertical_position: args.vertical_position || "bottom",
            horizontal_position: args.horizontal_position || "center",
            font_size: args.font_size || 14,
            font_color: args.font_color || "#000000",
          },
        );
        return {
          content: [
            {
              type: "text",
              text: `Page numbers added successfully!\nOutput: ${result.output_path}`,
            },
          ],
        };
      }

      case "pdf_to_word": {
        const result = await processPDF(
          "extract",
          args.file_path as string,
          args.output_path as string,
        );
        return {
          content: [
            {
              type: "text",
              text: `PDF converted to Word!\nOutput: ${result.output_path}`,
            },
          ],
        };
      }

      case "office_to_pdf": {
        const result = await processPDF(
          "officepdf",
          args.file_path as string,
          args.output_path as string,
        );
        return {
          content: [
            {
              type: "text",
              text: `Office file converted to PDF!\nOutput: ${result.output_path}`,
            },
          ],
        };
      }

      case "pdf_ocr": {
        const result = await processPDF(
          "pdfocr",
          args.file_path as string,
          args.output_path as string,
          {
            ocr_languages: args.languages || ["eng"],
          },
        );
        return {
          content: [
            {
              type: "text",
              text: `OCR applied successfully!\nOutput: ${result.output_path}`,
            },
          ],
        };
      }

      case "repair_pdf": {
        const result = await processPDF(
          "repair",
          args.file_path as string,
          args.output_path as string,
        );
        return {
          content: [
            {
              type: "text",
              text: `PDF repaired successfully!\nOutput: ${result.output_path}`,
            },
          ],
        };
      }

      case "compress_image": {
        const result = await processImage(
          "compressimage",
          args.file_path as string,
          args.output_path as string,
          {
            compression_level: args.compression_level || "recommended",
          },
        );
        return {
          content: [
            {
              type: "text",
              text: `Image compressed successfully!\nOutput: ${result.output_path}`,
            },
          ],
        };
      }

      case "resize_image": {
        const options: Record<string, unknown> = {
          resize_mode: args.resize_mode || "pixels",
          maintain_ratio: args.maintain_ratio !== false,
        };
        if (args.resize_mode === "percentage" && args.percentage) {
          options.percentage = args.percentage;
        } else {
          if (args.width) options.pixels_width = args.width;
          if (args.height) options.pixels_height = args.height;
        }

        const result = await processImage(
          "resizeimage",
          args.file_path as string,
          args.output_path as string,
          options,
        );
        return {
          content: [
            {
              type: "text",
              text: `Image resized successfully!\nOutput: ${result.output_path}`,
            },
          ],
        };
      }

      case "convert_image": {
        const result = await processImage(
          "convertimage",
          args.file_path as string,
          args.output_path as string,
          {
            to: args.to_format || "jpg",
          },
        );
        return {
          content: [
            {
              type: "text",
              text: `Image converted successfully!\nOutput: ${result.output_path}`,
            },
          ],
        };
      }

      case "remove_background": {
        const result = await processImage(
          "removebackgroundimage",
          args.file_path as string,
          args.output_path as string,
        );
        return {
          content: [
            {
              type: "text",
              text: `Background removed successfully!\nOutput: ${result.output_path}`,
            },
          ],
        };
      }

      case "upscale_image": {
        const result = await processImage(
          "upscaleimage",
          args.file_path as string,
          args.output_path as string,
          {
            multiplier: args.multiplier || 2,
          },
        );
        return {
          content: [
            {
              type: "text",
              text: `Image upscaled successfully!\nOutput: ${result.output_path}`,
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
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
