# ⏱️ Premium Stopwatch App

モダンなデザインと高いパフォーマンスを兼ね備えた、フルスタックのストップウォッチアプリケーションです。

## ✨ 特徴

- **💎 プレミアム UI/UX**: ダークモード、グラスモフィズム（ガラスのような質感）、洗練されたタイポグラフィを採用。
- **🚀 高パフォーマンス**: `requestAnimationFrame` (60fps) を使用した滑らかなタイマー表示。
- **📊 ラップ記録**: 経過時間を PostgreSQL データベースに永続化。ラップの個別削除も可能。
- **🔌 サーバー同期**: サーバー側で時間を管理しつつ、表示はブラウザ側でリアルタイムに更新（定期的な同期付き）。
- **🐳 簡単セットアップ**: Docker Compose を使用して、フロント、バック、DBを数秒で起動可能。

## 🛠️ 技術スタック

- **Frontend**: React (Hooks, CSS Variables, Glassmorphism)
- **Backend**: Node.js, Express
- **Database**: PostgreSQL
- **Infrastructure**: Docker, Docker Compose

## 🚀 はじめかた

### 1. 前提条件
- Docker および Docker Compose がインストールされていること。

### 2. インストールと起動
リポジトリのルートディレクトリで以下のコマンドを実行します：

```bash
docker-compose up -d --build
```

### 3. アクセス
ブラウザで以下のURLを開いてください：
- **Frontend**: [http://localhost:3000](http://localhost:3000)
- **Backend API**: [http://localhost:3001/api/time](http://localhost:3001/api/time)

## 📁 プロジェクト構造

```text
.
├── backend/            # Express サーバー (API、DB連携)
├── frontend/           # React アプリケーション (UI、ロジック)
├── docker-compose.yml  # 全サービスの定義
└── README.md           # このファイル
```

## 📝 開発メモ
- フロントエンドは Nginx 上でビルド・配信されます。
- 初期ビルド時の権限エラーを避けるため、`.dockerignore` で `node_modules` を除外設定済みです。
