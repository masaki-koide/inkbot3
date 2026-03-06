# Requirements Document

## Introduction

inkbot3はSplatoon 3のスケジュール情報をDiscordチャンネルに定期通知するBotである。現状、各スケジュールタイプ（レギュラーマッチ、バンカラマッチ チャレンジ、バンカラマッチ オープン、Xマッチ、イベントマッチ、サーモンラン、フェス）がそれぞれ個別のDiscord Embedとして送信されており、1回の通知で5〜7個のEmbedが並ぶ。これにより、チャンネル上で通知が大きなスペースを占有し、他の会話が埋もれやすい。

「スケジュール投稿表示圧縮」は、Discordタイムスタンプ形式の採用、24時間以内のスケジュールのみ表示、連続する同一バトルのマージ、同一イベントの時刻列挙によるグルーピングにより、各Embedの情報密度を最適化し、表示を圧縮する機能である。バトル系4タイプは色分けされた個別Embedを維持し、視認性を確保する。

## Requirements

### Requirement 1: バトルスケジュールEmbed個別表示

**Objective:** Discordユーザーとして、バトル系スケジュール（ナワバリバトル、バンカラ チャレンジ、バンカラ オープン、Xマッチ）をそれぞれ色分けされた個別Embedで表示してほしい。色で種類を瞬時に識別できるため。

#### 1-AC: Acceptance Criteria

1. The NotificationService shall ナワバリバトル・バンカラマッチ チャレンジ・バンカラマッチ オープン・XマッチをそれぞれのEmbed色で個別表示する
2. The NotificationService shall ナワバリバトル（旧レギュラーマッチ）のEmbedにはルール表記を省略する（ルールは常にナワバリバトルであるため）
3. The NotificationService shall ナワバリバトル以外のEmbedには時間帯・ルール・ステージ情報を含める
4. The NotificationService shall 各Embedの情報が欠落しないことを保証する

### Requirement 2: 24時間以内のスケジュールのみ表示

**Objective:** Discordユーザーとして、デイリー通知に関連するスケジュール（通知時刻から24時間以内に開始するもの）のみ表示してほしい。当日に関係ない未来のスケジュールが表示されると情報が過多になるため。

#### 2-AC: Acceptance Criteria

1. The NotificationService shall 通知送信時刻から24時間以内に開始するスケジュールのみを表示対象とする
2. When スケジュールエントリのstartTimeが通知送信時刻から24時間を超える, the NotificationService shall そのエントリを表示から除外する
3. The NotificationService shall フィルタリング後にスケジュールが0件となったEmbedを表示しない

### Requirement 3: 連続する同一エントリの統合

**Objective:** Discordユーザーとして、同一ルール・同一ステージの連続するバトルエントリを1つにまとめて表示してほしい。同じ内容が繰り返し表示されると冗長で読みにくいため。

#### 3-AC: Acceptance Criteria

1. When 連続する時間枠で同一のバトル（同一ルール・同一ステージ構成）が続く, the NotificationService shall それらを1つのエントリとして統合し、開始時刻を最初のエントリの開始時刻、終了時刻を最後のエントリの終了時刻とする
2. The NotificationService shall 統合対象はstartTime/endTimeが隣接する（前のendTime == 次のstartTime）エントリのみとする

### Requirement 4: 同一イベントマッチの時刻グルーピング

**Objective:** Discordユーザーとして、同一のイベントマッチ（同一event.id）が複数の時間枠で開催される場合、イベント情報を1回だけ表示し、開催時刻を列挙してまとめてほしい。2時間ごとの空き時間を挟んで開催されるイベントが冗長に繰り返されるのを防ぐため。

#### 4-AC: Acceptance Criteria

1. The NotificationService shall 同一event.idを持つイベントエントリをグルーピングする（隣接していなくてもよい）
2. The NotificationService shall グルーピングされたイベントについて、イベント名・説明・ルール・ステージを1回だけ表示し、各開催時間帯を列挙形式（例: `00:00〜02:00, 04:00〜06:00`）で表示する
3. The NotificationService shall 異なるevent.idのイベントは別々に表示する

### Requirement 5: Discordタイムスタンプ形式の採用

**Objective:** Discordユーザーとして、スケジュールの時刻表示にDiscord標準のタイムスタンプ形式（`<t:UNIX:format>`）を使用してほしい。ホバーでツールチップが表示され、ユーザーのローカルタイムゾーンに自動変換されるため。

#### 5-AC: Acceptance Criteria

1. The NotificationService shall スケジュールの開始時刻・終了時刻をDiscordタイムスタンプ形式（`<t:UNIX_TIMESTAMP:f>`、日付付き時刻表示）で表示する
2. The NotificationService shall 開始時刻に対して相対時刻表示（`<t:UNIX_TIMESTAMP:R>`、例: "2時間後"）を併記する
3. The NotificationService shall 従来の`MM/DD HH:MM`形式のテキスト表示を廃止し、Discordタイムスタンプ形式に完全移行する

### Requirement 6: サーモンランEmbed維持

**Objective:** Discordユーザーとして、サーモンランのスケジュールはバトル系とは別のEmbedとして表示してほしい。バトルとは異なる情報構成（ブキ、ボス、ビッグラン）を持ち、性質が異なるため。

#### 6-AC: Acceptance Criteria

1. The NotificationService shall サーモンランのスケジュールを独立したEmbedとして維持する
2. The NotificationService shall サーモンランEmbedにステージ・ブキ・ボス情報を現行と同等の内容で表示する
3. While ビッグランが開催中である, the NotificationService shall ビッグラン開催中である旨を表示する

### Requirement 7: イベントマッチ・フェスの条件付き表示

**Objective:** Discordユーザーとして、イベントマッチやフェスが開催中の場合のみそれぞれの情報が表示されてほしい。不要な空Embedが表示されないようにするため。

#### 7-AC: Acceptance Criteria

1. When イベントマッチのスケジュールデータが存在する, the NotificationService shall イベントマッチ情報を独立したEmbedとして表示する
2. When フェスのスケジュールデータが存在する, the NotificationService shall フェス情報を独立したEmbedとして表示する
3. When イベントマッチのスケジュールデータが存在しない, the NotificationService shall イベントマッチEmbedを送信しない
4. When フェスのスケジュールデータが存在しない, the NotificationService shall フェスEmbedを送信しない

### Requirement 8: フォーマット品質

**Objective:** Discordユーザーとして、表示がDiscord上で見やすく整理されてほしい。素早く必要な情報を見つけられるようにするため。

#### 8-AC: Acceptance Criteria

1. The NotificationService shall Embedのdescriptionフィールドの文字数をDiscordの上限（4096文字）以内に収める

### Requirement 9: エラー表示の維持

**Objective:** Discordユーザーとして、スケジュール取得失敗時のエラー通知が現行通り機能してほしい。表示圧縮がエラーハンドリングに影響しないようにするため。

#### 9-AC: Acceptance Criteria

1. If スケジュールデータの取得に失敗した, the NotificationService shall 現行と同一のエラーEmbed（赤色、エラーメッセージ）を送信する
2. If スケジュールデータの取得に失敗した, the NotificationService shall エラーログを出力する
