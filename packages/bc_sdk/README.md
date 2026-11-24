# bc_sdk

SDK mandiri (tanpa ketergantungan ke FastAPI) untuk berkomunikasi dengan Business Central.
Spesifikasi lengkap: [`docs/modules/bc-sdk.md`](../../docs/modules/bc-sdk.md).

Contoh usulan pemakaian async untuk MVP read-only. Kontrak publik ditetapkan di Fase 1.

```python
await bc.companies.list()
await bc.customers.list(company_id=company_id)
await bc.items.list(company_id=company_id)
```
