# Account Abstraction Backend Implementation Design

## 📋 プロジェクト概要

Soneium (Minato/Mainnet) 上でAccount Abstractionを利用したDAppの最小実装サンプル。
Frontend (React + RSBuild) でユーザーが署名し、Backend (Express) でPaymaster連携とBundler送信を行う。

### 主な機能
- ✅ UserOperationの作成・署名（Frontend）
- ✅ Paymasterによるガススポンサーシップ（Backend）
- ✅ Bundlerへの送信（Backend）
- ✅ トランザクションステータス確認（Backend）

---

## 🏗️ システム構成

```
┌─────────────────┐
│   Frontend      │
│ (React/RSBuild) │
│                 │
│  - Wallet接続   │
│  - UserOp作成   │
│  - 署名         │
└────────┬────────┘
         │ HTTPS
         │ POST /api/submit-userop
         ↓
┌─────────────────┐      ┌──────────────────┐
│   Backend       │      │   Paymaster      │
│   (Express)     │─────→│   Service        │
│                 │      └──────────────────┘
│  - UserOp検証   │
│  - Paymaster連携│      ┌──────────────────┐
│  - Bundler送信  │─────→│   Bundler        │
│  - ログ記録     │      └──────────────────┘
└─────────────────┘
```

---

## 📂 ディレクトリ構造

```
aa-backend-sample/
├── backend/
│   ├── src/
│   │   ├── index.ts                 # Expressサーバーエントリーポイント
│   │   ├── routes/
│   │   │   └── userOperation.ts     # UserOp関連のルート
│   │   ├── services/
│   │   │   ├── paymasterService.ts  # Paymaster連携
│   │   │   └── bundlerService.ts    # Bundler連携
│   │   ├── middleware/
│   │   │   ├── errorHandler.ts      # エラーハンドリング
│   │   │   └── validator.ts         # リクエスト検証
│   │   └── types/
│   │       └── userOperation.ts     # 型定義
│   ├── package.json
│   ├── tsconfig.json
│   ├── dev.sh.example               # 環境変数設定スクリプト例
│   └── .gitignore                   # dev.sh, node_modules等を除外
│
├── frontend/
│   ├── src/
│   │   ├── App.tsx                  # メインコンポーネント
│   │   ├── main.tsx                 # エントリーポイント
│   │   ├── index.html               # HTMLテンプレート
│   │   ├── components/
│   │   │   └── SendTransaction.tsx  # トランザクション送信UI
│   │   ├── hooks/
│   │   │   └── useSmartAccount.ts   # SmartAccount hook
│   │   └── lib/
│   │       └── api.ts               # Backend API client
│   ├── package.json
│   ├── rsbuild.config.ts            # RSBuild設定
│   └── .env.example
│
└── README.md
```

---

## 📦 必要なパッケージ

### Backend (Express)

```json
{
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "viem": "^2.30.6",
    "@startale-scs/aa-sdk": "^1.0.9",
    "zod": "^3.22.4"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/cors": "^2.8.17",
    "@types/node": "^20.11.0",
    "typescript": "^5.7.3",
    "tsx": "^4.7.0"
  },
  "scripts": {
    "dev": "tsx src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js"
  }
}
```

### Frontend (React + RSBuild)

```json
{
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "viem": "^2.30.6",
    "wagmi": "^2.5.7",
    "@startale-scs/aa-sdk": "^1.0.9",
    "@tanstack/react-query": "^5.17.0"
  },
  "devDependencies": {
    "@rsbuild/core": "^1.0.0",
    "@rsbuild/plugin-react": "^1.0.0",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "typescript": "^5.7.3"
  }
}
```

---

## 🔐 環境変数

### Backend (環境変数)

以下の環境変数を設定してください（システムの環境変数として直接設定）：

```bash
# Server
PORT=3001
NODE_ENV=development

# Network
CHAIN_ID=1946 # Soneium Minato
# CHAIN_ID=1868 # Soneium Mainnet

# Bundler
BUNDLER_URL=https://bundler.soneium.org/rpc
BUNDLER_API_KEY=your_bundler_api_key_here

# Paymaster
PAYMASTER_SERVICE_URL=https://paymaster.startale.com
PAYMASTER_ID=pm_xxxxxxxxxxxxxxxxxx

# EntryPoint
ENTRY_POINT_ADDRESS=0x0000000071727De22E5E9d8BAf0edAc6f37da032

# CORS
ALLOWED_ORIGINS=http://localhost:3000

# Rate Limiting (optional)
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_WINDOW_MS=900000
```

