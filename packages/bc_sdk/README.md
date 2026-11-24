# bc_sdk

SDK mandiri (tanpa ketergantungan ke FastAPI) untuk berkomunikasi dengan Business Central.
Spesifikasi lengkap: [`docs/modules/bc-sdk.md`](../../docs/modules/bc-sdk.md).

Target pemakaian (MVP, read-only):

```python
bc.companies.list()
bc.customers.list()
bc.items.list()
```
