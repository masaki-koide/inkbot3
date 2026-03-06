# Requirements Document

## Introduction
スプラトゥーン3のゲームスケジュール（ステージ・ルールのローテーション情報）を、毎日指定時刻にDiscordチャンネルへ定期通知するBotを開発する。ユーザーはスラッシュコマンドで通知先チャンネルの登録・解除を行う。通知内容は全スケジュール種別（レギュラー・バンカラ・X・イベント・サーモンラン・フェス）をまとめて1回の通知で送信する。スケジュールデータはSpla3 API（`https://spla3.yuu26.com`）から取得する。

## Requirements

### Requirement 1: 通知登録
**Objective:** Discordサーバー管理者として、スケジュール通知を受け取るチャンネルと通知時刻を登録したい。これにより、毎日自動でスケジュール情報を受け取れるようになる。

#### Acceptance Criteria
1. When ユーザーが通知登録コマンドを実行した時, the Bot shall 指定されたチャンネルと通知時刻を登録する
2. The Bot shall 通知時刻をコマンドの引数として受け付ける（例: 7時、8時など）
3. When 通知登録が完了した時, the Bot shall 登録完了メッセージ（チャンネル名・通知時刻を含む）を表示する
4. If 同一チャンネルが既に登録されている場合, then the Bot shall 通知時刻を上書き更新し、更新された旨を表示する
5. The Bot shall 登録情報を永続化し、Bot再起動後も保持する

### Requirement 2: 通知解除
**Objective:** Discordサーバー管理者として、不要になったスケジュール通知を解除したい。これにより、不要な通知を停止できる。

#### Acceptance Criteria
1. When ユーザーが通知解除コマンドを実行した時, the Bot shall 指定されたチャンネルの通知登録を削除する
2. When 通知解除が完了した時, the Bot shall 解除完了メッセージを表示する
3. If 指定されたチャンネルが登録されていない場合, then the Bot shall 登録が存在しない旨を表示する

### Requirement 3: 定期スケジュール通知
**Objective:** Discordユーザーとして、毎日指定した時刻にその日のスプラトゥーン3全スケジュールを自動で受け取りたい。これにより、能動的にスケジュールを確認する手間が省ける。

#### Acceptance Criteria
1. The Bot shall 登録されたチャンネルごとに、指定された時刻にスケジュール通知を自動送信する
2. The Bot shall 1回の通知に全スケジュール種別の情報を含める：
   - レギュラーマッチ（ステージ名・ルール名・開始時刻・終了時刻）
   - バンカラマッチ チャレンジ（ステージ名・ルール名・開始時刻・終了時刻）
   - バンカラマッチ オープン（ステージ名・ルール名・開始時刻・終了時刻）
   - Xマッチ（ステージ名・ルール名・開始時刻・終了時刻）
   - イベントマッチ（イベント名・説明・ルール・ステージ・開催期間）※開催中または予定がある場合
   - サーモンラン（ステージ名・支給ブキ・ボス情報・開始時刻・終了時刻）
   - フェス（ステージ・ルール・開催期間）※開催中または予定がある場合
3. The Bot shall Discord Embedを使用して見やすいフォーマットでスケジュール情報を表示する
4. If Spla3 APIからデータを取得できなかった場合, then the Bot shall 通知チャンネルにエラーメッセージを送信する

### Requirement 4: スラッシュコマンド
**Objective:** Discordユーザーとして、直感的なスラッシュコマンドで通知の登録・解除を行いたい。これにより、簡単にBotを管理できる。

#### Acceptance Criteria
1. The Bot shall Discordスラッシュコマンド（`/`コマンド）として通知管理機能を提供する
2. The Bot shall `/subscribe`コマンドを提供し、チャンネルと通知時刻を引数として受け付ける
3. The Bot shall `/unsubscribe`コマンドを提供し、チャンネルを引数として受け付ける

### Requirement 5: スケジュールデータ取得
**Objective:** システムとして、Spla3 APIから最新のスケジュールデータを確実に取得したい。これにより、ユーザーに正確な情報を提供できる。

#### Acceptance Criteria
1. The Bot shall Spla3 API（`https://spla3.yuu26.com`）からスケジュールデータを取得する
2. The Bot shall 対戦スケジュールには一括取得エンドポイント（`/api/schedule`）を使用する
3. The Bot shall サーモンランスケジュールには専用エンドポイント（`/api/coop-grouping/schedule`）を使用する
4. The Bot shall 取得したスケジュールデータをZodスキーマでバリデーションする
5. If APIレスポンスが期待するスキーマと一致しない場合, then the Bot shall バリデーションエラーをログに記録し、通知チャンネルにはデータ取得エラーとして通知する
6. The Bot shall APIリクエスト時にUser-Agentヘッダーを設定する

### Requirement 6: Bot基盤
**Objective:** 運用者として、Discord Botとして安定して稼働するシステムを構築したい。これにより、ユーザーが常にスケジュール通知を受け取れる。

#### Acceptance Criteria
1. The Bot shall Discord.jsを使用してDiscord Botとして動作する
2. The Bot shall 起動時にDiscordゲートウェイに接続し、スラッシュコマンドを登録する
3. The Bot shall 環境変数からDiscord Botトークンなどの設定情報を読み込む
4. If Discord接続が切断された場合, then the Bot shall 自動的に再接続を試みる
5. The Bot shall TypeScriptで実装する
