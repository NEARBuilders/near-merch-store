# NEAR Merch UI Competition Skill

```yaml
name: near-merch-ui-competition
version: 0.1.0
description: Contribute UI improvements to the NEAR Merch Store from a fresh local scaffold using everything-dev, proxy mode, TanStack Router, TanStack Query, and the existing bos.config.json publish flow.
homepage: https://github.com/NEARBuilders/near-merch-store
metadata:
  repo: https://github.com/NEARBuilders/near-merch-store
  runtime_manifest: bos.config.json
  default_dev_command: bun dev:proxy
  validation:
    - bun typecheck
    - bun test
  publish_command: bos publish
  publish_identity: contributor-owned NEAR account
```

## When to Use This Skill

Use this skill when the task is to build or polish a UI feature for the NEAR Merch Store from a fresh local checkout of the repository.

This skill is for contributors who need to:

- start from a fresh scaffold
- run the app locally with the existing runtime config model
- work mainly in `ui/src/`
- follow the repo's TanStack Router and TanStack Query patterns
- submit a publishable result to a competition or review flow

This version is optimized for fresh setup first, not long-term sync with the live published app.

## Identity and Ownership

The contributor or agent should publish under their own NEAR account.

- set `bos.config.json` `account` to your own NEAR account before publishing
- if you scaffold with `everything-dev create project`, pass `--account <your-account>` so the generated config is already owned by you
- the final published config and Near Social record should belong to the submitting agent, not the upstream template account

## Core Rule

Treat `bos.config.json` as the runtime contract.

Do not hardcode host or API URLs in the UI. The host, UI remote, API remote, proxy behavior, shared dependencies, and runtime identity are all driven by `bos.config.json`.

## Recommended Start

Start from a fresh checkout of the repository:

```bash
git clone https://github.com/NEARBuilders/near-merch-store.git
cd near-merch-store
bun install
cp .env.example .env
bun db:migrate
```

Before publishing, update `bos.config.json` so the top-level `account` is your own NEAR account.

If you are using a fresh scaffold flow with `everything-dev`, use your own account from the start.

Example:

```bash
bunx everything-dev create project my-near-merch-ui --account yourname.near
```

Then bring in the relevant app code and continue the same workflow.

Recommended dev mode for UI work:

```bash
bun dev:proxy
```

This keeps the local host and local UI connected to the configured API proxy, which is the safest default for focused UI work.

Other useful modes:

```bash
bun dev
```

Use when the task truly needs the full stack locally.

```bash
bun dev:ui
```

Use when you want local UI changes while keeping the API remote.

## Where to Work

Prefer editing these areas:

- `ui/src/routes/` for route-level UI and route loaders
- `ui/src/components/` for reusable interface pieces
- `ui/src/hooks/` for local UI logic
- `ui/src/integrations/api/` for query keys, loaders, and API-backed hooks

Avoid changing `host/` or `api/` unless the task explicitly requires it.

## Router Patterns

Use TanStack Router file-based routes under `ui/src/routes/`.

Follow these patterns:

- create routes with `createFileRoute(...)`
- use `beforeLoad` for auth or role checks
- use route loaders to prefetch query data
- keep navigation, route params, and route-level concerns inside route files

Good repo references:

- `ui/src/routes/_marketplace/_authenticated.tsx`
- `ui/src/routes/_marketplace/_authenticated/_admin.tsx`
- `ui/src/routes/_marketplace/index.tsx`

## Query Patterns

Use TanStack Query through the existing integration layer.

Preferred pattern:

- define stable query keys in `ui/src/integrations/api/keys.ts`
- define loaders and hooks in `ui/src/integrations/api/`
- prefetch route data with `context.queryClient.ensureQueryData(...)`
- read data inside components with query hooks instead of ad hoc fetch logic

Good repo references:

- `ui/src/integrations/api/keys.ts`
- `ui/src/integrations/api/products.ts`
- `ui/src/routes/_marketplace/index.tsx`

## API Access Rules

Use the shared oRPC client abstraction.

- import API access from `@/utils/orpc`
- do not create a second API client for normal UI work
- let the existing runtime-aware client handle SSR and browser differences

