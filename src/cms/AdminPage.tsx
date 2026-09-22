import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  createPasswordRecord, verifyPassword, loadCms, saveCms, getStoredPasswordRecord, storePasswordRecord,
  isAuthed, setAuthed, getLockoutRemainingMs, recordFailedAttempt, clearAttempts, isSafeHttpUrl,
  type CmsData, type CmsProject,
} from "./storage";

// ── Palette (mirrors App.tsx) ─────────────────────────────────────────────────
const C = {
  bg: "#F5F6F8", surface: "#E8ECF1", brand: "#1E5AA8", electric: "#3E8EF7",
  headline: "#0B1220", body: "#5B6572", muted: "#8A9BAD", divider: "#D6DCE3",
  white: "#FFFFFF", danger: "#D94040",
} as const;
const T = {
  display: "'Instrument Serif', Georgia, serif",
  body: "'Geist', 'Inter', system-ui, sans-serif",
};

type Tab = "projects" | "hero" | "social";

const EMPTY_PROJECT: CmsProject = {
  id: "", name: "", neighborhood: "", location: "", investor: "Tregtia Sh.p.k",
  use: "Residential", img: "", images: [], alt: "", desc: "", specs: "",
};

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

// ── Input helpers ─────────────────────────────────────────────────────────────
function Field({ label, value, onChange, multiline = false, placeholder = "" }: {
  label: string; value: string; onChange: (v: string) => void;
  multiline?: boolean; placeholder?: string;
}) {
  const shared: React.CSSProperties = {
    fontFamily: T.body, fontSize: 13, color: C.headline, background: C.white,
    borderWidth: 1, borderStyle: "solid", borderColor: C.divider, borderRadius: 6,
    padding: "8px 12px", width: "100%", outline: "none", boxSizing: "border-box",
    transition: "border-color 0.15s",
  };
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ fontFamily: T.body, fontSize: 11, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 5 }}>{label}</label>
      {multiline
        ? <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={3}
            style={{ ...shared, resize: "vertical" }}
            onFocus={(e) => (e.currentTarget.style.borderColor = C.brand)}
            onBlur={(e) => (e.currentTarget.style.borderColor = C.divider)} />
        : <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
            style={shared}
            onFocus={(e) => (e.currentTarget.style.borderColor = C.brand)}
            onBlur={(e) => (e.currentTarget.style.borderColor = C.divider)} />
      }
    </div>
  );
}

