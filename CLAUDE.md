# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Splatoon 3 schedule notification Discord bot (package name: `inkbot3`). Fetches battle/coop schedules from splatoon3.ink API and posts them as Discord embeds on a cron schedule. Users subscribe channels via slash commands.

## Commands

```bash
npm run build          # TypeScript compile (tsc)
npm run dev            # TypeScript watch mode
npm run start          # Run bot (requires .env)
npm run test           # vitest run (all tests)
npx vitest run src/notification-service.test.ts  # Single test file
npm run trigger        # Manual notification trigger (optional hour arg)
npx prisma generate    # Regenerate Prisma client to generated/prisma/
npx prisma migrate dev # Create/apply DB migrations
```

## Architecture

Entry point: `src/index.ts` — wires together config, database, bot, commands, and scheduler.

**Core flow:**
1. `config.ts` — Validates env vars (`DISCORD_TOKEN`, `DISCORD_APPLICATION_ID`, `DATABASE_URL`) with Zod
2. `database.ts` — Initializes Prisma with better-sqlite3 adapter
3. `bot.ts` — Creates Discord.js client, registers slash commands (`/subscribe`, `/unsubscribe`)
4. `command-handler.ts` — Handles interactions: subscribe upserts notification entry, unsubscribe removes it
5. `scheduler.ts` — Cron job (every hour at :00) queries notifications for current hour, sends embeds
6. `notification-service.ts` — Fetches schedules from splatoon3.ink API, builds Discord embeds with 24h time window filter and consecutive entry merging
7. `splatoon3ink-client.ts` — Typed API client with Zod validation, fetches schedules.json and locale/ja-JP.json in parallel, localizes names to Japanese

**Data layer:**
- `notification-repository.ts` — CRUD for `NotificationEntry` (factory function pattern, not class)
- `prisma/schema.prisma` — Single model `NotificationEntry` (guildId, channelId, hour) with SQLite
- Prisma client output: `generated/prisma/` (gitignored, regenerate with `npx prisma generate`)

**Utility:** `trigger.ts` — Standalone script to manually fire notifications for a given hour. `colors.ts` — Embed color constants.

## Tech Stack

- Node.js 22, TypeScript (ES2022, Node16 modules)
- discord.js 14, Prisma 7 with better-sqlite3 adapter, Zod v4, node-cron
- Vitest for testing
- Docker multi-stage build, deployed via Terraform to OCI (Oracle Cloud)
- Timezone: `Asia/Tokyo` (set in docker-compose)

## Conventions

- ESM throughout (`.js` extension in imports even for `.ts` files)
- All user-facing strings are in Japanese
- Factory functions over classes (e.g., `createNotificationRepository`, `createBot`)
- Tests colocated with source files (`*.test.ts`)
- `.npmrc` enforces `save-exact=true` for dependency pinning

## AI-DLC and Spec-Driven Development

Kiro-style Spec Driven Development implementation on AI-DLC (AI Development Life Cycle)

### Paths
- Steering: `.kiro/steering/`
- Specs: `.kiro/specs/`

### Steering vs Specification

**Steering** (`.kiro/steering/`) - Guide AI with project-wide rules and context
**Specs** (`.kiro/specs/`) - Formalize development process for individual features

### Active Specifications
- Check `.kiro/specs/` for active specifications
- Use `/kiro:spec-status [feature-name]` to check progress

## Development Guidelines
- Think in English, generate responses in Japanese. All Markdown content written to project files (e.g., requirements.md, design.md, tasks.md, research.md, validation reports) MUST be written in the target language configured for this specification (see spec.json.language).

## Minimal Workflow
- Phase 0 (optional): `/kiro:steering`, `/kiro:steering-custom`
- Phase 1 (Specification):
  - `/kiro:spec-init "description"`
  - `/kiro:spec-requirements {feature}`
  - `/kiro:validate-gap {feature}` (optional: for existing codebase)
  - `/kiro:spec-design {feature} [-y]`
  - `/kiro:validate-design {feature}` (optional: design review)
  - `/kiro:spec-tasks {feature} [-y]`
- Phase 2 (Implementation): `/kiro:spec-impl {feature} [tasks]`
  - `/kiro:validate-impl {feature}` (optional: after implementation)
- Progress check: `/kiro:spec-status {feature}` (use anytime)

## Development Rules
- 3-phase approval workflow: Requirements → Design → Tasks → Implementation
- Human review required each phase; use `-y` only for intentional fast-track
- Keep steering current and verify alignment with `/kiro:spec-status`
- Follow the user's instructions precisely, and within that scope act autonomously: gather the necessary context and complete the requested work end-to-end in this run, asking questions only when essential information is missing or the instructions are critically ambiguous.

## Steering Configuration
- Load entire `.kiro/steering/` as project memory
- Default files: `product.md`, `tech.md`, `structure.md`
- Custom files are supported (managed via `/kiro:steering-custom`)
