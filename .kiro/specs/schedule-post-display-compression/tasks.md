# Implementation Plan

- [x] 1. Discordタイムスタンプ変換関数の実装
- [x] 1.1 (P) ISO 8601文字列をDiscord短時刻形式に変換する関数を実装する
- [x] 1.2 (P) ISO 8601文字列をDiscord相対時刻形式に変換する関数を実装する
- [x] 1.3 タイムスタンプ変換関数のユニットテストを作成する

- [x] 2. 24時間フィルタ関数の実装
- [x] 2.1 通知送信時刻から24時間以内に開始するエントリのみを抽出するフィルタ関数を実装する
- [x] 2.2 フィルタ関数のユニットテストを作成する

- [x] 3. 連続エントリ統合関数の実装（バトル系）
- [x] 3.1 (P) バトル系スケジュールの連続する同一エントリを統合する関数を実装する
- [x] 3.2 統合関数のユニットテストを作成する

- [x] 4. 仕様変更対応: タイムスタンプ形式を`:t`→`:f`に変更
- [x] 4.1 (P) formatDiscordTimeの出力を`<t:UNIX:f>`形式に変更する
  - `<t:UNIX:t>`を`<t:UNIX:f>`に変更し、日付も表示されるようにする
  - 既存テストを更新する
  - _Requirements: 5.1_

- [x] 5. 仕様変更対応: イベントマッチのグルーピング方式変更
- [x] 5.1 (P) groupEventEntries関数を実装する
  - 同一event.idのエントリをグルーピングする（隣接条件は不要）
  - 各グループにtimeRanges配列として時刻範囲を保持する
  - GroupedEventEntry型を定義する
  - mergeConsecutiveEventEntriesを置き換える
  - _Requirements: 4.1, 4.2, 4.3_

- [x] 5.2 groupEventEntries関数のユニットテストを作成する
  - 同一event.idの非隣接エントリがグルーピングされることを検証
  - 異なるevent.idのエントリが別グループになることを検証
  - 空配列の入力時に空配列が返ることを検証
  - _Requirements: 4.1, 4.2, 4.3_

- [x] 5.3 (P) formatEventEntriesをグルーピング方式に対応させる
  - groupEventEntriesを使ってグルーピング
  - 時刻を列挙形式（例: `00:00〜02:00, 04:00〜06:00`）で表示
  - イベント名・説明・ルール・ステージは1回だけ表示
  - _Requirements: 4.1, 4.2, 4.3_

- [x] 5.4 formatEventEntriesのテストを更新する
  - グルーピング後の時刻列挙表示を検証
  - _Requirements: 4.1, 4.2_

- [x] 6. 仕様変更対応: Embed分離の復元
- [x] 6.1 (P) formatScheduleEntries関数を実装する
  - formatBattleSectionの代替としてタイトル見出しなしのバトルフォーマット関数を作成
  - omitRuleオプションでルール行の省略に対応
  - 空配列時は「スケジュールなし」を返す
  - _Requirements: 1.2, 1.3_

- [x] 6.2 formatScheduleEntriesのユニットテストを作成する
  - ルール省略・ルール表示・空配列のテスト
  - _Requirements: 1.2, 1.3_

- [x] 6.3 (P) buildScheduleEmbedsをバトル個別Embed方式に変更する
  - バトル4タイプを個別Embed（色分け維持）で出力
  - ナワバリバトル: Colors.Regular、ルール省略
  - バンカラ チャレンジ/オープン: Colors.Bankara
  - Xマッチ: Colors.XMatch
  - 24hフィルタ・連続統合を適用
  - フィルタ後0件のEmbedは省略
  - サーモンラン・イベントマッチ・フェスは既存ロジックを維持
  - _Requirements: 1.1, 1.4, 2.3, 6.1, 6.2, 6.3, 6.4, 7.1-7.4, 8.1_

- [x] 6.4 buildScheduleEmbedsの統合テストを更新する
  - 通常時のEmbed数が5（バトル4+サーモンラン）であることを検証
  - 各EmbedのTitle・色を検証
  - ナワバリバトルEmbedにルール行がないことを検証
  - 24hフィルタ後0件のEmbedが省略されることを検証
  - イベントマッチ・フェス存在時のEmbed数を検証
  - _Requirements: 1.1, 7.1-7.4_

- [x] 7. 不要コードの削除
- [x] 7.1 formatBattleSection関数とmergeConsecutiveEventEntries関数を削除する
  - formatBattleSectionはformatScheduleEntriesに置き換え済み
  - mergeConsecutiveEventEntriesはgroupEventEntriesに置き換え済み
  - 関連テストも更新・削除する
