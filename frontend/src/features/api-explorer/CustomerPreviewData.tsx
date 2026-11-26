import { CopyTextButton } from "./CopyTextButton";
import { PREVIEW_FIELDS, type PreviewCustomer, type PreviewField } from "./catalog";

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

export function CustomerPreviewData({ rows, format, resource = "customer", fields = PREVIEW_FIELDS }: {
  rows: PreviewCustomer[];
  format: PreviewFormat;
  resource?: "customer" | "item";
  fields?: readonly PreviewField[];
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
    <div className="preview-table-scroll">
      <table aria-label={`Contoh data ${resource}`}>
        <thead><tr>{fields.map(field => <th key={field} scope="col">{field}</th>)}</tr></thead>
        <tbody>{rows.map((row, index) => (
          <tr key={row.id ?? index}>{fields.map(field => <td key={field}>{row[field]}</td>)}</tr>
        ))}</tbody>
      </table>
    </div>
  );
}
