# Research & Design Decisions

## Summary

- **Feature**: `schedule-command-option-simplification`
- **Discovery Scope**: Extension（既存システムの簡略化）
- **Key Findings**:
  - Discord.js の `ChatInputCommandInteraction` は `channelId` プロパティで実行チャンネル ID を直接取得可能
  - `SlashCommandBuilder` のオプションは `setRequired(false)` で任意化可能。`getInteger` の第2引数を `false` にすると `number | null` を返す
  - DB スキーマ（`NotificationEntry`）の変更は不要。`guildId` + `channelId` のユニーク制約はそのまま利用できる

## Research Log

### Discord.js interaction.channelId の利用

- **Context**: channel オプションを廃止した場合、実行チャンネル ID をどのように取得するか
- **Sources Consulted**: discord.js v14 API ドキュメント、既存コード
- **Findings**:
  - `ChatInputCommandInteraction.channelId` は `string` 型で、コマンドが実行されたチャンネルの ID を返す
  - ギルド内テキストチャンネルで実行された場合、`guildId` が非 null であることで検証可能
  - 現在の `interaction.options.getChannel("channel", true)` を `interaction.channelId` に置き換えるだけで良い
- **Implications**: channel オプション削除は安全に実行可能。型安全性も維持される

### hour オプションの任意化

- **Context**: `SlashCommandBuilder.addIntegerOption` で `setRequired(false)` とした場合の挙動
- **Sources Consulted**: discord.js v14 API ドキュメント、既存コード
- **Findings**:
  - `setRequired(false)` にすると、ユーザーはオプションを省略可能
  - `interaction.options.getInteger("hour", false)` は `number | null` を返す
  - `null` の場合にデフォルト値（7）を適用するロジックを追加する
- **Implications**: 既存の min/max バリデーション（0〜23）は Discord API 側で維持される

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| インプレース修正 | 既存ファイル（bot.ts, command-handler.ts）の直接修正 | 最小限の変更、既存パターン維持 | なし | 新しいコンポーネントやパターンは不要 |

## Design Decisions

### Decision: channel オプションの完全廃止

- **Context**: ユーザーが他チャンネルを指定する必要はなく、実行チャンネルのみ対象とする仕様
- **Alternatives Considered**:
  1. channel オプションを任意化（デフォルトで実行チャンネル）
  2. channel オプションを完全廃止
- **Selected Approach**: 完全廃止（Option 2）
- **Rationale**: ユーザーの明確な要件。誤操作防止とアクセス制御の簡素化を実現
- **Trade-offs**: 他チャンネルへの通知設定が不可能になるが、要件として許容
- **Follow-up**: コマンド再登録が必要（Discord API 側のコマンド定義更新）

### Decision: hour のデフォルト値

- **Context**: hour オプション省略時のデフォルト値の選定
- **Alternatives Considered**:
  1. 7時（朝の一般的な時刻）
  2. 0時（日の始まり）
- **Selected Approach**: 7時
- **Rationale**: 要件で指定済み。朝にスケジュールを確認するユースケースに合致
- **Trade-offs**: なし（オプション指定で任意の時刻に変更可能）

## Risks & Mitigations

- コマンド定義変更後、Discord 側でキャッシュされた古いコマンドが一時的に残る可能性 — Bot 再起動時に自動的に上書き登録される
- 既存の通知登録データには影響なし — DB スキーマは変更しない

## References

- discord.js v14 `ChatInputCommandInteraction.channelId` — 実行チャンネル ID の取得元
- discord.js v14 `SlashCommandBuilder` — コマンドオプション定義
