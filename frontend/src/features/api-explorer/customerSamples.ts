import {
  PREVIEW_FIELDS, selectedPreviewFields,
  type CatalogEntity, type PreviewField, type PreviewOrder, type PreviewQuery,
} from "./catalog";

export type SampleEndpoint = "customers" | "items";
export type SampleLanguage = "Python" | "C#";
export const DEFAULT_PREVIEW_LIMIT = 5;

const CSHARP_KEYWORDS = new Set([
  "abstract", "as", "base", "bool", "break", "byte", "case", "catch", "char", "checked",
  "class", "const", "continue", "decimal", "default", "delegate", "do", "double", "else",
  "enum", "event", "explicit", "extern", "false", "finally", "fixed", "float", "for",
  "foreach", "goto", "if", "implicit", "in", "int", "interface", "internal", "is", "lock",
  "long", "namespace", "new", "null", "object", "operator", "out", "override", "params",
  "private", "protected", "public", "readonly", "ref", "return", "sbyte", "sealed",
  "short", "sizeof", "stackalloc", "static", "string", "struct", "switch", "this", "throw",
  "true", "try", "typeof", "uint", "ulong", "unchecked", "unsafe", "ushort", "using",
  "virtual", "void", "volatile", "while",
]);

interface SampleOptions {
  endpoint: string;
  language: SampleLanguage;
  limit: number;
  order?: PreviewOrder;
  filter?: string;
  selected: readonly string[];
  count: boolean;
  typedStrings: boolean;
  isCustom: boolean;
  isCompanies: boolean;
}

export function getCodeSample(
  endpoint: SampleEndpoint, language: SampleLanguage, limit = DEFAULT_PREVIEW_LIMIT, order?: PreviewOrder,
  number?: string, fields: readonly PreviewField[] = PREVIEW_FIELDS, name?: string, count?: boolean,
): string {
  const filters: string[] = [];
  if (number?.trim()) filters.push("number eq '" + number.replaceAll("'", "''") + "'");
  if (name?.trim()) filters.push("contains(displayName,'" + name.trim().replaceAll("'", "''") + "')");
  const filter = filters.length ? filters.join(" and ") : undefined;
  const selected = fields.length ? fields : PREVIEW_FIELDS;
  return renderSample({
    endpoint,
    language,
    limit,
    order,
    filter,
    selected,
    count: Boolean(count),
    typedStrings: true,
    isCustom: false,
    isCompanies: false,
  });
}

export function getEntityCodeSample(
  entity: CatalogEntity, language: SampleLanguage, query?: PreviewQuery,
): string {
  if (entity.source !== "custom" && (entity.name === "customers" || entity.name === "items")) {
    return getCodeSample(
      entity.name,
      language,
      query?.limit,
      query?.order,
      query?.number,
      selectedPreviewFields(query?.fields),
      query?.name,
      query?.count,
    );
  }
  return renderSample({
    endpoint: entity.name,
    language,
    limit: DEFAULT_PREVIEW_LIMIT,
    selected: entity.fields.slice(0, DEFAULT_PREVIEW_LIMIT).map(field => field.name),
    count: false,
    typedStrings: false,
    isCustom: entity.source === "custom",
    isCompanies: entity.source !== "custom" && entity.name === "companies",
  });
}

function renderSample(options: SampleOptions): string {
  return options.language === "Python" ? renderPython(options) : renderCSharp(options);
}

