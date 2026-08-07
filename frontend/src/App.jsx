import { useState, useEffect, useRef } from "react";
import {
  Mail, Lock, User, Eye, EyeOff, Upload, Zap, Check, X,
  AlertCircle, Copy, Crown, DollarSign, Calendar, MessageSquare,
  Clock, CheckCircle, ChevronDown, ChevronRight, LogOut,
  Loader2, Sparkles, History, Target, TrendingUp, Star, RotateCcw,
  ClipboardCheck,
} from "lucide-react";

/* ---------------------------------------------------------------
   Config
--------------------------------------------------------------- */
const API = import.meta.env.VITE_API_URL || "http://localhost:5002";

const PLANS = {
  free:   { id: "free",   name: "Free",   price: 0,  credits: 2,   tag: "Get started",     playbook: false },
  pro:    { id: "pro",    name: "Pro",     price: 19, credits: 999, tag: "Most popular",    playbook: true  },
  studio: { id: "studio", name: "Studio",  price: 49, credits: 999, tag: "Agencies",        playbook: true  },
};

const PLATFORMS = ["Instagram", "TikTok", "YouTube", "Twitter/X", "LinkedIn"];

/* ---------------------------------------------------------------
   Token helpers
--------------------------------------------------------------- */
const getToken  = ()     => localStorage.getItem("cr_access");
const getRToken = ()     => localStorage.getItem("cr_refresh");
const save      = (a, r) => { localStorage.setItem("cr_access", a); if (r) localStorage.setItem("cr_refresh", r); };
const clear     = ()     => { localStorage.removeItem("cr_access"); localStorage.removeItem("cr_refresh"); };

async function apiFetch(path, opts = {}) {
  const headers = { ...(opts.headers || {}) };
  if (!(opts.body instanceof FormData)) headers["Content-Type"] = "application/json";
  const t = getToken();
  if (t) headers["Authorization"] = `Bearer ${t}`;
  let res = await fetch(`${API}${path}`, { ...opts, headers });
  if (res.status === 401) {
    const rt = getRToken();
    if (rt) {
      const rr = await fetch(`${API}/api/auth/refresh`, {
        method: "POST", headers: { Authorization: `Bearer ${rt}`, "Content-Type": "application/json" },
      });
      if (rr.ok) {
        const { access_token } = await rr.json();
        save(access_token, null);
        headers["Authorization"] = `Bearer ${access_token}`;
        res = await fetch(`${API}${path}`, { ...opts, headers });
      } else clear();
    }
  }
  return res;
}

/* ---------------------------------------------------------------
   Root
--------------------------------------------------------------- */
export default function App() {
  const [screen,  setScreen]  = useState("auth");
  const [account, setAccount] = useState(null);

  useEffect(() => {
    if (!getToken()) return;
    apiFetch("/api/me").then(async r => {
      if (r.ok) { const d = await r.json(); setAccount(d.user); setScreen("tool"); }
      else clear();
    }).catch(clear);
  }, []);

  return (
    <div className="root">
      <Styles />
      {screen === "auth" && (
        <AuthScreen onSuccess={(u, a, r) => { save(a, r); setAccount(u); setScreen("tool"); }} />
      )}
      {screen === "tool" && account && (
        <ToolScreen
          account={account}
          setAccount={setAccount}
          onLogout={() => { clear(); setAccount(null); setScreen("auth"); }}
        />
      )}
    </div>
  );
}

