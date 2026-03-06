# Research & Design Decisions

---
**Purpose**: 設計判断の根拠となる調査結果・技術検証を記録する。
---

## Summary
- **Feature**: `schedule-post-display-compression`
- **Discovery Scope**: Extension（既存のnotification-service.tsの改修）
- **Key Findings**:
  - Discordタイムスタンプ形式は `<t:UNIX_SECONDS:STYLE>` でEmbed description内でも機能する
  - バトル4タイプの統合Embedは、Discord Embed descriptionの4096文字制限内に収まる（推定最大約2000文字）
  - 連続エントリ統合はソート済みAPIレスポンスを前提としてO(n)で実現可能

## Research Log

### Discordタイムスタンプ形式
- **Context**: 要件4でDiscordネイティブのタイムスタンプ表示への移行が求められている
- **Sources Consulted**: Discord Developer Documentation - Message Formatting
- **Findings**:
  - 形式: `<t:UNIX_SECONDS:STYLE>` （ミリ秒ではなく秒単位のUNIXタイムスタンプ）
  - スタイル一覧:
    - `t` → 短い時刻（16:20）
    - `T` → 長い時刻（16:20:30）
    - `d` → 短い日付（20/04/2021）
    - `D` → 長い日付（2021年4月20日）
    - `f` → 短い日時（2021年4月20日 16:20）デフォルト
    - `F` → 長い日時（2021年4月20日火曜日 16:20）
    - `R` → 相対時刻（2時間後）
  - Embed description内でも正常に動作する
  - ユーザーのローカルタイムゾーンに自動変換される
- **Implications**:
  - `formatTime()`関数をDiscordタイムスタンプ形式に置き換える
  - ISO 8601文字列 → `Date.getTime() / 1000` でUNIX秒に変換
  - `<t:UNIX:t>` で短い時刻、`<t:UNIX:R>` で相対時刻を併記

### Embed description文字数制限
- **Context**: バトル4タイプを1つのEmbedに統合した際の文字数を検証する必要がある
- **Sources Consulted**: Discord API Documentation - Embed Limits
- **Findings**:
  - description上限: 4096文字
  - 1エントリあたりの推定文字数:
    - タイムスタンプ行: `<t:1234567890:t> 〜 <t:1234567890:t> (<t:1234567890:R>)` ≈ 60文字
    - ルール行: `ルール: ガチエリア` ≈ 15文字
    - ステージ行: `ステージ: ステージA, ステージB` ≈ 30文字
    - 合計 ≈ 105文字/エントリ（ナワバリバトルはルール行なしで≈90文字）
  - 4タイプ × 12エントリ（24h/2h） = 最大48エントリ
  - ただし24時間フィルタでエントリ数は実質各12件程度
  - セクション見出し + 区切り含めて最大約2500〜3000文字と推定 → 4096制限内
- **Implications**: 1つのEmbedに統合しても文字数制限の問題は発生しない

### Spla3 APIレスポンスの時系列順序
- **Context**: 連続エントリ統合のためにAPIレスポンスが時系列順であることを確認する
- **Sources Consulted**: spla3.yuu26.com APIレスポンス構造
- **Findings**:
  - APIレスポンスはstartTimeの昇順でソートされている
  - 各エントリは2時間枠（startTime〜endTime）
  - 隣接判定: `entries[i].endTime === entries[i+1].startTime`
- **Implications**: ソート不要。隣接判定のみで統合ロジックを実装可能

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| 既存関数の改修 | notification-service.ts内の既存フォーマット関数を直接修正 | 変更量が最小、既存パターン維持 | 関数が肥大化する可能性 | 採用 |
| フォーマッタモジュール分離 | フォーマット処理を別モジュールに抽出 | テスト容易性向上、責務分離 | 現時点では過剰な分離 | 将来の拡張時に検討 |

## Design Decisions

### Decision: バトルEmbed統合方式
- **Context**: 4つの独立Embedを1つに統合する方法
- **Alternatives Considered**:
  1. EmbedBuilder.addFields() — Embed内でフィールドとして分離
  2. description内でMarkdown見出しによるセクション分離
- **Selected Approach**: description内でMarkdown太字見出しによるセクション分離
- **Rationale**: fieldsは25個制限があり柔軟性に欠ける。descriptionならMarkdownフォーマットが自由に使え、文字数上限も十分
- **Trade-offs**: 色分けが使えなくなるが、太字見出しで視覚的区別を補う
- **Follow-up**: 実際の表示を確認して可読性を検証

### Decision: タイムスタンプ変換の実装箇所
- **Context**: ISO 8601 → Discordタイムスタンプの変換
- **Selected Approach**: formatTime()関数を`formatDiscordTimestamp()`に置き換え
- **Rationale**: 既存のformatTime()の呼び出し箇所を一括で置き換え可能。単一関数で一貫した変換を保証

### Decision: 24時間フィルタの適用箇所
- **Context**: 24時間以内のスケジュールのみ表示するフィルタの適用場所
- **Selected Approach**: buildScheduleEmbeds()に渡す前にフィルタリング関数を適用
- **Rationale**: フォーマット関数はフィルタ済みデータのみを扱うことで責務を明確に分離

## Risks & Mitigations
- Embed description 4096文字超過 → 24時間フィルタにより実質的なエントリ数は制限されるため低リスク。万一超過した場合はバトルEmbedを2つに分割するフォールバックを検討
- APIレスポンスの順序変更 → 統合ロジックに`startTime`ソートを追加する防御的実装を検討

## References
- [Discord Developer Portal - Message Formatting](https://discord.com/developers/docs/reference#message-formatting) — タイムスタンプ形式の仕様
- [Discord Developer Portal - Embed Limits](https://discord.com/developers/docs/resources/message#embed-object-embed-limits) — Embed各フィールドの文字数制限
- [spla3.yuu26.com API](https://spla3.yuu26.com) — Splatoon 3スケジュールAPI
