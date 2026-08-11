// Minimal TOML serializer for models.dev-compatible model files.
// Supports strings, numbers, booleans, string arrays, and flat tables.

type TomlValue = string | number | boolean | string[];

export function tomlString(value: string): string {
  return JSON.stringify(value); // valid TOML basic string for our field set
}

function renderValue(value: TomlValue): string {
  if (typeof value === "string") return tomlString(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") return String(value);
  return `[${value.map((v) => tomlString(v)).join(", ")}]`;
}

export function toml(
  entries: Array<[string, TomlValue]>,
  tables: Record<string, Array<[string, TomlValue]>> = {},
  rawLines: string[] = [],
): string {
  const lines: string[] = [];
  for (const [key, value] of entries) {
    lines.push(`${key} = ${renderValue(value)}`);
  }
  for (const raw of rawLines) {
    lines.push(raw);
  }
  for (const [name, fields] of Object.entries(tables)) {
    if (fields.length === 0) continue;
    lines.push("");
    lines.push(`[${name}]`);
    for (const [key, value] of fields) {
      lines.push(`${key} = ${renderValue(value)}`);
    }
  }
  return `${lines.join("\n")}\n`;
}
