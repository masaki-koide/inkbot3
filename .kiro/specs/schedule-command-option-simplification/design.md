# Design Document

## Overview

**Purpose**: `/subscribe` および `/unsubscribe` コマンドのオプションを簡略化し、ユーザーがオプションなしでコマンドを実行できるようにする。

**Users**: Discord サーバーのユーザーが、最小限の入力でスケジュール通知の登録・解除を行う。

**Impact**: 既存の `bot.ts`（コマンド定義）と `command-handler.ts`（ハンドラ）を修正する。DB スキーマの変更は不要。

### Goals

- `channel` オプションを両コマンドから完全に削除し、実行チャンネルを自動的に使用する
- `hour` オプションを任意化し、デフォルト値（7時）を設ける
- 既存の通知データとの後方互換性を維持する

### Non-Goals

- 複数チャンネルの一括登録・解除機能
- デフォルト時刻のユーザー/サーバー単位でのカスタマイズ
- DB スキーマの変更

## Architecture

### Existing Architecture Analysis

現在のアーキテクチャ:

- `bot.ts`: `SlashCommandBuilder` でコマンド定義。`channel`（必須）と `hour`（必須）のオプションを持つ
- `command-handler.ts`: `interaction.options.getChannel("channel", true)` と `interaction.options.getInteger("hour", true)` でオプションを取得
- `notification-repository.ts`: `upsert(guildId, channelId, hour)` と `remove(guildId, channelId)` を提供
- `prisma/schema.prisma`: `NotificationEntry` モデル（`guildId` + `channelId` でユニーク制約）

変更対象は `bot.ts` と `command-handler.ts` の2ファイルのみ。Repository 層と DB スキーマは変更不要。

### Architecture Pattern & Boundary Map

既存のアーキテクチャパターン（コマンド定義 → ハンドラ → リポジトリ）をそのまま維持する。新しいコンポーネントは導入しない。

**Architecture Integration**:

- Selected pattern: インプレース修正（既存パターン維持）
- Domain/feature boundaries: 変更なし
- Existing patterns preserved: SlashCommandBuilder によるコマンド定義、ハンドラ関数による処理
- New components rationale: なし
- Steering compliance: 既存パターンに準拠

### Technology Stack

| Layer | Choice / Version | Role in Feature | Notes |
|-------|------------------|-----------------|-------|
| Backend / Services | discord.js 14.25.1 | コマンド定義変更、interaction.channelId 利用 | 既存依存関係のみ |
| Data / Storage | Prisma + SQLite | 通知登録の永続化 | スキーマ変更なし |

## Requirements Traceability

| Requirement | Summary | Components | Interfaces | Flows |
|-------------|---------|------------|------------|-------|
| 1.1 | 実行チャンネルを通知先として登録 | command-handler | handleSubscribe | subscribe フロー |
| 1.2 | subscribe から channel オプション削除 | bot | commands 配列 | - |
| 1.3 | サーバー外実行時のエラー | command-handler | handleSubscribe | subscribe フロー |
| 2.1 | 実行チャンネルの通知を解除 | command-handler | handleUnsubscribe | unsubscribe フロー |
| 2.2 | unsubscribe から channel オプション削除 | bot | commands 配列 | - |
| 2.3 | 登録なし時の警告 | command-handler | handleUnsubscribe | unsubscribe フロー |
| 3.1 | hour 省略時にデフォルト7時で登録 | command-handler | handleSubscribe | subscribe フロー |
| 3.2 | hour 指定時にその値で登録 | command-handler | handleSubscribe | subscribe フロー |
| 3.3 | hour の値域 0〜23 | bot | commands 配列 | - |
| 4.1 | subscribe 成功時にチャンネルと時刻を表示 | command-handler | handleSubscribe | subscribe フロー |
| 4.2 | unsubscribe 成功時にチャンネルを表示 | command-handler | handleUnsubscribe | unsubscribe フロー |

## Components and Interfaces

| Component | Domain/Layer | Intent | Req Coverage | Key Dependencies | Contracts |
|-----------|--------------|--------|--------------|------------------|-----------|
| bot.ts commands | Command Definition | スラッシュコマンドのオプション定義変更 | 1.2, 2.2, 3.3 | discord.js SlashCommandBuilder (P0) | - |
| handleSubscribe | Command Handler | subscribe コマンドのハンドラ修正 | 1.1, 1.3, 3.1, 3.2, 4.1 | NotificationRepository (P0) | Service |
| handleUnsubscribe | Command Handler | unsubscribe コマンドのハンドラ修正 | 2.1, 2.3, 4.2 | NotificationRepository (P0) | Service |

