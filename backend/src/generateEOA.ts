// viemから必要な関数をインポートします
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';

// 1. 秘密鍵を生成します
// generatePrivateKey() は '0x' プレフィックス付きの64文字の16進数文字列を返します。
const privateKey = generatePrivateKey();

// 2. 秘密鍵からアカウント（アドレスや署名機能などを含むオブジェクト）を導出します
const account = privateKeyToAccount(privateKey);

// 結果を表示します
console.log("==================================================================");
console.log("viem を使って新しいEOAを作成しました。");
console.log("==================================================================");
console.log(`秘密鍵 (Private Key): ${privateKey}`);
console.log(`EOAアドレス (Address): ${account.address}`);
console.log("==================================================================");
console.log("");
console.log("注意: この秘密鍵は絶対に他人に知られないように厳重に保管してください。");
console.log("秘密鍵を紛失すると、このアドレスに関連付けられた資産にアクセスできなくなります。");
