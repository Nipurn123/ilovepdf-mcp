# iLovePDF MCP Server 📄

A comprehensive MCP server for iLovePDF, iLoveIMG, and iLoveSign APIs. Process PDFs and images with 20+ tools.

[![npm version](https://img.shields.io/npm/v/ilovepdf-mcp.svg)](https://www.npmjs.com/package/ilovepdf-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![MCP](https://img.shields.io/badge/Model%20Context%20Protocol-1.0-blue)](https://modelcontextprotocol.io)

## Features

- ✅ **20+ Tools** for PDF and image processing
- ✅ **PDF Tools**: Compress, merge, split, convert, protect, unlock, watermark, OCR, and more
- ✅ **Image Tools**: Compress, resize, convert, remove background, upscale
- ✅ **Full API Coverage** - All iLovePDF/iLoveIMG tools supported
- ✅ **Simple Integration** - Just add your API keys

## Prerequisites

1. Get free API keys from [iLovePDF Developer Portal](https://developer.ilovepdf.com)
2. Free tier: 250 files/month

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

## Available Tools

### Authentication

| Tool            | Description          |
| --------------- | -------------------- |
| `ilovepdf_auth` | Test API credentials |

### PDF Tools

| Tool            | Description                   |
| --------------- | ----------------------------- |
| `compress_pdf`  | Reduce PDF file size          |
| `merge_pdf`     | Combine multiple PDFs         |
| `split_pdf`     | Split PDF by pages/ranges     |
| `pdf_to_jpg`    | Convert PDF pages to images   |
| `jpg_to_pdf`    | Convert images to PDF         |
| `unlock_pdf`    | Remove PDF password           |
| `protect_pdf`   | Add password protection       |
| `rotate_pdf`    | Rotate PDF pages              |
| `watermark_pdf` | Add text/image watermark      |
| `page_numbers`  | Add page numbers              |
| `pdf_to_word`   | Convert PDF to DOCX           |
| `office_to_pdf` | Convert Word/Excel/PPT to PDF |
| `pdf_ocr`       | Make scanned PDFs searchable  |
| `repair_pdf`    | Fix damaged PDFs              |

### Image Tools

| Tool                | Description                    |
| ------------------- | ------------------------------ |
| `compress_image`    | Reduce image file size         |
| `resize_image`      | Resize by pixels or percentage |
| `convert_image`     | Convert to JPG/PNG/GIF/HEIC    |
| `remove_background` | Remove image background (AI)   |
| `upscale_image`     | Upscale 2x or 4x (AI)          |

## Usage Examples

### Compress PDF

```json
{
  "name": "compress_pdf",
  "arguments": {
    "public_key": "your_public_key",
    "secret_key": "your_secret_key",
    "file_path": "/path/to/input.pdf",
    "output_path": "/path/to/output.pdf",
    "compression_level": "recommended"
  }
}
```

### Merge PDFs

```json
{
  "name": "merge_pdf",
  "arguments": {
    "public_key": "your_public_key",
    "secret_key": "your_secret_key",
    "file_paths": ["/path/to/file1.pdf", "/path/to/file2.pdf"],
    "output_path": "/path/to/merged.pdf"
  }
}
```

### Split PDF

```json
{
  "name": "split_pdf",
  "arguments": {
    "public_key": "your_public_key",
    "secret_key": "your_secret_key",
    "file_path": "/path/to/input.pdf",
    "output_path": "/path/to/output.zip",
    "mode": "ranges",
    "ranges": "1-5,6-10,11-15"
  }
}
```

### Remove Background from Image

```json
{
  "name": "remove_background",
  "arguments": {
    "public_key": "your_public_key",
    "secret_key": "your_secret_key",
    "file_path": "/path/to/input.jpg",
    "output_path": "/path/to/output.png"
  }
}
```

## Parameters Reference

### Compression Levels

- `low` - Minimal compression, highest quality
- `recommended` - Balanced compression (default)
- `extreme` - Maximum compression

### OCR Languages

Supported: `eng`, `spa`, `fra`, `deu`, `ita`, `por`, `chi_sim`, `jpn`, `kor`, `ara`, `rus`, etc.

### Image Formats

- Input: JPG, PNG, GIF, WEBP, HEIC, RAW
- Output: JPG, PNG, GIF, HEIC

## Error Handling

All tools return structured error messages:

```json
{
  "content": [
    {
      "type": "text",
      "text": "Error: Upload failed: 401 - Invalid API key"
    }
  ],
  "isError": true
}
```

## Rate Limits

- **Free Tier**: 250 files/month
- **Paid Tiers**: See [iLovePDF Pricing](https://developer.ilovepdf.com/pricing)

## Development

```bash
git clone https://github.com/opencode-ai/ilovepdf-mcp.git
cd ilovepdf-mcp
npm install
npm run build
```

## Related Projects

- [DuckDuckGo MCP](https://github.com/Nipurn123/duckduckgo-mcp) - Free web search MCP

## License

MIT © 2026
