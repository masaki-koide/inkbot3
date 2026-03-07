# Requirements Document

## Introduction
inkbot3（Splatoon 3 スケジュール通知 Discord ボット）にイベントログ収集機能を導入する。ボットの利用状況（どのギルド・チャンネルで、誰が、どのコマンドを実行したか）をデータベースに蓄積し、後々の分析に活用する。Discord APIではIDから名前を後から取得することが困難な場合があるため、ID と名前の両方を記録する。今後のコマンド追加にも対応できる汎用的なテーブル設計とする。

## Requirements

### Requirement 1: コマンド実行イベントのDB保存
**Objective:** As a 運用者, I want スラッシュコマンドの実行イベントがデータベースに永続化されること, so that ボットの利用状況を後から分析できる

#### Acceptance Criteria
1. When スラッシュコマンドが実行された, the inkbot3 shall コマンド実行イベントをデータベースに保存する
2. The inkbot3 shall 各イベントレコードにコマンド名を記録する
3. The inkbot3 shall 各イベントレコードにコマンド実行時刻を記録する
4. The inkbot3 shall 今後追加される任意のスラッシュコマンドについても、同じテーブル構造でイベントを記録できる

### Requirement 2: 実行場所（ギルド・チャンネル）の記録
**Objective:** As a 分析者, I want コマンドがどのギルド・チャンネルで実行されたかを把握したい, so that サーバーごと・チャンネルごとの利用傾向を分析できる

#### Acceptance Criteria
1. The inkbot3 shall 各イベントレコードにギルドID とギルド名を記録する
2. The inkbot3 shall 各イベントレコードにチャンネルID とチャンネル名を記録する
3. When ギルド外（DM等）でコマンドが実行された, the inkbot3 shall ギルド情報を null として記録する

### Requirement 3: 実行ユーザーの記録
**Objective:** As a 分析者, I want コマンドを実行したユーザーを特定したい, so that ユーザーごとの利用状況を分析できる

#### Acceptance Criteria
1. The inkbot3 shall 各イベントレコードにユーザーID とユーザー名を記録する

### Requirement 4: コマンドパラメータの記録
**Objective:** As a 分析者, I want コマンドに渡されたパラメータも記録したい, so that どのような設定で利用されているか分析できる

#### Acceptance Criteria
1. The inkbot3 shall 各イベントレコードにコマンドのオプション（パラメータ）を文字列として記録する

### Requirement 5: イベントログ記録の非阻害性
**Objective:** As a ユーザー, I want イベントログの記録処理がコマンドの応答に影響しないこと, so that ボットの応答性が維持される

#### Acceptance Criteria
1. If イベントログのDB保存に失敗した, then the inkbot3 shall コマンド自体の処理は正常に継続する
2. If イベントログのDB保存に失敗した, then the inkbot3 shall エラーを標準エラー出力にログ出力する
