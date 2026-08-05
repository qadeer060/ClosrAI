"""
ClosrAI Backend
===============
Flask + SQLite + JWT + Google Gemini

Endpoints
---------
POST /api/auth/register
POST /api/auth/login
POST /api/auth/refresh
GET  /api/me
POST /api/upgrade

POST /api/analyse          — upload screenshots → monetisation playbook
GET  /api/analyses         — list user's analyses
GET  /api/analyses/<id>    — get single analysis

GET  /api/plans
GET  /api/health
"""

import os, uuid, base64, logging, requests, re, json
from datetime import datetime, timezone
from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import (
    JWTManager, create_access_token, create_refresh_token,
    jwt_required, get_jwt_identity,
)
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from werkzeug.security import generate_password_hash, check_password_hash

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
BASE_DIR      = os.path.dirname(os.path.abspath(__file__))
UPLOAD_FOLDER = os.path.join(BASE_DIR, "uploads")
DB_PATH       = os.path.join(BASE_DIR, "closrai.db")
ALLOWED_EXT   = {"png", "jpg", "jpeg", "webp"}

GEMINI_KEY   = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL = "gemini-2.0-flash"
GEMINI_URL   = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent"

DATABASE_URL = os.getenv("DATABASE_URL", "")
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

CORS_ORIGINS = os.getenv("CORS_ORIGINS", "*")
cors_list    = [o.strip() for o in CORS_ORIGINS.split(",")] if CORS_ORIGINS != "*" else "*"
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

PLANS = {
    "free":   {"name": "Free",   "price_usd": 0,  "monthly_credits": 2,  "full_playbook": False},
    "pro":    {"name": "Pro",    "price_usd": 19, "monthly_credits": 999, "full_playbook": True},
    "studio": {"name": "Studio", "price_usd": 49, "monthly_credits": 999, "full_playbook": True},
}

# ---------------------------------------------------------------------------
# App setup
# ---------------------------------------------------------------------------
app = Flask(__name__)
app.config.update(
    SECRET_KEY                     = os.getenv("SECRET_KEY", "dev-secret-changeme"),
    JWT_SECRET_KEY                 = os.getenv("JWT_SECRET_KEY", "jwt-secret-changeme"),
    JWT_ACCESS_TOKEN_EXPIRES       = 3600,
    JWT_REFRESH_TOKEN_EXPIRES      = 60 * 60 * 24 * 30,
    SQLALCHEMY_DATABASE_URI        = DATABASE_URL or f"sqlite:///{DB_PATH}",
    SQLALCHEMY_TRACK_MODIFICATIONS = False,
    MAX_CONTENT_LENGTH             = 40 * 1024 * 1024,
    UPLOAD_FOLDER                  = UPLOAD_FOLDER,
)

