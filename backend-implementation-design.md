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

**注意**: `viem`と`wagmi`は互換性のため厳密なバージョン指定が必要

```json
{
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "viem": "2.30.6",
    "wagmi": "2.5.7",
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
PUBLIC_API_URL=http://localhost:3001

# Network
PUBLIC_CHAIN_ID=1946
PUBLIC_RPC_URL=https://rpc.minato.soneium.org

# WalletConnect (optional)
PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id
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

## 📐 実装方針の詳細

### アーキテクチャ選択: Frontend署名 → Backend Paymaster連携 → Backend Bundler送信

このプロジェクトでは、以下の方針で実装する：

```
┌─────────────────────────────────────────────────────────┐
│ Frontend (React)                                        │
│                                                          │
│ 1. SmartAccountClientでUserOperation作成               │
│    ※ paymaster設定なし（通常のRPC使用）                │
│ 2. ユーザーの秘密鍵でUserOperationに署名               │
│ 3. 署名済みUserOpをBackendに送信                       │
└───────────────┬─────────────────────────────────────────┘
                │ POST /api/user-operations
                │ { userOp, chainId }
                ↓
┌─────────────────────────────────────────────────────────┐
│ Backend (Express)                                       │
│                                                          │
│ 1. 署名済みUserOperationを受信・検証                   │
│ 2. Paymaster APIを呼び出してPaymaster情報を取得        │
│ 3. UserOperationにPaymaster情報を追加:                 │
│    - paymaster, paymasterData,                         │
│      paymasterVerificationGasLimit,                    │
│      paymasterPostOpGasLimit                           │
│ 4. Bundlerに送信してuserOpHashを取得                   │
│ 5. userOpHashをFrontendに返却                          │
└─────────────────────────────────────────────────────────┘
```

### 方針の特徴

#### ✅ Non-custodial（ユーザーが秘密鍵を保持）
- Frontend側でユーザーの秘密鍵を使用して署名
- Backend側に秘密鍵を預ける必要がない
- セキュリティリスクが低い

#### ✅ 参考実装（demo_basic_userop.ts）に近い
- Frontend側で`SmartAccountClient`を使用してUserOperation作成
- Backend側でPaymaster連携とBundler送信を処理

#### ✅ ERC-4337の並列署名機能を活用
- **重要**: ERC-4337では、UserOperationハッシュは`signature`と`paymasterSignature`を**除外して**計算される
- ユーザーの署名後にPaymaster情報を追加しても、**ユーザーの署名は無効化されない**
- ユーザーとPaymasterは独立して並列に署名可能

#### ✅ Backend側で秘密情報を管理
- PaymasterIDはBackend側の環境変数で管理
- Frontend側に秘密情報を露出させない

### Frontend実装の詳細

```typescript
// Frontend側: paymasterなしでSmartAccountClientを作成
const smartAccountClient = createSmartAccountClient({
  account: await toStartaleSmartAccount({
    signer: walletClient,  // ← Frontendのウォレット
    chain: chain,
    transport: http(rpcUrl),  // ← 通常のRPC（Bundlerではない）
  }),
  client: publicClient,
  // ⚠️ paymasterは設定しない
});

// UserOperationを準備・署名
const userOp = await smartAccountClient.prepareUserOperation({
  calls: [{ to, value, data }],
});

