# Startale Account Abstraction - React Sample

最小限の実装でStartale AA（Account Abstraction）をReactで使用するサンプルです。

## 概要

このプロジェクトは、Soneium MinatoテストネットでStartaleのAccount Abstractionを実装する最小限のサンプルです。

### 主な機能

- 🔐 **wagmi** によるウォレット接続（MetaMask、WalletConnect等）
- 🎯 **Smart Account** の作成と管理
- ⛽ **Paymaster** によるガス代の代理支払い
- 📝 **Counter Contract** との連携（インクリメント操作）

## 必要な事前準備

### Soneium Portal での Paymaster 設定

1. [Soneium Portal](https://portal.soneium.org/) にアクセス
2. Paymaster を作成
3. Bundler URL と Paymaster URL、API キーを取得

### (オプション) WalletConnect Project ID の取得

WalletConnectを使用する場合：

1. [WalletConnect Cloud](https://cloud.walletconnect.com) にアクセス
2. プロジェクトを作成
3. Project ID を取得

## セットアップ手順

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 設定ファイルの編集

#### src/config.ts

```typescript
export const config = createConfig({
  chains: [soneiumMinato],
  connectors: [
    injected(), // MetaMask等
    walletConnect({
      projectId: "YOUR_WALLETCONNECT_PROJECT_ID", // <- WalletConnect使用時に書き換え
      showQrModal: true,
    }),
  ],
  transports: {
    [soneiumMinato.id]: http(),
  },
});

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

- 利用可能なコネクターボタン（Injected、WalletConnect等）をクリック
- ウォレットで接続を承認
- 接続後、EOAアドレスとSmart Accountアドレスが表示される

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
- **wagmi**: Ethereum インタラクション
- **@wagmi/connectors**: ウォレットコネクター（MetaMask、WalletConnect等）
- **viem**: Ethereum ユーティリティ
- **@tanstack/react-query**: データフェッチング

## 実装のポイント

### Wagmi Config でコネクターを設定

```typescript
import { injected, walletConnect } from "@wagmi/connectors";

export const config = createConfig({
  chains: [soneiumMinato],
  connectors: [
    injected(), // MetaMask, Coinbase Wallet, etc.
    walletConnect({
      projectId: "YOUR_WALLETCONNECT_PROJECT_ID",
      showQrModal: true,
    }),
  ],
  transports: {
    [soneiumMinato.id]: http(),
  },
});
```

### ウォレット接続

```typescript
const { address, isConnected } = useAccount();
const { connect, connectors } = useConnect();
const { disconnect } = useDisconnect();

// 接続
connectors.map((connector) => (
  <button onClick={() => connect({ connector })}>
    {connector.name}
  </button>
))
```

### Smart Account の作成

```typescript
const { data: walletClient } = useWalletClient();

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

- ブラウザでウォレット拡張機能が有効か確認
- WalletConnect使用時はProject IDが正しいか確認

### ネットワークエラー

- Soneium Minato テストネットに接続しているか確認
- ウォレットに Minato ネットワークが追加されているか確認

## 参考リンク

- [Startale AA Documentation](https://docs.startale.com/account-abstraction/)
- [Soneium Portal](https://portal.soneium.org/)
- [WalletConnect Cloud](https://cloud.walletconnect.com)
- [wagmi Documentation](https://wagmi.sh/)
- [Startale AA Demo (Next.js)](https://github.com/StartaleLabs/aa-demo-next)

## ライセンス

MIT
