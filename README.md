# ClosrAI — Turn followers into buyers

ClosrAI analyses a creator's social media screenshots and tells them exactly how to monetise their audience — with ranked opportunities, a 30-day content plan, and ready-to-send DM scripts.

## What it does

Upload screenshots of your Instagram, TikTok, YouTube, or other social profile. ClosrAI reads the content, comments, and audience signals, then gives you:

- **3 ranked monetisation opportunities** — specific to your account, with price ranges and a quick win you can test this week
- **30-day content plan** (Pro/Studio) — post by post, week by week, designed to warm your audience toward a purchase
- **DM scripts** (Pro/Studio) — word-for-word messages for pricing questions, portfolio asks, and warm leads
- **Pricing strategy** (Pro/Studio) — how to position and price your offer for maximum conversion

## Plans

- **Free** — 2 analyses/month, opportunities only
- **Pro ($19/mo)** — unlimited analyses + full playbook (content plan, DM scripts, pricing strategy)
- **Studio ($49/mo)** — everything in Pro, for agencies managing multiple creators

---

## Run locally

### 1. Install Python and Node.js
- Python: python.org/downloads (tick "Add to PATH" on Windows)
- Node.js: nodejs.org

### 2. Get a free Gemini API key
1. Go to aistudio.google.com
2. Sign in with a Google account
3. Click "Get API Key" → "Create API key"
4. Copy the key (starts with AIza... or AQ...)

### 3. Start the backend
```
cd backend
pip install -r requirements.txt
python app.py
```
Runs on port 5002.

### 4. Start the frontend
```
cd frontend
npm install
npm run dev
```
Open http://localhost:5173

Without a Gemini key the app runs in demo mode — realistic placeholder results so you can see the full UI and flow.

---

## Deploy (PythonAnywhere + Vercel)

### Backend on PythonAnywhere
1. Push to GitHub
2. Clone: `git clone https://github.com/yourusername/closrai.git`
3. `cd closrai/backend && mkvirtualenv --python=/usr/bin/python3.10 closrai-env && pip install -r requirements.txt`
4. Web tab → New web app → Flask → Python 3.10
5. Path: `/home/yourusername/closrai/backend/app.py`
6. Virtualenv: `/home/yourusername/.virtualenvs/closrai-env`
7. WSGI file:
```python
import sys, os
sys.path.insert(0, '/home/yourusername/closrai/backend')
os.environ['SECRET_KEY']     = 'your-random-string'
os.environ['JWT_SECRET_KEY'] = 'your-other-random-string'
os.environ['GEMINI_API_KEY'] = 'your-key'
os.environ['FLASK_DEBUG']    = 'false'
from app import app as application
```
8. `mkdir -p ~/closrai/backend/uploads`
9. Reload — test at `yourusername.pythonanywhere.com/api/health`

### Frontend on Vercel
1. vercel.com → New Project → import your GitHub repo
2. Root Directory: `frontend`
3. Environment variable: `VITE_API_URL` = your PythonAnywhere URL
4. Deploy
