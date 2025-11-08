# Startale AA Sample

Account Abstraction sample application using Startale SDK on Soneium Minato testnet.

## 🚀 Quick Start

### Prerequisites

1. **Node.js 22** (managed via mise)
2. **MetaMask** browser extension installed
3. **Startale API Key** for Paymaster and Bundler services

### Setup and Run

#### 1. Backend Setup

```bash
cd backend
npm install
cp .env.sample .env
npm run dev
```

The backend server will start at `http://localhost:3001`.

Expected output:
```
🚀 Account Abstraction Backend Server Started
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Environment: development
  Port:        3001
  CORS:        http://localhost:3000
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Health Check: http://localhost:3001/health
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

#### 2. Frontend Setup

Open a new terminal window:

```bash
cd frontend
npm install
cp .env.sample .env
npm run dev
```

The browser will automatically open at `http://localhost:3000`.

### Verify Installation

1. **Backend Health Check**:
   ```bash
   curl http://localhost:3001/health
   ```

   Expected response:
   ```json
   {
     "status": "ok",
     "timestamp": "...",
     "services": {
       "paymaster": "configured",
       "bundler": "configured"
     }
   }
   ```

2. **Frontend UI**:
   - Open `http://localhost:3000`
   - Click "Connect MetaMask" to connect your wallet
   - Wait for Smart Account creation
   - Click "Send Test Transaction" to execute the full UserOperation flow
   - Monitor the progress and view transaction receipt

## 📖 Project Overview

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ Frontend (React + wagmi + Rsbuild)                          │
│ - MetaMask connection                                       │
│ - Smart Account creation                                    │
│ - UserOperation creation & signing                          │
└──────────────────┬──────────────────────────────────────────┘
                   │ HTTP/REST API
                   │ POST /api/user-operations/sponsor
                   │ POST /api/user-operations
                   │ GET  /api/user-operations/:hash
                   ↓
┌─────────────────────────────────────────────────────────────┐
│ Backend (Express + TypeScript)                              │
│ - UserOperation validation                                  │
│ - Paymaster integration (gas sponsorship)                   │
│ - Bundler submission                                        │
└──────────────────┬────────────────┬─────────────────────────┘
                   │                │
                   ↓                ↓
         Startale Paymaster    Startale Bundler
         (Soneium Minato)      (Soneium Minato)
```

## 📄 License

MIT License - See [LICENSE](LICENSE) for details.

## 🔗 References

- [Startale SDK Documentation](https://docs.startale.com/)
- [ERC-4337: Account Abstraction](https://eips.ethereum.org/EIPS/eip-4337)
- [Soneium Testnet](https://soneium.org/)
- [Implementation Design (Japanese)](./backend-implementation-design.md)
