import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";

export type SupportedFileType = "pdf" | "docx" | "doc";

export const ALLOWED_EXTENSIONS: SupportedFileType[] = ["pdf", "docx", "doc"];

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

/** Map a filename to its supported type, or null if unsupported. */
export function getFileType(filename: string): SupportedFileType | null {
    const ext = filename.split(".").pop()?.toLowerCase();
    if (ext === "pdf") return "pdf";
    if (ext === "docx") return "docx";
    if (ext === "doc") return "doc";
    return null;
}

/** Extract plain text from a Buffer for the given file type. */
export async function extractTextFromBuffer(
    buffer: Buffer,
    fileType: SupportedFileType,
): Promise<string> {
    switch (fileType) {
        case "pdf": {
            // pdf-parse v2+ uses PDFParse class (no default export in ESM)
            const parser = new PDFParse({ data: buffer });
            const result = await parser.getText();
            return result.text.trim();
        }
        case "docx":
        case "doc": {
            const result = await mammoth.extractRawText({ buffer });
            if (result.messages.length > 0) {
                const warnings = result.messages
                    .filter((m) => m.type === "warning")
                    .map((m) => m.message)
                    .join("; ");
                if (warnings) console.warn(`[extract-text] mammoth warnings: ${warnings}`);
            }
            return result.value.trim();
        }
        default: {
            const _exhaustive: never = fileType;
            throw new Error(`Unsupported file type: ${_exhaustive}`);
        }
    }
}

/** Sanitize a filename for safe storage on disk. */
export function sanitizeFileName(name: string): string {
    return name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
}
