# Requirements Document

## Introduction

Splatoon 3 スケジュール通知 Discord Bot（inkbot3）の `/subscribe` および `/unsubscribe` コマンドのオプションを簡略化する。現在は `channel`（通知先チャンネル）と `hour`（通知時刻）がともに必須オプションだが、`channel` オプションを完全に廃止してコマンド実行チャンネルのみを対象とし、`hour` オプションにはデフォルト値を設けて任意化する。これにより、ユーザーはオプションなしでコマンドを実行できるようになる。

## Requirements

### Requirement 1: subscribe コマンドの channel オプション廃止

**Objective:** Discord サーバーのユーザーとして、`/subscribe` コマンドはコマンドを実行したチャンネルのみを通知先として登録するようにしたい。チャンネル指定を不要にすることで、操作を簡略化し、意図しないチャンネルへの通知設定を防止したい。

#### Acceptance Criteria

1. When ユーザーが `/subscribe` コマンドを実行した場合, the Bot shall コマンドが実行されたチャンネルを通知先チャンネルとして登録する
2. The Bot shall `/subscribe` コマンドに channel オプションを提供しない
3. If コマンドがサーバー外（DM等）で実行された場合, the Bot shall エラーメッセージを表示し、サーバー内のテキストチャンネルで実行するよう案内する

### Requirement 2: unsubscribe コマンドの channel オプション廃止

**Objective:** Discord サーバーのユーザーとして、`/unsubscribe` コマンドはコマンドを実行したチャンネルの通知登録のみを解除するようにしたい。操作対象を実行チャンネルに限定することで、誤操作を防止したい。

#### Acceptance Criteria

1. When ユーザーが `/unsubscribe` コマンドを実行した場合, the Bot shall コマンドが実行されたチャンネルの通知登録を解除する
2. The Bot shall `/unsubscribe` コマンドに channel オプションを提供しない
3. If 該当チャンネルの通知登録が存在しない場合, the Bot shall 登録が見つからない旨の警告メッセージを表示する

### Requirement 3: subscribe コマンドの hour オプション任意化

**Objective:** Discord サーバーのユーザーとして、`/subscribe` コマンドの hour オプションを省略してデフォルト時刻で素早く登録できるようにしたい。必要に応じて時刻を指定することもできるようにしたい。

#### Acceptance Criteria

1. When ユーザーが `/subscribe` コマンドを hour オプションなしで実行した場合, the Bot shall デフォルトの通知時刻（7時）で登録する
2. When ユーザーが `/subscribe` コマンドを hour オプション付きで実行した場合, the Bot shall 指定された時刻で登録する
3. The Bot shall hour オプションの値として 0〜23 の整数のみを受け付ける

### Requirement 4: 応答メッセージでの設定内容表示

**Objective:** Discord サーバーのユーザーとして、コマンド実行後の応答メッセージで設定内容を確認できるようにしたい。

#### Acceptance Criteria

1. When subscribe コマンドが成功した場合, the Bot shall 登録されたチャンネルと通知時刻を応答メッセージに含める
2. When unsubscribe コマンドが成功した場合, the Bot shall 解除されたチャンネルを応答メッセージに含める
