---
'api': minor
'ui': minor
---

Add storage plugin system (R2/S3) with presigned upload flow, provider-agnostic placement support, and remote database backup/restore scripts

- **Storage plugin**: New `api/src/services/storage/` with R2 and S3 provider implementations following the fulfillment plugin pattern. Supports presigned URL uploads (client uploads directly to storage), signed read URLs, and file deletion. Provider selection via `STORAGE_PROVIDER` env var (`"r2"` or `"s3"`).

- **New API routes**: `POST /admin/assets/upload` (request presigned URL), `POST /admin/assets/upload/confirm` (finalize upload), `POST /admin/assets/{id}/signed-url` (read access), `POST /admin/fulfillment/placements` (provider-agnostic placement slots).

- **Fulfillment `getPlacements`**: Each provider now exposes available placement slots. Printful returns product-specific placements (front, back, sleeves, etc.). Lulu returns book slots (cover, interior). No provider-specific conditionals — always routed through the provider contract.

- **Asset schema**: Added `storage_key` and `size` columns to the assets table. Migration needs to be generated via `db:generate`.

- **UI DesignStep refactor**: Replaced the flat asset list with a thumbnail grid, drag-and-drop file upload (presigned URL flow), placement dropdown populated from the provider's `getPlacements` endpoint, and a quick placement preview overlay on the catalog product image. Mockups auto-trigger after product creation via the provider contract.

- **Remote backup/restore**: Added `db:backup:remote` and `db:restore:remote` scripts that accept a `DATABASE_URL` env var for backing up Railway Postgres before migrations.