// Backend APIに送信
const response = await fetch('/api/user-operations', {
  method: 'POST',
  body: JSON.stringify({ userOp, chainId }),
});
```

### Backend実装の詳細

#### paymasterService.ts
```typescript
export async function sponsorUserOperation(
  userOp: UserOperation
): Promise<UserOperation> {
  const client = getPaymasterClient();
  const context = getPaymasterContext();

  // Paymaster APIを呼び出してPaymaster情報を取得
  const paymasterData = await client.sponsorUserOperation({
    userOp,
    context,
  });

  // UserOperationにPaymaster情報を追加
  // ⚠️ ユーザーの署名は無効化されない（ERC-4337の並列署名機能）
  return {
    ...userOp,
    paymaster: paymasterData.paymaster,
    paymasterData: paymasterData.paymasterData,
    paymasterVerificationGasLimit: paymasterData.paymasterVerificationGasLimit,
    paymasterPostOpGasLimit: paymasterData.paymasterPostOpGasLimit,
  };
}
```

#### bundlerService.ts
```typescript
export async function sendUserOperation(
  userOp: UserOperation
): Promise<string> {
  const bundlerClient = getBundlerClient();
  const userOpHash = await bundlerClient.sendUserOperation(userOp);
  return userOpHash;
}
```

#### routes/userOperation.ts
```typescript
router.post('/user-operations', async (req, res) => {
  // 1. バリデーション
  const { userOp, chainId } = validateRequest(req.body);

  // 2. Paymaster情報を追加
  const sponsoredUserOp = await sponsorUserOperation(userOp);

  // 3. Bundlerに送信
  const userOpHash = await sendUserOperation(sponsoredUserOp);

  // 4. レスポンス
  res.json({ success: true, data: { userOpHash, status: 'submitted' } });
});
```

### 参考実装との違い

| 項目 | 参考実装（demo_basic_userop.ts） | このプロジェクト |
|------|--------------------------------|-----------------|
| 実行環境 | Node.js CLI | Frontend (React) + Backend (Express) |
| Signer | Node.js側で秘密鍵管理 | Frontend側でウォレット接続 |
| SmartAccountClient | 全て1箇所で処理 | Frontend側で作成（paymasterなし） |
| Paymaster連携 | SmartAccountClientに設定 | Backend側でAPIを呼び出し |
| Bundler送信 | SmartAccountClient経由 | Backend側でBundler APIを呼び出し |
| カストディアル | Yes（秘密鍵をサーバー管理） | No（ユーザーが秘密鍵を保持） |

---

## 🚀 実装手順

### Phase 1: Backend 基盤実装

1. ✅ **プロジェクトセットアップ** (完了: 2025-11-01)
   ```bash
   mkdir aa-backend-sample
   cd aa-backend-sample
   mkdir backend frontend
   ```

2. ✅ **Backend初期化** (完了: 2025-11-01)
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

3. ✅ **Express基本サーバー作成** (完了: 2025-11-01)
   - `src/index.ts`: サーバーエントリーポイント
   - CORS設定
   - エラーハンドリングミドルウェア
   - 環境変数は `process.env` から直接読み込み（dotenv不要）

4. ✅ **Paymaster Service実装** (完了: 2025-11-02)
   - `src/services/paymasterService.ts`
   - ✅ `createSCSPaymasterClient`でクライアント作成（シングルトンパターン）
   - ✅ `getPaymasterClient()`関数: クライアントの取得・作成
   - ✅ `getPaymasterContext()`関数: Paymasterコンテキストの生成
   - ✅ `sponsorUserOperation()`メソッド実装
     - 署名済みUserOperationを受け取る
     - Paymaster APIを呼び出してPaymaster情報を取得
     - UserOperationにPaymaster情報（paymaster, paymasterData, gas limits）を追加
     - ⚠️ ERC-4337の並列署名機能により、ユーザーの署名は無効化されない
   - ✅ 環境変数バリデーション: `validateConfig()`
   - ✅ 設定確認関数: `isPaymasterConfigured()`
   - ✅ 詳細なログ出力（ガス見積もり、コスト計算含む）

5. ⬜ **Bundler Service実装** (未実装)
   - `src/services/bundlerService.ts`
   - `createBundlerClient`でクライアント作成
   - `sendUserOperation`メソッド実装
   - `getUserOperationReceipt`メソッド実装

6. ⬜ **UserOperation Route実装** (未実装)
   - `src/routes/userOperation.ts`
   - POST `/api/user-operations` エンドポイント
   - GET `/api/user-operations/:hash` エンドポイント

7. ⬜ **Validation実装** (未実装)
   - Zodスキーマ定義
   - リクエストバリデーションミドルウェア

### Phase 2: Frontend実装

1. ✅ **RSBuildプロジェクト作成** (完了: 2025-11-01)
   ```bash
   cd ../frontend
   npm create rsbuild@latest
   # 選択: React, TypeScript
   npm install viem@2.30.6 wagmi@2.5.7 @startale-scs/aa-sdk @tanstack/react-query
   ```

   **注意**: バージョン互換性のため、以下の厳密なバージョンを使用
   - `viem`: `2.30.6` (固定)
   - `wagmi`: `2.5.7` (固定)

2. ✅ **RSBuild設定** (完了: 2025-11-01)
   - ✅ `rsbuild.config.ts`: ビルド設定とプラグイン
   - ✅ `.env.example`: RSBuild用環境変数（`PUBLIC_`プレフィックス使用）
   - ✅ `src/index.html`: HTMLテンプレート作成

   **rsbuild.config.ts**:
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

   **.env.example** (RSBuild用に`PUBLIC_`プレフィックスを使用):
   ```bash
   PUBLIC_API_URL=http://localhost:3001
   PUBLIC_CHAIN_ID=1946
   PUBLIC_RPC_URL=https://rpc.minato.soneium.org
   PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id
   ```

3. ✅ **Wagmi設定** (完了: 2025-11-01)
   - ✅ `src/App.tsx`: WagmiConfig設定、Soneium Minatoチェーン定義
   - ✅ `WagmiProvider`と`QueryClientProvider`でラップ
   - ✅ `injected`コネクタ設定

4. ⬜ **SmartAccount Hook実装** (未実装)
   - `src/hooks/useSmartAccount.ts`
   - `createSmartAccountClient`でクライアント作成
     - `toStartaleSmartAccount`でアカウント作成
     - ⚠️ **paymasterは設定しない**（通常のRPC使用）
   - `prepareUserOperation`でUserOperationを作成・署名
   - 署名済みUserOperationをBackend APIに送信

5. ⬜ **API Client実装** (未実装)
   - `src/lib/api.ts`
   - Backend APIとの通信ロジック
   - `POST /api/user-operations`: 署名済みUserOpを送信
   - `GET /api/user-operations/:hash`: ステータス確認

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

## 📚 参考リソース

- [Startale AA SDK Documentation](https://docs.startale.com)
- [Viem Documentation](https://viem.sh)
- [ERC-4337 Specification](https://eips.ethereum.org/EIPS/eip-4337)
- [Soneium Documentation](https://docs.soneium.org)

---

## 📝 備考

- 最小限の実装: この設計書は最も基本的な機能のみを含む
