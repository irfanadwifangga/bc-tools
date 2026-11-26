export function PageHeader({ title, description, titleId, align = "center" }: {
  title: string;
  description?: string;
  titleId: string;
  align?: "center" | "start";
}) {
  return (
    <header className={align === "center" ? "page-header page-header--center" : "page-header"}>
      <h1 id={titleId} className="workspace-title">{title}</h1>
      {description && <p className="page-header-description">{description}</p>}
    </header>
  );
}
