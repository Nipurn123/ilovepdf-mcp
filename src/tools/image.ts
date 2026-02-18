import { ToolDefinition, ILovePDFClient } from "../types.js";
import * as path from "path";

const imageKeyProps = {
  image_public_key: {
    type: "string",
    description: "iLoveIMG project public key (required for image tools)",
  },
  secret_key: { type: "string", description: "iLoveIMG secret key" },
};

export const imageTools: ToolDefinition[] = [
  {
    name: "compress_image",
    description:
      "Compress JPG, PNG, or GIF images to reduce file size. Requires iLoveIMG project keys.",
    inputSchema: {
      type: "object",
      properties: {
        ...imageKeyProps,
        file: { type: "string", description: "Path to image file or URL" },
        output: { type: "string", description: "Output file path" },
        compression_level: {
          type: "string",
          enum: ["low", "recommended", "extreme"],
          default: "recommended",
        },
      },
      required: ["image_public_key", "secret_key", "file", "output"],
    },
    handler: async (args, client) => {
      const taskInfo = await client.startTask("compressimage");
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
        "compressimage",
        [
          {
            server_filename: uploaded.server_filename,
            filename: path.basename(args.file!.toString()),
          },
        ],
        { compression_level: args.compression_level || "recommended" },
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
            text: `Image compressed successfully!\nOutput: ${args.output}`,
          },
        ],
      };
    },
  },

  {
    name: "resize_image",
    description:
      "Resize image by pixels or percentage. Maintains aspect ratio by default. Requires iLoveIMG project keys.",
    inputSchema: {
      type: "object",
      properties: {
        ...imageKeyProps,
        file: { type: "string", description: "Path to image file or URL" },
        output: { type: "string", description: "Output file path" },
        mode: {
          type: "string",
          enum: ["pixels", "percentage"],
          default: "pixels",
        },
        width: { type: "number", description: "Width in pixels" },
        height: { type: "number", description: "Height in pixels" },
        percentage: { type: "number", description: "Resize percentage" },
        maintain_ratio: { type: "boolean", default: true },
      },
      required: ["image_public_key", "secret_key", "file", "output"],
    },
    handler: async (args, client) => {
      const taskInfo = await client.startTask("resizeimage");
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
        resize_mode: args.mode || "pixels",
        maintain_ratio: args.maintain_ratio !== false,
      };

      if (args.mode === "percentage" && args.percentage) {
        options.percentage = args.percentage;
      } else {
        if (args.width) options.pixels_width = args.width;
        if (args.height) options.pixels_height = args.height;
      }

      await client.processFiles(
        taskInfo.server,
        taskInfo.task,
        "resizeimage",
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
            text: `Image resized successfully!\nOutput: ${args.output}`,
          },
        ],
      };
    },
  },

  {
    name: "convert_image",
    description:
      "Convert image to JPG, PNG, GIF, or HEIC format. Requires iLoveIMG project keys.",
    inputSchema: {
      type: "object",
      properties: {
        ...imageKeyProps,
        file: { type: "string", description: "Path to image file or URL" },
        output: {
          type: "string",
          description: "Output file path (include extension)",
        },
        to: {
          type: "string",
          enum: ["jpg", "png", "gif", "heic"],
          default: "jpg",
        },
      },
      required: ["image_public_key", "secret_key", "file", "output"],
    },
    handler: async (args, client) => {
      const taskInfo = await client.startTask("convertimage");
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
        "convertimage",
        [
          {
            server_filename: uploaded.server_filename,
            filename: path.basename(args.file!.toString()),
          },
        ],
        { to: args.to || "jpg" },
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
            text: `Image converted successfully!\nOutput: ${args.output}`,
          },
        ],
      };
    },
  },

  {
    name: "remove_background",
    description:
      "Remove background from image using AI. Outputs transparent PNG. Requires iLoveIMG project keys.",
    inputSchema: {
      type: "object",
      properties: {
        ...imageKeyProps,
        file: { type: "string", description: "Path to image file or URL" },
        output: { type: "string", description: "Output PNG file path" },
      },
      required: ["image_public_key", "secret_key", "file", "output"],
    },
    handler: async (args, client) => {
      const taskInfo = await client.startTask("removebackgroundimage");
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
        "removebackgroundimage",
        [
          {
            server_filename: uploaded.server_filename,
            filename: path.basename(args.file!.toString()),
          },
        ],
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
            text: `Background removed successfully!\nOutput: ${args.output}`,
          },
        ],
      };
    },
  },

  {
    name: "upscale_image",
    description:
      "Upscale image using AI. Supports 2x or 4x enlargement. Requires iLoveIMG project keys.",
    inputSchema: {
      type: "object",
      properties: {
        ...imageKeyProps,
        file: { type: "string", description: "Path to image file or URL" },
        output: { type: "string", description: "Output file path" },
        multiplier: {
          type: "number",
          enum: [2, 4],
          default: 2,
          description: "Upscale factor",
        },
      },
      required: ["image_public_key", "secret_key", "file", "output"],
    },
    handler: async (args, client) => {
      const taskInfo = await client.startTask("upscaleimage");
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
        "upscaleimage",
        [
          {
            server_filename: uploaded.server_filename,
            filename: path.basename(args.file!.toString()),
          },
        ],
        { multiplier: args.multiplier || 2 },
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
            text: `Image upscaled successfully!\nOutput: ${args.output}`,
          },
        ],
      };
    },
  },

  {
    name: "watermark_image",
    description:
      "Add text or image watermark to images. Requires iLoveIMG project keys.",
    inputSchema: {
      type: "object",
      properties: {
        ...imageKeyProps,
        file: { type: "string", description: "Path to image file or URL" },
        output: { type: "string", description: "Output file path" },
        text: { type: "string", description: "Watermark text" },
        position: {
          type: "string",
          enum: [
            "Center",
            "North",
            "South",
            "East",
            "West",
            "NorthEast",
            "NorthWest",
            "SouthEast",
            "SouthWest",
          ],
          default: "Center",
        },
        font_size: { type: "number", default: 14 },
        font_color: { type: "string", default: "#000000" },
        transparency: {
          type: "number",
          default: 100,
          description: "Opacity 1-100",
        },
        rotation: { type: "number", default: 0, description: "Rotation 0-360" },
      },
      required: ["image_public_key", "secret_key", "file", "output", "text"],
    },
    handler: async (args, client) => {
      const taskInfo = await client.startTask("watermarkimage");
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
        "watermarkimage",
        [
          {
            server_filename: uploaded.server_filename,
            filename: path.basename(args.file!.toString()),
          },
        ],
        {
          elements: [
            {
              type: "text",
              text: args.text,
              gravity: args.position || "Center",
              font_size: args.font_size || 14,
              font_color: args.font_color || "#000000",
              transparency: args.transparency || 100,
              rotation: args.rotation || 0,
              x_pos_percent: 50,
              y_pos_percent: 50,
              width_percent: 100,
              height_percent: 100,
            },
          ],
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
];
