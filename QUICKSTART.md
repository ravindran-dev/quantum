# Quantum Compiler - Quick Start

## Local Development

```bash
# Install dependencies
cd backend && npm install
cd ../frontend && npm install

# Start backend (Terminal 1)
cd backend && npm start

# Start frontend (Terminal 2)
cd frontend && npm start
```

Visit: http://localhost:3000

## Deploy to Production

### Option 1: Vercel (Frontend) + Railway (Backend) - Recommended

#### 1. Deploy Backend to Railway
```bash
npm install -g @railway/cli
railway login
cd backend
railway init
railway up
railway domain
```

Note the Railway URL (e.g., `https://quantum-backend.railway.app`)

#### 2. Update Frontend
Edit `frontend/src/App.js`:
```javascript
const BACKEND_URL = 'https://quantum-backend.railway.app';
```

#### 3. Deploy Frontend to Vercel
```bash
npm install -g vercel
cd /home/ravi/quantum
vercel --prod
```

### Option 2: All on Railway
```bash
cd /home/ravi/quantum
railway init
railway up
```

## Environment Variables

### Backend (Railway)
No additional env vars needed - Railway auto-sets PORT

### Frontend (Vercel)
Set in Vercel dashboard if needed:
- `REACT_APP_BACKEND_URL`: Your backend URL

## Support

For detailed instructions, see [DEPLOYMENT.md](DEPLOYMENT.md)