Reference:

- `ui/src/remote/orpc.ts`

## Auth Rules

The host owns auth. The UI should follow that model rather than inventing its own auth flow.

- treat auth state as host-backed
- use existing route guards for protected areas
- use the existing auth client patterns when login/session behavior is needed

Useful references:

- `ui/src/remote/auth-client.ts`
- `ui/src/routes/_marketplace/_authenticated.tsx`
- `ui/src/routes/_marketplace/_authenticated/_admin.tsx`

## UI Design Rules

Preserve the established visual language of the app unless the task is explicitly a redesign.

- reuse existing UI primitives where possible
- use semantic Tailwind tokens like `bg-background`, `text-foreground`, and `border-border`
- avoid hardcoded colors unless the surrounding file already uses them intentionally
- make loading, empty, and error states explicit
- check both desktop and mobile layouts

## Contribution Workflow

1. Start from a fresh local checkout
2. Run `bun dev:proxy`
3. Make the UI change in `ui/src/`
4. Follow existing route and query patterns
5. Validate the change
6. Publish only when the contribution is ready to review live

Validation commands:

```bash
bun typecheck
bun test
```

Publish command:

```bash
bos publish
```

This uses the existing everything-dev release flow to build, deploy, and publish the app configuration.

The release workflow is:

1. build packages
2. deploy them to Zephyr Cloud
3. update production URLs in `bos.config.json`
4. publish the updated `bos.config.json` to Near Social under your account

In this repo, the deploy step updates runtime URLs directly in `bos.config.json`:

- `app.host.production` in `host/rsbuild.config.ts`
- `app.ui.production` and `app.ui.ssr` in `ui/rsbuild.config.ts`
- `app.api.production` in `api/rspack.config.cjs`

For agents, this matters because the submission should include a publishable, account-owned runtime manifest rather than only source code.

## Publish Requirements

Your competition submission should come from a real publish flow, not just a local patch.

- the agent must have access to its own NEAR account
- the publish should be signed by that account
- the published `bos.config.json` should point to the deployed URLs produced by Zephyr
- the submission should include the published config link or Near Social explorer link

Useful publish setup notes:

- `bos publish` signs the Near Social `set` transaction using `NEAR_PRIVATE_KEY` or existing NEAR CLI credentials
- Zephyr deploy in the release flow expects deployment credentials such as `ZE_SERVER_TOKEN` and `ZE_USER_EMAIL`
- use `bos publish --dry-run` first if you want to verify the target path before sending a transaction

## Reference Links

- NEAR CLI (Rust): `https://github.com/near/near-cli-rs`
- NEAR CLI docs: `https://docs.near.org/tools/near-cli`
- NEAR protocol docs: `https://docs.near.org/`
- NEAR account model: `https://docs.near.org/protocol/account-model`
- Near Social: `https://near.social/`
- Zephyr CI/CD server token docs: `https://docs.zephyr-cloud.io/features/ci-cd-server-token`

## Deliverable Requirements

A strong submission should include:

- source changes in a GitHub repo, fork, or PR
- a short explanation of the UI change
- screenshots or a short demo video
- the dev mode used during implementation
- confirmation that `bun typecheck` and `bun test` were run
- a preview URL or published app link when available
- the published config or release link
- the NEAR account used for publishing

## Competition Submission Format

If this work is being submitted to a competition, the final deliverable should point to a single summary page, README, or PR description that links to:

- repo or PR URL
- live app or preview URL
- published config link
- screenshots or demo notes
- short changelog

This keeps judging simple and makes submissions easier to index later.

## Safety and Privacy Rules

- never commit `.env` or secret files
- never include API keys, tokens, or credentials in public submissions
- do not place sensitive values inside screenshots or README examples
- keep public competition submissions limited to safe, reviewable artifacts
- never publish under someone else's account unless explicitly instructed

## Success Criteria

The contribution is successful when it:

- runs from a fresh scaffold
- respects the existing runtime config model
- follows the repo's router and query conventions
- improves the UI without breaking host or API assumptions
- is easy to review, publish, and submit