**起動例**:
```bash
# macOS/Linux
export PORT=3001
export PAYMASTER_ID=pm_xxxxx
npm run dev

# Windows
set PORT=3001
set PAYMASTER_ID=pm_xxxxx
npm run dev
```

### Frontend (.env)

```bash
# API
VITE_API_URL=http://localhost:3001

# Network
VITE_CHAIN_ID=1946
VITE_RPC_URL=https://rpc.minato.soneium.org

# WalletConnect (optional)
VITE_WALLETCONNECT_PROJECT_ID=your_project_id
```

---

## 🔌 API設計

### 1. UserOperation送信

**POST** `/api/user-operations`

#### Request Body
```typescript
{
  "userOp": {
    "sender": "0x...",
    "nonce": "0x...",
    "callData": "0x...",
    "callGasLimit": "0x...",
    "verificationGasLimit": "0x...",
    "preVerificationGas": "0x...",
    "maxFeePerGas": "0x...",
    "maxPriorityFeePerGas": "0x...",
    "signature": "0x...",
    "factory": "0x...",      // optional
    "factoryData": "0x..."   // optional
  },
  "chainId": 1946
}
```

#### Response (Success)
```typescript
{
  "success": true,
  "data": {
    "userOpHash": "0x...",
    "status": "submitted"
  }
}
```

#### Response (Error)
```typescript
{
  "success": false,
  "error": {
    "code": "INVALID_USEROP",
    "message": "Invalid UserOperation format"
  }
}
```

### 2. UserOperationステータス確認

**GET** `/api/user-operations/:hash`

#### Response (Pending)
```typescript
{
  "success": true,
  "data": {
    "userOpHash": "0x...",
    "status": "pending",
    "receipt": null
  }
}
```

#### Response (Confirmed)
```typescript
{
  "success": true,
  "data": {
    "userOpHash": "0x...",
    "status": "confirmed",
    "receipt": {
      "transactionHash": "0x...",
      "blockNumber": "0x...",
      "success": true,
      "actualGasUsed": "0x...",
      "logs": [...]
    }
  }
}
```

### 3. ヘルスチェック

**GET** `/health`

#### Response
```typescript
{
  "status": "ok",
  "timestamp": "2025-11-01T12:00:00Z",
  "services": {
    "bundler": "ok",
    "paymaster": "ok"
  }
}
```

---

## 🎯 責任分担

### Frontend の責任

| 処理 | 説明 |
|------|------|
| ウォレット接続 | MetaMask等のウォレットと接続 |
| SmartAccount作成 | EOAからSmartAccountアドレス導出 |
| UserOperation作成 | `prepareUserOperation`でUserOpを構築 |
| 署名 | ユーザーの秘密鍵でUserOpに署名 |
| Backend API呼び出し | 署名済みUserOpをBackendに送信 |
| ステータス表示 | トランザクション状態をUIに表示 |

### Backend の責任

| 処理 | 説明 |
|------|------|
| UserOperation検証 | 形式・署名の妥当性チェック |
| Paymaster連携 | ガススポンサーシップの署名取得 |
| Bundler送信 | UserOperationをBundlerに送信 |
| エラーハンドリング | 失敗時の適切なエラー応答 |
| ログ記録 | 全UserOpの記録・監視 |
| Rate Limiting | API使用量の制限 |
| セキュリティ | PaymasterID等の秘密情報管理 |

---

## 🚀 実装手順

### Phase 1: Backend 基盤実装

1. **プロジェクトセットアップ**
   ```bash
   mkdir aa-backend-sample
   cd aa-backend-sample
   mkdir backend frontend
   ```

2. **Backend初期化**
   ```bash
   cd backend
   npm init -y
   npm install express cors viem @startale-scs/aa-sdk zod
   npm install -D typescript @types/express @types/cors @types/node tsx
   npx tsc --init
   ```

   **package.json にスクリプト追加**:
   ```json
   {
     "scripts": {
       "dev": "tsx src/index.ts",
       "build": "tsc",
       "start": "node dist/index.js"
     }
   }
   ```

   **.gitignore 作成**:
   ```gitignore
   node_modules/
   dist/
   dev.sh
   .envrc
   .env
   .env.local
   *.log
   .DS_Store
   ```

3. **Express基本サーバー作成**
   - `src/index.ts`: サーバーエントリーポイント
   - CORS設定
   - エラーハンドリングミドルウェア
   - 環境変数は `process.env` から直接読み込み（dotenv不要）

4. **Paymaster Service実装**
   - `src/services/paymasterService.ts`
   - `createSCSPaymasterClient`でクライアント作成
   - `sponsorUserOperation`メソッド実装