CORS(app, resources={r"/api/*": {"origins": cors_list}})
db      = SQLAlchemy(app)
jwt     = JWTManager(app)
limiter = Limiter(get_remote_address, app=app, storage_uri="memory://", default_limits=[])
logging.basicConfig(level=logging.INFO)
log = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------
class User(db.Model):
    __tablename__ = "users"
    id            = db.Column(db.Integer,     primary_key=True)
    email         = db.Column(db.String(255), unique=True, nullable=False)
    username      = db.Column(db.String(80),  unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    plan          = db.Column(db.String(20),  default="free")
    credits       = db.Column(db.Integer,     default=2)
    credits_reset = db.Column(db.DateTime,    default=lambda: datetime.now(timezone.utc))
    created_at    = db.Column(db.DateTime,    default=lambda: datetime.now(timezone.utc))
    analyses      = db.relationship("Analysis", backref="user", lazy=True)

    def set_password(self, pw):   self.password_hash = generate_password_hash(pw)
    def check_password(self, pw): return check_password_hash(self.password_hash, pw)

    def maybe_reset_credits(self):
        now   = datetime.now(timezone.utc)
        reset = self.credits_reset
        if reset.tzinfo is None:
            reset = reset.replace(tzinfo=timezone.utc)
        if (now - reset).days >= 30:
            self.credits       = PLANS[self.plan]["monthly_credits"]
            self.credits_reset = now
            db.session.commit()

    def to_dict(self):
        plan_info = PLANS.get(self.plan, PLANS["free"])
        return {
            "id":              self.id,
            "email":           self.email,
            "username":        self.username,
            "plan":            self.plan,
            "plan_name":       plan_info["name"],
            "price_usd":       plan_info["price_usd"],
            "credits":         self.credits,
            "monthly_credits": plan_info["monthly_credits"],
            "full_playbook":   plan_info["full_playbook"],
            "created_at":      self.created_at.isoformat(),
        }


class Analysis(db.Model):
    __tablename__    = "analyses"
    id               = db.Column(db.Integer,     primary_key=True)
    user_id          = db.Column(db.Integer,     db.ForeignKey("users.id"), nullable=False)
    platform         = db.Column(db.String(40),  nullable=False)
    niche            = db.Column(db.String(300), nullable=True)
    image_count      = db.Column(db.Integer,     default=1)
    opportunities    = db.Column(db.Text,        nullable=False)  # JSON array of 3 opportunities
    playbook         = db.Column(db.Text,        nullable=True)   # JSON — only for pro/studio
    created_at       = db.Column(db.DateTime,    default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            "id":           self.id,
            "platform":     self.platform,
            "niche":        self.niche,
            "image_count":  self.image_count,
            "opportunities": json.loads(self.opportunities) if self.opportunities else [],
            "playbook":      json.loads(self.playbook)      if self.playbook      else None,
            "created_at":   self.created_at.isoformat(),
        }

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def allowed(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXT

def get_user():
    return db.session.get(User, int(get_jwt_identity()))

def encode_image(path):
    with open(path, "rb") as f:
        return base64.standard_b64encode(f.read()).decode()

def get_mime(path):
    ext = path.rsplit(".", 1)[-1].lower()
    return "image/jpeg" if ext in ("jpg","jpeg") else f"image/{ext}"

# ---------------------------------------------------------------------------
# Gemini prompts
# ---------------------------------------------------------------------------
OPPORTUNITIES_PROMPT = """You are a world-class creator monetisation strategist. A creator has shared screenshots of their {platform} account — their profile, recent posts, and comment sections.

Their niche / description: {niche}

Study the screenshots carefully. Read the comments — what are people asking for? What problems are they describing? What compliments tell you what the audience values most? What questions come up repeatedly?

Based on what you actually observe, identify EXACTLY 3 monetisation opportunities ranked from most to least likely to convert for THIS specific creator and audience.

Respond with ONLY a valid JSON array. No markdown, no explanation, no backticks. Just the raw JSON array:

[
  {{
    "rank": 1,
    "title": "Short punchy name for this opportunity (5 words max)",
    "type": "one of: Digital Product / Online Course / 1-on-1 Coaching / Membership / Sponsored Content / Physical Product / Consulting",
    "price_range": "e.g. $27-$47 or $97/mo",
    "why_this_audience": "2 sentences — specific evidence from what you saw in the screenshots that tells you this would work",
    "quick_win": "One specific thing they could do THIS WEEK to test this without building anything"
  }},
  {{
    "rank": 2,
    "title": "...",
    "type": "...",
    "price_range": "...",
    "why_this_audience": "...",
    "quick_win": "..."
  }},
  {{
    "rank": 3,
    "title": "...",
    "type": "...",
    "price_range": "...",
    "why_this_audience": "...",
    "quick_win": "..."
  }}
]"""


PLAYBOOK_PROMPT = """You are a world-class creator monetisation strategist. You have already identified the top monetisation opportunity for this creator:

Platform: {platform}
Niche: {niche}
Top opportunity: {top_opportunity}

Now build them a complete 30-day execution playbook to turn their followers into paying customers.

Respond with ONLY a valid JSON object. No markdown, no explanation, no backticks. Just raw JSON:

{{
  "week1": {{
    "theme": "Week 1 theme in 5 words",
    "goal": "What this week achieves",
    "posts": [
      {{"day": 1, "format": "Reel/Carousel/Story/Post", "hook": "Opening line of the post", "purpose": "Why this post matters for conversion"}},
      {{"day": 3, "format": "...", "hook": "...", "purpose": "..."}},
      {{"day": 5, "format": "...", "hook": "...", "purpose": "..."}}
    ]
  }},
  "week2": {{
    "theme": "...",
    "goal": "...",
    "posts": [
      {{"day": 8,  "format": "...", "hook": "...", "purpose": "..."}},
      {{"day": 10, "format": "...", "hook": "...", "purpose": "..."}},
      {{"day": 12, "format": "...", "hook": "...", "purpose": "..."}}
    ]
  }},
  "week3": {{
    "theme": "...",
    "goal": "...",
    "posts": [
      {{"day": 15, "format": "...", "hook": "...", "purpose": "..."}},
      {{"day": 17, "format": "...", "hook": "...", "purpose": "..."}},
      {{"day": 19, "format": "...", "hook": "...", "purpose": "..."}}
    ]
  }},
  "week4": {{
    "theme": "Launch week",
    "goal": "Convert warm audience into buyers",
    "posts": [
      {{"day": 22, "format": "...", "hook": "...", "purpose": "..."}},
      {{"day": 24, "format": "...", "hook": "...", "purpose": "..."}},
      {{"day": 26, "format": "...", "hook": "...", "purpose": "..."}},
      {{"day": 28, "format": "...", "hook": "...", "purpose": "..."}}
    ]
  }},
  "dms": {{
    "interested_comment": "DM script to send when someone comments showing interest (under 80 words)",
    "direct_question":    "DM script when someone DMs asking what you sell (under 80 words)",
    "warm_lead":          "DM script for someone who's been engaging for weeks but hasn't bought (under 80 words)"
  }},
  "pricing_strategy": "2-3 sentences on exactly how to price and position the offer for maximum conversion with this specific audience"
}}"""


def call_gemini(image_paths, prompt):
    """Generic Gemini call with images + prompt. Returns raw text."""
    parts = []
    for path in image_paths:
        parts.append({"inline_data": {"mime_type": get_mime(path), "data": encode_image(path)}})
    parts.append({"text": prompt})

    resp = requests.post(
        GEMINI_URL,
        params  = {"key": GEMINI_KEY},
        headers = {"Content-Type": "application/json"},
        json    = {
            "contents":         [{"parts": parts}],
            "generationConfig": {"maxOutputTokens": 2000, "temperature": 0.7},
        },
        timeout = 90,
    )
    resp.raise_for_status()
    return resp.json()["candidates"][0]["content"]["parts"][0]["text"].strip()


def parse_json_response(text):
    """Strip any markdown fences and parse JSON safely."""
    clean = text.replace("```json", "").replace("```", "").strip()
    return json.loads(clean)


def demo_opportunities(platform, niche):
    return [
        {
            "rank": 1,
            "title": "Signature Mini Course",
            "type": "Online Course",
            "price_range": "$47–$97",
            "why_this_audience": f"Your {platform} audience is already consuming your free content hungrily — they trust you. A condensed, actionable course on your core topic is the logical next step. Comments show people asking 'how do I do this?' regularly.",
            "quick_win": "Post a Story poll this week asking 'Would you pay $47 for a step-by-step course on [your main topic]?' — the response rate will tell you everything."
        },
        {
            "rank": 2,
            "title": "Monthly Community Access",
            "type": "Membership",
            "price_range": "$17–$27/mo",
            "why_this_audience": f"Your {platform} comment section shows a tight-knit audience who talk to each other, not just to you. They're already a community — you just need to give them a home and charge for it.",
            "quick_win": "Create a free Discord or Telegram group this week, announce it in your next post, and watch how many join. Then announce the paid premium tier."
        },
        {
            "rank": 3,
            "title": "1-on-1 Strategy Session",
            "type": "1-on-1 Coaching",
            "price_range": "$97–$197 per session",
            "why_this_audience": f"A segment of your audience wants personalised help, not group content. The DMs and comments asking specific questions about their situation are your proof. Even 2 sessions a week is meaningful revenue.",
            "quick_win": "Add 'DM me STRATEGY for a free 15-min audit' to your next post bio or Story. See who responds — those are your first buyers."
        }
    ]


def demo_playbook(top_opportunity, niche):
    title = top_opportunity.get("title", "your offer")
    return {
        "week1": {
            "theme": "Establish your authority",
            "goal": "Remind your audience why they follow you and what problem you solve",
            "posts": [
                {"day": 1, "format": "Carousel", "hook": f"The 3 mistakes most people make with {niche} (and how to fix them)", "purpose": "Positions you as the expert and seeds the problem your offer solves"},
                {"day": 3, "format": "Reel",     "hook": "I went from [before state] to [after state] in 30 days — here's what actually changed", "purpose": "Social proof and aspiration — makes your audience want your result"},
                {"day": 5, "format": "Story",    "hook": "Quick question for you 👇 [poll: are you struggling with X?]", "purpose": "Collects data and makes the audience feel seen before you pitch anything"}
            ]
        },
        "week2": {
            "theme": "Build desire",
            "goal": "Show your audience what's possible — make them want the transformation",
            "posts": [
                {"day": 8,  "format": "Carousel", "hook": "What nobody tells you about [core topic in your niche]", "purpose": "Contrarian angle that gets shares and saves — expands reach"},
                {"day": 10, "format": "Reel",     "hook": "Behind the scenes of how I actually [achieve your result]", "purpose": "Transparency builds trust and shows your process is learnable"},
                {"day": 12, "format": "Post",     "hook": "Client result: [specific outcome] in [specific time frame]", "purpose": "Social proof that your method works for others, not just you"}
            ]
        },
        "week3": {
            "theme": "Tease the offer",
            "goal": "Let the audience know something is coming without a hard sell",
            "posts": [
                {"day": 15, "format": "Story",    "hook": "I'm building something and I need your input…", "purpose": "Creates curiosity and involvement — people who help build feel ownership"},
                {"day": 17, "format": "Reel",     "hook": "Everything I wish I knew about [niche] when I started", "purpose": "Value-heavy post that attracts new followers right before launch"},
                {"day": 19, "format": "Carousel", "hook": f"Here's exactly what's inside {title} (sneak peek)", "purpose": "First direct reveal of the offer — presented as content, not an ad"}
            ]
        },
        "week4": {
            "theme": "Launch week",
            "goal": "Convert warm audience into buyers",
            "posts": [
                {"day": 22, "format": "Reel",     "hook": f"It's finally here — {title} is open 🎉", "purpose": "Launch announcement — energy and excitement, clear call to action"},
                {"day": 24, "format": "Story",    "hook": "48 hours in — here's what people are saying already", "purpose": "Early social proof from buyers drives FOMO in the rest of the audience"},
                {"day": 26, "format": "Carousel", "hook": "Still on the fence? Here's what you get (and what you don't)", "purpose": "Handles objections directly — removes hesitation for warm leads"},
                {"day": 28, "format": "Story",    "hook": "Last 24 hours — closing tonight at midnight ⏰", "purpose": "Scarcity/urgency — the most important conversion moment of the month"}
            ]
        },
        "dms": {
            "interested_comment": f"Hey! Glad that resonated 😊 I'm actually opening {title} to a small group this month — would you want me to send you the details when it's ready? No pressure at all, just thought you might be interested based on your comment.",
            "direct_question":    f"Of course! I offer {title} which is basically [one sentence description]. It's {top_opportunity.get('price_range','competitively priced')} and designed for people who [describe your ideal buyer]. Want me to send you the full breakdown so you can decide if it's a fit?",
            "warm_lead":          f"Hey! I've noticed you've been engaging with my content for a while and I really appreciate it 🙏 I'm opening up {title} this month and I wanted to reach out personally before I announce it publicly — I think it could be genuinely useful for you based on what I've seen you commenting on. Want the details?"
        },
        "pricing_strategy": f"Launch at the lower end of your range ({top_opportunity.get('price_range','your price range').split('–')[0] if '–' in top_opportunity.get('price_range','') else top_opportunity.get('price_range','')}) for your first cohort — frame it as a founding member price that won't come back. This creates urgency without feeling salesy, and your first buyers become case studies that justify raising the price next month."
    }

# ---------------------------------------------------------------------------
# Auth routes
# ---------------------------------------------------------------------------
@app.route("/api/auth/register", methods=["POST"])
@limiter.limit("5 per hour")
def register():
    data     = request.get_json(silent=True) or {}
    email    = (data.get("email")    or "").strip().lower()
    username = (data.get("username") or "").strip()
    password = (data.get("password") or "")

    errors = {}
    if not re.match(r"^[^\s@]+@[^\s@]+\.[^\s@]+$", email): errors["email"]    = "Enter a valid email."
    if not re.match(r"^[a-zA-Z0-9_]{3,20}$", username):    errors["username"] = "3–20 chars: letters, numbers, underscore."
    if len(password) < 6:                                    errors["password"] = "At least 6 characters."
    if errors: return jsonify({"errors": errors}), 422

    if User.query.filter_by(email=email).first():    return jsonify({"errors": {"email":    "Email already registered."}}), 409
    if User.query.filter_by(username=username).first(): return jsonify({"errors": {"username": "Username taken."}}), 409

    user = User(email=email, username=username)
    user.set_password(password)
    db.session.add(user)
    db.session.commit()
    log.info(f"Registered: {username}")

    return jsonify({
        "user":          user.to_dict(),
        "access_token":  create_access_token(identity=str(user.id)),
        "refresh_token": create_refresh_token(identity=str(user.id)),
    }), 201


@app.route("/api/auth/login", methods=["POST"])
@limiter.limit("10 per hour")
def login():
    data     = request.get_json(silent=True) or {}
    email    = (data.get("email")    or "").strip().lower()
    password = (data.get("password") or "")
    user     = User.query.filter_by(email=email).first()
    if not user or not user.check_password(password):
        return jsonify({"error": "Invalid email or password."}), 401
    user.maybe_reset_credits()
    return jsonify({
        "user":          user.to_dict(),
        "access_token":  create_access_token(identity=str(user.id)),
        "refresh_token": create_refresh_token(identity=str(user.id)),
    })


@app.route("/api/auth/refresh", methods=["POST"])
@jwt_required(refresh=True)
def refresh():
    return jsonify({"access_token": create_access_token(identity=str(get_jwt_identity()))})


@app.route("/api/me", methods=["GET"])
@jwt_required()
def me():
    user = get_user()
    if not user: return jsonify({"error": "Not found."}), 404
    user.maybe_reset_credits()
    return jsonify({"user": user.to_dict()})


@app.route("/api/upgrade", methods=["POST"])
@jwt_required()
def upgrade():
    data    = request.get_json(silent=True) or {}
    plan_id = (data.get("plan") or "").lower()
    if plan_id not in PLANS: return jsonify({"error": f"Unknown plan: {plan_id}"}), 400
    user = get_user()
    if not user: return jsonify({"error": "Not found."}), 404
    old_cap   = PLANS[user.plan]["monthly_credits"]
    new_cap   = PLANS[plan_id]["monthly_credits"]
    user.plan = plan_id
    user.credits = max(user.credits, new_cap) if new_cap > old_cap else min(user.credits, new_cap)
    db.session.commit()
    return jsonify({"user": user.to_dict(), "message": f"Switched to {PLANS[plan_id]['name']}."})

# ---------------------------------------------------------------------------
# Plans
# ---------------------------------------------------------------------------
@app.route("/api/plans", methods=["GET"])
def plans():
    return jsonify({"plans": PLANS})

# ---------------------------------------------------------------------------
# Analyse route
# ---------------------------------------------------------------------------
@app.route("/api/analyse", methods=["POST"])
@jwt_required()
@limiter.limit("20 per hour")
def analyse():
    user = get_user()
    if not user: return jsonify({"error": "Not found."}), 404
    user.maybe_reset_credits()

    if user.credits <= 0:
        return jsonify({"error": "No analyses remaining this month. Upgrade to Pro for unlimited analyses."}), 402

    platform = (request.form.get("platform") or "Instagram").strip()
    niche    = (request.form.get("niche")    or "").strip()

    # Accept up to 5 screenshots
    saved_paths = []
    for key in ["image_1","image_2","image_3","image_4","image_5"]:
        f = request.files.get(key)
        if f and allowed(f.filename):
            ext  = f.filename.rsplit(".",1)[1].lower()
            name = f"{uuid.uuid4().hex}.{ext}"
            path = os.path.join(app.config["UPLOAD_FOLDER"], name)
            f.save(path)
            saved_paths.append(path)

    if not saved_paths:
        return jsonify({"error": "Upload at least one screenshot."}), 400

    user.credits -= 1
    db.session.commit()

    try:
        # Step 1: Generate opportunities
        if GEMINI_KEY:
            opp_prompt = OPPORTUNITIES_PROMPT.format(platform=platform, niche=niche or "general creator")
            opp_raw    = call_gemini(saved_paths, opp_prompt)
            try:
                opportunities = parse_json_response(opp_raw)
            except Exception:
                opportunities = demo_opportunities(platform, niche)
        else:
            opportunities = demo_opportunities(platform, niche)

        # Step 2: Generate full playbook if on Pro/Studio
        playbook = None
        if PLANS[user.plan]["full_playbook"] and opportunities:
            if GEMINI_KEY:
                top_opp        = opportunities[0]
                pb_prompt      = PLAYBOOK_PROMPT.format(
                    platform        = platform,
                    niche           = niche or "general creator",
                    top_opportunity = json.dumps(top_opp),
                )
                pb_raw = call_gemini([], pb_prompt)  # text-only, no images needed
                try:
                    playbook = parse_json_response(pb_raw)
                except Exception:
                    playbook = demo_playbook(top_opp, niche)
            else:
                playbook = demo_playbook(opportunities[0], niche)

    except requests.exceptions.HTTPError as e:
        log.warning(f"Gemini error: {e}")
        opportunities = demo_opportunities(platform, niche)
        playbook      = demo_playbook(opportunities[0], niche) if PLANS[user.plan]["full_playbook"] else None
        # refund on API error
        user.credits += 1
        db.session.commit()
    except Exception as e:
        log.warning(f"Analysis error: {e}")
        opportunities = demo_opportunities(platform, niche)
        playbook      = demo_playbook(opportunities[0], niche) if PLANS[user.plan]["full_playbook"] else None
    finally:
        for path in saved_paths:
            try: os.remove(path)
            except: pass

    analysis = Analysis(
        user_id       = user.id,
        platform      = platform,
        niche         = niche or None,
        image_count   = len(saved_paths),
        opportunities = json.dumps(opportunities),
        playbook      = json.dumps(playbook) if playbook else None,
    )
    db.session.add(analysis)
    db.session.commit()

    return jsonify({"analysis": analysis.to_dict(), "user": user.to_dict()}), 201


@app.route("/api/analyses", methods=["GET"])
@jwt_required()
def list_analyses():
    user = get_user()
    items = (Analysis.query
             .filter_by(user_id=user.id)
             .order_by(Analysis.created_at.desc())
             .limit(50).all())
    return jsonify({"analyses": [a.to_dict() for a in items]})


@app.route("/api/analyses/<int:aid>", methods=["GET"])
@jwt_required()
def get_analysis(aid):
    user = get_user()
    a    = Analysis.query.filter_by(id=aid, user_id=user.id).first()
    if not a: return jsonify({"error": "Not found."}), 404
    return jsonify({"analysis": a.to_dict()})

# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------
@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({
        "status": "ok",
        "ai":     bool(GEMINI_KEY),
        "model":  GEMINI_MODEL if GEMINI_KEY else "demo-mode",
        "db":     "postgres" if DATABASE_URL else "sqlite",
        "time":   datetime.now(timezone.utc).isoformat(),
    })

@app.errorhandler(413)
def too_large(e): return jsonify({"error": "Images too large. Max 40 MB total."}), 413

@app.errorhandler(404)
def not_found(e): return jsonify({"error": "Endpoint not found."}), 404

@app.errorhandler(500)
def internal(e):
    log.exception(e)
    return jsonify({"error": "Internal server error."}), 500

# ---------------------------------------------------------------------------
# Init
# ---------------------------------------------------------------------------
with app.app_context():
    os.makedirs(UPLOAD_FOLDER, exist_ok=True)
    db.create_all()

if __name__ == "__main__":
    port  = int(os.getenv("PORT", 5002))
    debug = os.getenv("FLASK_DEBUG", "true").lower() == "true"
    app.run(host="0.0.0.0", port=port, debug=debug)
    port  = int(os.getenv("PORT", 5002))
    debug = os.getenv("FLASK_DEBUG", "true").lower() == "true"
    app.run(host="0.0.0.0", port=port, debug=debug)
