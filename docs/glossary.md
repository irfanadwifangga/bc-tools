# Glossary

| Istilah | Arti |
|---|---|
| BC | Microsoft Dynamics 365 Business Central |
| Tenant | Instance Microsoft Entra milik organisasi (tenant ID) |
| Environment | Instance BC dalam tenant (misal Production, Sandbox) |
| Company | Entitas perusahaan dalam satu environment; punya GUID pada API |
| Entra ID | Layanan identitas Microsoft (dulu Azure AD) |
| App registration | Identitas aplikasi di Entra (client ID, secret) |
| Permission set | Kumpulan izin BC; membatasi apa yang boleh dilakukan aplikasi/user |
| Standard API v2.0 | API BC bawaan (`/api/v2.0`) |
| Custom API | API page buatan AL (`/api/{publisher}/{group}/{version}`) |
| OData | Protokol query REST yang dipakai BC (`$filter`, `$top`, `@odata.nextLink`) |
| ETag / If-Match | Mekanisme concurrency untuk write (relevan setelah MVP) |
| MSAL | Library autentikasi Microsoft |
| ADR | Architecture Decision Record |
| BC Ladder | Urutan evaluasi solusi: Standard → Config → Workflow → Power Automate → API → Custom → AI |
| SDK | `bc_sdk`, package internal pembungkus API BC |
| Typst builder | Repo terpisah milik pemilik: workflow berbasis agen (`AGENTS.md` + Typst CLI) untuk menulis user manual; bukan program |