function renderPython(options: SampleOptions): string {
  const { endpoint, limit, order, filter, selected, count, typedStrings, isCustom, isCompanies } = options;
  const lines = [
    "# Atur variabel BC_* untuk DEMO COMPANY sebelum menjalankan contoh.",
    "import json",
    "import os",
    "from uuid import UUID",
    "",
    "import httpx",
    "import msal",
    "",
    'if os.getenv("BC_ENVIRONMENT", "Sandbox").casefold() != "sandbox":',
    '    raise SystemExit("Contoh ini hanya untuk Sandbox.")',
    "",
    'tenant = UUID(os.environ["BC_TENANT_ID"])',
  ];
  if (!isCompanies) lines.push('company = UUID(os.environ["BC_COMPANY_ID"])');
  if (isCustom) lines.push('route = os.environ["BC_CUSTOM_API_ROUTE"].strip("/")');
  lines.push(
    'host = "https://api.businesscentral.dynamics.com"',
    "app = msal.ConfidentialClientApplication(",
    '    str(UUID(os.environ["BC_CLIENT_ID"])),',
    '    authority=f"https://login.microsoftonline.com/{tenant}",',
    '    client_credential=os.environ["BC_CLIENT_SECRET"],',
    ")",
    'result = app.acquire_token_for_client(scopes=[f"{host}/.default"])',
    'if "access_token" not in result:',
    '    raise SystemExit("Autentikasi aplikasi gagal.")',
    "",
  );
  if (isCompanies) {
    lines.push('url = f"{host}/v2.0/{tenant}/Sandbox/api/v2.0/companies"');
  } else {
    lines.push('url = f"{host}/v2.0/{tenant}/Sandbox/api/v2.0/companies({company})"');
  }
  lines.push(
    'headers = {"Authorization": f"Bearer {result[\'access_token\']}"}',
    "with httpx.Client(headers=headers, timeout=10.0, follow_redirects=False) as client:",
  );
  if (!isCompanies) {
    lines.push(
      '    info = client.get(url, params={"$select": "name"})',
      "    info.raise_for_status()",
      '    if info.json()["name"].casefold() != "demo company":',
      '        raise SystemExit("BC_COMPANY_ID harus menunjuk ke DEMO COMPANY.")',
      "",
    );
  }
  const params = [`"$top": ${limit}`];
  if (selected.length) {
    lines.push(`    fields = (${selected.map(field => `"${field}"`).join(", ")}${selected.length === 1 ? "," : ""})`);
    params.push('"$select": ",".join(fields)');
  }
  if (order) params.push(`"$orderby": "${order}"`);
  if (filter) params.push(`"$filter": ${JSON.stringify(filter)}`);
  if (count) params.push('"$count": "true"');

  const requestUrl = isCompanies
    ? "url"
    : isCustom
      ? `f"{host}/v2.0/{tenant}/Sandbox/api/{route}/companies({company})/${endpoint}"`
      : `f"{url}/${endpoint}"`;
  lines.push(
    `    response = client.get(${requestUrl}, params={${params.join(", ")}})`,
    "    response.raise_for_status()",
  );
  const rowExpr = selected.length
    ? `[{field: ${typedStrings ? "row[field]" : "row.get(field)"} for field in fields} for row in ${count ? 'payload["value"]' : 'response.json()["value"]'}]`
    : 'response.json()["value"]';
  if (count) {
    lines.push(
      "    payload = response.json()",
      `    rows = ${rowExpr}`,
      '    if "@odata.count" in payload:',
      '        print(f"Total: {payload[\'@odata.count\']}")',
    );
  } else {
    lines.push(`    rows = ${rowExpr}`);
  }
  lines.push("    print(json.dumps(rows, indent=2, ensure_ascii=False))");
  return lines.join("\n");
}

