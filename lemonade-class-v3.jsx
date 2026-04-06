import { useState, useEffect, useRef, useCallback } from "react";

/* ═══════════════════════════════════════════
   LEMONADE CLASS v3 — With Custom Art Assets
   ═══════════════════════════════════════════ */

// ─── ASSET BASE PATH ───
// Change this to wherever you host the PNGs on lemonadeclass.com
const A = "https://www.lemonadeclass.com/assets/";

const IMG = {
  // Lemon buddy emotions
  happy: A + "lemon-happy.png",
  excited: A + "lemon-excited.png",
  worried: A + "lemon-worried.png",
  sad: A + "lemon-sad.png",
  cool: A + "lemon-cool.png",
  neutral: A + "lemon-neutral.png",
  thinking: A + "lemon-thinking.png",
  celebrating: A + "lemon-celebrating.png",
  // Weather
  sunny: A + "weather-sunny.png",
  warm: A + "weather-warm.png",
  cloudy: A + "weather-cloudy.png",
  rainy: A + "weather-rainy.png",
  heatwave: A + "weather-heat-wave.png",
  // Inventory
  lemons: A + "inventory-lemons.png",
  cups: A + "inventory-cups.png",
  sugar: A + "inventory-sugar.png",
  // Events
  evCompetitor: A + "event-competitor.png",
  evSpoiled: A + "event-spoiled-lemons.png",
  evInspector: A + "event-health-inspector.png",
  evInfluencer: A + "event-influencer.png",
  evFieldTrip: A + "event-school-field-trip.png",
  evTruck: A + "event-supply-truck-delay.png",
  // UI
  cashIcon: A + "ui-cash-icon.png",
  starIcon: A + "ui-star-icon.png",
  trophy: A + "ui-trophy-icon.png",
  plusBtn: A + "ui-plus-button.png",
  minusBtn: A + "ui-minus-button.png",
  // Environment
  heroStand: A + "hero-lemonade-stand.png",
  confetti: A + "ui-confetti-burst.png",
};

// ─── GAME CONFIG ───
const GAME = {
  dailyStallFee: 6, expiredSurcharge: 3, baseCustomers: 200,
  custMin: 80, custMax: 380,
  lemonSpoilHot: [0.1, 0.22], lemonSpoilNorm: [0.04, 0.12], sugarSpoil: [0, 0.06],
  repSelloutPen: 2.5, repOOSPen: 1, repFairGain: 0.25,
  repOverPen: 0.4, repUnderPen: 0.1, priceElasticity: 1.45, mktCurve: 6,
  TICK_MS: 3000, CUST_MIN: 4000, CUST_MAX: 12000, SPARK_MS: 3000,
  DAYS: 5,
};

const WEATHER = [
  { img: "sunny", icon: "☀️", name: "Sunny", temp: [78, 92], base: 0.06, vol: "Low", hot: false },
  { img: "warm", icon: "🌤️", name: "Warm", temp: [72, 86], base: 0.03, vol: "Medium", hot: false },
  { img: "cloudy", icon: "☁️", name: "Cloudy", temp: [60, 78], base: -0.05, vol: "Medium", hot: false },
  { img: "rainy", icon: "🌧️", name: "Rainy", temp: [55, 70], base: -0.12, vol: "High", hot: false },
  { img: "heatwave", icon: "🔥", name: "Heat Wave", temp: [90, 102], base: 0.12, vol: "High", hot: true },
];

const EVENTS = [
  { title: "Competitor Undercut!", body: "A rival stand just dropped their price. Customers are comparing!", tags: ["Market Avg ↓", "Walk-away ↑"], key: "competitor", img: "evCompetitor" },
  { title: "Lemons Spoiled!", body: "Some lemons went bad — poor storage strikes again.", tags: ["Lemons lost", "Rep -1"], key: "spoil", img: "evSpoiled" },
  { title: "Health Inspector!", body: "Surprise visit! Is your permit up to date?", tags: ["Fine if expired", "Rep ±"], key: "inspector", img: "evInspector" },
  { title: "Influencer Post!", body: "A local foodie just posted about your stand!", tags: ["Customers ↑", "Rep +3"], key: "influencer", img: "evInfluencer" },
  { title: "School Field Trip!", body: "A bus full of thirsty kids just pulled up!", tags: ["Customers ↑↑", "Demand ↑"], key: "fieldtrip", img: "evFieldTrip" },
  { title: "Supply Delay!", body: "Tomorrow's delivery truck got stuck in traffic.", tags: ["Plan ahead!", "No effect today"], key: "truckdelay", img: "evTruck" },
];

// ─── HELPERS ───
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const money = (n) => (n < 0 ? "-$" + Math.abs(n).toFixed(2) : "$" + n.toFixed(2));
const randInt = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const ts = () => new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

function fresh() {
  return {
    day: 1, phase: "setup", cash: 25, revToday: 0, expToday: 0,
    price: 1, mktAvg: 1, lemons: 20, cups: 20, sugar: 20,
    permitDays: 2, hasSign: false, demand: 0.5, traffic: "Normal",
    vol: "Medium", sent: "bull", rep: 12,
    custTotal: 0, custLeft: 0, sold: 0, soldOut: false,
    mktSpend: 0, mktMins: 0, mktTotal: 480,
    idx: 100, idxSeries: [100], dayLogs: [],
    forecast: null, avgD: { s: 0, c: 0 }, evCnt: 0,
    weather: WEATHER[0], temp: 85,
    ticker: [{ t: "info", m: "Welcome to Lemonade Class! 🍋", s: "9:00" }],
    activeEvent: null, showEarnings: false, gameOver: false, eventPaused: false,
  };
}

// ─── STORAGE ───
const sKey = (n, c) => `lc:${c}:${n}`;
async function saveProg(name, code, state) {
  try {
    const d = { ...state, activeEvent: null, showEarnings: false, eventPaused: false };
    if (d.phase === "live") d.phase = "setup";
    await window.storage.set(sKey(name, code), JSON.stringify(d));
  } catch {}
}
async function loadProg(name, code) {
  try {
    const r = await window.storage.get(sKey(name, code));
    return r ? JSON.parse(r.value) : null;
  } catch { return null; }
}

// ─── LEMON MOOD MAPPING ───
function lemonMood(s) {
  if (s.gameOver) return "celebrating";
  if (s.phase === "closed" || s.showEarnings) {
    const net = s.revToday - s.expToday;
    return net > 5 ? "celebrating" : net > 0 ? "happy" : net > -3 ? "worried" : "sad";
  }
  if (s.phase === "live") {
    if (s.eventPaused) return "thinking";
    return s.demand > 0.6 ? "excited" : s.demand > 0.4 ? "happy" : "worried";
  }
  return s.cash < 10 ? "sad" : "neutral";
}