function Btn({ children, onClick, variant = "primary", small = false, danger = false }: {
  children: React.ReactNode; onClick: () => void;
  variant?: "primary" | "ghost"; small?: boolean; danger?: boolean;
}) {
  const bg = danger ? C.danger : variant === "primary" ? C.brand : "transparent";
  const col = variant === "primary" || danger ? C.white : C.body;
  const border = variant === "ghost" ? `1px solid ${C.divider}` : "none";
  return (
    <motion.button whileTap={{ scale: 0.97 }} onClick={onClick}
      style={{ fontFamily: T.body, fontSize: small ? 12 : 13, fontWeight: 500, color: col, background: bg,
        border, borderRadius: 7, padding: small ? "6px 14px" : "9px 20px", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}>
      {children}
    </motion.button>
  );
}

// ── Setup / Login ─────────────────────────────────────────────────────────────
function AuthScreen({ onAuthed }: { onAuthed: () => void }) {
  const hasRecord = !!getStoredPasswordRecord();
  const [pwd, setPwd] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [lockoutMs, setLockoutMs] = useState(() => getLockoutRemainingMs());

  useEffect(() => {
    if (lockoutMs <= 0) return;
    const t = setInterval(() => {
      const remaining = getLockoutRemainingMs();
      setLockoutMs(remaining);
      if (remaining <= 0) clearInterval(t);
    }, 500);
    return () => clearInterval(t);
  }, [lockoutMs > 0]);

  const submit = async () => {
    if (getLockoutRemainingMs() > 0) return;
    setError(""); setLoading(true);
    if (!hasRecord) {
      if (pwd.length < 10) { setError("Password must be at least 10 characters."); setLoading(false); return; }
      if (pwd !== confirm) { setError("Passwords do not match."); setLoading(false); return; }
      storePasswordRecord(await createPasswordRecord(pwd));
      clearAttempts();
      setAuthed(true); onAuthed();
    } else {
      const ok = await verifyPassword(pwd, getStoredPasswordRecord()!);
      if (ok) { clearAttempts(); setAuthed(true); onAuthed(); }
      else {
        recordFailedAttempt();
        const remaining = getLockoutRemainingMs();
        setLockoutMs(remaining);
        setError(remaining > 0 ? `Too many attempts. Try again in ${Math.ceil(remaining / 1000)}s.` : "Incorrect password.");
      }
    }
    setLoading(false);
  };

  const locked = lockoutMs > 0;

  return (
    <div style={{ minHeight: "100vh", background: C.headline, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
        style={{ background: C.white, borderRadius: 12, padding: "40px 36px", width: 360, boxShadow: "0 8px 40px rgba(0,0,0,0.2)" }}>
        <div style={{ fontFamily: T.display, fontSize: 26, fontWeight: 400, color: C.headline, marginBottom: 6 }}>
          {hasRecord ? "Sign in" : "Set up CMS"}
        </div>
        <div style={{ fontFamily: T.body, fontSize: 13, color: C.muted, marginBottom: 28 }}>
          {hasRecord ? "Enter your admin password to continue." : "Create a password to secure the CMS. Min. 10 characters."}
        </div>

        <Field label="Password" value={pwd} onChange={setPwd} placeholder="••••••••" />
        {!hasRecord && <Field label="Confirm password" value={confirm} onChange={setConfirm} placeholder="••••••••" />}

        <AnimatePresence>
          {error && (
            <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              style={{ fontFamily: T.body, fontSize: 12, color: C.danger, marginBottom: 14 }}>{error}</motion.div>
          )}
        </AnimatePresence>

        <button onClick={submit} disabled={loading || locked}
          style={{ fontFamily: T.body, fontSize: 14, fontWeight: 600, color: C.white, background: C.brand, border: "none", borderRadius: 8, padding: "11px 0", width: "100%", cursor: loading || locked ? "default" : "pointer", opacity: loading || locked ? 0.6 : 1, transition: "opacity 0.15s" }}>
          {locked ? `Locked (${Math.ceil(lockoutMs / 1000)}s)` : loading ? "Checking…" : hasRecord ? "Sign in" : "Create password"}
        </button>

        <div style={{ fontFamily: T.body, fontSize: 11, color: C.muted, marginTop: 20, lineHeight: 1.6 }}>
          Password is hashed with salted PBKDF2 and stored only in this browser. It is never sent anywhere.
        </div>
      </motion.div>
    </div>
  );
}

// ── Project editor modal ──────────────────────────────────────────────────────
function ProjectEditor({ initial, onSave, onClose }: {
  initial: CmsProject; onSave: (p: CmsProject) => void; onClose: () => void;
}) {
  const [p, setP] = useState<CmsProject>(initial);
  const [imgInput, setImgInput] = useState("");
  const [imgError, setImgError] = useState("");
  const upd = (k: keyof CmsProject, v: string) => setP((prev) => ({ ...prev, [k]: v }));

  const addImage = () => {
    const url = imgInput.trim();
    if (!url) return;
    if (!isSafeHttpUrl(url)) { setImgError("Only http:// or https:// image URLs are allowed."); return; }
    setImgError("");
    setP((prev) => ({ ...prev, images: [...prev.images, url], img: prev.img || url }));
    setImgInput("");
  };

  const removeImage = (i: number) => {
    setP((prev) => {
      const imgs = prev.images.filter((_, idx) => idx !== i);
      return { ...prev, images: imgs, img: imgs[0] || "" };
    });
  };

  const save = () => {
    const id = p.id || slugify(p.name) || `project-${Date.now()}`;
    onSave({ ...p, id, alt: p.alt || p.name });
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 100, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "40px 20px", overflowY: "auto" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }}
        style={{ background: C.white, borderRadius: 10, padding: 32, width: "100%", maxWidth: 640 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <div style={{ fontFamily: T.display, fontSize: 22, fontWeight: 400, color: C.headline }}>{p.id ? "Edit project" : "New project"}</div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, fontSize: 20, lineHeight: 1 }}>×</button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
          <Field label="Project name *" value={p.name} onChange={(v) => upd("name", v)} />
          <Field label="Neighborhood" value={p.neighborhood} onChange={(v) => upd("neighborhood", v)} />
          <Field label="Location" value={p.location} onChange={(v) => upd("location", v)} />
          <Field label="Investor" value={p.investor} onChange={(v) => upd("investor", v)} />
          <Field label="Use" value={p.use} onChange={(v) => upd("use", v)} />
          <Field label="Specs" value={p.specs} onChange={(v) => upd("specs", v)} placeholder="e.g. B+P+4 · 25 units" />
        </div>
        <Field label="Description" value={p.desc} onChange={(v) => upd("desc", v)} multiline placeholder="Project description…" />

        {/* Images */}
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontFamily: T.body, fontSize: 11, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 8 }}>Images (URLs)</label>
          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <input value={imgInput} onChange={(e) => setImgInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addImage()}
              placeholder="Paste image URL and press Enter"
              style={{ fontFamily: T.body, fontSize: 13, flex: 1, borderWidth: 1, borderStyle: "solid", borderColor: C.divider, borderRadius: 6, padding: "8px 12px", outline: "none" }} />
            <Btn onClick={addImage} small>Add</Btn>
          </div>
          {imgError && <div style={{ fontFamily: T.body, fontSize: 11, color: C.danger, marginBottom: 8 }}>{imgError}</div>}
          {p.images.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {p.images.map((url, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, background: C.surface, borderRadius: 6, padding: "6px 10px" }}>
                  <img src={url} alt="" style={{ width: 40, height: 28, objectFit: "cover", borderRadius: 3, flexShrink: 0 }} onError={(e) => (e.currentTarget.style.opacity = "0.3")} />
                  <span style={{ fontFamily: T.body, fontSize: 11, color: C.body, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{url}</span>
                  {i === 0 && <span style={{ fontFamily: T.body, fontSize: 10, color: C.brand, fontWeight: 600 }}>Cover</span>}
                  <button onClick={() => removeImage(i)} style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, fontSize: 15, lineHeight: 1, padding: "0 2px" }}>×</button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, paddingTop: 12, borderTopWidth: 1, borderTopStyle: "solid", borderTopColor: C.divider }}>
          <Btn onClick={onClose} variant="ghost">Cancel</Btn>
          <Btn onClick={save}>Save project</Btn>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Projects tab ──────────────────────────────────────────────────────────────
function ProjectsTab({ data, onChange }: { data: CmsData; onChange: (d: CmsData) => void }) {
  const [editing, setEditing] = useState<CmsProject | null>(null);

  const save = (p: CmsProject) => {
    const exists = data.projects.findIndex((x) => x.id === p.id);
    const updated = exists >= 0
      ? data.projects.map((x) => (x.id === p.id ? p : x))
      : [...data.projects, p];
    onChange({ ...data, projects: updated });
    setEditing(null);
  };

  const remove = (id: string) => {
    if (!confirm("Remove this project?")) return;
    onChange({ ...data, projects: data.projects.filter((p) => p.id !== id) });
  };

  const move = (i: number, dir: -1 | 1) => {
    const arr = [...data.projects];
    const j = i + dir;
    if (j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    onChange({ ...data, projects: arr });
  };

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div style={{ fontFamily: T.body, fontSize: 13, color: C.muted }}>{data.projects.length} projects</div>
        <Btn onClick={() => setEditing({ ...EMPTY_PROJECT })}>+ Add project</Btn>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {data.projects.map((p, i) => (
          <motion.div key={p.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            style={{ display: "flex", alignItems: "center", gap: 12, background: C.white, borderWidth: 1, borderStyle: "solid", borderColor: C.divider, borderRadius: 8, padding: "12px 16px" }}>
            {p.img
              ? <img src={p.img} alt="" style={{ width: 60, height: 42, objectFit: "cover", borderRadius: 5, flexShrink: 0 }} />
              : <div style={{ width: 60, height: 42, background: C.surface, borderRadius: 5, flexShrink: 0 }} />
            }
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: T.body, fontSize: 14, fontWeight: 500, color: C.headline, marginBottom: 2 }}>{p.name}</div>
              <div style={{ fontFamily: T.body, fontSize: 11, color: C.muted }}>{p.neighborhood}{p.location ? ` · ${p.location}` : ""} · {p.images.length} image{p.images.length !== 1 ? "s" : ""}</div>
            </div>
            <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
              <button onClick={() => move(i, -1)} disabled={i === 0} style={{ background: "none", border: "none", cursor: i === 0 ? "default" : "pointer", color: i === 0 ? C.divider : C.muted, fontSize: 16, padding: "2px 4px" }}>↑</button>
              <button onClick={() => move(i, 1)} disabled={i === data.projects.length - 1} style={{ background: "none", border: "none", cursor: i === data.projects.length - 1 ? "default" : "pointer", color: i === data.projects.length - 1 ? C.divider : C.muted, fontSize: 16, padding: "2px 4px" }}>↓</button>
              <Btn onClick={() => setEditing(p)} small variant="ghost">Edit</Btn>
              <Btn onClick={() => remove(p.id)} small danger>Remove</Btn>
            </div>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {editing && <ProjectEditor initial={editing} onSave={save} onClose={() => setEditing(null)} />}
      </AnimatePresence>
    </>
  );
}

// ── Hero images tab ───────────────────────────────────────────────────────────
function HeroTab({ data, onChange }: { data: CmsData; onChange: (d: CmsData) => void }) {
  const [input, setInput] = useState("");
  const [error, setError] = useState("");

  const add = () => {
    const url = input.trim();
    if (!url) return;
    if (!isSafeHttpUrl(url)) { setError("Only http:// or https:// image URLs are allowed."); return; }
    setError("");
    onChange({ ...data, heroImages: [...data.heroImages, url] });
    setInput("");
  };

  const remove = (i: number) => {
    if (data.heroImages.length <= 1) return;
    onChange({ ...data, heroImages: data.heroImages.filter((_, idx) => idx !== i) });
  };

  const move = (i: number, dir: -1 | 1) => {
    const arr = [...data.heroImages];
    const j = i + dir;
    if (j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    onChange({ ...data, heroImages: arr });
  };

  return (
    <>
      <div style={{ fontFamily: T.body, fontSize: 13, color: C.muted, marginBottom: 20 }}>
        These images rotate as the hero slideshow on the home page. First image shows first.
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <input value={input} onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="Paste image URL and press Enter"
          style={{ fontFamily: T.body, fontSize: 13, flex: 1, borderWidth: 1, borderStyle: "solid", borderColor: C.divider, borderRadius: 6, padding: "9px 12px", outline: "none" }} />
        <Btn onClick={add}>Add image</Btn>
      </div>
      {error && <div style={{ fontFamily: T.body, fontSize: 11, color: C.danger, marginBottom: 12 }}>{error}</div>}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {data.heroImages.map((url, i) => (
          <motion.div key={url + i} layout initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
            style={{ display: "flex", alignItems: "center", gap: 12, background: C.white, borderWidth: 1, borderStyle: "solid", borderColor: C.divider, borderRadius: 8, padding: "10px 14px" }}>
            <img src={url} alt="" style={{ width: 80, height: 52, objectFit: "cover", borderRadius: 5, flexShrink: 0 }} onError={(e) => (e.currentTarget.style.opacity = "0.3")} />
            <span style={{ fontFamily: T.body, fontSize: 12, color: C.body, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{url}</span>
            {i === 0 && <span style={{ fontFamily: T.body, fontSize: 10, fontWeight: 600, color: C.brand }}>First</span>}
            <button onClick={() => move(i, -1)} disabled={i === 0} style={{ background: "none", border: "none", cursor: i === 0 ? "default" : "pointer", color: i === 0 ? C.divider : C.muted, fontSize: 16 }}>↑</button>
            <button onClick={() => move(i, 1)} disabled={i === data.heroImages.length - 1} style={{ background: "none", border: "none", cursor: i === data.heroImages.length - 1 ? "default" : "pointer", color: i === data.heroImages.length - 1 ? C.divider : C.muted, fontSize: 16 }}>↓</button>
            <Btn onClick={() => remove(i)} small danger>Remove</Btn>
          </motion.div>
        ))}
      </div>
    </>
  );
}

// ── Social tab ────────────────────────────────────────────────────────────────
function SocialTab({ data, onChange }: { data: CmsData; onChange: (d: CmsData) => void }) {
  const upd = (k: "instagram" | "facebook", v: string) =>
    onChange({ ...data, social: { ...data.social, [k]: v } });

  return (
    <div style={{ maxWidth: 480 }}>
      <div style={{ fontFamily: T.body, fontSize: 13, color: C.muted, marginBottom: 24 }}>
        Add your social profile URLs. They will appear as icon links in the site footer.
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <span style={{ fontSize: 22 }}>📸</span>
        <div style={{ flex: 1 }}>
          <Field label="Instagram URL" value={data.social.instagram} onChange={(v) => upd("instagram", v)} placeholder="https://instagram.com/tregtia" />
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ fontSize: 22 }}>📘</span>
        <div style={{ flex: 1 }}>
          <Field label="Facebook URL" value={data.social.facebook} onChange={(v) => upd("facebook", v)} placeholder="https://facebook.com/tregtia" />
        </div>
      </div>
    </div>
  );
}

// ── Change password ───────────────────────────────────────────────────────────
function ChangePassword({ onDone }: { onDone: () => void }) {
  const [curr, setCurr] = useState("");
  const [next, setNext] = useState("");
  const [conf, setConf] = useState("");
  const [error, setError] = useState("");
  const [ok, setOk] = useState(false);

  const submit = async () => {
    setError("");
    const record = getStoredPasswordRecord();
    const currOk = record ? await verifyPassword(curr, record) : false;
    if (!currOk) { setError("Current password is incorrect."); return; }
    if (next.length < 10) { setError("New password must be at least 10 characters."); return; }
    if (next !== conf) { setError("Passwords do not match."); return; }
    storePasswordRecord(await createPasswordRecord(next));
    setOk(true);
    setTimeout(onDone, 1200);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      style={{ maxWidth: 380 }}>
      <div style={{ fontFamily: T.display, fontSize: 20, fontWeight: 400, color: C.headline, marginBottom: 20 }}>Change password</div>
      <Field label="Current password" value={curr} onChange={setCurr} />
      <Field label="New password" value={next} onChange={setNext} />
      <Field label="Confirm new password" value={conf} onChange={setConf} />
      {error && <div style={{ fontFamily: T.body, fontSize: 12, color: C.danger, marginBottom: 10 }}>{error}</div>}
      {ok && <div style={{ fontFamily: T.body, fontSize: 12, color: "#2a8a3e", marginBottom: 10 }}>Password updated ✓</div>}
      <div style={{ display: "flex", gap: 8 }}>
        <Btn onClick={onDone} variant="ghost">Cancel</Btn>
        <Btn onClick={submit}>Update password</Btn>
      </div>
    </motion.div>
  );
}

// ── Main AdminPage ────────────────────────────────────────────────────────────
export default function AdminPage({ defaultData, onDataChange }: {
  defaultData: CmsData;
  onDataChange: (d: CmsData) => void;
}) {
  const [authed, setAuthed_] = useState(isAuthed());
  const [tab, setTab] = useState<Tab>("projects");
  const [data, setData] = useState<CmsData>(() => loadCms() ?? defaultData);
  const [changePwd, setChangePwd] = useState(false);
  const [saved, setSaved] = useState(false);

  const update = useCallback((d: CmsData) => {
    setData(d);
    saveCms(d);
    onDataChange(d);
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  }, [onDataChange]);

  useEffect(() => { if (authed) { const d = loadCms() ?? defaultData; setData(d); onDataChange(d); } }, [authed, defaultData, onDataChange]);

  if (!authed) return <AuthScreen onAuthed={() => { setAuthed_(true); }} />;

  const TABS: { id: Tab; label: string }[] = [
    { id: "projects", label: "Projects" },
    { id: "hero",     label: "Hero images" },
    { id: "social",   label: "Social links" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: C.bg }}>
      {/* Top bar */}
      <div style={{ background: C.headline, padding: "0 40px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 56, position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ fontFamily: T.display, fontSize: 18, color: C.white }}>CMS</span>
          <span style={{ fontFamily: T.body, fontSize: 11, color: "rgba(255,255,255,0.3)" }}>Tregtia</span>
          <AnimatePresence>
            {saved && (
              <motion.span initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
                style={{ fontFamily: T.body, fontSize: 11, color: "#5cc87a" }}>
                ✓ Saved
              </motion.span>
            )}
          </AnimatePresence>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <button onClick={() => window.location.hash = ""} style={{ fontFamily: T.body, fontSize: 12, color: "rgba(255,255,255,0.45)", background: "none", border: "none", cursor: "pointer" }}>← Back to site</button>
          <button onClick={() => setChangePwd(true)} style={{ fontFamily: T.body, fontSize: 12, color: "rgba(255,255,255,0.45)", background: "none", border: "none", cursor: "pointer" }}>Change password</button>
          <button onClick={() => { setAuthed(false); setAuthed_(false); }} style={{ fontFamily: T.body, fontSize: 12, color: "rgba(255,255,255,0.45)", background: "none", border: "none", cursor: "pointer" }}>Sign out</button>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "40px 40px 80px" }}>
        {changePwd
          ? <ChangePassword onDone={() => setChangePwd(false)} />
          : (
            <>
              {/* Tabs */}
              <div style={{ display: "flex", gap: 2, marginBottom: 32, borderBottomWidth: 1, borderBottomStyle: "solid", borderBottomColor: C.divider }}>
                {TABS.map((t) => (
                  <button key={t.id} onClick={() => setTab(t.id)}
                    style={{ fontFamily: T.body, fontSize: 13, fontWeight: tab === t.id ? 600 : 400, color: tab === t.id ? C.brand : C.muted, background: "none", border: "none", cursor: "pointer", padding: "10px 18px", borderBottomWidth: 2, borderBottomStyle: "solid", borderBottomColor: tab === t.id ? C.brand : "transparent", marginBottom: -1, transition: "color 0.15s, border-color 0.15s" }}>
                    {t.label}
                  </button>
                ))}
              </div>

              <AnimatePresence mode="wait">
                <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                  {tab === "projects" && <ProjectsTab data={data} onChange={update} />}
                  {tab === "hero"     && <HeroTab     data={data} onChange={update} />}
                  {tab === "social"   && <SocialTab   data={data} onChange={update} />}
                </motion.div>
              </AnimatePresence>
            </>
          )
        }
      </div>
    </div>
  );
}