function renderCSharp(options: SampleOptions): string {
  const { endpoint, limit, order, filter, selected, count, typedStrings, isCustom, isCompanies } = options;
  const lines = [
    "// Atur variabel BC_* untuk DEMO COMPANY sebelum menjalankan contoh.",
    "using System;",
    ...(selected.length ? ["using System.Linq;"] : []),
    "using System.Net.Http;",
    "using System.Net.Http.Headers;",
    "using System.Text.Json;",
    "using Microsoft.Identity.Client;",
    "",
    "static string Required(string name) =>",
    '    Environment.GetEnvironmentVariable(name) ?? throw new InvalidOperationException($"{name} belum diatur.");',
    "",
    'var environment = Environment.GetEnvironmentVariable("BC_ENVIRONMENT") ?? "Sandbox";',
    'if (!string.Equals(environment, "Sandbox", StringComparison.OrdinalIgnoreCase))',
    '    throw new InvalidOperationException("Contoh ini hanya untuk Sandbox.");',
    "",
    'var tenant = Guid.Parse(Required("BC_TENANT_ID"));',
  ];
  if (!isCompanies) lines.push('var company = Guid.Parse(Required("BC_COMPANY_ID"));');
  if (isCustom) lines.push('var route = Required("BC_CUSTOM_API_ROUTE").Trim(\'/\');');
  lines.push(
    'const string host = "https://api.businesscentral.dynamics.com";',
    'var app = ConfidentialClientApplicationBuilder.Create(Guid.Parse(Required("BC_CLIENT_ID")).ToString())',
    '    .WithAuthority($"https://login.microsoftonline.com/{tenant}")',
    '    .WithClientSecret(Required("BC_CLIENT_SECRET"))',
    "    .Build();",
    'var token = await app.AcquireTokenForClient(new[] { host + "/.default" }).ExecuteAsync();',
    "",
    "using var client = new HttpClient(new HttpClientHandler { AllowAutoRedirect = false })",
    "{",
    "    Timeout = TimeSpan.FromSeconds(10)",
    "};",
    'client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token.AccessToken);',
  );
  if (isCompanies) {
    lines.push('var url = $"{host}/v2.0/{tenant}/Sandbox/api/v2.0/companies";');
  } else {
    lines.push('var url = $"{host}/v2.0/{tenant}/Sandbox/api/v2.0/companies({company})";');
    lines.push('using var info = JsonDocument.Parse(await client.GetStringAsync(url + "?$select=name"));');
    lines.push('if (!string.Equals(info.RootElement.GetProperty("name").GetString(), "DEMO COMPANY", StringComparison.OrdinalIgnoreCase))');
    lines.push('    throw new InvalidOperationException("BC_COMPANY_ID harus menunjuk ke DEMO COMPANY.");');
    lines.push("");
  }
  if (isCustom) {
    lines.push('var customUrl = $"{host}/v2.0/{tenant}/Sandbox/api/{route}/companies({company})";');
  }
  const queryParts = [`$top=${limit}`];
  if (selected.length) queryParts.push(`$select=${selected.join(",")}`);
  if (order) queryParts.push(`$orderby=${encodeURIComponent(order)}`);
  if (filter) queryParts.push(`$filter=${encodeURIComponent(filter)}`);
  if (count) queryParts.push("$count=true");
  const queryString = `?${queryParts.join("&")}`;
  const targetExpr = isCompanies
    ? `url + "${queryString}"`
    : `${isCustom ? "customUrl" : "url"} + "/${endpoint}${queryString}"`;
  lines.push(`using var data = JsonDocument.Parse(await client.GetStringAsync(${targetExpr}));`);
  if (selected.length) {
    const suffix = typedStrings ? ".GetString()" : "";
    lines.push(
      'var rows = data.RootElement.GetProperty("value").EnumerateArray().Select(row => new',
      "{",
      selected.map(field => {
        const identifier = CSHARP_KEYWORDS.has(field) ? `@${field}` : field;
        return `    ${identifier} = row.GetProperty("${field}")${suffix}`;
      }).join(",\n"),
      "});",
    );
  } else {
    lines.push('var rows = data.RootElement.GetProperty("value");');
  }
  if (count) {
    lines.push(
      'if (data.RootElement.TryGetProperty("@odata.count", out var totalCount))',
      '    Console.WriteLine($"Total: {totalCount}");',
    );
  }
  lines.push("Console.WriteLine(JsonSerializer.Serialize(rows, new JsonSerializerOptions { WriteIndented = true }));");
  return lines.join("\n");
}
