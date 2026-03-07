# 実装計画

- [x] 1. splatoon3ink-client の Zod スキーマと型定義を作成する
- [x] 1.1 splatoon3.ink schedules.json のレスポンス全体を検証する Zod スキーマを定義する
  - バトルスケジュール各種（regular, bankara, x, event, fest）のネスト構造をスキーマ化する
  - サーモンランスケジュール（coopGroupingSchedule.regularSchedules, bigRunSchedules）のネスト構造をスキーマ化する
  - GraphQL メタフィールド（`__typename`, `__isVsSetting` 等）はスキーマで許容するが型には含めない
  - ステージ画像の `image.url` ネスト構造を反映する
  - _Requirements: 1.2, 1.3, 1.4, 1.5_

- [x] 1.2 locale/ja-JP.json のレスポンスを検証する Zod スキーマを定義する
  - stages, rules, weapons, bosses, events の各カテゴリのスキーマを定義する
  - events は `{ name, desc, regulation }` の3フィールド、他は `{ name }` のみ
  - _Requirements: 2.1_

- [x] 1.3 エクスポートする内部データ型を定義する
  - VsStage, VsRule, VsScheduleEntry, EventScheduleEntry, FestScheduleEntry, CoopScheduleEntry, Schedules 等の型を splatoon3.ink の命名規則に合わせて定義する
  - すべてのフィールドを readonly にする
  - _Requirements: 3.1_

- [x] 2. splatoon3ink-client のデータ取得・変換ロジックを実装する
- [x] 2.1 schedules.json と locale/ja-JP.json を並行取得する fetchSchedules 関数を実装する
  - `Promise.all` で両エンドポイントを並行フェッチする
  - User-Agent ヘッダーに `inkbot3 (Discord Bot)` を設定する
  - HTTP エラー時はエラーログ出力後に例外をスローする
  - Zod バリデーション失敗時はエラー詳細をログ出力後に例外をスローする
  - _Requirements: 1.1, 1.5, 1.6, 1.7, 5.1, 5.2_

- [x] 2.2 ローカライズルックアップ関数を実装する
  - ロケールデータからエンティティ ID をキーに日本語名を取得する
  - ステージ・ルール・ボスは base64 ID、ブキは `__splatoon3ink_id`（hex）をキーにする
  - イベントは name と desc の両方をローカライズする
  - ID がロケールデータに存在しない場合は英語名をフォールバックする
  - _Requirements: 2.2, 2.3, 2.4_

- [x] 2.3 API レスポンスからローカライズ済み内部型への変換ロジックを実装する
  - regularSchedules, xSchedules から VsScheduleEntry への変換を実装する
  - bankaraSchedules から CHALLENGE と OPEN を分離して VsScheduleEntry に変換する
  - eventSchedules から EventScheduleEntry への変換を実装する（timePeriods をそのまま保持）
  - festSchedules から FestScheduleEntry への変換を実装する（festMatchSettings が null のエントリも含める）
  - coopGroupingSchedule の regularSchedules と bigRunSchedules を統合し CoopScheduleEntry に変換する（bigRun は `isBigRun: true`）
  - _Requirements: 1.2, 1.3, 1.4, 2.1, 2.2, 2.3_

- [x] 3. notification-service を新しい API クライアントに対応させる
- [x] 3.1 notification-service の import パスと型名を splatoon3ink-client に合わせて更新する
  - import 元を splatoon3ink-client に変更する
  - 型名を新しい命名に置き換える（BattleSchedules → Schedules、ScheduleEntry → VsScheduleEntry、Stage → VsStage、Rule → VsRule 等）
  - fetchBattleSchedules + fetchCoopSchedules の2関数呼び出しを fetchSchedules の1関数に統合する
  - _Requirements: 3.1, 3.2, 3.4_

- [x] 3.2 EventScheduleEntry の構造変更に対応する
  - 旧: 1エントリ1時間帯（startTime/endTime）→ 新: timePeriods 配列で複数時間帯
  - groupEventEntries はイベント単位のグルーピングが API 側で完了済みのため削除する
  - formatEventEntries を timePeriods ベースのフォーマットに書き換える
  - GroupedEventEntry 型を削除する
  - _Requirements: 3.1, 3.2_

- [x] 3.3 FestScheduleEntry の変更に対応する
  - isFest フィールドへの参照を削除する
  - festMatchSettings が null のエントリのフィルタリングロジックを維持する
  - _Requirements: 3.1, 3.2_

- [x] 4. テストを新しいデータ型に合わせて更新する
- [x] 4.1 notification-service.test.ts のテストヘルパーと型参照を更新する
  - makeEntry, makeEventEntry, makeCoopEntry, makeFestEntry のヘルパー関数を新型に合わせて修正する
  - import を splatoon3ink-client に変更する
  - isFest フィールドの削除を反映する
  - _Requirements: 3.3_

- [x] 4.2 イベントマッチ関連のテストを timePeriods ベースに書き換える
  - groupEventEntries のテストを削除する
  - formatEventEntries のテストを timePeriods 配列を入力とするテストに書き換える
  - buildScheduleEmbeds のイベント関連テストを更新する
  - _Requirements: 3.3_

- [x] 4.3 splatoon3ink-client のユニットテストを追加する
  - ローカライズルックアップの正常系・フォールバック（ID 不存在時に英語名を返す）をテストする
  - バンカラ CHALLENGE/OPEN 分離ロジックをテストする
  - bigRun エントリのマージロジックをテストする
  - _Requirements: 1.4, 2.2, 2.3, 2.4_

- [x] 5. 旧 API コードを削除しファイル名を変更する
  - spla3-client.ts を削除する（splatoon3ink-client.ts で完全に置き換え済み）
  - 旧 Spla3 API のベース URL 定数、Zod スキーマ、snake_case → camelCase 変換関数がすべて除去されていることを確認する
  - プロジェクト内の旧ファイルへの参照が残っていないことを確認する
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 6. ビルド検証と全テスト実行
  - TypeScript コンパイル（`npm run build`）がエラーなく完了することを確認する
  - 全テスト（`npm run test`）がパスすることを確認する
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 3.4, 4.1, 4.2, 4.3, 4.4, 5.1, 5.2_
