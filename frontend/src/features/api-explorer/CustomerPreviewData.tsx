import { CopyTextButton } from "./CopyTextButton";
import type { PreviewCustomer } from "./catalog";

export type PreviewFormat = "Tabel" | "JSON";

export function JsonCode({ text }: { text: string }) {
  // The capture keeps every token in place; unstyled parts retain the original whitespace.
  const parts = text.split(/("(?:\\.|[^"\\])*"|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?|true|false|null)/g);
  return <code>{parts.map((token, index) => {
    if (index % 2 === 0) return token;
    let kind = "literal";
    if (token.startsWith('"')) {
      kind = parts[index + 1].startsWith(":") ? "key" : "string";
    }
    return <span key={index} className={`json-${kind}`}>{token}</span>;
  })}</code>;
}

export function CustomerPreviewData({ rows, format, resource = "customer" }: {
  rows: PreviewCustomer[];
  format: PreviewFormat;
  resource?: "customer" | "item";
}) {
  if (format === "JSON") {
    const text = JSON.stringify(rows, null, 2);
    return <>
      <CopyTextButton text={text} label="Salin JSON" />
      <pre className="preview-json"><JsonCode text={text} /></pre>
    </>;
  }
  if (rows.length === 0) return null;

  return (
    <table aria-label={`Contoh data ${resource}`}>
      <thead><tr><th scope="col">id</th><th scope="col">number</th><th scope="col">displayName</th></tr></thead>
      <tbody>{rows.map(row => (
        <tr key={row.id}><td>{row.id}</td><td>{row.number}</td><td>{row.displayName}</td></tr>
      ))}</tbody>
    </table>
  );
}
