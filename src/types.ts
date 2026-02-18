import { z } from "zod";
import FormData from "form-data";
import fetch, { RequestInit } from "node-fetch";
import * as fs from "fs";

export const AuthSchema = z.object({
  public_key: z.string(),
  secret_key: z.string(),
});

export type Auth = z.infer<typeof AuthSchema>;

export interface TaskInfo {
  server: string;
  task: string;
  remaining_credits: number;
}

export interface UploadedFile {
  server_filename: string;
}

export interface ProcessResult {
  download_filename: string;
  filesize: number;
  output_filesize: number;
  output_filenumber: number;
  output_extensions: string[];
  timer: string;
  status: string;
}

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  handler: (
    args: Record<string, unknown>,
    client: ILovePDFClient,
  ) => Promise<{
    content: Array<{ type: string; text: string }>;
    isError?: boolean;
  }>;
}

const IMAGE_TOOLS = [
  "compressimage",
  "resizeimage",
  "convertimage",
  "removebackgroundimage",
  "upscaleimage",
  "watermarkimage",
  "cropimage",
  "rotateimage",
  "repairimage",
];

export class ILovePDFClient {
  private auth: Auth;
  private cachedToken: string | null = null;
  private tokenExpiry: number = 0;
  private apiBase: string;
  private isImageTool: boolean;

  constructor(
    publicKey: string,
    secretKey: string,
    isImageTool: boolean = false,
  ) {
    this.auth = { public_key: publicKey, secret_key: secretKey };
    this.apiBase = isImageTool
      ? "https://api.iloveimg.com"
      : "https://api.ilovepdf.com";
    this.isImageTool = isImageTool;
  }

  async getToken(): Promise<string> {
    if (this.cachedToken && Date.now() < this.tokenExpiry) {
      return this.cachedToken;
    }

    const response = await fetch(`${this.apiBase}/v1/auth`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ public_key: this.auth.public_key }),
    });

    if (!response.ok) {
      throw new Error(`Auth failed: ${response.status}`);
    }

    const data = (await response.json()) as { token: string };
    this.cachedToken = data.token;
    this.tokenExpiry = Date.now() + 2 * 60 * 60 * 1000 - 5 * 60 * 1000;
    return this.cachedToken;
  }

  async startTask(tool: string, region: string = "us"): Promise<TaskInfo> {
    const token = await this.getToken();
    // iLoveIMG only works with EU region
    const effectiveRegion = this.isImageTool ? "eu" : region;
    const response = await fetch(
      `${this.apiBase}/v1/start/${tool}/${effectiveRegion}`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      },
    );

    if (!response.ok) {
      throw new Error(`Start task failed: ${response.status}`);
    }

    return response.json() as Promise<TaskInfo>;
  }

  async uploadFile(
    server: string,
    task: string,
    filePath: string,
  ): Promise<UploadedFile> {
    const token = await this.getToken();
    const formData = new FormData();
    formData.append("task", task);
    formData.append("file", fs.createReadStream(filePath));

    const response = await fetch(`https://${server}/v1/upload`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        ...formData.getHeaders(),
      },
      body: formData as unknown as RequestInit["body"],
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.status}`);
    }

    return response.json() as Promise<UploadedFile>;
  }

  async uploadUrl(
    server: string,
    task: string,
    url: string,
  ): Promise<UploadedFile> {
    const token = await this.getToken();
    const formData = new FormData();
    formData.append("task", task);
    formData.append("cloud_file", url);

    const response = await fetch(`https://${server}/v1/upload`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        ...formData.getHeaders(),
      },
      body: formData as unknown as RequestInit["body"],
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.status}`);
    }

    return response.json() as Promise<UploadedFile>;
  }

  async processFiles(
    server: string,
    task: string,
    tool: string,
    files: Array<{
      server_filename: string;
      filename: string;
      password?: string;
      rotate?: number;
    }>,
    options: Record<string, unknown> = {},
  ): Promise<ProcessResult> {
    const token = await this.getToken();

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

  async downloadResult(
    server: string,
    task: string,
    outputPath: string,
  ): Promise<void> {
    const token = await this.getToken();

    const response = await fetch(`https://${server}/v1/download/${task}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      throw new Error(`Download failed: ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    await fs.promises.writeFile(outputPath, buffer);
  }

  async deleteTask(server: string, task: string): Promise<void> {
    const token = await this.getToken();
    await fetch(`https://${server}/v1/task/${task}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  async getRemainingCredits(): Promise<number> {
    const taskInfo = await this.startTask("compress");
    return taskInfo.remaining_credits;
  }

  async connectTask(
    parentTask: string,
    nextTool: string,
  ): Promise<{ task: string; server: string; files: Record<string, string> }> {
    const token = await this.getToken();
    const response = await fetch(`${this.apiBase}/v1/task/next`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ task: parentTask, tool: nextTool }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Connect task failed: ${response.status} - ${error}`);
    }

    return response.json() as Promise<{
      task: string;
      server: string;
      files: Record<string, string>;
    }>;
  }

  async createSignature(params: {
    task: string;
    files: Array<{ server_filename: string; filename: string }>;
    signers: Array<{ name: string; email: string; order: number }>;
    subject?: string;
    message?: string;
    expiration_days?: number;
    reminders?: boolean;
  }): Promise<string> {
    const token = await this.getToken();
    const response = await fetch(`${this.apiBase}/v1/signature`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        task: params.task,
        files: params.files,
        signers: params.signers,
        subject: params.subject,
        message: params.message,
        expiration_days: params.expiration_days || 15,
        reminders: params.reminders !== false,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Create signature failed: ${response.status} - ${error}`);
    }

    const data = (await response.json()) as { token: string };
    return data.token;
  }

  async listSignatures(params: {
    page?: number;
    status?: string;
  }): Promise<unknown> {
    const token = await this.getToken();
    const queryParams = new URLSearchParams();
    queryParams.append("secret_key", this.auth.secret_key);
    if (params.page) queryParams.append("page", params.page.toString());
    if (params.status) queryParams.append("status", params.status);

    const response = await fetch(
      `${this.apiBase}/v1/signature?${queryParams.toString()}`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      },
    );

    if (!response.ok) {
      throw new Error(`List signatures failed: ${response.status}`);
    }

    return response.json();
  }

  async getSignatureStatus(signatureToken: string): Promise<unknown> {
    const token = await this.getToken();
    const response = await fetch(
      `${this.apiBase}/v1/signature/${signatureToken}`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      },
    );

    if (!response.ok) {
      throw new Error(`Get signature failed: ${response.status}`);
    }

    return response.json();
  }

  async downloadSignedFiles(
    signatureToken: string,
    outputPath: string,
  ): Promise<void> {
    const token = await this.getToken();
    const response = await fetch(
      `${this.apiBase}/v1/signature/${signatureToken}/download`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      },
    );

    if (!response.ok) {
      throw new Error(`Download signed files failed: ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    await fs.promises.writeFile(outputPath, buffer);
  }

  async voidSignature(signatureToken: string): Promise<void> {
    const token = await this.getToken();
    const response = await fetch(
      `${this.apiBase}/v1/signature/${signatureToken}/void`,
      {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
      },
    );

    if (!response.ok) {
      throw new Error(`Void signature failed: ${response.status}`);
    }
  }

  async sendSignatureReminder(signatureToken: string): Promise<void> {
    const token = await this.getToken();
    const response = await fetch(
      `${this.apiBase}/v1/signature/${signatureToken}/remind`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      },
    );

    if (!response.ok) {
      throw new Error(`Send reminder failed: ${response.status}`);
    }
  }
}
