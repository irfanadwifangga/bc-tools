# backend

FastAPI, modular monolith. Struktur target:

```
app/
├── core/       # config, logging, error handling, dependencies
├── modules/    # satu folder per modul (api_explorer, portal)
└── main.py
tests/
```

Aturan: tidak ada logic bisnis di router; semua akses BC lewat `bc_sdk`. Lihat `docs/standards/`.
Folder modul dibuat saat modul dikerjakan, bukan sebelumnya.
