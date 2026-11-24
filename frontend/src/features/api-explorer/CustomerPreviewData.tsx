import type { PreviewCustomer } from "./catalog";

export type PreviewFormat = "Tabel" | "JSON";

export function CustomerPreviewData({ rows, format }: {
  rows: PreviewCustomer[];
  format: PreviewFormat;
}) {
  if (format === "JSON") {
    return <pre className="preview-json"><code>{JSON.stringify(rows, null, 2)}</code></pre>;
  }
  if (rows.length === 0) return null;

  return (
    <table aria-label="Contoh data customer">
      <thead><tr><th scope="col">id</th><th scope="col">number</th><th scope="col">displayName</th></tr></thead>
      <tbody>{rows.map(row => (
        <tr key={row.id}><td>{row.id}</td><td>{row.number}</td><td>{row.displayName}</td></tr>
      ))}</tbody>
    </table>
  );
}