/* ═══════════════════════════════════════════
   GLOBAL STYLES
   ═══════════════════════════════════════════ */
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Baloo+2:wght@400;500;600;700;800&family=Nunito:wght@400;600;700;800&display=swap');
  @keyframes fadeUp { from { opacity:0; transform:translateY(24px); } to { opacity:1; transform:translateY(0); } }
  @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
  @keyframes popIn { from { opacity:0; transform:scale(.88); } to { opacity:1; transform:scale(1); } }
  @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:.45; } }
  @keyframes slideR { from { opacity:0; transform:translateX(-14px); } to { opacity:1; transform:translateX(0); } }
  @keyframes float { 0%,100% { transform:translateY(0); } 50% { transform:translateY(-14px); } }
  @keyframes bounce { 0%,100% { transform:translateY(0); } 40% { transform:translateY(-8px); } 60% { transform:translateY(-4px); } }
  @keyframes shimmer { 0% { background-position:-200% 0; } 100% { background-position:200% 0; } }
  @keyframes confettiFall { 0% { opacity:1; transform:translateY(0) rotate(0deg); } 100% { opacity:0; transform:translateY(60px) rotate(180deg); } }
  .chover { transition: transform .2s, border-color .2s; }
  .chover:hover { transform: translateY(-2px); border-color: rgba(255,225,53,.18) !important; }
  * { box-sizing:border-box; margin:0; padding:0; }
  ::-webkit-scrollbar { width:5px; }
  ::-webkit-scrollbar-thumb { background:rgba(255,255,255,.08); border-radius:99px; }
  body { overflow-x: hidden; }
