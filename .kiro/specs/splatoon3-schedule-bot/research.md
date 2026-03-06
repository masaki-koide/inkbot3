# Research & Design Decisions

## Summary
- **Feature**: `splatoon3-schedule-bot`
- **Discovery Scope**: New Feature（グリーンフィールド）
- **Key Findings**:
  - Spla3 APIはレスポンスが日本語対応済みで、`/api/schedule`で対戦スケジュール一括取得、`/api/coop-grouping/schedule`でサーモンラン取得が可能
  - node-cronは軽量で依存関係ゼロ、定期実行に最適。Botは常駐プロセスのためnode-cronが適合する
  - Prisma 7 + SQLite（better-sqlite3アダプター）で型安全なDB操作を実現。将来的なDB移行にも対応可能
  - OCI Free Tier（ARM Ampere A1）上でDockerコンテナとしてデプロイ

## Research Log

### Spla3 API構造調査
- **Context**: 要件5で指定されたデータ取得元APIの仕様確認
- **Sources**: https://spla3.yuu26.com/api/schedule, https://spla3.yuu26.com/api/coop-grouping/schedule
- **Findings**:
  - `/api/schedule`レスポンス: `result`オブジェクト内に`regular`, `bankara_challenge`, `bankara_open`, `x`, `event`, `fest`, `fest_challenge`の7カテゴリ
  - 各エントリ共通フィールド: `start_time`, `end_time`, `rule`(key/name), `stages`(id/name/image配列), `is_fest`
  - `event`エントリは追加で`event`オブジェクト(id/name/desc)を持つ
  - `fest`エントリは`rule`と`stages`がnull、`is_tricolor`と`tricolor_stages`フィールドあり
  - `/api/coop-grouping/schedule`レスポンス: `results`配列内に`start_time`, `end_time`, `boss`(id/name), `stage`(id/name/image), `weapons`(name/image配列), `is_big_run`
  - タイムスタンプはJST(+09:00)のISO 8601形式
  - User-Agentヘッダーの設定が推奨される
- **Implications**: Zodスキーマでレスポンス型を定義し、全フィールドを厳密にバリデーション可能

### 定期実行ライブラリ調査
- **Context**: 要件3の定期スケジュール通知実行のための技術選定
- **Sources**: https://www.npmjs.com/package/node-cron, https://www.npmjs.com/package/cron
- **Findings**:
  - `node-cron`: 純粋JavaScript、外部依存なし、軽量。crontab構文の6フィールド拡張（秒単位精度）対応。`start()`/`stop()`で動的制御可能
  - `cron`(kelektiv): より高機能だがnode-cronより重い
  - node-cronはジョブの永続化機能を持たないが、Discord Botは常駐プロセス（WebSocket接続維持）のため問題にならない
  - 通知設定の永続化はDB（SQLite）で管理し、node-cronはスケジューリングトリガーのみ担当
- **Implications**: node-cronを採用。役割を「いつ実行するか（トリガー）」に限定し、「何を実行するか（データ）」はSQLiteで管理

### データ永続化方式調査
- **Context**: 要件1.5の登録情報永続化のための技術選定。将来性を考慮
- **Sources**: https://www.prisma.io/docs/getting-started/prisma-orm/quickstart/sqlite, https://www.prisma.io/docs/orm/overview/databases/sqlite
- **Findings**:
  - Prisma 7はドライバーアダプター方式に移行。SQLiteには`@prisma/adapter-better-sqlite3`を使用
  - `generator client`に`provider = "prisma-client"`、`output = "../generated/prisma"`を指定
  - `datasource db`に`provider = "sqlite"`を指定
  - クライアント初期化: `PrismaBetterSqlite3`アダプターを`PrismaClient`に渡す
  - 必要パッケージ: `prisma`, `@prisma/client`, `@prisma/adapter-better-sqlite3`, `@types/better-sqlite3`
  - Prisma 7.3.0でSQLite 3.51.0のバグ修正済み
  - 将来PostgreSQL等に移行する場合、Prismaスキーマのprovider変更とアダプター差し替えのみで対応可能
