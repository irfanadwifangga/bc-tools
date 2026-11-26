import type { PreviewOrder } from "./catalog";

export type SampleEndpoint = "customers" | "items";
export type SampleLanguage = "Python" | "C#";
export const DEFAULT_PREVIEW_LIMIT = 5;

export function getCodeSample(
  endpoint: SampleEndpoint, language: SampleLanguage, limit = DEFAULT_PREVIEW_LIMIT, order?: PreviewOrder,
): string {
  return samples[language](endpoint, limit, order);
}

const samples = {
  Python: (endpoint: SampleEndpoint, limit: number, order?: PreviewOrder) => `# Atur variabel BC_* untuk DEMO COMPANY sebelum menjalankan contoh.
import json
import os
from uuid import UUID

import httpx
import msal

if os.getenv("BC_ENVIRONMENT", "Sandbox").casefold() != "sandbox":
    raise SystemExit("Contoh ini hanya untuk Sandbox.")

tenant = UUID(os.environ["BC_TENANT_ID"])
company = UUID(os.environ["BC_COMPANY_ID"])
host = "https://api.businesscentral.dynamics.com"
app = msal.ConfidentialClientApplication(
    str(UUID(os.environ["BC_CLIENT_ID"])),
    authority=f"https://login.microsoftonline.com/{tenant}",
    client_credential=os.environ["BC_CLIENT_SECRET"],
)
result = app.acquire_token_for_client(scopes=[f"{host}/.default"])
if "access_token" not in result:
    raise SystemExit("Autentikasi aplikasi gagal.")

url = f"{host}/v2.0/{tenant}/Sandbox/api/v2.0/companies({company})"
headers = {"Authorization": f"Bearer {result['access_token']}"}
with httpx.Client(headers=headers, timeout=10.0, follow_redirects=False) as client:
    info = client.get(url, params={"$select": "name"})
    info.raise_for_status()
    if info.json()["name"].casefold() != "demo company":
        raise SystemExit("BC_COMPANY_ID harus menunjuk ke DEMO COMPANY.")

    fields = ("id", "number", "displayName")
    response = client.get(f"{url}/${endpoint}", params={"$top": ${limit}, "$select": ",".join(fields)${order ? `, "$orderby": "${order}"` : ""}})
    response.raise_for_status()
    rows = [{field: row[field] for field in fields} for row in response.json()["value"]]
    print(json.dumps(rows, indent=2, ensure_ascii=False))`,
  "C#": (endpoint: SampleEndpoint, limit: number, order?: PreviewOrder) => `// Atur variabel BC_* untuk DEMO COMPANY sebelum menjalankan contoh.
using System;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text.Json;
using Microsoft.Identity.Client;

static string Required(string name) =>
    Environment.GetEnvironmentVariable(name) ?? throw new InvalidOperationException($"{name} belum diatur.");

var environment = Environment.GetEnvironmentVariable("BC_ENVIRONMENT") ?? "Sandbox";
if (!string.Equals(environment, "Sandbox", StringComparison.OrdinalIgnoreCase))
    throw new InvalidOperationException("Contoh ini hanya untuk Sandbox.");

var tenant = Guid.Parse(Required("BC_TENANT_ID"));
var company = Guid.Parse(Required("BC_COMPANY_ID"));
const string host = "https://api.businesscentral.dynamics.com";
var app = ConfidentialClientApplicationBuilder.Create(Guid.Parse(Required("BC_CLIENT_ID")).ToString())
    .WithAuthority($"https://login.microsoftonline.com/{tenant}")
    .WithClientSecret(Required("BC_CLIENT_SECRET"))
    .Build();
var token = await app.AcquireTokenForClient(new[] { host + "/.default" }).ExecuteAsync();

using var client = new HttpClient(new HttpClientHandler { AllowAutoRedirect = false })
{
    Timeout = TimeSpan.FromSeconds(10)
};
client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token.AccessToken);
var url = $"{host}/v2.0/{tenant}/Sandbox/api/v2.0/companies({company})";
using var info = JsonDocument.Parse(await client.GetStringAsync(url + "?$select=name"));
if (!string.Equals(info.RootElement.GetProperty("name").GetString(), "DEMO COMPANY", StringComparison.OrdinalIgnoreCase))
    throw new InvalidOperationException("BC_COMPANY_ID harus menunjuk ke DEMO COMPANY.");

using var data = JsonDocument.Parse(await client.GetStringAsync(url + "/${endpoint}?$top=${limit}&$select=id,number,displayName${order ? `&$orderby=${encodeURIComponent(order)}` : ""}"));
var rows = data.RootElement.GetProperty("value").EnumerateArray().Select(row => new
{
    id = row.GetProperty("id").GetString(),
    number = row.GetProperty("number").GetString(),
    displayName = row.GetProperty("displayName").GetString()
});
Console.WriteLine(JsonSerializer.Serialize(rows, new JsonSerializerOptions { WriteIndented = true }));`,
} as const;