5. **Bundler Service実装**
   - `src/services/bundlerService.ts`
   - `createBundlerClient`でクライアント作成
   - `sendUserOperation`メソッド実装
   - `getUserOperationReceipt`メソッド実装

6. **UserOperation Route実装**
   - `src/routes/userOperation.ts`
   - POST `/api/user-operations` エンドポイント
   - GET `/api/user-operations/:hash` エンドポイント

7. **Validation実装**
   - Zodスキーマ定義
   - リクエストバリデーションミドルウェア

### Phase 2: Frontend実装

1. **RSBuildプロジェクト作成**
   ```bash
   cd ../frontend
   npm create rsbuild@latest
   # 選択: React, TypeScript
   npm install viem wagmi @startale-scs/aa-sdk @tanstack/react-query
   ```

2. **RSBuild設定**
   - `rsbuild.config.ts`: ビルド設定とプラグイン
   - 環境変数の読み込み設定

   ```typescript
   import { defineConfig } from '@rsbuild/core';
   import { pluginReact } from '@rsbuild/plugin-react';

   export default defineConfig({
     plugins: [pluginReact()],
     html: {
       template: './src/index.html',
     },
     server: {
       port: 3000,
     },
   });
   ```

3. **Wagmi設定**
   - `src/App.tsx`: WagmiConfig設定
   - Soneiumチェーン追加

4. **SmartAccount Hook実装**
   - `src/hooks/useSmartAccount.ts`
   - `toStartaleSmartAccount`でアカウント作成
   - `sendUserOperation`関数実装

5. **API Client実装**
   - `src/lib/api.ts`
   - Backend APIとの通信ロジック

6. **UI実装**
   - `src/components/SendTransaction.tsx`
   - ウォレット接続ボタン
   - トランザクション送信ボタン
   - ステータス表示

### Phase 3: 統合テスト

1. **ローカル起動**
   ```bash
   # Backend (Terminal 1)
   # 環境変数を設定してから起動
   cd backend
   export PAYMASTER_ID=pm_xxxxx
   export PAYMASTER_SERVICE_URL=https://paymaster.startale.com
   export BUNDLER_URL=https://bundler.soneium.org/rpc
   npm run dev

   # Frontend (Terminal 2)
   cd frontend
   npm run dev
   ```

   **Note**: 環境変数が多い場合は、シェルスクリプトやdirenvの使用を推奨

2. **動作確認**
   - ウォレット接続
   - UserOperation送信
   - トランザクション確認

3. **エラーケーステスト**
   - 不正なUserOp
   - ネットワークエラー
   - Rate Limit

---

## 🧪 テスト方法

### Backend単体テスト

```bash
# Healthチェック
curl http://localhost:3001/health

# UserOp送信テスト（Postman/curl）
curl -X POST http://localhost:3001/api/user-operations \
  -H "Content-Type: application/json" \
  -d @sample-userop.json

# ステータス確認
curl http://localhost:3001/api/user-operations/0x1234...
```

### Frontend動作確認

1. ブラウザで`http://localhost:3000`を開く
2. MetaMaskを接続（Soneium Minato切り替え）
3. "Send Transaction"ボタンをクリック
4. MetaMaskで署名
5. トランザクションステータスを確認

---

## 📊 実装優先度

### 必須機能（MVP）
- [x] UserOperation送信エンドポイント
- [x] Paymaster連携
- [x] Bundler送信
- [x] 基本的なエラーハンドリング
- [x] Frontend UI（送信ボタン）

### 推奨機能
- [ ] UserOperationステータス確認
- [ ] リクエストバリデーション
- [ ] Rate Limiting
- [ ] ログ記録

### オプション機能
- [ ] データベース連携（履歴保存）
- [ ] WebSocket（リアルタイム通知）
- [ ] 管理ダッシュボード
- [ ] メトリクス収集

---

## ⚠️ セキュリティチェックリスト

- [ ] 環境変数に秘密情報を格納（システム環境変数またはシークレット管理ツール使用）
- [ ] 環境変数をバージョン管理に含めない（.gitignore確認）
- [ ] HTTPS通信必須（本番環境）
- [ ] CORS設定を適切に制限
- [ ] Rate Limitingの実装
- [ ] UserOperation内容の検証
- [ ] エラーメッセージに機密情報を含めない
- [ ] PaymasterID/BundlerキーをFrontendに露出しない
- [ ] 入力サニタイゼーション

---

## 📚 参考リソース

