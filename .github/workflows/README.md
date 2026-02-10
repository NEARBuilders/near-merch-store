# Cron Job for Cleanup Abandoned Drafts

This directory contains GitHub Actions configuration for automated daily cleanup of abandoned draft orders in the marketplace.

## Required GitHub Secrets & Variables

Before enabling this workflow, configure these in your GitHub repository settings:

### GitHub Variables
- `BASE_URL`: The public API base URL for your deployed marketplace (e.g., `https://yourdomain.com`)

### GitHub Secrets  
- `CRON_SECRET`: A random 32+ character secret key used to authenticate the cron endpoint

### Environment Variable (in your deployed API)
- `CRON_SECRET`: Must match the secret configured in GitHub (same value as above)

## How it works

1. **Timing**: Runs daily at 10:00 UTC. Can also be triggered manually via GitHub Actions UI (`workflow_dispatch`).

2. **Endpoint**: Calls `POST ${BASE_URL}/api/cron/cleanup-drafts` with header:
   - `x-cron-secret: ${{ secrets.CRON_SECRET }}`
   - Body: `{"maxAgeHours":24}`

3. **Behavior** (implemented in `api/src/jobs/cleanup-drafts.ts`):
   - Finds all orders with status `draft_created` older than 24 hours
   - For each order: cancels associated draft orders in Printful/Gelato (via `provider.client.cancelOrder()`)
   - Updates local order status to `cancelled` or `partially_cancelled`
   - Returns counts: totalProcessed, cancelled, partiallyCancelled, failed, errors

## Security

The cron endpoint is protected by a shared secret (`CRON_SECRET`) that must match:

- GitHub Secret (`CRON_SECRET`)
- Your deployed API environment variable (`CRON_SECRET`)

Requests without the correct header receive `UNAUTHORIZED`.
