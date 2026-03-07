# リサーチ & 設計判断ログ

## サマリー
- **フィーチャー**: `api-source-migration`
- **ディスカバリースコープ**: Extension（既存システムの API クライアント差し替え）
- **主要な知見**:
  - splatoon3.ink は schedules.json と locale/ja-JP.json の2エンドポイント構成
  - schedules.json は SplatNet 3 の GraphQL レスポンスをそのまま公開しており、名称は英語
  - 日本語名はロケールファイルからエンティティの base64 ID（ブキのみ hex ID）でルックアップ

## リサーチログ

### splatoon3.ink API レスポンス構造

- **コンテキスト**: 移行先 API のデータ構造把握
- **ソース**: https://splatoon3.ink/data/schedules.json, https://github.com/misenhower/splatoon3.ink/wiki/Data-Access
- **知見**:
  - トップレベル: `data` オブジェクト内に各スケジュール種別
  - `regularSchedules.nodes[]`: `startTime`, `endTime`, `regularMatchSetting.vsStages[]`, `regularMatchSetting.vsRule`
  - `bankaraSchedules.nodes[]`: `startTime`, `endTime`, `bankaraMatchSettings[]`（CHALLENGE と OPEN の2要素配列）
  - `xSchedules.nodes[]`: `startTime`, `endTime`, `xMatchSetting.vsStages[]`, `xMatchSetting.vsRule`
  - `eventSchedules.nodes[]`: `leagueMatchSetting.leagueMatchEvent`, `leagueMatchSetting.vsStages[]`, `leagueMatchSetting.vsRule`, `timePeriods[]`
  - `festSchedules.nodes[]`: `startTime`, `endTime`, `festMatchSettings`（null または fest 詳細）
  - `coopGroupingSchedule.regularSchedules.nodes[]`: `startTime`, `endTime`, `setting.boss`, `setting.coopStage`, `setting.weapons[]`
  - `coopGroupingSchedule.bigRunSchedules.nodes[]`: 同構造（通常は空）
  - `coopGroupingSchedule.teamContestSchedules.nodes[]`: 同構造（通常は空）
- **設計への影響**:
  - バンカラは1ノード内に CHALLENGE/OPEN 両方が含まれるため、分離ロジックが必要
  - イベントマッチは `timePeriods[]` が複数時間帯を持つ（旧 API と構造が異なる）
  - ステージ画像は `image.url` にネストされている（旧 API は直接文字列）
  - `__typename`, `__isVsSetting` 等の GraphQL メタフィールドはバリデーション時に無視可能

### ローカライズ構造

- **コンテキスト**: splatoon3.ink は名称を英語で返すため、日本語化の方法を調査
- **ソース**: https://splatoon3.ink/data/locale/ja-JP.json
- **知見**:
  - カテゴリ: `stages`, `rules`, `weapons`, `bosses`, `events`, `gear`, `brands`, `powers`, `festivals`
  - ID フォーマット: stages/rules/bosses/events は base64 エンコード ID、weapons は hex ID（`__splatoon3ink_id`）
  - `stages`/`rules`/`weapons`/`bosses`: `{ name: string }` のみ
  - `events`: `{ name: string, desc: string, regulation: string }` の3フィールド
  - ルックアップキー: schedules.json 内の各エンティティの `id` フィールド（weapons は `__splatoon3ink_id`）
- **設計への影響**:
  - API クライアントは schedules.json と locale/ja-JP.json の2回フェッチが必要
  - ローカライズ適用はデータ変換レイヤーで実施
  - weapons のみルックアップキーが異なる（`__splatoon3ink_id` hex 文字列）

### 旧 API との構造差分

- **コンテキスト**: 変換ロジックの設計に必要な差分の把握
- **知見**:
  - 旧: `result.regular[]` → 新: `data.regularSchedules.nodes[]`
  - 旧: `result.bankara_challenge[]` / `result.bankara_open[]`（分離済） → 新: `data.bankaraSchedules.nodes[].bankaraMatchSettings[]`（統合、mode で分離）
  - 旧: `result.event[]`（各エントリが1時間帯） → 新: `data.eventSchedules.nodes[]`（各エントリが `timePeriods[]` で複数時間帯）
  - 旧: ステージ画像は `image: string` → 新: `image: { url: string }`
  - 旧: snake_case（`start_time`, `is_fest`） → 新: camelCase（`startTime`）、ただし一部 PascalCase ネスト
  - 旧: 日本語名が直接返る → 新: 英語名 + ロケールファイルで日本語化

## アーキテクチャパターン評価

| オプション | 説明 | 強み | リスク/制限 | 備考 |
|-----------|------|------|------------|------|
| 直接置き換え | spla3-client.ts を splatoon3ink-client.ts に書き換え | シンプル、変更箇所が明確 | 一時的に両 API が使えない | 既存パターン（関数エクスポート）を維持 |

## 設計判断

### 判断: 単一ファイル置き換えアプローチ

- **コンテキスト**: API クライアントの移行方法の選択
- **検討した代替案**:
  1. アダプターパターン（抽象インターフェース + 実装切り替え）
  2. 直接置き換え（spla3-client.ts → splatoon3ink-client.ts）
- **選択したアプローチ**: 直接置き換え
- **理由**: 旧 API に戻す予定がなく、抽象化のメリットが薄い。既存のファクトリ関数パターンを維持しつつ、ファイル内容を新 API 対応に書き換える
- **トレードオフ**: 切り替え中は旧 API が使えないが、段階的移行は不要

### 判断: ローカライズデータの取得タイミング

- **コンテキスト**: locale/ja-JP.json の取得をいつ行うか
- **検討した代替案**:
  1. スケジュール取得時に毎回並行フェッチ
  2. 起動時に1回取得してキャッシュ
- **選択したアプローチ**: スケジュール取得時に毎回並行フェッチ
- **理由**: ロケールデータも更新される可能性があり、cron 実行が毎時1回のため負荷は問題にならない。キャッシュ管理の複雑さを回避できる
- **トレードオフ**: 毎回2リクエスト発生するが、API ポリシー（1時間1回以下）に適合

## リスク & 軽減策
- splatoon3.ink API のダウンタイム — エラーハンドリングで既存と同等の通知を維持
- ロケールファイルの更新遅延 — 英語名フォールバックで表示は継続
- フェスデータ構造が null 以外のケースが未検証 — festMatchSettings が null 以外の場合のスキーマを柔軟に定義

## 参考文献
- [splatoon3.ink Data Access Wiki](https://github.com/misenhower/splatoon3.ink/wiki/Data-Access) — API 利用ポリシーとエンドポイント仕様
- [splatoon3.ink GitHub](https://github.com/misenhower/splatoon3.ink) — ソースコードとデータ構造
- [splatnet3-types](https://github.com/nintendoapis/splatnet3-types) — SplatNet 3 の TypeScript 型定義
