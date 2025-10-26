# Startale Account Abstraction - React Sample

最小限の実装でStartale AA（Account Abstraction）をReactで使用するサンプルです。

## 概要

このプロジェクトは、Soneium MinatoテストネットでStartaleのAccount Abstractionを実装する最小限のサンプルです。

### 主な機能

- 🔐 **Dynamic Labs** によるウォレット接続
- 🎯 **Smart Account** の作成と管理
- ⛽ **Paymaster** によるガス代の代理支払い
- 📝 **Counter Contract** との連携（インクリメント操作）

## 必要な事前準備

### 1. Dynamic Labs Environment ID の取得

1. [Dynamic Labs](https://app.dynamic.xyz/) にアクセス
2. アカウント作成とプロジェクトの作成
3. Environment ID を取得

### 2. Soneium Portal での Paymaster 設定

1. [Soneium Portal](https://portal.soneium.org/) にアクセス
2. Paymaster を作成
3. Bundler URL と Paymaster URL、API キーを取得

## セットアップ手順

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 設定ファイルの編集

#### src/App.tsx

```typescript
environmentId: "YOUR_DYNAMIC_ENVIRONMENT_ID", // <- ここを書き換え
```

#### src/config.ts

```typescript
export const AA_CONFIG = {
  MINATO_RPC: "https://rpc.minato.soneium.org",
  BUNDLER_URL: "YOUR_BUNDLER_URL",           // <- ここを書き換え
  PAYMASTER_SERVICE_URL: "YOUR_PAYMASTER_URL", // <- ここを書き換え
  COUNTER_CONTRACT_ADDRESS: "0x6bcf154A6B80fDE9bd1556d39C9bCbB19B539Bd8",
};
```

### 3. 開発サーバーの起動

```bash
npm run dev
```

ブラウザで `http://localhost:5173` を開きます。

## 使い方

### 1. ウォレット接続

- "Connect Wallet" ボタンをクリック
- Dynamic Labs のモーダルからウォレットを選択して接続
- 接続後、Smart Account アドレスが表示される

### 2. Counter Contract の操作

- **Get Counter Value**: 現在のカウンター値を取得
- **Increment Counter (AA)**: Account Abstraction を使ってカウンターをインクリメント
  - ガス代は Paymaster が代理支払い
  - ユーザーは署名のみで取引が完了

## プロジェクト構成

```
startale-aa-example/
├── src/
│   ├── components/
│   │   └── StartaleAccount.tsx  # メインコンポーネント（AA 実装）
│   ├── App.tsx                   # プロバイダー設定
│   ├── config.ts                 # Wagmi と AA の設定
│   ├── main.tsx                  # エントリーポイント
│   └── index.css                 # スタイル
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

## 主要な依存関係

- **@startale-scs/aa-sdk**: Startale Smart Account SDK
- **@dynamic-labs/sdk-react-core**: ウォレット接続
- **wagmi**: Ethereum インタラクション
- **viem**: Ethereum ユーティリティ
- **@tanstack/react-query**: データフェッチング

## 実装のポイント

### Smart Account の作成

```typescript
const account = await toStartaleSmartAccount({
  client: walletClient,
  signer: walletClient.account,
});
```

### Account Client の初期化

```typescript
const client = createStartaleAccountClient({
  account,
  chain: soneiumMinato,
  bundlerUrl: AA_CONFIG.BUNDLER_URL,
  paymasterUrl: AA_CONFIG.PAYMASTER_SERVICE_URL,
});
```

### User Operation の送信

```typescript
const hash = await accountClient.sendUserOperation({
  calls: [
    {
      to: contractAddress,
      data: encodedFunctionData,
      value: 0n,
    },
  ],
});
```

## トラブルシューティング

### Bundler/Paymaster エラー

- Soneium Portal で正しく Paymaster が設定されているか確認
- API キーが有効か確認
- URL が正しいか確認（末尾のスラッシュに注意）

### ウォレット接続エラー

- Dynamic Labs の Environment ID が正しいか確認
- ブラウザでウォレット拡張機能が有効か確認

### ネットワークエラー

- Soneium Minato テストネットに接続しているか確認
- ウォレットに Minato ネットワークが追加されているか確認

## 参考リンク

- [Startale AA Documentation](https://docs.startale.com/account-abstraction/)
- [Soneium Portal](https://portal.soneium.org/)
- [Dynamic Labs](https://app.dynamic.xyz/)
- [Startale AA Demo (Next.js)](https://github.com/StartaleLabs/aa-demo-next)

## ライセンス

MIT
