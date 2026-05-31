/**
 * Escapes a string for CSV format.
 * Quotes the string if it contains commas, newlines, or double quotes.
 * Double quotes are escaped by doubling them (e.g. " becomes "").
 */
export function escapeCsvCell(cell: unknown): string {
    if (cell === null || cell === undefined) return "";

    const text = String(cell);

    if (text.includes(",") || text.includes('"') || text.includes("\n") || text.includes("\r")) {
        return `"${text.replace(/"/g, '""')}"`;
    }

    return text;
}

/**
 * Converts an array of objects to a CSV string.
 */
export function generateCsv<T extends Record<string, unknown>>(
    data: T[],
    headers: { key: keyof T; label: string }[]
): string {
    if (!data || data.length === 0) return "";

    // Generate header row
    const headerRow = headers.map((h) => escapeCsvCell(h.label)).join(",");

    // Generate data rows
    const rows = data.map((item) => {
        return headers
            .map((header) => {
                const val = item[header.key];
                // Special case for arrays (like matchedSkills / missingSkills)
                if (Array.isArray(val)) {
                    return escapeCsvCell(val.join("; "));
                }
                return escapeCsvCell(val);
            })
            .join(",");
    });

    return [headerRow, ...rows].join("\n");
}
