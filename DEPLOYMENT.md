# Deployment Guide for Quantum Compiler

## Architecture Overview

Due to the nature of this application (executing arbitrary code with system compilers), we need to split the deployment:

- **Frontend**: Deployed on Vercel (static hosting)
- **Backend**: Deployed on Railway/Render/Heroku (supports code execution)

## Option 1: Frontend on Vercel + Backend on Railway (Recommended)

### Step 1: Deploy Backend to Railway

1. **Install Railway CLI**:
   ```bash
   npm install -g @railway/cli
   ```

2. **Login to Railway**:
   ```bash
   railway login
   ```

3. **Initialize Railway project**:
   ```bash
   cd backend
   railway init
   ```

4. **Deploy backend**:
   ```bash
   railway up
   ```

5. **Get your backend URL**:
   ```bash
   railway domain
   ```
   You'll get something like: `https://your-app.railway.app`

### Step 2: Deploy Frontend to Vercel

1. **Install Vercel CLI**:
   ```bash
   npm install -g vercel
   ```

2. **Update backend URL in frontend**:
   Edit `frontend/src/App.js` and change:
   ```javascript
   const BACKEND_URL = 'https://your-app.railway.app'; // Replace with your Railway URL
   ```

3. **Deploy to Vercel**:
   ```bash
   cd /home/ravi/quantum
   vercel
   ```

4. **Follow the prompts**:
   - Link to existing project or create new
   - Set root directory to `./`
   - Build command: `cd frontend && npm install && npm run build`
   - Output directory: `frontend/build`

5. **Deploy to production**:
   ```bash
   vercel --prod
   ```

## Option 2: Backend on Render

### Deploy Backend to Render

1. **Create account**: Go to https://render.com

2. **New Web Service**:
   - Connect your GitHub repository
   - Root directory: `backend`
   - Build command: `npm install`
   - Start command: `node server.js`
   - Add environment variables if needed

3. **Install system dependencies** (Add to render.yaml):
   ```yaml
   services:
     - type: web
       name: quantum-backend
       env: node
       region: oregon
       plan: free
       buildCommand: npm install
       startCommand: node server.js
       envVars:
         - key: NODE_VERSION
           value: 18
       buildFilter:
         paths:
           - backend/**
   ```

4. **Copy the backend URL** provided by Render

5. **Update frontend** with the Render backend URL and deploy to Vercel

## Option 3: Full Stack on Railway

Deploy both frontend and backend on Railway:

```bash
# From project root
railway init
railway up

# Railway will auto-detect your Node.js app
# Add a railway.json configuration file
```

## Environment Variables

### Backend (Railway/Render)
- `PORT`: Set automatically by the platform
- `NODE_ENV`: production

### Frontend (Vercel)
- `REACT_APP_BACKEND_URL`: Your backend URL

## Important Notes

1. **CORS**: Backend already has CORS enabled for all origins
2. **SQLite**: Will work on Railway/Render with persistent volumes
3. **Compilers**: Railway/Render provide g++, python3, and Java by default
4. **File Storage**: Use persistent volumes on Railway/Render for SQLite database

## Quick Deploy Commands

### Using Railway (Backend + Frontend)
```bash
# Backend
cd backend
railway login
railway init
railway up
railway domain

# Note the URL, then update frontend/src/App.js
# Frontend on Vercel
cd ..
vercel --prod
```

### Using Vercel (Frontend only)
```bash
cd /home/ravi/quantum
vercel --prod
```

## Testing Deployment

After deployment:
1. Visit your Vercel URL
2. Try logging in with an email
3. Write and run code
4. Check if history works
5. Verify auto-save functionality

## Troubleshooting

### Backend Issues
- Check Railway/Render logs
- Verify compilers are installed
- Check CORS settings
- Verify database file has write permissions

### Frontend Issues
- Verify backend URL is correct
- Check browser console for CORS errors
- Ensure API endpoints match

## Cost Estimates

- **Vercel**: Free tier (100 GB bandwidth/month)
- **Railway**: $5/month with 512MB RAM, $0.000463/GB-hour
- **Render**: Free tier available (auto-sleep after inactivity)

## Recommended Setup

For best results:
- **Frontend**: Vercel (free, fast CDN)
- **Backend**: Railway ($5/month, reliable, no sleep)

## Alternative: Docker Deployment

If you want to deploy anywhere with Docker support, see DOCKER.md (coming soon).
