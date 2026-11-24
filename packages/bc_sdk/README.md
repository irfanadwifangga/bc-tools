# bc_sdk

SDK mandiri (tanpa ketergantungan ke FastAPI) untuk berkomunikasi dengan Business Central.
Spesifikasi lengkap: [`docs/modules/bc-sdk.md`](../../docs/modules/bc-sdk.md).

Contoh pemakaian async. Gunakan `BCSettings` untuk konfigurasi dan `async with` untuk menutup client.

```python
from bc_sdk import BCClient

async with BCClient.from_settings(settings) as bc:
    companies = await bc.companies.list()
    customers = await bc.customers.list()
    items = await bc.items.list(top=50)
```
