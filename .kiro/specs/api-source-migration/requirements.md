# 要件定義書

## イントロダクション

本仕様は、スケジュールデータの取得元APIを現行の Spla3 API (`spla3.yuu26.com`) から splatoon3.ink API へ移行するための要件を定義する。splatoon3.ink は SplatNet 3 のデータを元にスケジュール情報を JSON 形式で提供するコミュニティ標準のデータソースである。API 仕様は [Data Access Wiki](https://github.com/misenhower/splatoon3.ink/wiki/Data-Access) に準拠する。

スケジュールデータは `https://splatoon3.ink/data/schedules.json` から取得し、名称の日本語化には `https://splatoon3.ink/data/locale/ja-JP.json` を併用する。schedules.json のレスポンスは SplatNet 3 の GraphQL 構造をそのまま反映しており（`regularSchedules.nodes[]`, `bankaraSchedules.nodes[]` 等）、名称は英語で返される。日本語名はロケールファイルから base64 エンコード ID をキーにルックアップする。

## 要件

### Requirement 1: スケジュールデータ取得の移行

**Objective:** 開発者として、バトル・サーモンラン両方のスケジュール取得元を splatoon3.ink API に切り替えたい。これにより、安定した単一データソースからすべてのスケジュール情報を取得できるようにする。

#### 受け入れ基準

1. The inkbot3 shall スケジュールデータを `https://splatoon3.ink/data/schedules.json` から取得する
2. The inkbot3 shall `data.regularSchedules.nodes[]`, `data.bankaraSchedules.nodes[]`, `data.xSchedules.nodes[]`, `data.eventSchedules.nodes[]`, `data.festSchedules.nodes[]` からバトルスケジュールを抽出する
3. The inkbot3 shall `data.coopGroupingSchedule.regularSchedules.nodes[]`, `data.coopGroupingSchedule.bigRunSchedules.nodes[]` からサーモンランスケジュールを抽出する
4. The inkbot3 shall `bankaraSchedules.nodes[].bankaraMatchSettings` 配列から `bankaraMode: "CHALLENGE"` と `bankaraMode: "OPEN"` を分離して取得する
5. The inkbot3 shall splatoon3.ink API のレスポンスを Zod スキーマでバリデーションする
6. The inkbot3 shall API リクエスト時に `User-Agent` ヘッダーを設定する
7. When splatoon3.ink API からスケジュールの取得に失敗した場合, the inkbot3 shall エラーをログ出力し、適切なエラーメッセージを含む例外をスローする

### Requirement 2: 日本語ローカライズ

**Objective:** ユーザーとして、スケジュール通知のステージ名・ルール名・ブキ名・ボス名がすべて日本語で表示されてほしい。これにより、移行前と同じユーザー体験が維持される。

#### 受け入れ基準

1. The inkbot3 shall `https://splatoon3.ink/data/locale/ja-JP.json` からローカライズデータを取得する
2. The inkbot3 shall schedules.json 内の各エンティティの `id`（base64 エンコード文字列）をキーにローカライズデータから日本語名をルックアップする
3. The inkbot3 shall ステージ名（`stages`）、ルール名（`rules`）、ブキ名（`weapons`）、ボス名（`bosses`）、イベント名・説明（`events`）を日本語に変換する
4. If ローカライズデータにIDが存在しない場合, the inkbot3 shall schedules.json に含まれる英語名をフォールバックとして使用する

### Requirement 3: 内部データ型の再設計

**Objective:** 開発者として、内部データ型の命名を splatoon3.ink のデータ構造に合わせて再設計したい。これにより、API レスポンスとコード内の型の対応関係が明確になる。

#### 受け入れ基準

1. The inkbot3 shall 型名・インターフェース名を splatoon3.ink の命名規則に合わせて変更してよい（例: `BattleSchedules` → API 構造に即した命名）
2. The inkbot3 shall `notification-service.ts` 等の依存モジュールを新しい型名に合わせて更新する
3. The inkbot3 shall 既存のテスト（`notification-service.test.ts`）を新しい型名に合わせて更新し、すべてのテストがパスする
4. The inkbot3 shall エクスポートされる関数のシグネチャが変更される場合、呼び出し元も合わせて更新する

### Requirement 4: 旧 API コードの削除

**Objective:** 開発者として、移行完了後に旧 Spla3 API 固有のコードを削除したい。これにより、コードベースの保守性を維持する。

#### 受け入れ基準

1. The inkbot3 shall 旧 Spla3 API（`spla3.yuu26.com`）のベース URL 定数を削除する
2. The inkbot3 shall 旧 Spla3 API 固有の Zod スキーマを新 API 用のスキーマに置き換える
3. The inkbot3 shall 旧 API のレスポンス形式に依存する snake_case → camelCase 変換関数を削除する
4. The inkbot3 shall ファイル名 `spla3-client.ts` を splatoon3.ink を反映した名前に変更する

### Requirement 5: API 利用ポリシーの遵守

**Objective:** 開発者として、splatoon3.ink の利用ポリシーを遵守したい。これにより、データソースとの良好な関係を維持する。

#### 受け入れ基準

1. The inkbot3 shall データ更新頻度に合わせ、schedules.json の取得を1時間に1回以下とする（既存の cron ジョブで充足）
2. The inkbot3 shall `User-Agent` ヘッダーにボット識別情報を含める
