# iLovePDF MCP Server

A modular MCP server for iLovePDF and iLoveIMG APIs. 35+ tools organized by category.

[![npm version](https://img.shields.io/npm/v/ilovepdf-mcp.svg)](https://www.npmjs.com/package/ilovepdf-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![MCP](https://img.shields.io/badge/Model%20Context%20Protocol-1.0-blue)](https://modelcontextprotocol.io)

## Features

- ✅ **Modular Architecture** - Tools organized by category in separate files
- ✅ **35+ Tools** for PDF and image processing
- ✅ **PDF Tools**: Core, Convert, Edit, Security
- ✅ **Image Tools**: Compress, Resize, Convert, Remove Background, Upscale
- ✅ **Signature Tools**: Create, manage, and download e-signatures
- ✅ **Chain Operations** - Connect multiple operations without re-uploading
- ✅ **Environment Variables** - Set keys globally via `ILOVEPDF_PUBLIC_KEY` and `ILOVEPDF_SECRET_KEY`
- ✅ **URL Support** - Process files from URLs

## Modular Structure

```
src/
├── index.ts          # Main server entry
├── types.ts          # Types and ILovePDFClient
└── tools/
    ├── core.ts       # compress, merge, split, rotate, repair
    ├── convert.ts    # pdf↔jpg, html→pdf, office→pdf, pdf→pdfa
    ├── edit.ts       # watermark, page_numbers, ocr, extract_text
    ├── security.ts   # protect, unlock
    ├── image.ts      # compress, resize, convert, remove_bg, upscale
    ├── signature.ts  # create, list, status, download, void, remind
    ├── chain.ts      # chain_tasks
    └── utility.ts    # check_credits, validate_pdfa
```

## Installation

Add to your MCP config:

```json
{
  "mcpServers": {
    "ilovepdf": {
      "command": "npx",
      "args": ["-y", "ilovepdf-mcp"],
      "env": {
        "ILOVEPDF_PUBLIC_KEY": "your_public_key",
        "ILOVEPDF_SECRET_KEY": "your_secret_key"
      }
    }
  }
}
```

Or provide keys per-request (see examples below).

## Tools by Category

### Core Operations (5 tools)

| Tool           | Description           |
| -------------- | --------------------- |
| `compress_pdf` | Reduce PDF file size  |
| `merge_pdf`    | Combine multiple PDFs |
| `split_pdf`    | Split by pages/ranges |
| `rotate_pdf`   | Rotate PDF pages      |
| `repair_pdf`   | Fix damaged PDFs      |

### Conversion (5 tools)

| Tool            | Description          |
| --------------- | -------------------- |
| `pdf_to_jpg`    | PDF → Images         |
| `jpg_to_pdf`    | Images → PDF         |
| `html_to_pdf`   | Webpage → PDF        |
| `office_to_pdf` | Word/Excel/PPT → PDF |
| `pdf_to_pdfa`   | PDF → Archive format |

### Edit (4 tools)

| Tool            | Description                  |
| --------------- | ---------------------------- |
| `watermark_pdf` | Add text/image watermark     |
| `page_numbers`  | Add page numbers             |
| `ocr_pdf`       | Make scanned PDFs searchable |
| `extract_text`  | Extract text from PDF        |

### Security (2 tools)

| Tool          | Description             |
| ------------- | ----------------------- |
| `protect_pdf` | Add password protection |
| `unlock_pdf`  | Remove password         |

### Image (6 tools)

| Tool                | Description             |
| ------------------- | ----------------------- |
| `compress_image`    | Reduce image size       |
| `resize_image`      | Resize by pixels/%      |
| `convert_image`     | Format conversion       |
| `remove_background` | AI background removal   |
| `upscale_image`     | AI 2x/4x upscale        |
| `watermark_image`   | Add watermark to images |

### Signature (6 tools)

| Tool                       | Description                 |
| -------------------------- | --------------------------- |
| `create_signature_request` | Create e-signature request  |
| `list_signatures`          | List all signature requests |
| `get_signature_status`     | Get status of a request     |
| `download_signed_files`    | Download signed PDFs        |
| `void_signature`           | Cancel a pending request    |
| `send_signature_reminder`  | Send reminder to signers    |

### Chain Operations (1 tool)

| Tool          | Description                                   |
| ------------- | --------------------------------------------- |
| `chain_tasks` | Connect multiple operations without re-upload |

### Utility (2 tools)

| Tool            | Description               |
| --------------- | ------------------------- |
| `check_credits` | Check API quota           |
| `validate_pdfa` | Validate PDF/A compliance |

## Prerequisites

**Important:** You need **separate projects** at [iLoveAPI Projects](https://www.iloveapi.com/user/projects):

1. **PDF Project** - For all PDF tools (18 tools) - Select "PDF REST API"
2. **Image Project** - For image tools (6 tools) - Select "Image REST API"
3. **Signature Project** - For signature tools (6 tools) - Select "Signature REST API"

Free tier: 250 files/month per project.

## Usage

### With Environment Variables

Set once in your MCP config and all tools will use them automatically:

```json
{
  "mcpServers": {
    "ilovepdf": {
      "command": "npx",
      "args": ["-y", "ilovepdf-mcp"],
      "env": {
        "ILOVEPDF_PUBLIC_KEY": "your_public_key",
        "ILOVEPDF_SECRET_KEY": "your_secret_key"
      }
    }
  }
}
```

### Example: Compress PDF

```json
{
  "name": "compress_pdf",
  "arguments": {
    "file": "/path/to/input.pdf",
    "output": "/path/to/output.pdf",
    "compression_level": "recommended"
  }
}
```

### Example: Merge PDFs

```json
{
  "name": "merge_pdf",
  "arguments": {
    "files": ["/path/to/file1.pdf", "/path/to/file2.pdf"],
    "output": "/path/to/merged.pdf"
  }
}
```

### Example: Remove Background from Image

```json
{
  "name": "remove_background",
  "arguments": {
    "image_public_key": "your_image_project_public_key",
    "secret_key": "your_secret_key",
    "file": "/path/to/image.jpg",
    "output": "/path/to/output.png"
  }
}
```

### Example: Chain Operations

Chain multiple PDF operations without re-uploading. The parent task ID is returned in tool responses:

1. First, run a PDF tool (e.g., `compress_pdf`) - it returns a `Task ID`
2. Use that Task ID to chain to the next operation:

```json
{
  "name": "chain_tasks",
  "arguments": {
    "parent_task": "g27d4mrsg3ztmnzAgm5d...",
    "next_tool": "watermark"
  }
}
```

3. After chaining, process the new task with the returned files

### Example: Create Signature Request

```json
{
  "name": "create_signature_request",
  "arguments": {
    "files": ["/path/to/contract.pdf"],
    "signers": [{ "name": "John Doe", "email": "john@example.com" }],
    "subject": "Please sign this document",
    "expiration_days": 15
  }
}
```

## Development

```bash
git clone https://github.com/Nipurn123/ilovepdf-mcp.git
cd ilovepdf-mcp
npm install
npm run build
```

## License

MIT © 2026
