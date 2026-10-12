# StockSense AI — Data & Dataset Provenance

## 1. Demo Dataset Notice
The files located in `data/demo/`:
- `demo_products.csv`
- `demo_sales.csv`

are explicitly labelled as **Demo Data**. They are provided for local first-run evaluation, automated test coverage, and product demonstration. They reflect realistic retail catalog items (Electronics, Stationery, Apparel, Home & Living) and 45 days of non-negative, chronological sales transactions.

## 2. Public Dataset Reference
- Reference: **UCI Online Retail Dataset** (https://archive.ics.uci.edu/dataset/352/online+retail).
- Real-world transaction records from a UK-based non-store online retail firm.
- Any transformation of external transactional datasets must map transaction date, item ID/SKU, quantity, unit price, and transaction type while excluding negative/canceled transactions unless modeled as customer returns.

## 3. User Authoritative Data
- Any CSV catalogue or historical sales file imported by the user through the StockSense AI import interface is authoritative for the active workspace.
- The system enforces unique SKU indexing, non-negative quantity validation, chronological sorting, and duplicate import prevention using file hashes and transaction IDs.
