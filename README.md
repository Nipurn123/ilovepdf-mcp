# iLovePDF MCP Server 📄🖼️

A modular MCP server for iLovePDF and iLoveIMG APIs. 25+ tools organized by category.

[![npm version](https://img.shields.io/npm/v/ilovepdf-mcp.svg)](https://www.npmjs.com/package/ilovepdf-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![MCP](https://img.shields.io/badge/Model%20Context%20Protocol-1.0-blue)](https://modelcontextprotocol.io)

## Features

- ✅ **Modular Architecture** - Tools organized by category in separate files
- ✅ **25+ Tools** for PDF and image processing
- ✅ **PDF Tools**: Core, Convert, Edit, Security
- ✅ **Image Tools**: Compress, Resize, Convert, Remove Background, Upscale
- ✅ **URL Support** - Process files from URLs
- ✅ **Simple Auth** - Per-request API keys

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
    └── utility.ts    # check_credits, validate_pdfa
```

## Installation

Add to your MCP config:

```json
{
  "mcpServers": {
    "ilovepdf": {
      "command": "npx",
      "args": ["-y", "ilovepdf-mcp"]
    }
  }
}
```

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

### Utility (2 tools)

| Tool            | Description               |
| --------------- | ------------------------- |
| `check_credits` | Check API quota           |
| `validate_pdfa` | Validate PDF/A compliance |

## Prerequisites

**Important:** You need **two separate projects** at [iLoveAPI Projects](https://www.iloveapi.com/user/projects):

1. **PDF Project** - For all PDF tools (18 tools)
2. **Image Project** - For image tools (6 tools) - Create an "iLoveIMG" project

Free tier: 250 files/month per project.

## Usage

Use your **PDF project** keys for PDF tools, and **Image project** keys for image tools.

### Example: Compress PDF

```json
{
  "name": "compress_pdf",
  "arguments": {
    "public_key": "your_public_key",
    "secret_key": "your_secret_key",
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
    "public_key": "your_public_key",
    "secret_key": "your_secret_key",
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
    "public_key": "your_public_key",
    "secret_key": "your_secret_key",
    "file": "/path/to/image.jpg",
    "output": "/path/to/output.png"
  }
}
```

## Comparison with adamdavis99/ilovepdf-mcp

| Feature                   | This Repo      | adamdavis99 |
| ------------------------- | -------------- | ----------- |
| **Modular Structure**     | ✅ Yes         | ❌ No       |
| **Image Tools**           | ✅ 6 tools     | ❌ None     |
| **Chain Operations**      | ❌ No          | ✅ Yes      |
| **Signature Tools**       | ❌ No          | ✅ Yes      |
| **Environment Variables** | ❌ Per-request | ✅ .env     |

## Development

```bash
git clone https://github.com/Nipurn123/ilovepdf-mcp.git
cd ilovepdf-mcp
npm install
npm run build
```

## License

MIT © 2026
