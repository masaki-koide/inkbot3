# Research & Design Decisions

## Summary
- **Feature**: `event-logging`
- **Discovery Scope**: Extension（既存システムへの拡張）
- **Key Findings**:
  - 既存のリポジトリはファクトリ関数パターン（`createNotificationRepository`）で統一されており、新規リポジトリも同パターンを踏襲する
  - Discord.js の `ChatInputCommandInteraction` からギルド名・チャンネル名・ユーザー名を取得可能（`interaction.guild?.name`、`interaction.channel?.name`、`interaction.user.username`）
  - 既存の Prisma スキーマは SQLite + better-sqlite3 アダプタ構成で、新テーブル追加はマイグレーションで対応可能

## Research Log

### Discord.js Interaction から取得可能な情報
- **Context**: イベントログに必要なデータが Interaction オブジェクトから取得できるか確認
- **Sources Consulted**: 既存コード（`src/command-handler.ts`）
- **Findings**:
  - `interaction.guildId` — ギルドID（DM の場合 null）
  - `interaction.guild?.name` — ギルド名（キャッシュから取得、null の可能性あり）
  - `interaction.channelId` — チャンネルID
  - `interaction.channel` — チャンネルオブジェクト（`name` プロパティあり、DM チャンネルでは name が null）
  - `interaction.user.id` — ユーザーID
  - `interaction.user.username` — ユーザー名
  - `interaction.commandName` — コマンド名
  - `interaction.options` — コマンドオプション（`getInteger`, `getString` 等）
- **Implications**: 必要な全データが Interaction から直接取得可能。追加の API コールは不要

### コマンドオプションの文字列表現
- **Context**: パラメータを汎用的な文字列として保存する方法を検討
- **Findings**:
  - 現在の subscribe コマンドには `hour`（Integer）オプションのみ
  - `interaction.options.data` で全オプションを配列として取得可能
  - 単純に `name=value` 形式で文字列連結すれば十分（例: `hour=7`）
  - 複数オプションがある場合はカンマ区切り等で対応可能
- **Implications**: 文字列として保存する方針はシンプルで適切

### 既存リポジトリパターン
- **Context**: 新規リポジトリの設計パターンを既存コードから学習
- **Findings**:
  - `createNotificationRepository(prisma: PrismaClient)` がファクトリ関数
  - 戻り値のオブジェクトリテラルにメソッドを定義
  - 型は `ReturnType<typeof createNotificationRepository>` で推論
  - 非同期メソッドが Promise を返す
- **Implications**: 同一パターンで `createCommandLogRepository` を作成する

## Design Decisions

### Decision: テーブル設計 — 汎用的な単一テーブル
- **Context**: 今後コマンドが増えることを考慮し、コマンド種別に依存しないテーブル構造が必要
- **Alternatives Considered**:
  1. コマンドごとに別テーブル — スキーマが明確だがコマンド追加のたびにマイグレーション必要
  2. 単一テーブルで commandName カラムにコマンド名を格納 — 汎用的でコマンド追加にスキーマ変更不要
- **Selected Approach**: 単一テーブル（`CommandLog`）に commandName カラムを持たせる
- **Rationale**: 新コマンド追加時にスキーマ変更不要。分析クエリも commandName でフィルタ可能
- **Trade-offs**: 型安全性はやや低下するが、柔軟性と保守性が向上

### Decision: ログ記録のタイミング — コマンド実行直後
- **Context**: コマンド実行の成功/失敗に関わらず記録するか、成功時のみ記録するか
- **Selected Approach**: コマンド受信時点で記録する（結果に関わらず）
- **Rationale**: 利用状況の分析目的であり、「誰がいつ何をしたか」が重要。成功/失敗は分析の主目的ではない
- **Trade-offs**: 失敗時のログも残るが、分析上は有用な情報

### Decision: ログ記録の非阻害性 — try-catch で失敗を吸収
- **Context**: ログ記録の失敗がコマンド本体の処理に影響してはならない
- **Selected Approach**: ログ記録を try-catch で囲み、失敗時は console.error で出力のみ
- **Rationale**: ログはあくまで補助機能であり、本体の UX を損なうべきではない

## Risks & Mitigations
- SQLite の同時書き込み制限 — ボットの規模では問題にならない。将来的に規模拡大時は DB 移行を検討
- ギルド名・チャンネル名が null の場合 — nullable カラムで対応し、null のまま保存

## References
- discord.js ChatInputCommandInteraction — 既存コード `src/command-handler.ts` を参照
- Prisma 7 マイグレーション — 既存 `prisma/schema.prisma` の構造に準拠