- **Implications**: Prisma 7 + SQLite（better-sqlite3）を採用。型安全なDB操作とマイグレーション管理を活用

### インフラ・デプロイ調査
- **Context**: OCI上でのDocker運用方式の検討
- **Sources**: https://oneuptime.com/blog/post/2026-02-08-how-to-set-up-docker-on-an-oracle-cloud-free-tier-instance/view, https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm
- **Findings**:
  - OCI Free Tier: ARM Ampere A1（最大4 OCPU / 24 GB RAM）が無料で利用可能
  - Docker対応: Oracle Linux/Ubuntu上にDocker Engineをインストールして運用
  - ARMインスタンス推奨: メモリが豊富でDockerワークロードに最適
  - Dockerイメージ: `linux/arm64`対応イメージを使用（Node.js公式イメージは対応済み）
  - SQLiteのDBファイルはDockerボリュームでホストにマウントし、コンテナ再作成時もデータを保持
- **Implications**: OCI Free Tier ARM + Dockerで運用。マルチステージビルドでイメージサイズを最小化

### Terraform + OCI調査
- **Context**: OCIインフラのコード管理（IaC）のための技術選定
- **Sources**: https://developer.hashicorp.com/terraform/tutorials/oci-get-started, https://learn.arm.com/learning-paths/servers-and-cloud-computing/oci-terraform/tf-oci/, https://github.com/RhubarbSin/terraform-oci-free-compute-maximal-example
- **Findings**:
  - OCI公式Terraformプロバイダー（`oracle/oci`）がHashiCorp Registryで提供されている
  - 認証方式: APIキー認証（`~/.oci/config`の`config_file_profile`を参照）
  - Free Tier ARM構成: `VM.Standard.A1.Flex`シェイプで1 OCPU / 6 GB RAM程度をBot用に確保すれば十分
  - プロビジョニング対象リソース:
    - VCN（Virtual Cloud Network）+ サブネット + Internet Gateway
    - セキュリティリスト（SSH用ポート22のイングレス）
    - Compute Instance（ARM Ampere A1、Ubuntu/Oracle Linux）
    - cloud-initでDocker + Docker Composeの自動セットアップ
  - GitHub上に複数のOCI Free Tier向けTerraform設定例あり
  - OCI Resource ManagerでもTerraformをマネージド実行可能（ただしローカル実行が一般的）
- **Implications**: Terraformでインフラ全体をコード管理。VCN/サブネット/セキュリティリスト/Compute Instanceを定義し、cloud-initでDocker環境を自動構築

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| レイヤードアーキテクチャ | コマンド層→サービス層→データ/外部連携層の3層構造 | シンプル、小規模プロジェクトに適合、理解しやすい | 大規模化時の拡張性 | 本プロジェクトの規模に最適 |
| ヘキサゴナル | ポート＆アダプター | テスタビリティが高い | 過剰な抽象化、小規模プロジェクトにはオーバーエンジニアリング | 不採用 |

## Design Decisions

### Decision: 定期実行方式
- **Context**: 登録チャンネルごとに異なる時刻で通知を送信する必要がある
- **Alternatives**:
  1. チャンネルごとに個別cronジョブ — 各登録に1つのcronジョブを作成
  2. 毎時チェック方式 — 1つのcronジョブが毎時0分に実行し、該当時刻の登録を検索
- **Selected**: 毎時チェック方式
- **Rationale**: cronジョブの動的な追加・削除管理が不要になり、シンプルに実装できる。通知時刻は「時」単位のため毎時0分の実行で十分
- **Trade-offs**: 全登録が毎時チェックされるが、SQLiteクエリ（`WHERE hour = ?`）は軽量
- **Follow-up**: 通知送信の正確性を実装時に検証

### Decision: データ永続化方式
- **Context**: 通知登録情報をBot再起動後も保持する必要がある。将来的な拡張性も考慮
- **Alternatives**:
  1. JSONファイル（fs直接） — 最小依存
  2. lowdb — JSONベースDB
  3. SQLite + Prisma — リレーショナルDB + ORM