- [Startale AA SDK Documentation](https://docs.startale.com)
- [Viem Documentation](https://viem.sh)
- [ERC-4337 Specification](https://eips.ethereum.org/EIPS/eip-4337)
- [Soneium Documentation](https://docs.soneium.org)

---

## 🎓 次のステップ

1. ✅ この設計書に基づいて実装
2. 🧪 Minato testnetで動作確認
3. 🔧 必要に応じて機能追加
4. 🚀 Mainnetデプロイ準備

---

## 🤔 なぜ RSBuild を選んだのか？

### Next.js ではなく RSBuild を使う理由

このサンプルでは **Backend が Express で完全分離** されているため、Next.js の主要機能が不要です：

| 機能 | Next.js | 必要性 | RSBuild |
|------|---------|--------|---------|
| SSR/SSG | ✅ | ❌ (純粋なSPA) | ❌ |
| API Routes | ✅ | ❌ (Expressで実装) | ❌ |
| File-based Routing | ✅ | ❌ (シングルページ) | ❌ |
| Server Components | ✅ | ❌ | ❌ |
| **ビルド速度** | 普通 | ✅ | ⚡ **爆速** (Rust製) |
| **バンドルサイズ** | 大きい | ✅ | 🎯 **最小** |
| **シンプルさ** | 複雑 | ✅ | ✅ **シンプル** |

### RSBuild のメリット

1. **🚀 爆速ビルド** - Rustベースで従来のツールの5-10倍高速
2. **📦 軽量** - 不要な機能がなく、純粋なバンドラー
3. **🎯 学習コストが低い** - Webpack互換、シンプルな設定
4. **✅ 完全なTypeScript対応** - wagmi, viem等との相性良好
5. **🔧 拡張性** - プラグインで必要に応じて機能追加

### いつ Next.js を使うべきか

以下の場合は Next.js の方が適切です：

- ✅ SEOが重要（SSR/SSG必須）
- ✅ Backend API も同じリポジトリで管理したい
- ✅ 複数ページのWebアプリケーション
- ✅ Vercel等へのデプロイで恩恵を受けたい

このサンプルは **最小限のAccount Abstraction実装** が目的なので、RSBuildが最適なのだ！

---

## 🔧 環境変数管理のベストプラクティス

このサンプルでは dotenv を使用せず、**システム環境変数を直接使用** します。

### 開発環境での管理方法

#### オプション1: シェルスクリプト（推奨）

```bash
# backend/dev.sh
#!/bin/bash
export PORT=3001
export PAYMASTER_ID=pm_xxxxx
export PAYMASTER_SERVICE_URL=https://paymaster.startale.com
export BUNDLER_URL=https://bundler.soneium.org/rpc
export ALLOWED_ORIGINS=http://localhost:3000

npm run dev
```

```bash
chmod +x dev.sh
./dev.sh
```

#### オプション2: direnv（ディレクトリ単位）

```bash
# .envrc
export PORT=3001
export PAYMASTER_ID=pm_xxxxx
export PAYMASTER_SERVICE_URL=https://paymaster.startale.com
```

```bash
# direnvをインストール（macOS）
brew install direnv

# .envrcを許可
direnv allow

# ディレクトリに入ると自動で環境変数が設定される
cd backend
npm run dev
```

#### オプション3: IDE統合（VSCode等）

```json
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Launch Backend",
      "program": "${workspaceFolder}/backend/src/index.ts",
      "runtimeExecutable": "tsx",
      "env": {
        "PORT": "3001",
        "PAYMASTER_ID": "pm_xxxxx",
        "PAYMASTER_SERVICE_URL": "https://paymaster.startale.com"
      }
    }
  ]
}
```

### 本番環境での管理

本番環境では以下のシークレット管理ツール使用を推奨：

| サービス | 用途 |
|---------|------|
| AWS Secrets Manager | AWS環境 |
| Google Cloud Secret Manager | GCP環境 |
| HashiCorp Vault | マルチクラウド |
| Railway/Render環境変数 | PaaS |

### セキュリティ注意点

- ✅ `.env` や `dev.sh` は **必ず `.gitignore` に追加**
- ✅ `.env.example` で変数名だけを共有（値は含めない）
- ✅ 本番環境の秘密情報は開発環境と別管理
- ❌ 環境変数をコード内にハードコーディングしない

---

## 📝 備考

- **最小限の実装**: この設計書は最も基本的な機能のみを含む
- **拡張性**: 必要に応じてDB、キャッシュ、監視ツール等を追加可能
- **Production Ready**: 本番環境ではHTTPS、認証、監視が必須
- **フレームワーク選択**: RSBuildは最小構成に最適。規模拡大時は再検討推奨