/* ---------------------------------------------------------------
   Auth
--------------------------------------------------------------- */
function AuthScreen({ onSuccess }) {
  const [mode,    setMode]   = useState("signup");
  const [email,   setEmail]  = useState("");
  const [uname,   setUname]  = useState("");
  const [pass,    setPass]   = useState("");
  const [showPw,  setShowPw] = useState(false);
  const [errs,    setErrs]   = useState({});
  const [apiErr,  setApiErr] = useState("");
  const [loading, setLoad]   = useState(false);

  async function submit(e) {
    e.preventDefault(); setApiErr("");
    const v = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) v.email = "Enter a valid email.";
    if (mode === "signup" && !/^[a-zA-Z0-9_]{3,20}$/.test(uname)) v.username = "3–20 chars: letters, numbers, underscore.";
    if (pass.length < 6) v.password = "At least 6 characters.";
    setErrs(v);
    if (Object.keys(v).length) return;
    setLoad(true);
    try {
      const res  = await fetch(`${API}/api/auth/${mode === "signup" ? "register" : "login"}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mode === "signup" ? { email, username: uname, password: pass } : { email, password: pass }),
      });
      const data = await res.json();
      if (!res.ok) { data.errors ? setErrs(data.errors) : setApiErr(data.error || "Something went wrong."); return; }
      onSuccess(data.user, data.access_token, data.refresh_token);
    } catch { setApiErr("Cannot reach the server. Is it running?"); }
    finally   { setLoad(false); }
  }

  return (
    <div className="auth-wrap">
      {/* Left brand panel */}
      <div className="auth-left">
        <div className="auth-logo">
          <div className="logo-mark"><TrendingUp size={18}/></div>
          ClosrAI
        </div>

        <div className="auth-headline">
          <h1>You have followers.<br/><span className="teal">Now make money from them.</span></h1>
          <p className="auth-sub">Upload your social screenshots. ClosrAI reads your audience, spots what they'd pay for, and builds a 30-day plan to convert them — specific to your account, not a generic template.</p>
        </div>

        <div className="auth-cards">
          <div className="auth-mini-card">
            <Target size={16} color="#00D4AA"/>
            <div>
              <div className="auth-mc-title">3 monetisation opportunities</div>
              <div className="auth-mc-sub">ranked by what your audience will actually buy</div>
            </div>
          </div>
          <div className="auth-mini-card">
            <Calendar size={16} color="#F59E0B"/>
            <div>
              <div className="auth-mc-title">30-day content plan</div>
              <div className="auth-mc-sub">post by post, designed to warm then convert</div>
            </div>
          </div>
          <div className="auth-mini-card">
            <MessageSquare size={16} color="#A78BFA"/>
            <div>
              <div className="auth-mc-title">DM scripts for every scenario</div>
              <div className="auth-mc-sub">pricing questions, portfolio asks, warm leads</div>
            </div>
          </div>
        </div>

        {/* Decorative floating cards */}
        <div className="auth-float">
          <div className="float-card fc-1">
            <Star size={12} color="#F59E0B"/> <span>"This is exactly what I needed"</span>
          </div>
          <div className="float-card fc-2">
            <TrendingUp size={12} color="#00D4AA"/> <span>$2,400 first month</span>
          </div>
          <div className="float-card fc-3">
            <CheckCircle size={12} color="#00D4AA"/> <span>147 analyses run today</span>
          </div>
        </div>
      </div>

      {/* Right form */}
      <div className="auth-right">
        <div className="auth-card">
          <div className="tabs">
            <button className={"tab"+(mode==="signup"?" tab-on":"")} onClick={()=>setMode("signup")} type="button">Sign up</button>
            <button className={"tab"+(mode==="login" ?" tab-on":"")} onClick={()=>setMode("login")}  type="button">Log in</button>
          </div>
          {apiErr && <div className="banner err-banner"><AlertCircle size={13}/> {apiErr}</div>}
          <form onSubmit={submit} className="form" noValidate>
            <Field label="Email" icon={<Mail size={14}/>} type="email" value={email} onChange={setEmail} error={errs.email} placeholder="you@creator.com"/>
            {mode === "signup" && <Field label="Username" icon={<User size={14}/>} value={uname} onChange={setUname} error={errs.username} placeholder="your handle"/>}
            <Field label="Password" icon={<Lock size={14}/>} type={showPw?"text":"password"} value={pass} onChange={setPass} error={errs.password} placeholder="••••••••"
              suffix={<button type="button" className="eye-btn" onClick={()=>setShowPw(v=>!v)}>{showPw?<EyeOff size={13}/>:<Eye size={13}/>}</button>}
            />
            <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
              {loading ? <Loader2 size={14} className="spin"/> : <Zap size={14}/>}
              {loading ? "Please wait…" : mode==="signup" ? "Create account — it's free" : "Log in"}
            </button>
            <p className="fine">{mode==="signup" ? "Free plan includes 2 analyses per month. No card needed." : "Welcome back."}</p>
          </form>
        </div>
      </div>
    </div>
  );
}

function Field({ label, icon, error, suffix, ...rest }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <div className={"field-wrap"+(error?" field-err":"")}>
        <span className="field-icon">{icon}</span>
        <input className="input" {...rest} onChange={e=>rest.onChange(e.target.value)} value={rest.value}/>
        {suffix}
      </div>
      {error && <span className="err-msg"><AlertCircle size={11}/> {error}</span>}
    </label>
  );
}

/* ---------------------------------------------------------------
   Tool screen
--------------------------------------------------------------- */
function ToolScreen({ account, setAccount, onLogout }) {
  const [tab,         setTab]         = useState("analyse");
  const [menuOpen,    setMenuOpen]    = useState(false);
  const [showPricing, setShowPricing] = useState(false);
  const [analyses,    setAnalyses]    = useState([]);
  const [checkins,    setCheckins]    = useState([]);
  const [current,     setCurrent]     = useState(null);
  const [generating,  setGenerating]  = useState(false);
  const [apiErr,      setApiErr]      = useState("");

  // Form state
  const [platform, setPlatform] = useState("Instagram");
  const [niche,    setNiche]    = useState("");
  const [images,   setImages]   = useState([null, null, null, null, null]);
  const imgRefs = [useRef(), useRef(), useRef(), useRef(), useRef()];

  const plan = PLANS[account.plan] || PLANS.free;

  useEffect(() => { loadAnalyses(); loadCheckins(); }, []);

  async function loadAnalyses() {
    const r = await apiFetch("/api/analyses");
    if (r.ok) { const d = await r.json(); setAnalyses(d.analyses); }
  }

  async function loadCheckins() {
    const r = await apiFetch("/api/checkins");
    if (r.ok) { const d = await r.json(); setCheckins(d.checkins); }
  }

  function setImage(idx, file) {
    if (!file || !file.type.startsWith("image/")) return;
    setImages(prev => { const n = [...prev]; n[idx] = file; return n; });
  }

  function removeImage(idx) {
    setImages(prev => { const n = [...prev]; n[idx] = null; return n; });
  }

  async function runAnalysis() {
    const validImages = images.filter(Boolean);
    if (!validImages.length) { setApiErr("Upload at least one screenshot."); return; }
    if (!niche.trim())        { setApiErr("Describe your niche or content focus."); return; }
    setApiErr(""); setGenerating(true); setCurrent(null);

    const form = new FormData();
    form.append("platform", platform);
    form.append("niche",    niche.trim());
    images.forEach((img, i) => { if (img) form.append(`image_${i+1}`, img); });

    try {
      const res  = await apiFetch("/api/analyse", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) { setApiErr(data.error || "Analysis failed."); return; }
      setCurrent(data.analysis);
      setAccount(data.user);
      setAnalyses(prev => [data.analysis, ...prev]);
      setTab("results");
    } catch { setApiErr("Cannot reach the server."); }
    finally   { setGenerating(false); }
  }

  function resetForm() {
    setCurrent(null); setImages([null,null,null,null,null]); setNiche(""); setApiErr("");
  }

  async function upgradePlan(planId) {
    const res  = await apiFetch("/api/upgrade", { method: "POST", body: JSON.stringify({ plan: planId }) });
    const data = await res.json();
    if (res.ok) { setAccount(data.user); setShowPricing(false); }
  }

  return (
    <div className="tool">
      {/* Topbar */}
      <header className="topbar">
        <div className="topbar-logo">
          <div className="logo-mark logo-sm"><TrendingUp size={14}/></div>
          ClosrAI
        </div>
        <div className="topbar-right">
          <button className="credit-pill" onClick={()=>setShowPricing(true)} type="button">
            {account.plan === "free" ? `${account.credits} / ${plan.credits} analyses` : "Unlimited"}
          </button>
          <button className="plan-badge" onClick={()=>setShowPricing(true)} type="button">
            <Crown size={11}/> {plan.name}
          </button>
          <div className="acct-wrap">
            <button className="avatar-btn" onClick={()=>setMenuOpen(v=>!v)} type="button">
              {account.username[0].toUpperCase()} <ChevronDown size={12}/>
            </button>
            {menuOpen && (
              <div className="dropdown">
                <div className="dd-head">
                  <div className="dd-name">{account.username}</div>
                  <div className="dd-email">{account.email}</div>
                </div>
                <button className="dd-item" onClick={()=>{setShowPricing(true);setMenuOpen(false);}} type="button"><Crown size={13}/> Upgrade plan</button>
                <button className="dd-item" onClick={onLogout} type="button"><LogOut size={13}/> Log out</button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main tabs */}
      <div className="main-tabs">
        <button className={"main-tab"+(tab==="analyse"?" main-tab-on":"")} onClick={()=>setTab("analyse")} type="button">
          <Target size={13}/> Analyse
        </button>
        <button className={"main-tab"+(tab==="results"?" main-tab-on":"")} onClick={()=>setTab("results")} type="button">
          <Sparkles size={13}/> Results {current && <span className="new-dot"/>}
        </button>
        <button className={"main-tab"+(tab==="checkin"?" main-tab-on":"")} onClick={()=>setTab("checkin")} type="button">
          <ClipboardCheck size={13}/> Check-in <span className="badge">{checkins.length}</span>
        </button>
        <button className={"main-tab"+(tab==="history"?" main-tab-on":"")} onClick={()=>setTab("history")} type="button">
          <History size={13}/> History <span className="badge">{analyses.length}</span>
        </button>
      </div>

      {/* Analyse tab */}
      {tab === "analyse" && (
        <div className="analyse-wrap">
          <div className="analyse-grid">
            {/* Left — inputs */}
            <div className="analyse-input">
              <div className="section-label">01 · PLATFORM</div>
              <div className="platform-grid">
                {PLATFORMS.map(p => (
                  <button key={p} className={"platform-btn"+(platform===p?" platform-btn-on":"")} onClick={()=>setPlatform(p)} type="button">{p}</button>
                ))}
              </div>

              <div className="section-label" style={{marginTop:20}}>02 · YOUR NICHE</div>
              <label className="field">
                <span className="field-label">Describe your content and audience</span>
                <div className="field-wrap field-wrap-tall">
                  <textarea className="input input-textarea" rows={3} value={niche} onChange={e=>setNiche(e.target.value)}
                    placeholder="e.g. Fitness and weight loss for busy moms aged 30-45 who want to lose 20lbs without giving up their social life"/>
                </div>
              </label>

              <div className="section-label" style={{marginTop:20}}>03 · SCREENSHOTS <span className="label-sub">up to 5</span></div>
              <p className="hint-text">Upload your profile page, recent posts, and comment sections. The more context the better.</p>

              <div className="img-upload-grid">
                {images.map((img, i) => (
                  <div key={i} className={"img-slot"+(img?" img-slot-filled":"")} onClick={()=>!img && imgRefs[i].current?.click()}>
                    <input ref={imgRefs[i]} type="file" accept="image/*" hidden onChange={e=>setImage(i, e.target.files[0])}/>
                    {img ? (
                      <>
                        <img src={URL.createObjectURL(img)} alt="" className="img-preview"/>
                        <button className="img-remove" onClick={e=>{e.stopPropagation();removeImage(i);}} type="button"><X size={10}/></button>
                      </>
                    ) : (
                      <div className="img-empty">
                        <Upload size={14} color={i===0?"#00D4AA":"#475569"}/>
                        <span className="img-label">{i===0?"Profile":"Post/Comments"}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {apiErr && <div className="banner err-banner"><AlertCircle size={13}/> {apiErr}</div>}

              {account.credits <= 0 && account.plan === "free" && (
                <div className="upgrade-nudge">
                  <Crown size={14} color="#F59E0B"/>
                  <div>
                    <div style={{fontWeight:600,fontSize:13,color:"#F5F0E8"}}>Out of analyses this month</div>
                    <div style={{fontSize:12,color:"#6B7280"}}>Upgrade to Pro for unlimited analyses + full playbooks</div>
                  </div>
                  <button className="btn btn-amber btn-sm" onClick={()=>setShowPricing(true)} type="button">Upgrade</button>
                </div>
              )}

              <button className="btn btn-primary btn-full" onClick={runAnalysis} disabled={generating || (account.credits<=0 && account.plan==="free")} type="button">
                {generating ? <Loader2 size={14} className="spin"/> : <Sparkles size={14}/>}
                {generating ? "Analysing your audience…" : "Analyse my account"}
              </button>

              {generating && (
                <div className="gen-steps">
                  <GenStep label="Reading your screenshots"         active/>
                  <GenStep label="Scanning comment patterns"        />
                  <GenStep label="Identifying monetisation signals" />
                  <GenStep label="Building your playbook"           />
                </div>
              )}
            </div>

            {/* Right — explainer */}
            <div className="analyse-explainer">
              <div className="section-label">WHAT YOU'LL GET</div>
              <div className="explainer-cards">
                <div className="explainer-card">
                  <div className="ec-icon" style={{background:"rgba(0,212,170,.1)",border:"1px solid rgba(0,212,170,.2)"}}>
                    <Target size={18} color="#00D4AA"/>
                  </div>
                  <div>
                    <div className="ec-title">3 Monetisation Opportunities</div>
                    <div className="ec-desc">Ranked by likelihood to convert with YOUR audience, based on what we actually see in your screenshots. With price ranges and a quick win you can test this week.</div>
                  </div>
                </div>

                <div className={"explainer-card"+(plan.playbook?"":" explainer-card-locked")}>
                  <div className="ec-icon" style={{background:"rgba(245,158,11,.1)",border:"1px solid rgba(245,158,11,.2)"}}>
                    <Calendar size={18} color="#F59E0B"/>
                  </div>
                  <div>
                    <div className="ec-title">30-Day Content Plan {!plan.playbook && <span className="lock-badge">Pro</span>}</div>
                    <div className="ec-desc">Week by week, post by post — every piece of content designed to warm your audience toward a purchase. Includes the hook for each post.</div>
                  </div>
                </div>

                <div className={"explainer-card"+(plan.playbook?"":" explainer-card-locked")}>
                  <div className="ec-icon" style={{background:"rgba(167,139,250,.1)",border:"1px solid rgba(167,139,250,.2)"}}>
                    <MessageSquare size={18} color="#A78BFA"/>
                  </div>
                  <div>
                    <div className="ec-title">DM Scripts {!plan.playbook && <span className="lock-badge">Pro</span>}</div>
                    <div className="ec-desc">Word-for-word DMs for every scenario — pricing questions, portfolio requests, warm leads sitting on the fence. Copy and send.</div>
                  </div>
                </div>

                {!plan.playbook && (
                  <button className="upgrade-card" onClick={()=>setShowPricing(true)} type="button">
                    <Crown size={14} color="#F59E0B"/>
                    <span>Upgrade to Pro to unlock the full playbook — $19/mo</span>
                    <ChevronRight size={14} color="#F59E0B"/>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Results tab */}
      {tab === "results" && (
        <div className="results-wrap">
          {!current ? (
            <div className="empty-state">
              <div className="empty-icon"><Sparkles size={28}/></div>
              <p>Run an analysis first — your results will appear here.</p>
              <button className="btn btn-primary btn-sm" onClick={()=>setTab("analyse")} type="button">Go to Analyse</button>
            </div>
          ) : (
            <ResultsView analysis={current} plan={plan} onUpgrade={()=>setShowPricing(true)} onReset={()=>{resetForm();setTab("analyse");}}/>
          )}
        </div>
      )}

      {/* Check-in tab */}
      {tab === "checkin" && (
        <CheckinTab
          analyses={analyses}
          checkins={checkins}
          onCheckinAdded={(c) => setCheckins(prev => [c, ...prev])}
        />
      )}

      {/* History tab */}
      {tab === "history" && (
        <div className="history-wrap">
          {analyses.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon"><History size={28}/></div>
              <p>No analyses yet. Run your first one to see it here.</p>
            </div>
          ) : (
            <div className="history-list">
              {analyses.map(a => (
                <div key={a.id} className="history-card" onClick={()=>{setCurrent(a);setTab("results");}}>
                  <div className="hc-left">
                    <div className={"platform-dot pd-"+a.platform.toLowerCase().split("/")[0]}/>
                    <div>
                      <div className="hc-platform">{a.platform}</div>
                      <div className="hc-niche">{a.niche || "No niche specified"}</div>
                    </div>
                  </div>
                  <div className="hc-right">
                    <div className="hc-opps">{a.opportunities.length} opportunities</div>
                    <div className="hc-date">{new Date(a.created_at).toLocaleDateString()}</div>
                    {a.playbook && <div className="hc-playbook-badge"><Sparkles size={10}/> Full playbook</div>}
                  </div>
                  <ChevronRight size={14} color="#475569"/>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showPricing && <PricingModal currentPlan={account.plan} onSelect={upgradePlan} onClose={()=>setShowPricing(false)}/>}
    </div>
  );
}

/* ---------------------------------------------------------------
   Results view
--------------------------------------------------------------- */
function ResultsView({ analysis, plan, onUpgrade, onReset }) {
  const [activeOpp,   setActiveOpp]   = useState(0);
  const [activeWeek,  setActiveWeek]  = useState("week1");
  const [activeDmTab, setActiveDmTab] = useState("interested_comment");
  const [copiedDm,    setCopiedDm]    = useState(false);

  const opp  = analysis.opportunities[activeOpp];
  const pb   = analysis.playbook;
  const week = pb?.[activeWeek];

  function copyDm() {
    navigator.clipboard.writeText(pb.dms[activeDmTab]);
    setCopiedDm(true);
    setTimeout(() => setCopiedDm(false), 2000);
  }

  const TYPE_COLORS = {
    "Online Course":       "#00D4AA",
    "Membership":          "#A78BFA",
    "1-on-1 Coaching":     "#F59E0B",
    "Digital Product":     "#60A5FA",
    "Sponsored Content":   "#F472B6",
    "Physical Product":    "#34D399",
    "Consulting":          "#FB923C",
  };
  const typeColor = TYPE_COLORS[opp?.type] || "#00D4AA";

  return (
    <div className="results-inner">
      {/* Header */}
      <div className="results-header">
        <div>
          <div className="results-platform-tag">{analysis.platform} · {analysis.niche || "General creator"}</div>
          <h2 className="results-title">Your monetisation playbook</h2>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={onReset} type="button"><RotateCcw size={13}/> New analysis</button>
      </div>

      {/* Opportunities */}
      <div className="section-label">MONETISATION OPPORTUNITIES</div>
      <div className="opp-tabs">
        {analysis.opportunities.map((o, i) => (
          <button key={i} className={"opp-tab"+(activeOpp===i?" opp-tab-on":"")} onClick={()=>setActiveOpp(i)} type="button">
            <span className="opp-rank">#{o.rank}</span> {o.title}
          </button>
        ))}
      </div>

      {opp && (
        <div className="opp-card" style={{"--opp-color": typeColor}}>
          <div className="opp-card-head">
            <div>
              <div className="opp-type-badge" style={{background:`${typeColor}18`, color:typeColor, border:`1px solid ${typeColor}30`}}>{opp.type}</div>
              <div className="opp-title">{opp.title}</div>
            </div>
            <div className="opp-price">
              <DollarSign size={14} color={typeColor}/>
              <span>{opp.price_range}</span>
            </div>
          </div>
          <div className="opp-section-title">Why your audience would buy this</div>
          <p className="opp-why">{opp.why_this_audience}</p>
          <div className="opp-quickwin">
            <div className="opp-section-title" style={{marginBottom:6}}><Zap size={12} color="#F59E0B"/> Quick win this week</div>
            <p className="opp-why" style={{color:"#F5F0E8"}}>{opp.quick_win}</p>
          </div>
        </div>
      )}

      {/* Playbook — Pro only */}
      {pb ? (
        <>
          {/* 30-day content plan */}
          <div className="section-label" style={{marginTop:28}}>30-DAY CONTENT PLAN</div>
          <div className="week-tabs">
            {["week1","week2","week3","week4"].map((w,i) => (
              <button key={w} className={"week-tab"+(activeWeek===w?" week-tab-on":"")} onClick={()=>setActiveWeek(w)} type="button">
                Week {i+1}
              </button>
            ))}
          </div>

          {week && (
            <div className="week-card">
              <div className="week-header">
                <div className="week-theme">{week.theme}</div>
                <div className="week-goal">{week.goal}</div>
              </div>
              <div className="week-posts">
                {week.posts.map((post, i) => (
                  <div key={i} className="week-post">
                    <div className="wp-day">Day {post.day}</div>
                    <div className="wp-format-badge">{post.format}</div>
                    <div className="wp-hook">"{post.hook}"</div>
                    <div className="wp-purpose">{post.purpose}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pricing strategy */}
          {pb.pricing_strategy && (
            <div className="pricing-strategy-card">
              <div className="ps-label"><DollarSign size={13} color="#00D4AA"/> Pricing strategy</div>
              <p className="ps-text">{pb.pricing_strategy}</p>
            </div>
          )}

          {/* DM Scripts */}
          <div className="section-label" style={{marginTop:28}}>DM SCRIPTS</div>
          <div className="dm-tabs">
            {[
              {key:"interested_comment", label:"Interested comment"},
              {key:"direct_question",    label:"Direct question"},
              {key:"warm_lead",          label:"Warm lead"},
            ].map(({key,label}) => (
              <button key={key} className={"dm-tab"+(activeDmTab===key?" dm-tab-on":"")} onClick={()=>setActiveDmTab(key)} type="button">{label}</button>
            ))}
          </div>
          <div className="dm-card">
            <p className="dm-text">{pb.dms[activeDmTab]}</p>
            <button className="btn btn-ghost btn-sm" onClick={copyDm} type="button">
              {copiedDm ? <><Check size={12}/> Copied!</> : <><Copy size={12}/> Copy DM</>}
            </button>
          </div>
        </>
      ) : (
        <div className="playbook-locked">
          <Crown size={24} color="#F59E0B"/>
          <div className="pl-title">Full playbook locked on Free plan</div>
          <div className="pl-desc">Upgrade to Pro to unlock your 30-day content plan, DM scripts, and pricing strategy — tailored to this exact analysis.</div>
          <button className="btn btn-amber" onClick={onUpgrade} type="button"><Crown size={14}/> Upgrade to Pro — $19/mo</button>
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------
   Small components
--------------------------------------------------------------- */
function GenStep({ label, active }) {
  return (
    <div className={"gen-step"+(active?" gen-step-active":"")}>
      {active ? <Loader2 size={11} className="spin"/> : <span className="step-dot"/>}
      {label}
    </div>
  );
}

function PricingModal({ currentPlan, onSelect, onClose }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e=>e.stopPropagation()}>
        <div className="modal-head">
          <h3>Choose your plan</h3>
          <button className="icon-btn" onClick={onClose} type="button"><X size={17}/></button>
        </div>
        <div className="plan-grid">
          {Object.values(PLANS).map(p => {
            const active = p.id === currentPlan;
            return (
              <div key={p.id} className={"plan-card"+(active?" plan-card-active":"")+(p.id==="pro"?" plan-card-featured":"")}>
                {p.id === "pro" && <div className="plan-featured-badge">Most popular</div>}
                <div className="plan-tag">{p.tag}</div>
                <div className="plan-name">{p.name}</div>
                <div className="plan-price"><span className="plan-price-num">${p.price}</span><span className="plan-price-period"> / mo</span></div>
                <div className="plan-features">
                  <div className="pf-item"><Check size={12} color="#00D4AA"/> {p.credits === 999 ? "Unlimited analyses" : `${p.credits} analyses / month`}</div>
                  <div className="pf-item">{p.playbook ? <Check size={12} color="#00D4AA"/> : <X size={12} color="#475569"/>} 30-day content plan</div>
                  <div className="pf-item">{p.playbook ? <Check size={12} color="#00D4AA"/> : <X size={12} color="#475569"/>} DM scripts</div>
                  <div className="pf-item">{p.playbook ? <Check size={12} color="#00D4AA"/> : <X size={12} color="#475569"/>} Pricing strategy</div>
                </div>
                <button className={"btn btn-full "+(active?"btn-ghost":p.id==="pro"?"btn-primary":"btn-outline")} disabled={active} onClick={()=>onSelect(p.id)} type="button">
                  {active ? "Current plan" : `Get ${p.name}`}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------
   Check-in Tab
--------------------------------------------------------------- */
function CheckinTab({ analyses, checkins, onCheckinAdded }) {
  const [view,          setView]         = useState("form");
  const [analysisId,    setAnalysisId]   = useState("");
  const [weekNumber,    setWeekNumber]   = useState("");
  const [whatPosted,    setWhatPosted]   = useState("");
  const [whatPerformed, setWhatPerformed]= useState("");
  const [dmsReplies,    setDmsReplies]   = useState("");
  const [submitting,    setSubmitting]   = useState(false);
  const [result,        setResult]       = useState(null);
  const [apiErr,        setApiErr]       = useState("");
  const [expandedId,    setExpandedId]   = useState(null);
  const [copiedDebrief, setCopiedDebrief]= useState(false);

  async function submit() {
    if (!whatPosted.trim())    { setApiErr("Tell us what you posted this week."); return; }
    if (!whatPerformed.trim()) { setApiErr("Tell us what performed best."); return; }
    if (!dmsReplies.trim())    { setApiErr("Tell us about DMs or replies (write 'none' if you got none)."); return; }
    setApiErr(""); setSubmitting(true); setResult(null);
    const body = { what_posted: whatPosted.trim(), what_performed: whatPerformed.trim(), dms_replies: dmsReplies.trim() };
    if (analysisId) body.analysis_id = parseInt(analysisId);
    if (weekNumber) body.week_number  = parseInt(weekNumber);
    try {
      const res  = await apiFetch("/api/checkin", { method: "POST", body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) { setApiErr(data.error || "Check-in failed."); return; }
      setResult(data);
      onCheckinAdded(data.checkin);
    } catch { setApiErr("Cannot reach the server."); }
    finally   { setSubmitting(false); }
  }

  function reset() {
    setResult(null); setWhatPosted(""); setWhatPerformed(""); setDmsReplies("");
    setAnalysisId(""); setWeekNumber(""); setApiErr("");
  }

  function copyDebrief() {
    if (!result) return;
    navigator.clipboard.writeText(result.checkin.debrief);
    setCopiedDebrief(true);
    setTimeout(() => setCopiedDebrief(false), 2000);
  }

  const adjustedWeeks = result?.checkin?.adjusted_weeks;

  return (
    <div className="checkin-wrap">
      <div className="checkin-subtabs">
        <button className={"ci-stab"+(view==="form"?" ci-stab-on":"")} onClick={()=>setView("form")} type="button">
          <ClipboardCheck size={12}/> New check-in
        </button>
        <button className={"ci-stab"+(view==="history"?" ci-stab-on":"")} onClick={()=>setView("history")} type="button">
          <History size={12}/> Past check-ins <span className="badge">{checkins.length}</span>
        </button>
      </div>

      {view === "form" && (
        <div className="checkin-grid">
          <div className="checkin-form">
            {!result ? (
              <>
                <div className="section-label">LINK TO A PLAN <span className="label-sub">optional</span></div>
                <div className="ci-row">
                  <label className="field" style={{flex:1}}>
                    <span className="field-label">Analysis / 30-day plan</span>
                    <div className="field-wrap">
                      <select className="input ci-select" value={analysisId} onChange={e=>setAnalysisId(e.target.value)}>
                        <option value="">Standalone (not tied to a plan)</option>
                        {analyses.filter(a=>a.playbook).map(a=>(
                          <option key={a.id} value={a.id}>{a.platform} · {a.niche||"No niche"} · {new Date(a.created_at).toLocaleDateString()}</option>
                        ))}
                      </select>
                    </div>
                  </label>
                  {analysisId && (
                    <label className="field" style={{width:110}}>
                      <span className="field-label">Week</span>
                      <div className="field-wrap">
                        <select className="input ci-select" value={weekNumber} onChange={e=>setWeekNumber(e.target.value)}>
                          <option value="">—</option>
                          <option value="1">Week 1</option>
                          <option value="2">Week 2</option>
                          <option value="3">Week 3</option>
                          <option value="4">Week 4</option>
                        </select>
                      </div>
                    </label>
                  )}
                </div>

                <div className="section-label" style={{marginTop:16}}>THIS WEEK'S DATA</div>

                <label className="field">
                  <span className="field-label">What did you post? <span style={{color:"var(--fog)"}}>— list each piece of content</span></span>
                  <div className="field-wrap field-wrap-tall">
                    <textarea className="input input-textarea" rows={3} value={whatPosted} onChange={e=>setWhatPosted(e.target.value)}
                      placeholder="e.g. 3 reels about meal prep, 1 carousel on morning routines, 2 Stories with polls"/>
                  </div>
                </label>

                <label className="field">
                  <span className="field-label">What performed best? <span style={{color:"var(--fog)"}}>— views, saves, comments, shares</span></span>
                  <div className="field-wrap field-wrap-tall">
                    <textarea className="input input-textarea" rows={3} value={whatPerformed} onChange={e=>setWhatPerformed(e.target.value)}
                      placeholder="e.g. The meal prep reel got 12k views vs my usual 2k — tons of saves and people tagging friends"/>
                  </div>
                </label>

                <label className="field">
                  <span className="field-label">DMs and replies you got <span style={{color:"var(--fog)"}}>— write 'none' if zero</span></span>
                  <div className="field-wrap field-wrap-tall">
                    <textarea className="input input-textarea" rows={3} value={dmsReplies} onChange={e=>setDmsReplies(e.target.value)}
                      placeholder="e.g. 4 DMs asking if I have a meal plan PDF, 2 comments asking about coaching, 1 asking for pricing"/>
                  </div>
                </label>

                {apiErr && <div className="banner err-banner"><AlertCircle size={13}/> {apiErr}</div>}

                <button className="btn btn-primary btn-full" onClick={submit} disabled={submitting} type="button">
                  {submitting ? <Loader2 size={14} className="spin"/> : <ClipboardCheck size={14}/>}
                  {submitting ? "Analysing your week…" : "Get my weekly debrief"}
                </button>
              </>
            ) : (
              <div className="ci-result">
                <div className="ci-result-head">
                  <div>
                    <div className="section-label">WEEK {result.checkin.week_number||"—"} DEBRIEF</div>
                    {result.analysis && <div className="ci-linked-tag">{result.analysis.platform} · {result.analysis.niche}</div>}
                  </div>
                  <div style={{display:"flex",gap:8}}>
                    <button className="btn btn-ghost btn-sm" onClick={copyDebrief} type="button">
                      {copiedDebrief ? <><Check size={12}/> Copied!</> : <><Copy size={12}/> Copy</>}
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={reset} type="button"><RotateCcw size={12}/> New</button>
                  </div>
                </div>
                <div className="ci-debrief-box">
                  <p className="ci-debrief-text">{result.checkin.debrief}</p>
                </div>
              </div>
            )}
          </div>

          <div className="checkin-output">
            {!result && (
              <div className="ci-explainer">
                <div className="section-label">WHAT YOU'LL GET</div>
                <div className="ci-explainer-cards">
                  {[
                    {icon:"📊", color:"var(--teal)",   title:"Weekly debrief",   desc:"What your data actually means, what to double down on, and what to stop — specific to your numbers."},
                    {icon:"📅", color:"var(--amber)",  title:"Adjusted plan",    desc:"If linked to a 30-day plan, ClosrAI rewrites the remaining weeks based on what's actually working."},
                    {icon:"💬", color:"var(--violet)", title:"DM action items",  desc:"If people are DMing you, ClosrAI flags the buying signals and tells you exactly how to respond."},
                  ].map(({icon,color,title,desc})=>(
                    <div key={title} className="ci-explainer-card">
                      <div className="ci-ec-icon" style={{color}}>{icon}</div>
                      <div><div className="ci-ec-title">{title}</div><div className="ci-ec-desc">{desc}</div></div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {result && adjustedWeeks && (
              <div className="ci-adjusted">
                <div className="section-label">ADJUSTED REMAINING PLAN</div>
                <p className="ci-adj-sub">Updated based on what's working for your account this week.</p>
                {Object.entries(adjustedWeeks).map(([weekKey, weekData]) => (
                  <div key={weekKey} className="ci-week-card">
                    <div className="ci-week-header" onClick={()=>setExpandedId(expandedId===weekKey?null:weekKey)}>
                      <div>
                        <div className="ci-week-name">{weekKey.replace("week","Week ")}</div>
                        <div className="ci-week-theme">{weekData.theme}</div>
                      </div>
                      <ChevronRight size={13} className={"chevron"+(expandedId===weekKey?" rotated":"")} color="#475569"/>
                    </div>
                    {expandedId === weekKey && (
                      <div className="ci-week-body">
                        <div className="ci-week-goal">{weekData.goal}</div>
                        {weekData.posts?.map((post, i) => (
                          <div key={i} className="ci-post-row">
                            <span className="wp-day">Day {post.day}</span>
                            <span className="wp-format-badge">{post.format}</span>
                            <div><div className="wp-hook">"{post.hook}"</div><div className="wp-purpose">{post.purpose}</div></div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {result && !adjustedWeeks && (
              <div className="empty-state" style={{minHeight:240}}>
                <div className="empty-icon"><Calendar size={24}/></div>
                <p>Link a 30-day plan and select a week number to get an adjusted content plan based on your results.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {view === "history" && (
        <div className="ci-history">
          {checkins.length === 0 ? (
            <div className="empty-state" style={{margin:"60px auto"}}>
              <div className="empty-icon"><ClipboardCheck size={26}/></div>
              <p>No check-ins yet. Submit your first weekly check-in to see it here.</p>
            </div>
          ) : (
            <div className="ci-history-list">
              {checkins.map(ci => (
                <div key={ci.id} className="ci-history-card" onClick={()=>setExpandedId(expandedId===ci.id?null:ci.id)}>
                  <div className="ci-hc-head">
                    <div>
                      <div className="ci-hc-title">{ci.week_number ? `Week ${ci.week_number} check-in` : "Standalone check-in"}</div>
                      <div className="ci-hc-date">{new Date(ci.created_at).toLocaleDateString()}</div>
                    </div>
                    <div style={{display:"flex",gap:8,alignItems:"center"}}>
                      {ci.adjusted_weeks && <span className="hc-playbook-badge"><Sparkles size={10}/> Plan adjusted</span>}
                      <ChevronRight size={13} className={"chevron"+(expandedId===ci.id?" rotated":"")} color="#475569"/>
                    </div>
                  </div>
                  {expandedId === ci.id && (
                    <div className="ci-hc-body">
                      <div className="ci-hc-section-label">Debrief</div>
                      <p className="ci-debrief-text">{ci.debrief}</p>
                      <div className="ci-hc-section-label" style={{marginTop:12}}>What you posted</div>
                      <p className="ci-hc-data">{ci.what_posted}</p>
                      <div className="ci-hc-section-label" style={{marginTop:8}}>What performed</div>
                      <p className="ci-hc-data">{ci.what_performed}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------
   Styles
--------------------------------------------------------------- */
function Styles() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');

      *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
      body{background:#080B0E;color:#F5F0E8;font-family:'Inter',sans-serif;-webkit-font-smoothing:antialiased;}

      .root{
        --black:#080B0E; --panel:#0F1318; --card:#161B22; --card2:#1C2330;
        --line:#1E2840; --fog:#6B7280; --slate:#9CA3AF; --bone:#F5F0E8;
        --teal:#00D4AA; --teal-dim:#00B894; --teal-glow:rgba(0,212,170,.12);
        --amber:#F59E0B; --violet:#A78BFA; --red:#F43F5E; --blue:#60A5FA;
        min-height:100vh;
      }
      .root *:focus-visible{outline:2px solid var(--teal);outline-offset:2px;}
      .teal{color:var(--teal);}

      /* ---- Logo ---- */
      .logo-mark{width:34px;height:34px;background:linear-gradient(135deg,var(--teal),#00B4D8);border-radius:10px;display:flex;align-items:center;justify-content:center;color:#080B0E;}
      .logo-sm{width:26px;height:26px;border-radius:8px;}

      /* ---- Auth ---- */
      .auth-wrap{display:grid;grid-template-columns:1.15fr .85fr;min-height:100vh;}
      .auth-left{background:linear-gradient(160deg,#080B0E 0%,#0A1628 100%);border-right:1px solid var(--line);padding:52px;display:flex;flex-direction:column;gap:32px;position:relative;overflow:hidden;}
      .auth-logo{display:flex;align-items:center;gap:10px;font-family:'Syne';font-size:20px;font-weight:700;color:var(--bone);}
      .auth-headline h1{font-family:'Syne';font-size:36px;font-weight:800;line-height:1.2;color:var(--bone);max-width:480px;}
      .auth-sub{color:var(--slate);font-size:15px;line-height:1.7;max-width:460px;margin-top:14px;}
      .auth-cards{display:flex;flex-direction:column;gap:12px;}
      .auth-mini-card{display:flex;align-items:center;gap:12px;background:rgba(255,255,255,.03);border:1px solid var(--line);border-radius:12px;padding:14px 16px;}
      .auth-mc-title{font-weight:600;font-size:14px;color:var(--bone);}
      .auth-mc-sub{font-size:12px;color:var(--fog);margin-top:2px;}

      /* Floating cards */
      .auth-float{position:absolute;bottom:40px;right:-10px;display:flex;flex-direction:column;gap:8px;opacity:.7;}
      .float-card{display:flex;align-items:center;gap:7px;background:var(--card);border:1px solid var(--line);border-radius:20px;padding:8px 14px;font-size:12px;color:var(--slate);white-space:nowrap;}
      .fc-1{transform:translateX(20px);}
      .fc-2{transform:translateX(0px);}
      .fc-3{transform:translateX(30px);}

      .auth-right{display:flex;align-items:center;justify-content:center;padding:40px;background:var(--black);}
      .auth-card{width:100%;max-width:380px;background:var(--panel);border:1px solid var(--line);border-radius:16px;padding:28px;}

      /* ---- Form ---- */
      .tabs{display:flex;gap:3px;background:var(--black);border-radius:10px;padding:4px;margin-bottom:22px;}
      .tab{flex:1;background:none;border:none;color:var(--fog);font-family:'Inter';font-size:14px;font-weight:600;padding:9px;border-radius:7px;cursor:pointer;}
      .tab-on{background:var(--card);color:var(--bone);}
      .form{display:flex;flex-direction:column;gap:14px;}
      .field{display:flex;flex-direction:column;gap:5px;}
      .field-label{font-size:11px;color:var(--slate);text-transform:uppercase;letter-spacing:.06em;font-weight:500;}
      .field-wrap{display:flex;align-items:center;background:var(--black);border:1px solid var(--line);border-radius:9px;padding:0 11px;transition:border-color .15s;}
      .field-wrap:focus-within{border-color:var(--teal);}
      .field-err{border-color:var(--red)!important;}
      .field-wrap-tall{align-items:flex-start;padding:10px 12px;}
      .field-icon{color:var(--fog);display:flex;flex-shrink:0;}
      .input{flex:1;background:none;border:none;color:var(--bone);font-family:'Inter';font-size:14px;padding:10px 9px;outline:none;}
      .input::placeholder{color:var(--fog);}
      .input-textarea{resize:none;line-height:1.6;font-size:13px;padding:0 8px;}
      .eye-btn{background:none;border:none;color:var(--fog);cursor:pointer;display:flex;padding:3px;}
      .err-msg{display:flex;align-items:center;gap:5px;color:var(--red);font-size:12px;}
      .fine{color:var(--fog);font-size:12px;text-align:center;}
      .hint-text{color:var(--fog);font-size:12.5px;margin-top:-8px;}

      /* ---- Buttons ---- */
      .btn{display:inline-flex;align-items:center;justify-content:center;gap:7px;font-family:'Inter';font-weight:600;font-size:14px;padding:11px 18px;border-radius:9px;border:1px solid transparent;cursor:pointer;transition:all .15s;}
      .btn:disabled{opacity:.4;cursor:not-allowed;}
      .btn-full{width:100%;}
      .btn-primary{background:var(--teal);color:#080B0E;}
      .btn-primary:hover:not(:disabled){background:var(--teal-dim);}
      .btn-ghost{background:transparent;border-color:var(--line);color:var(--bone);}
      .btn-ghost:hover:not(:disabled){border-color:var(--teal);color:var(--teal);}
      .btn-outline{background:transparent;border-color:var(--line);color:var(--bone);}
      .btn-outline:hover:not(:disabled){border-color:var(--teal);color:var(--teal);}
      .btn-amber{background:var(--amber);color:#080B0E;}
      .btn-amber:hover:not(:disabled){background:#E08E00;}
      .btn-sm{font-size:13px;padding:8px 13px;}
      .spin{animation:spin .9s linear infinite;}
      @keyframes spin{to{transform:rotate(360deg);}}

      /* ---- Banners ---- */
      .banner{display:flex;align-items:center;gap:8px;padding:10px 13px;border-radius:8px;font-size:13px;}
      .err-banner{background:rgba(244,63,94,.1);border:1px solid rgba(244,63,94,.3);color:var(--red);}

      /* ---- Tool topbar ---- */
      .tool{min-height:100vh;display:flex;flex-direction:column;}
      .topbar{display:flex;align-items:center;justify-content:space-between;padding:14px 28px;border-bottom:1px solid var(--line);background:var(--panel);}
      .topbar-logo{display:flex;align-items:center;gap:8px;font-family:'Syne';font-size:16px;font-weight:700;color:var(--bone);}
      .topbar-right{display:flex;align-items:center;gap:9px;}
      .credit-pill{background:var(--card);border:1px solid var(--line);color:var(--slate);font-size:12px;padding:6px 12px;border-radius:999px;cursor:pointer;font-family:'Inter';}
      .credit-pill:hover{border-color:var(--teal);}
      .plan-badge{display:flex;align-items:center;gap:5px;background:rgba(245,158,11,.1);border:1px solid rgba(245,158,11,.25);color:var(--amber);font-size:12px;padding:6px 12px;border-radius:999px;cursor:pointer;font-weight:600;}
      .acct-wrap{position:relative;}
      .avatar-btn{display:flex;align-items:center;gap:4px;background:var(--card);border:1px solid var(--line);color:var(--bone);height:34px;padding:0 10px;border-radius:999px;cursor:pointer;font-weight:700;font-size:13px;}
      .dropdown{position:absolute;right:0;top:42px;width:210px;background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:7px;z-index:50;}
      .dd-head{padding:8px 10px 9px;border-bottom:1px solid var(--line);margin-bottom:5px;}
      .dd-name{font-weight:600;font-size:14px;} .dd-email{color:var(--fog);font-size:11px;margin-top:2px;}
      .dd-item{display:flex;align-items:center;gap:7px;width:100%;background:none;border:none;color:var(--bone);font-size:13px;padding:8px 10px;border-radius:6px;cursor:pointer;text-align:left;}
      .dd-item:hover{background:var(--card);}

      /* ---- Main tabs ---- */
      .main-tabs{display:flex;padding:9px 28px 0;border-bottom:1px solid var(--line);background:var(--panel);}
      .main-tab{display:flex;align-items:center;gap:6px;background:none;border:none;border-bottom:2px solid transparent;color:var(--fog);font-family:'Inter';font-size:14px;font-weight:600;padding:9px 14px;cursor:pointer;margin-bottom:-1px;position:relative;}
      .main-tab-on{color:var(--teal);border-bottom-color:var(--teal);}
      .badge{background:var(--card);color:var(--slate);font-size:11px;padding:2px 7px;border-radius:999px;font-weight:600;}
      .new-dot{width:7px;height:7px;border-radius:50%;background:var(--teal);display:inline-block;margin-left:2px;}
      .section-label{font-size:10.5px;font-weight:700;color:var(--teal);text-transform:uppercase;letter-spacing:.1em;}
      .label-sub{font-size:9px;color:var(--fog);text-transform:lowercase;letter-spacing:0;margin-left:6px;}
      .icon-btn{background:none;border:none;color:var(--fog);cursor:pointer;display:flex;padding:4px;}

      /* ---- Analyse tab ---- */
      .analyse-wrap{padding:28px;flex:1;}
      .analyse-grid{display:grid;grid-template-columns:1fr 1fr;gap:32px;align-items:start;}
      .analyse-input{display:flex;flex-direction:column;gap:14px;}
      .platform-grid{display:flex;flex-wrap:wrap;gap:8px;}
      .platform-btn{background:var(--card);border:1px solid var(--line);color:var(--slate);font-size:13px;font-weight:600;padding:8px 16px;border-radius:20px;cursor:pointer;transition:all .15s;font-family:'Inter';}
      .platform-btn:hover{border-color:var(--teal);color:var(--teal);}
      .platform-btn-on{background:var(--teal-glow);border-color:var(--teal);color:var(--teal);}
      .img-upload-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;}
      .img-slot{border:1.5px dashed var(--line);border-radius:10px;height:88px;cursor:pointer;overflow:hidden;display:flex;align-items:center;justify-content:center;background:var(--card);transition:border-color .15s;position:relative;}
      .img-slot:hover{border-color:var(--slate);}
      .img-slot-filled{border-style:solid;border-color:var(--teal);}
      .img-empty{display:flex;flex-direction:column;align-items:center;gap:5px;}
      .img-label{font-size:9.5px;color:var(--fog);text-align:center;}
      .img-preview{width:100%;height:100%;object-fit:cover;}
      .img-remove{position:absolute;top:3px;right:3px;background:rgba(0,0,0,.7);border:none;border-radius:50%;width:16px;height:16px;display:flex;align-items:center;justify-content:center;color:#fff;cursor:pointer;}
      .upgrade-nudge{display:flex;align-items:center;gap:12px;background:rgba(245,158,11,.06);border:1px solid rgba(245,158,11,.2);border-radius:10px;padding:12px 14px;}
      .gen-steps{display:flex;flex-direction:column;gap:7px;}
      .gen-step{display:flex;align-items:center;gap:7px;font-size:12.5px;color:var(--fog);}
      .gen-step-active{color:var(--teal);}
      .step-dot{width:6px;height:6px;border-radius:50%;background:var(--line);display:inline-block;}

      /* Explainer */
      .analyse-explainer{display:flex;flex-direction:column;gap:14px;}
      .explainer-cards{display:flex;flex-direction:column;gap:12px;}
      .explainer-card{display:flex;align-items:flex-start;gap:14px;background:var(--card);border:1px solid var(--line);border-radius:12px;padding:16px;}
      .explainer-card-locked{opacity:.5;}
      .ec-icon{width:40px;height:40px;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
      .ec-title{font-weight:600;font-size:14px;color:var(--bone);margin-bottom:4px;}
      .ec-desc{font-size:12.5px;color:var(--fog);line-height:1.55;}
      .lock-badge{background:rgba(245,158,11,.15);color:var(--amber);font-size:10px;padding:2px 7px;border-radius:999px;margin-left:6px;font-weight:600;}
      .upgrade-card{display:flex;align-items:center;gap:10px;background:rgba(245,158,11,.06);border:1px solid rgba(245,158,11,.25);border-radius:12px;padding:14px 16px;cursor:pointer;color:var(--amber);font-size:13px;font-weight:600;font-family:'Inter';width:100%;}

      /* ---- Results ---- */
      .results-wrap{padding:28px;flex:1;}
      .results-inner{display:flex;flex-direction:column;gap:22px;max-width:820px;margin:0 auto;}
      .results-header{display:flex;align-items:flex-start;justify-content:space-between;}
      .results-platform-tag{font-size:12px;color:var(--fog);margin-bottom:4px;}
      .results-title{font-family:'Syne';font-size:24px;font-weight:700;color:var(--bone);}
      .opp-tabs{display:flex;gap:8px;flex-wrap:wrap;}
      .opp-tab{display:flex;align-items:center;gap:6px;background:var(--card);border:1px solid var(--line);color:var(--slate);font-size:13px;font-weight:600;padding:9px 16px;border-radius:8px;cursor:pointer;transition:all .15s;font-family:'Inter';}
      .opp-tab:hover{border-color:var(--teal);color:var(--teal);}
      .opp-tab-on{background:var(--teal-glow);border-color:var(--teal);color:var(--teal);}
      .opp-rank{background:var(--teal-glow);color:var(--teal);font-size:11px;padding:1px 6px;border-radius:4px;}
      .opp-card{background:var(--card);border:1px solid var(--line);border-left:3px solid var(--opp-color,var(--teal));border-radius:12px;padding:20px;display:flex;flex-direction:column;gap:14px;}
      .opp-card-head{display:flex;justify-content:space-between;align-items:flex-start;}
      .opp-type-badge{font-size:11px;font-weight:600;padding:3px 10px;border-radius:999px;margin-bottom:6px;display:inline-block;}
      .opp-title{font-family:'Syne';font-size:20px;font-weight:700;color:var(--bone);}
      .opp-price{display:flex;align-items:center;gap:4px;font-size:16px;font-weight:700;color:var(--bone);}
      .opp-section-title{font-size:11px;font-weight:600;color:var(--fog);text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px;}
      .opp-why{font-size:13.5px;color:var(--slate);line-height:1.6;}
      .opp-quickwin{background:rgba(245,158,11,.06);border:1px solid rgba(245,158,11,.15);border-radius:10px;padding:14px;}

      /* Playbook */
      .week-tabs{display:flex;gap:4px;background:var(--black);border-radius:8px;padding:4px;max-width:320px;}
      .week-tab{flex:1;background:none;border:none;color:var(--fog);font-family:'Inter';font-size:13px;font-weight:600;padding:8px;border-radius:6px;cursor:pointer;}
      .week-tab-on{background:var(--card);color:var(--bone);}
      .week-card{background:var(--card);border:1px solid var(--line);border-radius:12px;overflow:hidden;}
      .week-header{padding:16px 20px;border-bottom:1px solid var(--line);background:var(--teal-glow);}
      .week-theme{font-family:'Syne';font-size:16px;font-weight:700;color:var(--bone);}
      .week-goal{font-size:13px;color:var(--teal);margin-top:3px;}
      .week-posts{display:flex;flex-direction:column;gap:0;}
      .week-post{padding:14px 20px;border-bottom:1px solid var(--line);display:grid;grid-template-columns:56px 80px 1fr;gap:10px;align-items:start;}
      .week-post:last-child{border-bottom:none;}
      .wp-day{font-size:11px;font-weight:700;color:var(--teal);}
      .wp-format-badge{font-size:10px;font-weight:600;color:var(--violet);background:rgba(167,139,250,.1);border:1px solid rgba(167,139,250,.2);padding:2px 8px;border-radius:999px;white-space:nowrap;}
      .wp-hook{font-size:13px;color:var(--bone);font-style:italic;}
      .wp-purpose{font-size:11.5px;color:var(--fog);margin-top:4px;grid-column:2/-1;}
      .pricing-strategy-card{background:var(--teal-glow);border:1px solid rgba(0,212,170,.2);border-radius:12px;padding:16px;}
      .ps-label{display:flex;align-items:center;gap:6px;font-size:11px;font-weight:700;color:var(--teal);text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px;}
      .ps-text{font-size:13.5px;color:var(--slate);line-height:1.6;}
      .dm-tabs{display:flex;gap:4px;flex-wrap:wrap;}
      .dm-tab{background:var(--card);border:1px solid var(--line);color:var(--slate);font-size:12.5px;font-weight:600;padding:8px 14px;border-radius:8px;cursor:pointer;font-family:'Inter';}
      .dm-tab-on{background:rgba(167,139,250,.1);border-color:var(--violet);color:var(--violet);}
      .dm-card{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:18px;display:flex;flex-direction:column;gap:12px;}
      .dm-text{font-family:'JetBrains Mono',monospace;font-size:12.5px;line-height:1.75;color:var(--bone);white-space:pre-wrap;}
      .playbook-locked{display:flex;flex-direction:column;align-items:center;gap:14px;background:var(--card);border:1px solid var(--line);border-radius:16px;padding:36px;text-align:center;}
      .pl-title{font-family:'Syne';font-size:18px;font-weight:700;color:var(--bone);}
      .pl-desc{font-size:14px;color:var(--fog);line-height:1.6;max-width:360px;}

      /* ---- History ---- */
      .history-wrap{padding:28px;flex:1;}
      .history-list{display:flex;flex-direction:column;gap:10px;max-width:700px;margin:0 auto;}
      .history-card{display:flex;align-items:center;gap:16px;background:var(--card);border:1px solid var(--line);border-radius:12px;padding:16px 20px;cursor:pointer;transition:border-color .15s;}
      .history-card:hover{border-color:var(--teal);}
      .hc-left{display:flex;align-items:center;gap:12px;flex:1;}
      .platform-dot{width:10px;height:10px;border-radius:50%;flex-shrink:0;}
      .pd-instagram{background:#E1306C;} .pd-tiktok{background:#00F2EA;} .pd-youtube{background:#FF0000;} .pd-twitter{background:#1DA1F2;} .pd-linkedin{background:#0077B5;}
      .hc-platform{font-weight:700;font-size:14px;color:var(--bone);}
      .hc-niche{font-size:12px;color:var(--fog);margin-top:2px;}
      .hc-right{display:flex;flex-direction:column;align-items:flex-end;gap:4px;}
      .hc-opps{font-size:12px;color:var(--teal);font-weight:600;}
      .hc-date{font-size:11px;color:var(--fog);}
      .hc-playbook-badge{display:flex;align-items:center;gap:4px;font-size:10px;color:var(--amber);background:rgba(245,158,11,.1);padding:2px 7px;border-radius:999px;}

      /* ---- Empty state ---- */
      .empty-state{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;min-height:360px;color:var(--fog);text-align:center;max-width:300px;margin:0 auto;line-height:1.6;}
      .empty-icon{width:60px;height:60px;background:var(--card);border:1px solid var(--line);border-radius:16px;display:flex;align-items:center;justify-content:center;color:var(--teal);}

      /* ---- Pricing modal ---- */
      .modal-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.75);display:flex;align-items:center;justify-content:center;z-index:50;padding:20px;}
      .modal{background:var(--panel);border:1px solid var(--line);border-radius:16px;padding:28px;max-width:760px;width:100%;}
      .modal-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;}
      .modal-head h3{font-family:'Syne';font-size:20px;font-weight:700;}
      .plan-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;}
      .plan-card{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:20px;display:flex;flex-direction:column;gap:10px;position:relative;}
      .plan-card-active{border-color:var(--teal);}
      .plan-card-featured{border-color:var(--teal);background:var(--teal-glow);}
      .plan-featured-badge{position:absolute;top:-11px;left:50%;transform:translateX(-50%);background:var(--teal);color:#080B0E;font-size:11px;font-weight:700;padding:3px 12px;border-radius:999px;white-space:nowrap;}
      .plan-tag{font-size:11px;color:var(--fog);font-weight:500;}
      .plan-name{font-family:'Syne';font-size:18px;font-weight:700;}
      .plan-price{display:flex;align-items:baseline;gap:2px;}
      .plan-price-num{font-size:26px;font-weight:700;color:var(--bone);}
      .plan-price-period{font-size:13px;color:var(--fog);}
      .plan-features{display:flex;flex-direction:column;gap:7px;margin:4px 0;}
      .pf-item{display:flex;align-items:center;gap:7px;font-size:13px;color:var(--slate);}

      /* ---- Check-in tab ---- */
      .checkin-wrap{padding:28px;flex:1;}
      .checkin-subtabs{display:flex;gap:4px;margin-bottom:22px;background:var(--black);border-radius:10px;padding:4px;max-width:320px;}
      .ci-stab{display:flex;align-items:center;gap:6px;flex:1;background:none;border:none;color:var(--fog);font-family:'Inter';font-size:13px;font-weight:600;padding:9px 12px;border-radius:7px;cursor:pointer;}
      .ci-stab-on{background:var(--card);color:var(--bone);}
      .checkin-grid{display:grid;grid-template-columns:1fr 1fr;gap:32px;align-items:start;}
      .checkin-form{display:flex;flex-direction:column;gap:14px;}
      .checkin-output{display:flex;flex-direction:column;gap:14px;}
      .ci-row{display:flex;gap:10px;align-items:flex-start;}
      .ci-select{background:none;border:none;color:var(--bone);font-family:'Inter';font-size:14px;padding:10px 4px;outline:none;width:100%;cursor:pointer;}
      .ci-select option{background:var(--card);color:var(--bone);}
      .ci-result{display:flex;flex-direction:column;gap:14px;}
      .ci-result-head{display:flex;justify-content:space-between;align-items:flex-start;}
      .ci-linked-tag{font-size:12px;color:var(--fog);margin-top:4px;}
      .ci-debrief-box{background:var(--card);border:1px solid var(--line);border-left:3px solid var(--teal);border-radius:12px;padding:18px;}
      .ci-debrief-text{font-size:13.5px;color:var(--slate);line-height:1.75;white-space:pre-wrap;}
      .ci-explainer{display:flex;flex-direction:column;gap:14px;}
      .ci-explainer-cards{display:flex;flex-direction:column;gap:10px;}
      .ci-explainer-card{display:flex;align-items:flex-start;gap:14px;background:var(--card);border:1px solid var(--line);border-radius:12px;padding:14px;}
      .ci-ec-icon{font-size:22px;flex-shrink:0;}
      .ci-ec-title{font-weight:600;font-size:14px;color:var(--bone);margin-bottom:4px;}
      .ci-ec-desc{font-size:12.5px;color:var(--fog);line-height:1.55;}
      .ci-adjusted{display:flex;flex-direction:column;gap:10px;}
      .ci-adj-sub{font-size:13px;color:var(--fog);}
      .ci-week-card{background:var(--card);border:1px solid var(--line);border-radius:10px;overflow:hidden;}
      .ci-week-header{display:flex;justify-content:space-between;align-items:center;padding:13px 16px;cursor:pointer;}
      .ci-week-header:hover{background:rgba(255,255,255,.02);}
      .ci-week-name{font-size:11px;font-weight:700;color:var(--teal);text-transform:uppercase;letter-spacing:.06em;}
      .ci-week-theme{font-size:14px;font-weight:600;color:var(--bone);margin-top:2px;}
      .ci-week-body{padding:0 16px 14px;border-top:1px solid var(--line);}
      .ci-week-goal{font-size:12.5px;color:var(--teal);padding:10px 0 8px;}
      .ci-post-row{display:grid;grid-template-columns:52px 80px 1fr;gap:8px;align-items:start;padding:8px 0;border-top:1px solid var(--line);}
      .ci-history{max-width:700px;margin:0 auto;width:100%;}
      .ci-history-list{display:flex;flex-direction:column;gap:9px;}
      .ci-history-card{background:var(--card);border:1px solid var(--line);border-radius:12px;overflow:hidden;cursor:pointer;}
      .ci-hc-head{display:flex;align-items:center;justify-content:space-between;padding:14px 18px;}
      .ci-hc-head:hover{background:rgba(255,255,255,.02);}
      .ci-hc-title{font-weight:600;font-size:14px;color:var(--bone);}
      .ci-hc-date{font-size:12px;color:var(--fog);margin-top:2px;}
      .ci-hc-body{padding:0 18px 16px;border-top:1px solid var(--line);}
      .ci-hc-section-label{font-size:10.5px;font-weight:700;color:var(--teal);text-transform:uppercase;letter-spacing:.06em;margin-top:12px;margin-bottom:5px;}
      .ci-hc-data{font-size:13px;color:var(--slate);line-height:1.55;}

      @media(max-width:820px){
        .auth-wrap{grid-template-columns:1fr;}
        .auth-left{display:none;}
        .analyse-grid{grid-template-columns:1fr;}
        .checkin-grid{grid-template-columns:1fr;}
        .plan-grid{grid-template-columns:1fr;}
        .week-post{grid-template-columns:48px 1fr;}
        .topbar{padding:12px 16px;flex-wrap:wrap;gap:8px;}
        .results-wrap,.analyse-wrap,.history-wrap,.checkin-wrap{padding:18px;}
        .img-upload-grid{grid-template-columns:repeat(3,1fr);}
      }
    `}</style>
  );
}