### Command Definition Layer

#### bot.ts commands

| Field | Detail |
|-------|--------|
| Intent | スラッシュコマンドのオプション構成を変更する |
| Requirements | 1.2, 2.2, 3.3 |

**Responsibilities & Constraints**

- `subscribe` コマンドから `channel` オプションを削除する
- `subscribe` コマンドの `hour` オプションを `setRequired(false)` に変更する
- `unsubscribe` コマンドから `channel` オプションを削除する
- hour の min/max バリデーション（0〜23）は維持する

**Dependencies**

- External: discord.js `SlashCommandBuilder` — コマンド定義 (P0)

### Command Handler Layer

#### handleSubscribe

| Field | Detail |
|-------|--------|
| Intent | subscribe コマンド実行時に実行チャンネルとデフォルト時刻を使用する |
| Requirements | 1.1, 1.3, 3.1, 3.2, 4.1 |

**Responsibilities & Constraints**

- `interaction.channelId` から実行チャンネル ID を取得する（`interaction.options.getChannel` を廃止）
- `interaction.options.getInteger("hour", false)` で hour を取得し、`null` の場合はデフォルト値 7 を使用する
- `guildId` が `null` の場合のエラーハンドリングは現行通り維持する
- 応答メッセージにチャンネルと通知時刻を含める（現行通り）

**Dependencies**

- Outbound: NotificationRepository — upsert, findByGuildAndChannel (P0)

**Contracts**: Service [x]

##### Service Interface

```typescript
// 変更前
const channel = interaction.options.getChannel("channel", true);
const hour = interaction.options.getInteger("hour", true);

// 変更後
const channelId = interaction.channelId;
const hour = interaction.options.getInteger("hour", false) ?? 7;
```

- Preconditions: `interaction.guildId` が非 null（サーバー内実行）
- Postconditions: `NotificationEntry` が upsert される
- Invariants: `hour` は 0〜23 の範囲（Discord API 側で保証、デフォルト値 7 も範囲内）

**Implementation Notes**

- `interaction.channelId` は `string` 型で、型変換不要
- 応答メッセージで `<#${channelId}>` を使用してチャンネルメンションを表示（`channel.id` から `channelId` への変数名変更のみ）

#### handleUnsubscribe

| Field | Detail |
|-------|--------|
| Intent | unsubscribe コマンド実行時に実行チャンネルの通知を解除する |
| Requirements | 2.1, 2.3, 4.2 |

**Responsibilities & Constraints**

- `interaction.channelId` から実行チャンネル ID を取得する
- `guildId` が `null` の場合のエラーハンドリングは現行通り維持する
- 登録が存在しない場合の警告メッセージは現行通り維持する

**Dependencies**

- Outbound: NotificationRepository — remove (P0)

**Contracts**: Service [x]

##### Service Interface

```typescript
// 変更前
const channel = interaction.options.getChannel("channel", true);

// 変更後
const channelId = interaction.channelId;
```

- Preconditions: `interaction.guildId` が非 null
- Postconditions: 該当する `NotificationEntry` が削除される（存在する場合）
- Invariants: なし

**Implementation Notes**

- 応答メッセージで `<#${channelId}>` を使用（`channel.id` からの変数名変更のみ）

## Data Models

DB スキーマ（`NotificationEntry`）の変更は不要。既存のモデルとユニーク制約がそのまま機能する。

## Error Handling

### Error Categories and Responses

**User Errors**:

- サーバー外（DM）での実行 → 「このコマンドはサーバー内でのみ使用できます」（現行通り、1.3）
- 未登録チャンネルの解除 → 「通知登録は存在しません」（現行通り、2.3）

**System Errors**:

- DB 操作失敗 → 「通知の登録中にエラーが発生しました」/「通知の解除中にエラーが発生しました」（現行通り）

新しいエラーパターンの追加は不要。

## Testing Strategy

### Unit Tests

- `handleSubscribe`: `interaction.channelId` が通知先チャンネルとして使用されることを検証
- `handleSubscribe`: hour オプション省略時にデフォルト値 7 が使用されることを検証
- `handleSubscribe`: hour オプション指定時にその値が使用されることを検証
- `handleUnsubscribe`: `interaction.channelId` が解除対象チャンネルとして使用されることを検証

### Integration Tests

- コマンド定義に `channel` オプションが含まれないことを検証
- コマンド定義の `hour` オプションが `required: false` であることを検証
