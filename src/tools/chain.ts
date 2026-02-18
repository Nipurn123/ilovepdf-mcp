import { ToolDefinition, ILovePDFClient } from "../types.js";

export const chainTools: ToolDefinition[] = [
  {
    name: "chain_tasks",
    description:
      "Chain multiple PDF operations together. The output of one task becomes input for the next, avoiding re-upload. Returns a task ID that can be used for subsequent operations.",
    inputSchema: {
      type: "object",
      properties: {
        public_key: { type: "string", description: "iLovePDF public key" },
        secret_key: { type: "string", description: "iLovePDF secret key" },
        parent_task: {
          type: "string",
          description: "Task ID from a previous operation",
        },
        next_tool: {
          type: "string",
          enum: [
            "compress",
            "merge",
            "split",
            "rotate",
            "repair",
            "pdfjpg",
            "imagepdf",
            "officepdf",
            "pdfa",
            "watermark",
            "pagenumber",
            "protect",
            "unlock",
            "pdfocr",
            "extract",
            "htmlpdf",
          ],
          description: "Next tool to apply",
        },
      },
      required: ["public_key", "secret_key", "parent_task", "next_tool"],
    },
    handler: async (args, client) => {
      const chainedTask = await client.connectTask(
        args.parent_task as string,
        args.next_tool as string,
      );

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                message: "Task chained successfully",
                new_task: chainedTask.task,
                server: chainedTask.server,
                files: chainedTask.files,
              },
              null,
              2,
            ),
          },
        ],
      };
    },
  },
];