`;

/* ═══════════════════════════════════════════
   COMPONENTS
   ═══════════════════════════════════════════ */
function Bar({ value, max, c1 = "#FFE135", c2 = "#4ADE80", h = 14, label }) {
  const pct = clamp((value / max) * 100, 0, 100);
  return (
    <div>
      {label && <div style={{ fontSize: 11, color: "#8892b0", marginBottom: 4, fontWeight: 600 }}>{label}</div>}
      <div style={{ height: h, borderRadius: 99, background: "rgba(255,255,255,.06)", overflow: "hidden", border: "1px solid rgba(255,255,255,.08)" }}>
        <div style={{ height: "100%", width: pct + "%", borderRadius: 99, background: `linear-gradient(90deg, ${c1}, ${c2})`, transition: "width .8s cubic-bezier(.22,1,.36,1)", boxShadow: `0 0 10px ${c1}33` }} />
      </div>
    </div>
  );
}

function Spark({ data, w = 240, h = 50 }) {
  if (data.length < 2) return <div style={{ width: w, height: h }} />;
  const mn = Math.min(...data), mx = Math.max(...data), rng = mx - mn || 1, p = 5;
  const pts = data.map((v, i) => `${p + (i / (data.length - 1)) * (w - p * 2)},${p + (1 - (v - mn) / rng) * (h - p * 2)}`).join(" ");
  const lx = w - p, ly = p + (1 - (data[data.length - 1] - mn) / rng) * (h - p * 2);
  return (
    <svg width={w} height={h} style={{ display: "block" }}>
      <defs><linearGradient id="sg"><stop offset="0%" stopColor="#FFE135" /><stop offset="100%" stopColor="#4ADE80" /></linearGradient></defs>
      <polyline points={pts} fill="none" stroke="url(#sg)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={lx} cy={ly} r="3.5" fill="#4ADE80" style={{ filter: "drop-shadow(0 0 4px #4ADE80)" }} />
    </svg>
  );
}

function LemonBuddy({ mood, size = 64 }) {
  return (
    <img
      src={IMG[mood] || IMG.neutral}
      alt={`Lemon buddy - ${mood}`}
      style={{
        width: size, height: size, objectFit: "contain",
        animation: mood === "celebrating" ? "bounce .6s ease infinite" : mood === "excited" ? "bounce .8s ease infinite" : "float 3s ease-in-out infinite",
        filter: "drop-shadow(0 4px 12px rgba(255,225,53,.25))",
      }}
    />
  );
}

function WeatherImg({ weatherKey, size = 38 }) {
  return <img src={IMG[weatherKey] || IMG.sunny} alt="weather" style={{ width: size, height: size, objectFit: "contain" }} />;
}

function InvSlot({ imgKey, label, count, cost, disabled, onBuy }) {
  return (
    <div className="chover" style={{
      padding: 14, borderRadius: 16, background: "rgba(255,255,255,.03)",
      border: "1px solid rgba(255,255,255,.07)", textAlign: "center",
    }}>
      <img src={IMG[imgKey]} alt={label} style={{ width: 48, height: 48, objectFit: "contain", marginBottom: 4 }} />
      <div style={{ fontSize: 10, color: "#64748b", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.5 }}>{label}</div>
      <div style={{ fontSize: 30, fontWeight: 800, color: "#e2e8f0", fontFamily: "'Baloo 2',sans-serif", margin: "2px 0 6px" }}>{count}</div>
      <button disabled={disabled} onClick={onBuy} style={{
        width: "100%", padding: "7px 0", borderRadius: 10, border: "none", fontSize: 12, fontWeight: 700,
        background: disabled ? "rgba(255,255,255,.03)" : "linear-gradient(135deg, rgba(255,225,53,.14), rgba(255,184,0,.08))",
        color: disabled ? "#334155" : "#FFE135", cursor: disabled ? "default" : "pointer",
        transition: "transform .15s",
      }}
        onMouseOver={e => !disabled && (e.target.style.transform = "scale(1.06)")}
        onMouseOut={e => e.target.style.transform = "scale(1)"}
      >+10 · ${cost}</button>
    </div>
  );
}

/* ═══════════════════════════════════════════
   MODALS
   ═══════════════════════════════════════════ */
function Overlay({ children }) {
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,.65)", zIndex: 1000,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
      backdropFilter: "blur(8px)", animation: "fadeIn .3s ease",
    }}>{children}</div>
  );
}

function EventModal({ event, onHold, onAdjust }) {
  if (!event) return null;
  return (
    <Overlay>
      <div style={{
        maxWidth: 460, width: "100%", background: "linear-gradient(135deg, #112240, #0a192f)",
        borderRadius: 22, border: "1px solid rgba(255,204,102,.2)",
        boxShadow: "0 20px 60px rgba(0,0,0,.5)", overflow: "hidden",
        animation: "popIn .4s cubic-bezier(.34,1.56,.64,1)",
      }}>
        {/* Event illustration */}
        <div style={{
          width: "100%", height: 160, overflow: "hidden",
          background: "linear-gradient(180deg, rgba(255,204,102,.06), transparent)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <img src={IMG[event.img]} alt={event.title} style={{
            width: "100%", height: "100%", objectFit: "cover",
            animation: "fadeIn .5s ease",
          }} />
        </div>
        <div style={{ padding: "18px 22px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 20 }}>⚡</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#ffcc66", letterSpacing: 1.5, textTransform: "uppercase" }}>Market Event</span>
          </div>
          <h3 style={{ fontSize: 22, fontWeight: 800, color: "#fff", margin: "0 0 8px", fontFamily: "'Baloo 2',sans-serif" }}>{event.title}</h3>
          <p style={{ color: "#8892b0", margin: "0 0 14px", lineHeight: 1.6, fontSize: 14 }}>{event.body}</p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
            {event.tags.map((t, i) => (
              <span key={i} style={{ padding: "5px 12px", borderRadius: 99, fontSize: 12, fontWeight: 700, background: "rgba(255,204,102,.1)", color: "#ffcc66", border: "1px solid rgba(255,204,102,.18)" }}>{t}</span>
            ))}
          </div>
          <div style={{ fontSize: 12, color: "#475569", fontStyle: "italic", marginBottom: 16, padding: "10px 14px", borderRadius: 10, background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.05)" }}>
            ⏸ Market is paused — take your time to decide!
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={onHold} style={{ flex: 1, padding: 13, borderRadius: 13, border: "1px solid rgba(255,255,255,.1)", background: "rgba(255,255,255,.04)", color: "#cbd5e1", fontFamily: "'Baloo 2',sans-serif", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Hold Position</button>
            <button onClick={onAdjust} style={{ flex: 1, padding: 13, borderRadius: 13, border: "none", background: "linear-gradient(135deg,#FFE135,#FFB800)", color: "#0a0a1a", fontFamily: "'Baloo 2',sans-serif", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Adjust Price</button>
          </div>
        </div>
      </div>
    </Overlay>
  );
}

function EarningsModal({ data, day, total, onNext }) {
  if (!data) return null;
  const net = data.rev - data.exp;
  const grade = net > 15 ? "A+" : net > 8 ? "A" : net > 3 ? "B" : net > 0 ? "C" : net > -5 ? "D" : "F";
  const mood = net > 5 ? "celebrating" : net > 0 ? "happy" : net > -3 ? "worried" : "sad";
  return (
    <Overlay>
      <div style={{
        maxWidth: 480, width: "100%", background: "linear-gradient(135deg, #112240, #0a192f)",
        borderRadius: 24, border: `1px solid ${net >= 0 ? "rgba(74,222,128,.2)" : "rgba(255,77,109,.2)"}`,
        boxShadow: "0 20px 60px rgba(0,0,0,.5)", overflow: "hidden",
        animation: "popIn .5s cubic-bezier(.34,1.56,.64,1)",
      }}>
        <div style={{ padding: "22px 24px", textAlign: "center", borderBottom: "1px solid rgba(255,255,255,.06)", position: "relative" }}>
          {net > 5 && <img src={IMG.confetti} alt="" style={{ position: "absolute", top: -20, left: "50%", transform: "translateX(-50%)", width: 200, opacity: 0.6, pointerEvents: "none", animation: "confettiFall 2s ease forwards" }} />}
          <LemonBuddy mood={mood} size={72} />
          <h3 style={{ fontSize: 24, fontWeight: 800, color: "#fff", margin: "10px 0 6px", fontFamily: "'Baloo 2',sans-serif" }}>
            Day {day} — {net >= 0 ? "Profitable!" : "Tough Day"}
          </h3>
          <div style={{
            display: "inline-block", padding: "4px 20px", borderRadius: 99, fontSize: 32, fontWeight: 800,
            fontFamily: "'Baloo 2',sans-serif",
            background: net >= 0 ? "rgba(74,222,128,.12)" : "rgba(255,77,109,.12)",
            color: net >= 0 ? "#4ADE80" : "#FF6B6B",
          }}>Grade: {grade}</div>
        </div>
        <div style={{ padding: 22 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 18 }}>
            {[
              { l: "Revenue", v: money(data.rev), c: "#4ADE80" },
              { l: "Expenses", v: money(data.exp), c: "#FF6B6B" },
              { l: "Net Profit", v: (net >= 0 ? "+" : "") + money(net), c: net >= 0 ? "#4ADE80" : "#FF6B6B" },
              { l: "Cups Sold", v: data.sold + "", c: "#FFE135" },
            ].map((k, i) => (
              <div key={i} style={{ padding: 13, borderRadius: 14, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.06)", animation: `fadeUp .4s ease ${.1 + i * .08}s both` }}>
                <div style={{ fontSize: 10, color: "#475569", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.5 }}>{k.l}</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: k.c, fontFamily: "'Baloo 2',sans-serif", marginTop: 3 }}>{k.v}</div>
              </div>
            ))}
          </div>
          <div style={{ padding: 14, borderRadius: 14, background: "rgba(255,225,53,.05)", border: "1px dashed rgba(255,225,53,.18)", marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#FFE135", marginBottom: 4 }}>💡 Think About It</div>
            <div style={{ fontSize: 13, color: "#8892b0", lineHeight: 1.6 }}>
              {net > 5 ? "What pricing or inventory decision made the biggest difference today?" :
               net > 0 ? "You earned a profit! What could you adjust to grow it further?" :
               "What would you do differently with your pricing, inventory, or marketing?"}
            </div>
          </div>
          <button onClick={onNext} style={{
            width: "100%", padding: "15px 0", borderRadius: 15, border: "none",
            background: day >= total ? "linear-gradient(135deg, #a855f7, #6366f1)" : "linear-gradient(135deg, #FFE135, #FFB800)",
            color: day >= total ? "#fff" : "#0a0a1a", fontSize: 17, fontWeight: 800,
            fontFamily: "'Baloo 2',sans-serif", cursor: "pointer", boxShadow: "0 4px 20px rgba(0,0,0,.3)", transition: "transform .2s",
          }}
            onMouseOver={e => e.target.style.transform = "scale(1.02)"}
            onMouseOut={e => e.target.style.transform = "scale(1)"}
          >{day >= total ? "🏆 See Final Results" : "Next Day →"}</button>
        </div>
      </div>
    </Overlay>
  );
}

function GameOverScreen({ logs, cash, rep, playerName, onReset }) {
  const tp = logs.reduce((s, d) => s + d.net, 0);
  const best = logs.reduce((b, d) => d.net > b.net ? d : b, logs[0]);
  const grade = tp > 40 ? "A+" : tp > 25 ? "A" : tp > 12 ? "B" : tp > 0 ? "C" : "D";
  return (
    <Overlay>
      <div style={{
        maxWidth: 540, width: "100%", background: "linear-gradient(135deg, #0a0a1a, #112240)",
        borderRadius: 28, padding: 36, textAlign: "center",
        border: "1px solid rgba(255,225,53,.15)", boxShadow: "0 30px 80px rgba(0,0,0,.6)",
        animation: "popIn .6s cubic-bezier(.34,1.56,.64,1)", position: "relative", overflow: "hidden",
      }}>
        <img src={IMG.confetti} alt="" style={{ position: "absolute", top: -30, right: -30, width: 180, opacity: 0.4, pointerEvents: "none" }} />
        <img src={IMG.confetti} alt="" style={{ position: "absolute", bottom: -20, left: -20, width: 150, opacity: 0.3, pointerEvents: "none", transform: "rotate(180deg)" }} />
        <img src={IMG.trophy} alt="Trophy" style={{ width: 80, height: 80, objectFit: "contain", marginBottom: 8, filter: "drop-shadow(0 4px 16px rgba(255,184,0,.3))" }} />
        <h2 style={{ fontSize: 30, fontWeight: 800, color: "#FFE135", margin: "0 0 2px", fontFamily: "'Baloo 2',sans-serif" }}>Game Over, {playerName}!</h2>
        <p style={{ color: "#64748b", margin: "0 0 22px" }}>Your {GAME.DAYS}-day business report</p>
        <div style={{ display: "inline-block", padding: "6px 28px", borderRadius: 99, marginBottom: 22, background: "rgba(255,225,53,.1)", border: "2px solid rgba(255,225,53,.25)" }}>
          <span style={{ fontFamily: "'Baloo 2',sans-serif", fontSize: 44, color: "#FFE135" }}>{grade}</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 22 }}>
          {[
            { l: "Total Profit", v: (tp >= 0 ? "+" : "") + money(tp), c: tp >= 0 ? "#4ADE80" : "#FF6B6B" },
            { l: "Final Cash", v: money(cash), c: "#FFE135" },
            { l: "Reputation", v: Math.round(rep) + "/100", c: "#a78bfa" },
          ].map((k, i) => (
            <div key={i} style={{ padding: 13, borderRadius: 14, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.06)" }}>
              <div style={{ fontSize: 10, color: "#475569", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>{k.l}</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: k.c, fontFamily: "'Baloo 2',sans-serif", marginTop: 3 }}>{k.v}</div>
            </div>
          ))}
        </div>
        {best && <p style={{ fontSize: 13, color: "#475569", marginBottom: 20 }}>Best day: <strong style={{ color: "#4ADE80" }}>Day {best.day}</strong> · {money(best.net)} profit · {best.weather}</p>}
        <button onClick={onReset} style={{
          padding: "14px 44px", borderRadius: 14, border: "none",
          background: "linear-gradient(135deg, #FFE135, #FFB800)", color: "#0a0a1a",
          fontFamily: "'Baloo 2',sans-serif", fontSize: 18, fontWeight: 800, cursor: "pointer",
          boxShadow: "0 4px 20px rgba(255,225,53,.25)",
        }}>Play Again 🍋</button>
      </div>
    </Overlay>
  );
}

/* ═══════════════════════════════════════════
   SIGN-IN
   ═══════════════════════════════════════════ */
function SignIn({ onJoin }) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const go = async () => {
    const n = name.trim(), c = code.trim().toUpperCase();
    if (!n) { setError("Enter your name"); return; }
    if (!c || c.length < 3) { setError("Enter your class code"); return; }
    setLoading(true); setError("");
    const saved = await loadProg(n, c);
    setLoading(false);
    onJoin(n, c, saved);
  };

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "linear-gradient(145deg, #0a0a1a 0%, #112240 50%, #0a192f 100%)",
      fontFamily: "'Baloo 2','Nunito',sans-serif", padding: 20, position: "relative", overflow: "hidden",
    }}>
      <style>{GLOBAL_CSS}</style>

      {/* Hero stand background */}
      <div style={{ position: "absolute", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 700, opacity: 0.08, pointerEvents: "none" }}>
        <img src={IMG.heroStand} alt="" style={{ width: "100%", objectFit: "contain" }} />
      </div>

      {/* Floating lemons */}
      {[...Array(5)].map((_, i) => (
        <div key={i} style={{ position: "absolute", left: `${[10, 80, 25, 90, 55][i]}%`, top: `${[15, 20, 75, 65, 10][i]}%`, animation: `float ${4 + i * .7}s ease-in-out ${i * .3}s infinite`, opacity: 0.12 }}>
          <img src={IMG.happy} alt="" style={{ width: [45, 32, 50, 38, 42][i], objectFit: "contain" }} />
        </div>
      ))}

      <div style={{ maxWidth: 420, width: "100%", textAlign: "center", position: "relative", zIndex: 1, animation: "fadeUp .7s ease" }}>
        <div style={{ marginBottom: 28 }}>
          <LemonBuddy mood="excited" size={90} />
          <h1 style={{
            fontSize: 38, fontWeight: 800, margin: "12px 0 0", letterSpacing: -0.5,
            background: "linear-gradient(90deg, #FFE135, #FFB800, #FF8C00)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          }}>Lemonade Class</h1>
          <p style={{ color: "#64748b", fontSize: 15, marginTop: 6, fontWeight: 500 }}>Run your stand. Learn business. Stack profits.</p>
        </div>

        <div style={{
          background: "linear-gradient(135deg, rgba(17,34,64,.95), rgba(10,25,47,.95))",
          borderRadius: 24, padding: 28, border: "1px solid rgba(255,225,53,.12)",
          boxShadow: "0 16px 48px rgba(0,0,0,.4)", backdropFilter: "blur(12px)",
        }}>
          <div style={{ marginBottom: 18, textAlign: "left" }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1.5, display: "block", marginBottom: 6 }}>Your Name</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Marcus" maxLength={24}
              style={{ width: "100%", padding: "14px 16px", borderRadius: 14, border: "2px solid rgba(255,255,255,.08)", background: "rgba(0,0,0,.3)", color: "#e2e8f0", fontSize: 16, fontFamily: "'Baloo 2',sans-serif", outline: "none", transition: "border-color .2s" }}
              onFocus={e => e.target.style.borderColor = "rgba(255,225,53,.4)"}
              onBlur={e => e.target.style.borderColor = "rgba(255,255,255,.08)"}
              onKeyDown={e => e.key === "Enter" && go()} />
          </div>
          <div style={{ marginBottom: 22, textAlign: "left" }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1.5, display: "block", marginBottom: 6 }}>Class Code</label>
            <input value={code} onChange={e => setCode(e.target.value.toUpperCase())} placeholder="e.g. MR-JONES-3RD" maxLength={20}
              style={{ width: "100%", padding: "14px 16px", borderRadius: 14, border: "2px solid rgba(255,255,255,.08)", background: "rgba(0,0,0,.3)", color: "#e2e8f0", fontSize: 16, fontFamily: "'Baloo 2',sans-serif", outline: "none", letterSpacing: 2, textTransform: "uppercase", transition: "border-color .2s" }}
              onFocus={e => e.target.style.borderColor = "rgba(255,225,53,.4)"}
              onBlur={e => e.target.style.borderColor = "rgba(255,255,255,.08)"}
              onKeyDown={e => e.key === "Enter" && go()} />
            <div style={{ fontSize: 11, color: "#475569", marginTop: 6 }}>Your teacher will give you this code</div>
          </div>
          {error && <div style={{ padding: "10px 14px", borderRadius: 10, marginBottom: 14, background: "rgba(255,77,109,.1)", border: "1px solid rgba(255,77,109,.2)", color: "#FF6B6B", fontSize: 13, fontWeight: 600 }}>{error}</div>}
          <button onClick={go} disabled={loading} style={{
            width: "100%", padding: "16px 0", borderRadius: 16, border: "none",
            background: loading ? "rgba(255,225,53,.3)" : "linear-gradient(135deg, #FFE135, #FFB800)",
            color: "#0a0a1a", fontSize: 18, fontWeight: 800, fontFamily: "'Baloo 2',sans-serif",
            cursor: loading ? "wait" : "pointer", boxShadow: "0 4px 24px rgba(255,225,53,.25)", transition: "transform .2s",
          }}
            onMouseOver={e => !loading && (e.target.style.transform = "scale(1.02)")}
            onMouseOut={e => e.target.style.transform = "scale(1)"}
          >{loading ? "Loading..." : "Join Class 🚀"}</button>
        </div>
        <p style={{ color: "#334155", fontSize: 12, marginTop: 18 }}>© Lemonade Class · Classroom Financial Literacy</p>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   GAME BOARD
   ═══════════════════════════════════════════ */
function GameBoard({ playerName, classCode, initialState }) {
  const [s, setS] = useState(() => initialState || fresh());
  const T = useRef({ mkt: null, spk: null, cust: null });
  const sRef = useRef(s); sRef.current = s;

  const up = useCallback((fn) => setS(p => { const n = { ...p }; fn(n); return n; }), []);
  const tick = useCallback((t, m) => up(s => { s.ticker = [{ t, m, s: ts() }, ...s.ticker].slice(0, 20); }), [up]);

  // Auto-save
  useEffect(() => {
    const iv = setInterval(() => { const c = sRef.current; if (c.phase !== "live") saveProg(playerName, classCode, c); }, 15000);
    return () => clearInterval(iv);
  }, [playerName, classCode]);

  // Init forecast
  useEffect(() => {
    if (!s.forecast && s.phase === "setup") {
      up(st => { const p = pick(WEATHER); st.forecast = { acc: "Low", wrong: Math.random() < .55, wName: p.name, wImg: p.img, wVol: p.vol }; });
    }
  }, []);

  const calcDemand = useCallback((st) => {
    const sign = st.hasSign ? 1.08 : 1, permit = st.permitDays <= 0 ? .9 : 1;
    const mF = 1 + .3 * (1 - Math.exp(-st.mktSpend / GAME.mktCurve));
    const pF = clamp(Math.exp(-GAME.priceElasticity * (st.price / Math.max(.01, st.mktAvg) - 1)), .2, 1.55);
    const rF = .7 + (st.rep / 100) * .6;
    const mult = pF * mF * rF * sign * permit;
    const vN = st.vol === "Low" ? .02 : st.vol === "Medium" ? .04 : .08;
    const mS = (Math.log(mult) / Math.log(1.8)) * .22;
    st.demand = clamp(.5 + st.weather.base + mS + (Math.random() * 2 - 1) * vN, .06, .94);
    st.traffic = st.demand >= .68 ? "Busy" : st.demand >= .52 ? "Normal" : st.demand >= .35 ? "Quiet" : "Dead";
    st.sent = st.demand >= .62 ? "bull" : st.demand <= .38 ? "bear" : "neutral";
    st.avgD.s += st.demand; st.avgD.c += 1;
  }, []);

  const applyEv = useCallback((st, ev) => {
    if (ev.key === "competitor") st.mktAvg = clamp(st.mktAvg - .12, .6, 1.6);
    else if (ev.key === "spoil") { const l = Math.min(st.lemons, randInt(4, 10)); st.lemons -= l; st.rep = clamp(st.rep - 1, 0, 100); }
    else if (ev.key === "inspector") { if (st.permitDays <= 0) { st.cash -= 12; st.expToday += 12; st.rep = clamp(st.rep - 3, 0, 100); } else st.rep = clamp(st.rep + 1.5, 0, 100); }
    else if (ev.key === "influencer") { st.rep = clamp(st.rep + 3.5, 0, 100); st.custLeft = Math.min(st.custTotal, st.custLeft + randInt(10, 22)); }
    else if (ev.key === "fieldtrip") { st.custLeft = Math.min(st.custTotal + 30, st.custLeft + randInt(15, 30)); }
  }, []);

  // ─── START DAY ───
  const startDay = useCallback(() => {
    up(st => {
      if (st.phase !== "setup") return;
      st.phase = "live"; st.mktMins = 0; st.revToday = 0; st.expToday = 0;
      st.sold = 0; st.soldOut = false; st.avgD = { s: 0, c: 0 }; st.evCnt = 0; st.eventPaused = false;
      let actual;
      if (st.forecast?.wrong) { actual = pick(WEATHER.filter(w => w.name !== st.forecast.wName)); st.ticker = [{ t: "warn", m: "⚠️ Forecast was WRONG! Conditions shifted!", s: "9:00" }, ...st.ticker].slice(0, 20); }
      else if (st.forecast) { actual = WEATHER.find(w => w.name === st.forecast.wName) || pick(WEATHER); st.ticker = [{ t: "info", m: "✅ Forecast matched! Good planning pays off.", s: "9:00" }, ...st.ticker].slice(0, 20); }
      else actual = pick(WEATHER);
      st.weather = actual; st.temp = randInt(actual.temp[0], actual.temp[1]); st.vol = actual.vol;
      st.permitDays -= 1;
      let fixed = GAME.dailyStallFee; if (st.permitDays <= 0) fixed += GAME.expiredSurcharge;
      st.cash -= fixed; st.expToday += fixed;
      st.ticker = [{ t: "bad", m: `-${money(fixed)} Daily stand costs`, s: "9:00" }, ...st.ticker].slice(0, 20);
      calcDemand(st);
      const dL = .75 + st.demand * .85, rL = .85 + (st.rep / 100) * .35, sL = st.hasSign ? 1.08 : 1, pL = st.permitDays <= 0 ? .92 : 1, vL = st.vol === "High" ? 1.05 : st.vol === "Low" ? .97 : 1;
      st.custTotal = clamp(Math.round(GAME.baseCustomers * dL * rL * sL * pL * vL), GAME.custMin, GAME.custMax);
      st.custLeft = st.custTotal;
    });

    clearInterval(T.current.mkt); clearInterval(T.current.spk); clearTimeout(T.current.cust);

    T.current.mkt = setInterval(() => {
      const c = sRef.current; if (c.phase !== "live" || c.eventPaused) return;
      up(st => {
        st.mktMins += 10;
        if (st.mktMins % 60 === 0) { const d = (Math.random() * 2 - 1) * (st.vol === "High" ? .12 : st.vol === "Medium" ? .08 : .05); st.mktAvg = clamp(st.mktAvg + d, .6, 1.6); }
        const eC = st.vol === "Low" ? .08 : st.vol === "Medium" ? .14 : .22;
        if (Math.random() < eC && !st.activeEvent && st.evCnt < 3) {
          const ev = pick(EVENTS); st.evCnt += 1; applyEv(st, ev); calcDemand(st);
          st.activeEvent = ev; st.eventPaused = true;
          st.ticker = [{ t: "warn", m: `⚡ ${ev.title}`, s: ts() }, ...st.ticker].slice(0, 20);
        }
        if (st.mktMins >= st.mktTotal) st.phase = "closing";
      });
    }, GAME.TICK_MS);

    T.current.spk = setInterval(() => {
      const c = sRef.current; if (c.phase !== "live" || c.eventPaused) return;
      up(st => {
        calcDemand(st);
        const d = (st.demand - .5) * .25, v = st.vol === "Low" ? .18 : st.vol === "Medium" ? .32 : .55;
        st.idx = clamp(st.idx + d + (Math.random() * 2 - 1) * v, 80, 140);
        st.idxSeries = [...st.idxSeries.slice(-58), st.idx];
      });
    }, GAME.SPARK_MS);

    const custLoop = () => {
      const c = sRef.current; if (c.phase !== "live") return;
      if (c.eventPaused) { T.current.cust = setTimeout(custLoop, 1000); return; }
      up(st => {
        if (st.phase !== "live" || st.eventPaused) return;
        if (st.custLeft <= 0) { st.phase = "closing"; return; }
        st.custLeft -= 1;
        if (st.lemons <= 0 || st.cups <= 0 || st.sugar <= 0) { st.rep = clamp(st.rep - GAME.repOOSPen, 0, 100); st.soldOut = true; st.ticker = [{ t: "warn", m: "😬 Sold out — customer left!", s: ts() }, ...st.ticker].slice(0, 20); return; }
        const r = st.price / Math.max(.01, st.mktAvg), over = clamp(r - 1, 0, 1.5);
        const mF = 1 + .3 * (1 - Math.exp(-st.mktSpend / GAME.mktCurve));
        let walk = clamp(.18 + over * .28 + (.55 - st.demand) * .22 - (mF - 1) * .1 - (st.hasSign ? .02 : 0), .04, .55);
        if (Math.random() < walk) { if (over > .25) st.rep = clamp(st.rep - .35, 0, 100); return; }
        const fair = Math.abs(st.price - st.mktAvg) <= .25;
        let multi = 1; const mx = Math.min(st.lemons, st.cups, st.sugar);
        if (Math.random() < clamp((st.demand - .65) * .2, 0, .06)) multi = 3;
        else if (Math.random() < clamp((st.demand - .4) * .45 + (fair ? .06 : -.02), .02, .3)) multi = 2;
        multi = Math.min(multi, mx);
        st.lemons -= multi; st.cups -= multi; st.sugar -= multi;
        const sale = st.price * multi; st.cash += sale; st.revToday += sale; st.sold += multi;
        const d = st.price - st.mktAvg;
        if (d > .3) st.rep = clamp(st.rep - GAME.repOverPen, 0, 100);
        else if (d < -.35) st.rep = clamp(st.rep - GAME.repUnderPen, 0, 100);
        else st.rep = clamp(st.rep + GAME.repFairGain, 0, 100);
        st.rep = clamp(st.rep + (fair ? .1 : .04), 0, 100);
        st.ticker = [{ t: "good", m: `+${money(sale)} · ${multi} cup${multi > 1 ? "s" : ""} sold 🥤`, s: ts() }, ...st.ticker].slice(0, 20);
      });
      const d = sRef.current.demand;
      T.current.cust = setTimeout(custLoop, clamp(Math.round(GAME.CUST_MAX - (GAME.CUST_MAX - GAME.CUST_MIN) * d) + randInt(-500, 500), GAME.CUST_MIN, GAME.CUST_MAX));
    };
    T.current.cust = setTimeout(custLoop, 3000);
  }, [up, calcDemand, applyEv]);

  // ─── CLOSING ───
  useEffect(() => {
    if (s.phase === "closing") {
      clearInterval(T.current.mkt); clearInterval(T.current.spk); clearTimeout(T.current.cust);
      up(st => {
        st.phase = "closed";
        const lR = st.weather.hot ? Math.random() * (GAME.lemonSpoilHot[1] - GAME.lemonSpoilHot[0]) + GAME.lemonSpoilHot[0] : Math.random() * (GAME.lemonSpoilNorm[1] - GAME.lemonSpoilNorm[0]) + GAME.lemonSpoilNorm[0];
        st.lemons -= Math.min(st.lemons, Math.round(st.lemons * lR));
        st.sugar -= Math.min(st.sugar, Math.round(st.sugar * (Math.random() * (GAME.sugarSpoil[1] - GAME.sugarSpoil[0]) + GAME.sugarSpoil[0])));
        if (st.soldOut && st.custLeft > 0) st.rep = clamp(st.rep - GAME.repSelloutPen, 0, 100);
        if (st.sold >= Math.round(st.custTotal * .35) && !st.soldOut) st.rep = clamp(st.rep + 1.2, 0, 100);
        st.dayLogs = [...st.dayLogs, { day: st.day, rev: +st.revToday.toFixed(2), exp: +st.expToday.toFixed(2), net: +(st.revToday - st.expToday).toFixed(2), sold: st.sold, weather: st.weather.name }];
        st.showEarnings = true;
      });
      setTimeout(() => saveProg(playerName, classCode, sRef.current), 500);
    }
  }, [s.phase, up, playerName, classCode]);

  const nextDay = useCallback(() => {
    up(st => {
      st.showEarnings = false;
      if (st.day >= GAME.DAYS) { st.gameOver = true; saveProg(playerName, classCode, st); return; }
      st.day += 1; st.phase = "setup"; st.mktSpend = 0;
      st.mktAvg = clamp(st.mktAvg * .6 + 1 * .4, .6, 1.6);
      const acc = st.rep >= 70 ? "High" : st.rep >= 35 ? "Medium" : "Low";
      const p = pick(WEATHER);
      st.forecast = { acc, wrong: Math.random() < (acc === "High" ? .18 : acc === "Medium" ? .33 : .55), wName: p.name, wImg: p.img, wVol: p.vol };
    });
  }, [up, playerName, classCode]);

  useEffect(() => () => { clearInterval(T.current.mkt); clearInterval(T.current.spk); clearTimeout(T.current.cust); }, []);

  const spend = (amt, note) => {
    if (s.cash < amt) { tick("bad", `Not enough cash for ${note}`); return false; }
    up(st => { st.cash -= amt; st.expToday += amt; }); tick("bad", `-${money(amt)} ${note}`); return true;
  };

  const isSetup = s.phase === "setup", isLive = s.phase === "live";
  const net = s.revToday - s.expToday;
  const minsLeft = Math.max(0, s.mktTotal - s.mktMins);
  const sentC = s.sent === "bull" ? "#4ADE80" : s.sent === "bear" ? "#FF6B6B" : "#FFD166";
  const repLvl = s.rep >= 80 ? 5 : s.rep >= 60 ? 4 : s.rep >= 40 ? 3 : s.rep >= 20 ? 2 : 1;
  const mood = lemonMood(s);

  return (
    <div style={{ minHeight: "100vh", fontFamily: "'Baloo 2','Nunito',sans-serif", color: "#e2e8f0", background: "linear-gradient(145deg, #0a0a1a 0%, #0f172a 40%, #112240 100%)" }}>
      <style>{GLOBAL_CSS}</style>

      {/* Modals */}
      {s.activeEvent && <EventModal event={s.activeEvent}
        onHold={() => { tick("info", "Held position."); up(st => { st.activeEvent = null; st.eventPaused = false; }); }}
        onAdjust={() => { up(st => { st.price = clamp(st.price + (st.sent === "bear" ? -.1 : st.sent === "bull" ? .05 : -.05), .5, 3); st.activeEvent = null; st.eventPaused = false; }); tick("good", "Price adjusted!"); }}
      />}
      {s.showEarnings && s.dayLogs.length > 0 && <EarningsModal data={s.dayLogs[s.dayLogs.length - 1]} day={s.day} total={GAME.DAYS} onNext={nextDay} />}
      {s.gameOver && <GameOverScreen logs={s.dayLogs} cash={s.cash} rep={s.rep} playerName={playerName} onReset={() => { const f = fresh(); setS(f); saveProg(playerName, classCode, f); }} />}

      <div style={{ maxWidth: 1080, margin: "0 auto", padding: "14px 14px 30px", position: "relative", zIndex: 1 }}>

        {/* TOP BAR */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10,
          padding: "10px 16px", borderRadius: 18,
          background: "linear-gradient(135deg, rgba(17,34,64,.95), rgba(10,25,47,.95))",
          border: "1px solid rgba(255,255,255,.07)", boxShadow: "0 6px 28px rgba(0,0,0,.35)",
          backdropFilter: "blur(10px)", position: "sticky", top: 6, zIndex: 10, animation: "fadeUp .4s ease",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <LemonBuddy mood={mood} size={46} />
            <div>
              <div style={{ fontSize: 10, color: "#475569", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.5 }}>{playerName} · Day {s.day}/{GAME.DAYS}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <img src={IMG.cashIcon} alt="" style={{ width: 20, height: 20 }} />
                <span style={{ fontSize: 26, fontWeight: 800, color: "#FFE135" }}>{money(s.cash)}</span>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ padding: "5px 12px", borderRadius: 99, background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.08)", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
              <WeatherImg weatherKey={s.weather.img} size={24} /> {s.weather.name} {s.temp}°
            </span>
            <span style={{ padding: "5px 12px", borderRadius: 99, background: `${sentC}12`, border: `1px solid ${sentC}25`, fontSize: 12, fontWeight: 700, color: sentC, display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ width: 7, height: 7, borderRadius: 99, background: sentC, boxShadow: `0 0 6px ${sentC}55` }} />
              {s.sent === "bull" ? "Bullish 📈" : s.sent === "bear" ? "Bearish 📉" : "Neutral ➡️"}
            </span>
            <span style={{ padding: "5px 12px", borderRadius: 99, fontSize: 13, fontWeight: 700, background: net >= 0 ? "rgba(74,222,128,.08)" : "rgba(255,107,107,.08)", color: net >= 0 ? "#4ADE80" : "#FF6B6B" }}>
              Net: {net >= 0 ? "+" : ""}{money(net)}
            </span>
          </div>

          <span style={{
            padding: "5px 12px", borderRadius: 99, fontSize: 11, fontWeight: 700,
            background: isSetup ? "rgba(167,139,250,.12)" : isLive ? "rgba(74,222,128,.12)" : "rgba(255,107,107,.12)",
            color: isSetup ? "#a78bfa" : isLive ? "#4ADE80" : "#FF6B6B",
          }}>{isSetup ? "SETUP" : isLive ? (s.eventPaused ? "⏸ PAUSED" : "● LIVE") : "CLOSED"}</span>
        </div>

        {/* GRID */}
        <div style={{ display: "grid", gridTemplateColumns: "1.05fr .95fr", gap: 14, marginTop: 14 }}>

          {/* LEFT: MARKET */}
          <div style={{ background: "linear-gradient(135deg, rgba(17,34,64,.92), rgba(10,25,47,.92))", borderRadius: 20, border: "1px solid rgba(255,255,255,.07)", boxShadow: "0 6px 28px rgba(0,0,0,.25)", overflow: "hidden", animation: "fadeUp .5s ease .05s both" }}>
            <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,.05)", display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(255,255,255,.015)" }}>
              <h2 style={{ fontSize: 13, fontWeight: 700, color: "#FFE135", letterSpacing: 1, margin: 0 }}>📊 LIVE MARKET</h2>
              <span style={{ fontSize: 11, color: "#475569", fontWeight: 600 }}>{isLive ? `⏱ ${Math.floor(minsLeft / 60)}h ${minsLeft % 60}m` : isSetup ? "Waiting" : "Closed"}</span>
            </div>
            <div style={{ padding: 14 }}>
              <div className="chover" style={{ padding: 13, borderRadius: 15, background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.06)", marginBottom: 11 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#8892b0" }}>🍋 Lemon Market Index</span>
                  <span style={{ fontSize: 10, color: "#475569" }}>Vol: {s.vol}</span>
                </div>
                <Spark data={s.idxSeries} />
                <div style={{ fontSize: 22, fontWeight: 800, color: "#FFE135", marginTop: 4 }}>{s.idx.toFixed(1)}</div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 11 }}>
                <div style={{ padding: 11, borderRadius: 13, background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.06)" }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#8892b0", marginBottom: 5 }}>📊 Demand</div>
                  <Bar value={s.demand * 100} max={100} h={11} />
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5, fontSize: 11, color: "#475569" }}>
                    <span>{Math.round(s.demand * 100)}%</span><span>{s.traffic}</span>
                  </div>
                </div>
                <div style={{ padding: 11, borderRadius: 13, background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.06)" }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#8892b0", marginBottom: 5 }}>
                    👥 Customers {isLive && !s.eventPaused && <span style={{ color: "#4ADE80", animation: "pulse 1.5s infinite", fontSize: 9 }}>● LIVE</span>}
                  </div>
                  <div style={{ fontSize: 24, fontWeight: 800 }}>{isLive ? `${s.custLeft}/${s.custTotal}` : "—"}</div>
                  <div style={{ fontSize: 11, color: "#475569", marginTop: 1 }}>Sold: <strong style={{ color: "#FFE135" }}>{s.sold}</strong></div>
                </div>
              </div>

              {isLive && <div style={{ marginBottom: 11 }}><Bar value={s.mktMins} max={s.mktTotal} c1="#a78bfa" c2="#6366f1" h={9} label="Market Day · 9AM → 5PM" /></div>}

              {isSetup && s.forecast && (
                <div className="chover" style={{ padding: 13, borderRadius: 15, marginBottom: 11, background: "rgba(167,139,250,.04)", border: "1px solid rgba(167,139,250,.12)" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#a78bfa", marginBottom: 7 }}>🔮 Forecast <span style={{ fontWeight: 400, color: "#475569" }}>({s.forecast.acc} accuracy)</span></div>
                  <div style={{ display: "flex", gap: 7, alignItems: "center", flexWrap: "wrap" }}>
                    <WeatherImg weatherKey={s.forecast.wImg} size={30} />
                    <span style={{ padding: "4px 11px", borderRadius: 99, fontSize: 12, fontWeight: 600, background: "rgba(167,139,250,.1)", color: "#c4b5fd" }}>{s.forecast.wName}</span>
                    <span style={{ padding: "4px 11px", borderRadius: 99, fontSize: 12, fontWeight: 600, background: "rgba(167,139,250,.06)", color: "#a78bfa" }}>Vol: {s.forecast.wVol}</span>
                  </div>
                  <div style={{ fontSize: 11, color: "#475569", marginTop: 7 }}>⚠️ Forecasts can be wrong — plan wisely!</div>
                </div>
              )}

              <div style={{ borderRadius: 13, background: "rgba(0,0,0,.18)", border: "1px solid rgba(255,255,255,.05)", height: 190, overflow: "auto", padding: 10 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#475569", marginBottom: 5 }}>📜 LIVE TICKER</div>
                {s.ticker.map((t, i) => (
                  <div key={i} style={{ fontSize: 12, color: "#8892b0", marginBottom: 4, lineHeight: 1.4, opacity: Math.max(.4, 1 - i * .08), animation: i === 0 ? "slideR .3s ease" : "none" }}>
                    <span style={{ color: "#334155", marginRight: 5 }}>{t.s}</span>
                    <span style={{ marginRight: 4 }}>{t.t === "good" ? "🟢" : t.t === "bad" ? "🔴" : t.t === "warn" ? "🟡" : "⚪"}</span>
                    {t.m}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT: OPERATIONS */}
          <div style={{ background: "linear-gradient(135deg, rgba(17,34,64,.92), rgba(10,25,47,.92))", borderRadius: 20, border: "1px solid rgba(255,255,255,.07)", boxShadow: "0 6px 28px rgba(0,0,0,.25)", overflow: "hidden", animation: "fadeUp .5s ease .1s both" }}>
            <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,.05)", display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(255,255,255,.015)" }}>
              <h2 style={{ fontSize: 13, fontWeight: 700, color: "#4ADE80", letterSpacing: 1, margin: 0 }}>🏪 OPERATIONS</h2>
            </div>
            <div style={{ padding: 14, overflowY: "auto", maxHeight: "calc(100vh - 160px)" }}>

              {/* Price */}
              <div className="chover" style={{ padding: 15, borderRadius: 15, background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.06)", marginBottom: 11 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#8892b0" }}>💲 Price per Cup</span>
                  <span style={{ fontSize: 10, color: "#475569" }}>Avg: ${s.mktAvg.toFixed(2)}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14 }}>
                  <button onClick={() => up(st => { st.price = clamp(st.price - .05, .5, 3); })} style={{ width: 46, height: 46, borderRadius: 12, border: "none", background: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <img src={IMG.minusBtn} alt="-" style={{ width: 42, height: 42 }} />
                  </button>
                  <span style={{ fontSize: 36, fontWeight: 800, color: "#FFE135", minWidth: 95, textAlign: "center" }}>${s.price.toFixed(2)}</span>
                  <button onClick={() => up(st => { st.price = clamp(st.price + .05, .5, 3); })} style={{ width: 46, height: 46, borderRadius: 12, border: "none", background: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <img src={IMG.plusBtn} alt="+" style={{ width: 42, height: 42 }} />
                  </button>
                </div>
                <div style={{ fontSize: 11, color: "#475569", textAlign: "center", marginTop: 5 }}>
                  {s.price > s.mktAvg + .15 ? "⚠️ Above market — fewer sales" : s.price < s.mktAvg - .15 ? "📉 Below market — lower margins" : "✅ Competitive price"}
                </div>
              </div>

              {/* Inventory */}
              <div style={{ marginBottom: 11 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#8892b0", marginBottom: 7 }}>📦 Inventory</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                  <InvSlot imgKey="lemons" label="Lemons" count={s.lemons} cost={6} disabled={!isSetup} onBuy={() => isSetup && spend(6, "Lemons +10") && up(st => { st.lemons += 10; })} />
                  <InvSlot imgKey="cups" label="Cups" count={s.cups} cost={4} disabled={!isSetup} onBuy={() => isSetup && spend(4, "Cups +10") && up(st => { st.cups += 10; })} />
                  <InvSlot imgKey="sugar" label="Sugar" count={s.sugar} cost={3} disabled={!isSetup} onBuy={() => isSetup && spend(3, "Sugar +10") && up(st => { st.sugar += 10; })} />
                </div>
                <div style={{ fontSize: 10, color: "#334155", marginTop: 5 }}>Each cup = 1 lemon + 1 cup + 1 sugar</div>
              </div>

              {/* Marketing + Compliance */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9, marginBottom: 11 }}>
                <div style={{ padding: 11, borderRadius: 13, background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.06)" }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#8892b0", marginBottom: 7 }}>📣 Marketing · ${s.mktSpend}</div>
                  <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                    {[0, 3, 7, 12].map(amt => (
                      <button key={amt} disabled={!isSetup} onClick={() => {
                        if (!isSetup) return; const d = amt - s.mktSpend;
                        if (d > 0 && !spend(d, `Marketing +$${d}`)) return;
                        up(st => { st.mktSpend = amt; });
                      }} style={{
                        padding: "5px 11px", borderRadius: 8, fontSize: 12, fontWeight: 700, border: "none",
                        background: s.mktSpend === amt ? "rgba(255,225,53,.15)" : "rgba(255,255,255,.03)",
                        color: s.mktSpend === amt ? "#FFE135" : "#475569", cursor: isSetup ? "pointer" : "default",
                      }}>${amt}</button>
                    ))}
                  </div>
                </div>
                <div style={{ padding: 11, borderRadius: 13, background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.06)" }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#8892b0", marginBottom: 7 }}>🧾 Compliance</div>
                  <div style={{ fontSize: 12, color: s.permitDays > 0 ? "#4ADE80" : "#FF6B6B", fontWeight: 700, marginBottom: 5 }}>
                    {s.permitDays > 0 ? `Permit: ${s.permitDays}d` : "⚠️ EXPIRED"}
                  </div>
                  <div style={{ display: "flex", gap: 5 }}>
                    <button disabled={!isSetup} onClick={() => isSetup && spend(8, "Permit") && up(st => { st.permitDays = 3; })} style={{ padding: "5px 9px", borderRadius: 7, fontSize: 11, fontWeight: 600, border: "none", background: "rgba(167,139,250,.1)", color: isSetup ? "#a78bfa" : "#334155", cursor: isSetup ? "pointer" : "default" }}>Permit $8</button>
                    <button disabled={!isSetup || s.hasSign} onClick={() => isSetup && !s.hasSign && spend(5, "Sign") && up(st => { st.hasSign = true; })} style={{ padding: "5px 9px", borderRadius: 7, fontSize: 11, fontWeight: 600, border: "none", background: s.hasSign ? "rgba(74,222,128,.1)" : "rgba(255,255,255,.03)", color: s.hasSign ? "#4ADE80" : isSetup ? "#8892b0" : "#334155", cursor: isSetup && !s.hasSign ? "pointer" : "default" }}>{s.hasSign ? "✅ Sign" : "Sign $5"}</button>
                  </div>
                </div>
              </div>

              {/* Reputation */}
              <div style={{ marginBottom: 13, display: "flex", alignItems: "center", gap: 8 }}>
                <img src={IMG.starIcon} alt="" style={{ width: 20, height: 20 }} />
                <div style={{ flex: 1 }}>
                  <Bar value={s.rep} max={100} c1="#FFE135" c2="#a78bfa" h={11} label={`Reputation: ${Math.round(s.rep)}/100 · Level ${repLvl}`} />
                </div>
              </div>

              {/* ACTION */}
              {isSetup && (
                <button onClick={startDay} style={{
                  width: "100%", padding: "15px 0", borderRadius: 15, border: "none",
                  background: "linear-gradient(135deg, #4ADE80, #22C55E)",
                  color: "#0a0a1a", fontSize: 17, fontWeight: 800, cursor: "pointer",
                  boxShadow: "0 4px 22px rgba(74,222,128,.25)", transition: "transform .2s, box-shadow .2s",
                }}
                  onMouseOver={e => { e.target.style.transform = "scale(1.02)"; e.target.style.boxShadow = "0 6px 30px rgba(74,222,128,.4)"; }}
                  onMouseOut={e => { e.target.style.transform = "scale(1)"; e.target.style.boxShadow = "0 4px 22px rgba(74,222,128,.25)"; }}
                >🏪 Open for Business!</button>
              )}
              {isLive && (
                <button onClick={() => up(st => { if (st.phase === "live") st.phase = "closing"; })} style={{
                  width: "100%", padding: "15px 0", borderRadius: 15, border: "none",
                  background: "linear-gradient(135deg, #FF6B6B, #FF4D6D)",
                  color: "#fff", fontSize: 17, fontWeight: 800, cursor: "pointer",
                  boxShadow: "0 4px 22px rgba(255,77,109,.25)", transition: "transform .2s",
                }}
                  onMouseOver={e => e.target.style.transform = "scale(1.02)"}
                  onMouseOut={e => e.target.style.transform = "scale(1)"}
                >🔴 Close Market Early</button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   APP ROOT
   ═══════════════════════════════════════════ */
export default function App() {
  const [session, setSession] = useState(null);
  if (!session) return <SignIn onJoin={(name, code, saved) => setSession({ name, code, saved })} />;
  return <GameBoard playerName={session.name} classCode={session.code} initialState={session.saved} />;
}
