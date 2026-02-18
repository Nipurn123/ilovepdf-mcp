import { ToolDefinition, ILovePDFClient } from "../types.js";
import * as path from "path";

export const signatureTools: ToolDefinition[] = [
  {
    name: "create_signature_request",
    description:
      "Create an e-signature request for PDF documents. Sends email to signers.",
    inputSchema: {
      type: "object",
      properties: {
        public_key: { type: "string", description: "iLovePDF public key" },
        secret_key: { type: "string", description: "iLovePDF secret key" },
        files: {
          type: "array",
          items: { type: "string" },
          description: "Paths to PDF files to be signed (max 5)",
        },
        signers: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string", description: "Signer full name" },
              email: { type: "string", description: "Signer email address" },
            },
            required: ["name", "email"],
          },
          description: "List of signers (max 50)",
        },
        subject: { type: "string", description: "Email subject" },
        message: { type: "string", description: "Email message body" },
        expiration_days: {
          type: "integer",
          default: 15,
          description: "Days until signature request expires",
        },
        reminders: {
          type: "boolean",
          default: true,
          description: "Send automatic reminders",
        },
      },
      required: ["public_key", "secret_key", "files", "signers"],
    },
    handler: async (args, client) => {
      const taskInfo = await client.startTask("sign");
      const files = args.files as string[];

      const uploadedFiles = [];
      for (const file of files) {
        const uploaded = await client.uploadFile(
          taskInfo.server,
          taskInfo.task,
          file,
        );
        uploadedFiles.push({
          server_filename: uploaded.server_filename,
          filename: path.basename(file),
        });
      }

      const signers = (
        args.signers as Array<{ name: string; email: string }>
      ).map((s, i) => ({
        name: s.name,
        email: s.email,
        order: i + 1,
      }));

      const signatureToken = await client.createSignature({
        task: taskInfo.task,
        files: uploadedFiles,
        signers,
        subject: args.subject as string,
        message: args.message as string,
        expiration_days: (args.expiration_days as number) || 15,
        reminders: args.reminders !== false,
      });

      await client.deleteTask(taskInfo.server, taskInfo.task);

      return {
        content: [
          {
            type: "text",
            text: `Signature request created!\nToken: ${signatureToken}\nSigners: ${signers.length}\nFiles: ${files.length}`,
          },
        ],
      };
    },
  },

  {
    name: "list_signatures",
    description: "List all signature requests for your project.",
    inputSchema: {
      type: "object",
      properties: {
        public_key: { type: "string", description: "iLovePDF public key" },
        secret_key: { type: "string", description: "iLovePDF secret key" },
        page: { type: "integer", default: 1, description: "Page number" },
        status: {
          type: "string",
          enum: ["pending", "signed", "voided", "expired"],
          description: "Filter by status",
        },
      },
      required: ["public_key", "secret_key"],
    },
    handler: async (args, client) => {
      const signatures = await client.listSignatures({
        page: args.page ? (args.page as number) : 1,
        status: args.status as string,
      });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(signatures, null, 2),
          },
        ],
      };
    },
  },

  {
    name: "get_signature_status",
    description: "Get status and details of a signature request.",
    inputSchema: {
      type: "object",
      properties: {
        public_key: { type: "string", description: "iLovePDF public key" },
        secret_key: { type: "string", description: "iLovePDF secret key" },
        signature_token: {
          type: "string",
          description: "Signature request token",
        },
      },
      required: ["public_key", "secret_key", "signature_token"],
    },
    handler: async (args, client) => {
      const status = await client.getSignatureStatus(
        args.signature_token as string,
      );

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(status, null, 2),
          },
        ],
      };
    },
  },

  {
    name: "download_signed_files",
    description:
      "Download signed PDF files from a completed signature request.",
    inputSchema: {
      type: "object",
      properties: {
        public_key: { type: "string", description: "iLovePDF public key" },
        secret_key: { type: "string", description: "iLovePDF secret key" },
        signature_token: {
          type: "string",
          description: "Signature request token",
        },
        output: { type: "string", description: "Output file path" },
      },
      required: ["public_key", "secret_key", "signature_token", "output"],
    },
    handler: async (args, client) => {
      await client.downloadSignedFiles(
        args.signature_token as string,
        args.output as string,
      );

      return {
        content: [
          {
            type: "text",
            text: `Signed files downloaded to: ${args.output}`,
          },
        ],
      };
    },
  },

  {
    name: "void_signature",
    description: "Cancel/void a pending signature request.",
    inputSchema: {
      type: "object",
      properties: {
        public_key: { type: "string", description: "iLovePDF public key" },
        secret_key: { type: "string", description: "iLovePDF secret key" },
        signature_token: {
          type: "string",
          description: "Signature request token",
        },
      },
      required: ["public_key", "secret_key", "signature_token"],
    },
    handler: async (args, client) => {
      await client.voidSignature(args.signature_token as string);

      return {
        content: [
          {
            type: "text",
            text: `Signature request voided: ${args.signature_token}`,
          },
        ],
      };
    },
  },

  {
    name: "send_signature_reminder",
    description: "Send a reminder email to pending signers.",
    inputSchema: {
      type: "object",
      properties: {
        public_key: { type: "string", description: "iLovePDF public key" },
        secret_key: { type: "string", description: "iLovePDF secret key" },
        signature_token: {
          type: "string",
          description: "Signature request token",
        },
      },
      required: ["public_key", "secret_key", "signature_token"],
    },
    handler: async (args, client) => {
      await client.sendSignatureReminder(args.signature_token as string);

      return {
        content: [
          {
            type: "text",
            text: `Reminder sent for: ${args.signature_token}`,
          },
        ],
      };
    },
  },
];
