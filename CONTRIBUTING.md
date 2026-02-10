# Contributing Guide

Thank you for contributing to the NEAR Merch Store! 🎉

## Quick Setup

```bash
bun install              # Install dependencies
bun db:migrate           # Run database migrations
bun dev                  # Start all services
```

Visit http://localhost:3000 to see the application.

**Need more details?** See [README.md](./README.md) for architecture overview and [LLM.txt](./LLM.txt) for technical deep-dive.

## Development Workflow

### Making Changes

- **UI Changes**: Edit `ui/src/` → hot reload automatically → deploy with `bun build:ui`
- **API Changes**: Edit `api/src/` → hot reload automatically → deploy with `bun build:api`
- **Host Changes**: Edit `host/src/` or `bos.config.json` → deploy with `bun build:host`

### Environment Configuration

All runtime URLs are configured in `bos.config.json` - no rebuild needed! Switch environments:

```bash
NODE_ENV=development bun dev:host  # Use local services (default)
NODE_ENV=production bun dev:host   # Use production CDN URLs
```

Secrets go in `.env` (see [.env.example](./.env.example) for required variables).

### Project Documentation

- **[README.md](./README.md)** - Architecture, tech stack, and quick start
- **[LLM.txt](./LLM.txt)** - Technical guide for LLMs and developers
- **[api/README.md](./api/README.md)** - API plugin documentation
- **[api/LLM.txt](./api/LLM.txt)** - Plugin development guide (every-plugin)
- **[ui/README.md](./ui/README.md)** - Frontend documentation
- **[host/README.md](./host/README.md)** - Server host documentation

## Contributing Code

1. **Fork** the repository on GitHub
2. **Clone** your fork locally
3. **Create** a feature branch: `git checkout -b feature/amazing-feature`
4. **Make** your changes
5. **Add a changeset** (if release-impacting): `bun run changeset`
6. **Test** thoroughly: `bun test` and `bun typecheck`
7. **Commit** using [Semantic Commits](https://gist.github.com/joshbuchea/6f47e86d2510bce28f8e7f42ae84c716)
8. **Push** to your fork: `git push origin feature/amazing-feature`
9. **Open** a Pull Request to the main repository

## Versioning & Releases (Changesets)

We use Changesets to automate semantic version bumps and changelogs for our workspace packages. If your PR changes released behavior, include a changeset file in `.changeset/`.

See: [`.changeset/README.md`](./.changeset/README.md)

### How to add a changeset

1. Make your code changes on a feature branch
2. Run: `bun run changeset`
3. Select the package(s) impacted (`api`, `ui`)
4. Pick the semver bump:
   - `patch` = backwards-compatible bugfix/small improvement
   - `minor` = backwards-compatible feature
   - `major` = breaking change
5. Write a short, user-facing summary when prompted
6. Commit the generated `.changeset/*.md` file along with your code changes

### What happens after merge

When changesets land on `main`, the release workflow uses them to open an automated “version packages” PR (version bumps + `CHANGELOG.md` updates). Merging that PR drives the release automation.

This process includes running `bun run deploy`, which triggers a **Zephyr** build. Zephyr updates `bos.config.json` with the new production URLs. This configuration file is used by `bun run start` to serve the application.

### Code Style

- Follow existing TypeScript patterns and conventions, including kebab-case for most file names
- Ensure type safety (no `any` types unless absolutely necessary)
- Write descriptive commit messages
- Add tests for new features

## Reporting Issues

Use [GitHub Issues](https://github.com/NEARBuilders/near-merch-store/issues) with:

- **Clear description** of the problem
- **Steps to reproduce** the issue
- **Expected behavior** vs **actual behavior**
- **Environment details** (OS, Node/Bun version, browser, etc.)

## Getting Help

- Check the [README](./README.md) for architecture and setup
- Read the [LLM.txt](./LLM.txt) for technical details
- Review workspace READMEs for specific documentation
- Ask questions in GitHub Issues or Discussions

---

Thank you for your contributions! 💚