- **Selected**: SQLite + Prisma
- **Rationale**: Prismaにより型安全なDB操作とマイグレーション管理が可能。将来的にPostgreSQL等への移行も容易。ORMによりSQLを直接書く必要がない
- **Trade-offs**: JSONファイルに比べて依存パッケージが増加するが、型安全性・マイグレーション・拡張性のメリットが大きい

### Decision: インフラ・デプロイ方式
- **Context**: 常駐プロセスとしてDiscord Botを安定運用する必要がある
- **Alternatives**:
  1. OCI Compute Instance（直接実行） — Node.jsを直接起動
  2. OCI Compute Instance + Docker — コンテナとしてデプロイ
  3. OCI Container Instances — マネージドコンテナ
- **Selected**: OCI Compute Instance + Docker
- **Rationale**: Free Tier ARM Ampere A1で無料運用可能。Dockerによりデプロイの再現性と環境分離を確保。docker composeで管理が容易
- **Trade-offs**: Docker学習コストがあるが、デプロイの再現性と運用の簡便さのメリットが大きい

### Decision: インフラ管理方式
- **Context**: OCIインフラの構築と管理を再現可能な形で行いたい
- **Alternatives**:
  1. OCI Web Console手動操作 — GUIで構築
  2. OCI CLI — コマンドラインで構築
  3. Terraform — IaCでコード管理
- **Selected**: Terraform
- **Rationale**: インフラ構成をコードとしてバージョン管理できる。変更の追跡・再現・共有が容易。OCI公式プロバイダーが利用可能
- **Trade-offs**: 初期のTerraform設定作成コストがあるが、再構築やインフラ変更時のメリットが大きい
- **Follow-up**: Terraformの状態ファイル（tfstate）の管理方針を決定（ローカル管理 or リモートバックエンド）

## Risks & Mitigations
- Spla3 APIの仕様変更やサービス停止 — Zodバリデーションでスキーマ不一致を早期検出、エラーメッセージでユーザーに通知
- node-cronの精度 — 毎時0分のトリガーであり数秒の誤差は用途上問題ない
- SQLiteファイルの破損 — Dockerボリュームでホストにマウントし永続化。SQLite自体がACIDトランザクション対応
- ARMアーキテクチャの互換性 — Node.js公式イメージがARM対応済み。Prisma/better-sqlite3もARM対応
- OCI Always Freeアイドルインスタンス削除 — 7日間以上CPU/ネットワーク/メモリ使用率がすべて20%未満の場合、インスタンスが削除される可能性がある。Discord BotはWebSocket常時接続によりネットワーク使用があるため通常は該当しないが、長期的に監視が必要

## References
- [Spla3 API](https://spla3.yuu26.com) — スプラトゥーン3スケジュールAPI
- [node-cron](https://www.npmjs.com/package/node-cron) — 軽量cronスケジューラ
- [discord.js v14](https://discord.js.org/) — Discord Bot フレームワーク
- [Zod](https://zod.dev/) — TypeScript-firstバリデーションライブラリ
- [Prisma 7 SQLite Quickstart](https://www.prisma.io/docs/getting-started/prisma-orm/quickstart/sqlite) — Prisma + SQLiteセットアップガイド
- [OCI Free Tier](https://www.oracle.com/cloud/free/) — Oracle Cloud無料枠
- [OCI Docker Setup Guide](https://oneuptime.com/blog/post/2026-02-08-how-to-set-up-docker-on-an-oracle-cloud-free-tier-instance/view) — OCI上のDockerセットアップ
- [Terraform OCI Get Started](https://developer.hashicorp.com/terraform/tutorials/oci-get-started) — Terraform OCI公式チュートリアル
- [Deploy ARM on OCI with Terraform](https://learn.arm.com/learning-paths/servers-and-cloud-computing/oci-terraform/tf-oci/) — Terraform + OCI ARMデプロイガイド
- [terraform-oci-free-compute-maximal-example](https://github.com/RhubarbSin/terraform-oci-free-compute-maximal-example) — OCI Free Tier Terraform設定例
