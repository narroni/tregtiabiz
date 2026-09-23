import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Upload } from "lucide-react";
import { InstagramIcon, FacebookIcon } from "../icons";
import { isSafeHttpUrl, type CmsData, type CmsProject } from "./storage";
import { resizeImageToJpegBase64 } from "./resizeImage";
import siteData from "../content/site-data.json";

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
type Session = "loading" | "authed" | "anon";

const EMPTY_PROJECT: CmsProject = {
  id: "", neighborhood: "", location: "", investor: "Tregtia Sh.p.k",
  use: "Residential", img: "", images: [], featured: false,
  name: { en: "", sq: "" }, alt: { en: "", sq: "" }, desc: { en: "", sq: "" }, specs: { en: "", sq: "" },
};

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

async function readJsonSafe(res: Response): Promise<{ error?: string; detail?: string }> {
  try { return await res.json(); } catch { return {}; }
}

// ── Input helpers ─────────────────────────────────────────────────────────────
function Field({ label, value, onChange, multiline = false, placeholder = "", type = "text" }: {
  label: string; value: string; onChange: (v: string) => void;
  multiline?: boolean; placeholder?: string; type?: string;
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
        : <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
            style={shared}
            onFocus={(e) => (e.currentTarget.style.borderColor = C.brand)}
            onBlur={(e) => (e.currentTarget.style.borderColor = C.divider)} />
      }
    </div>
  );
}

function Btn({ children, onClick, variant = "primary", small = false, danger = false, disabled = false }: {
  children: React.ReactNode; onClick: () => void;
  variant?: "primary" | "ghost"; small?: boolean; danger?: boolean; disabled?: boolean;
}) {
  const bg = danger ? C.danger : variant === "primary" ? C.brand : "transparent";
  const col = variant === "primary" || danger ? C.white : C.body;
  const border = variant === "ghost" ? `1px solid ${C.divider}` : "none";
  return (
    <motion.button whileTap={disabled ? undefined : { scale: 0.97 }} onClick={onClick} disabled={disabled}
      style={{ fontFamily: T.body, fontSize: small ? 12 : 13, fontWeight: 500, color: col, background: bg,
        border, borderRadius: 7, padding: small ? "6px 14px" : "9px 20px", cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.6 : 1, display: "inline-flex", alignItems: "center", gap: 6 }}>
      {children}
    </motion.button>
  );
}

// ── Upload-from-device button ─────────────────────────────────────────────────
// Resizes/re-encodes the file client-side, then POSTs it to /api/cms/upload,
// which commits it to the GitHub repo (there's no separate file storage) and
// returns a relative URL — usable the same way as a pasted image URL.
function UploadButton({ onUploaded, small = false }: { onUploaded: (url: string) => void; small?: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) { setError("Please choose an image file."); return; }
    setError(""); setUploading(true);
    try {
      const dataBase64 = await resizeImageToJpegBase64(file);
      const res = await fetch("/api/cms/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataBase64 }),
      });
      const body = await readJsonSafe(res);
      if (!res.ok) { setError((body as { error?: string }).error || "Upload failed."); return; }
      onUploaded((body as { url: string }).url);
    } catch {
      setError("Couldn't process that image — try a different file.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <input ref={inputRef} type="file" accept="image/*" style={{ display: "none" }}
        onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; void handleFile(f); }} />
      <Btn onClick={() => inputRef.current?.click()} variant="ghost" small={small} disabled={uploading}>
        <Upload size={14} /> {uploading ? "Uploading…" : "Upload from device"}
      </Btn>
      {error && <div style={{ fontFamily: T.body, fontSize: 11, color: C.danger, marginTop: 6 }}>{error}</div>}
    </div>
  );
}

// ── Login ─────────────────────────────────────────────────────────────────────
function AuthScreen({ onAuthed }: { onAuthed: () => void }) {
  const [pwd, setPwd] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!pwd) return;
    setError(""); setLoading(true);
    try {
      const res = await fetch("/api/cms/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: pwd }),
      });
      if (res.ok) { onAuthed(); return; }
      const body = await readJsonSafe(res);
      setError(body.error || "Incorrect password.");
    } catch {
      setError("Network error — please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: C.headline, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
        style={{ background: C.white, borderRadius: 12, padding: "40px 36px", width: 360, boxShadow: "0 8px 40px rgba(0,0,0,0.2)" }}>
        <div style={{ fontFamily: T.display, fontSize: 26, fontWeight: 400, color: C.headline, marginBottom: 6 }}>
          Sign in
        </div>
        <div style={{ fontFamily: T.body, fontSize: 13, color: C.muted, marginBottom: 28 }}>
          Enter your admin password to continue.
        </div>

        <Field label="Password" value={pwd} onChange={setPwd} placeholder="••••••••" type="password" />

        <AnimatePresence>
          {error && (
            <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              style={{ fontFamily: T.body, fontSize: 12, color: C.danger, marginBottom: 14 }}>{error}</motion.div>
          )}
        </AnimatePresence>

        <button onClick={submit} disabled={loading} onKeyDown={(e) => e.key === "Enter" && submit()}
          style={{ fontFamily: T.body, fontSize: 14, fontWeight: 600, color: C.white, background: C.brand, border: "none", borderRadius: 8, padding: "11px 0", width: "100%", cursor: loading ? "default" : "pointer", opacity: loading ? 0.7 : 1, transition: "opacity 0.15s" }}>
          {loading ? "Checking…" : "Sign in"}
        </button>

        <div style={{ fontFamily: T.body, fontSize: 11, color: C.muted, marginTop: 20, lineHeight: 1.6 }}>
          Checked on the server — the password never touches this browser's storage.
        </div>
      </motion.div>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div style={{ minHeight: "100vh", background: C.headline, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <span style={{ fontFamily: T.body, fontSize: 13, color: "rgba(255,255,255,0.5)" }}>Loading…</span>
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

  const [formLang, setFormLang] = useState<"en" | "sq">("en");
  const updLoc = (field: "name" | "alt" | "desc" | "specs", v: string) =>
    setP((prev) => ({ ...prev, [field]: { ...prev[field], [formLang]: v } }));

  const save = () => {
    const nameForId = p.name.en || p.name.sq;
    const id = p.id || slugify(nameForId) || `project-${Date.now()}`;
    const alt: typeof p.alt = {
      en: p.alt.en || p.name.en,
      sq: p.alt.sq || p.name.sq || p.name.en,
    };
    onSave({ ...p, id, alt });
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
          <Field label="Neighborhood" value={p.neighborhood} onChange={(v) => upd("neighborhood", v)} />
          <Field label="Location" value={p.location} onChange={(v) => upd("location", v)} />
          <Field label="Investor" value={p.investor} onChange={(v) => upd("investor", v)} />
          <Field label="Use" value={p.use} onChange={(v) => upd("use", v)} />
        </div>

        <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20, cursor: "pointer" }}>
          <input type="checkbox" checked={p.featured} onChange={(e) => setP((prev) => ({ ...prev, featured: e.target.checked }))} style={{ width: 15, height: 15, cursor: "pointer" }} />
          <span style={{ fontFamily: T.body, fontSize: 13, color: C.body }}>Show on homepage (featured)</span>
        </label>

        {/* Language tabs for translatable fields */}
        <div style={{ display: "flex", gap: 2, marginBottom: 16, borderBottomWidth: 1, borderBottomStyle: "solid", borderBottomColor: C.divider }}>
          {(["en", "sq"] as const).map((l) => (
            <button key={l} onClick={() => setFormLang(l)}
              style={{ fontFamily: T.body, fontSize: 12, fontWeight: formLang === l ? 600 : 400, color: formLang === l ? C.brand : C.muted, background: "none", border: "none", cursor: "pointer", padding: "8px 14px", borderBottomWidth: 2, borderBottomStyle: "solid", borderBottomColor: formLang === l ? C.brand : "transparent", marginBottom: -1 }}>
              {l === "en" ? "English" : "Shqip"}
            </button>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
          <Field label={`Project name * (${formLang.toUpperCase()})`} value={p.name[formLang]} onChange={(v) => updLoc("name", v)} />
          <Field label={`Specs (${formLang.toUpperCase()})`} value={p.specs[formLang]} onChange={(v) => updLoc("specs", v)} placeholder="e.g. B+P+4 · 25 units" />
        </div>
        <Field label={`Description (${formLang.toUpperCase()})`} value={p.desc[formLang]} onChange={(v) => updLoc("desc", v)} multiline placeholder="Project description…" />
        <Field label={`Image alt text (${formLang.toUpperCase()}, optional — defaults to name)`} value={p.alt[formLang]} onChange={(v) => updLoc("alt", v)} placeholder={p.name[formLang] || "Describes the image for accessibility"} />

        {/* Images */}
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontFamily: T.body, fontSize: 11, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 8 }}>Images</label>
          <div style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "flex-start" }}>
            <input value={imgInput} onChange={(e) => setImgInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addImage()}
              placeholder="Paste image URL and press Enter"
              style={{ fontFamily: T.body, fontSize: 13, flex: 1, borderWidth: 1, borderStyle: "solid", borderColor: C.divider, borderRadius: 6, padding: "8px 12px", outline: "none" }} />
            <Btn onClick={addImage} small>Add</Btn>
            <UploadButton small onUploaded={(url) => setP((prev) => ({ ...prev, images: [...prev.images, url], img: prev.img || url }))} />
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
              <div style={{ fontFamily: T.body, fontSize: 14, fontWeight: 500, color: C.headline, marginBottom: 2, display: "flex", alignItems: "center", gap: 6 }}>
                {p.name.en || p.name.sq || "(untitled)"}
                {p.featured && <span style={{ fontFamily: T.body, fontSize: 9, fontWeight: 600, color: C.brand, background: "rgba(30,90,168,0.1)", padding: "2px 6px", borderRadius: 4, textTransform: "uppercase", letterSpacing: "0.04em" }}>Featured</span>}
              </div>
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
        <UploadButton onUploaded={(url) => onChange({ ...data, heroImages: [...data.heroImages, url] })} />
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
        <InstagramIcon size={20} color={C.muted} style={{ flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <Field label="Instagram URL" value={data.social.instagram} onChange={(v) => upd("instagram", v)} placeholder="https://instagram.com/tregtia" />
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <FacebookIcon size={20} color={C.muted} style={{ flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <Field label="Facebook URL" value={data.social.facebook} onChange={(v) => upd("facebook", v)} placeholder="https://facebook.com/tregtia" />
        </div>
      </div>
    </div>
  );
}

// ── Change password (info panel — password now lives in a Vercel env var) ─────
function ChangePasswordInfo({ onDone }: { onDone: () => void }) {
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} style={{ maxWidth: 460 }}>
      <div style={{ fontFamily: T.display, fontSize: 20, fontWeight: 400, color: C.headline, marginBottom: 16 }}>Change password</div>
      <div style={{ fontFamily: T.body, fontSize: 13, color: C.body, lineHeight: 1.8, marginBottom: 20 }}>
        The admin password lives in a Vercel environment variable, not in this browser — so it's changed there, not here:
        <ol style={{ margin: "12px 0 0", paddingLeft: 20 }}>
          <li>On your computer, in the project folder, run <code>node scripts/hash-password.mjs</code> and follow the prompts.</li>
          <li>Copy the printed value.</li>
          <li>In Vercel → your project → Settings → Environment Variables, edit <code>CMS_PASSWORD_HASH</code> and paste the new value in.</li>
          <li>Redeploy (Vercel → Deployments → ⋯ → Redeploy) for the change to take effect.</li>
        </ol>
      </div>
      <Btn onClick={onDone} variant="ghost">Back</Btn>
    </motion.div>
  );
}

// ── Main AdminPage ────────────────────────────────────────────────────────────
export default function AdminPage() {
  const [session, setSession] = useState<Session>("loading");
  const [tab, setTab] = useState<Tab>("projects");
  const [data, setData] = useState<CmsData>(siteData as CmsData);
  const [dirty, setDirty] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState("");
  const [justPublished, setJustPublished] = useState(false);
  const [changePwd, setChangePwd] = useState(false);

  useEffect(() => {
    fetch("/api/cms/session")
      .then((r) => r.json())
      .then((d) => setSession(d.authed ? "authed" : "anon"))
      .catch(() => setSession("anon"));
  }, []);

  // Warn before leaving the tab with unpublished edits.
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  const update = useCallback((d: CmsData) => {
    setData(d);
    setDirty(true);
    setJustPublished(false);
  }, []);

  const publish = async () => {
    setPublishing(true); setPublishError("");
    try {
      const res = await fetch("/api/cms/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const body = await readJsonSafe(res);
        const base = body.error || "Publish failed.";
        const detail = body.detail ? String(body.detail).slice(0, 400) : "";
        setPublishError(detail ? `${base} — ${detail}` : base);
        return;
      }
      setDirty(false);
      setJustPublished(true);
      setTimeout(() => setJustPublished(false), 6000);
    } catch {
      setPublishError("Network error — please try again.");
    } finally {
      setPublishing(false);
    }
  };

  const signOut = async () => {
    try { await fetch("/api/cms/logout", { method: "POST" }); } catch { /* ignore */ }
    setSession("anon");
  };

  if (session === "loading") return <LoadingScreen />;
  if (session === "anon") return <AuthScreen onAuthed={() => setSession("authed")} />;

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
            {dirty && !publishing && (
              <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                style={{ fontFamily: T.body, fontSize: 11, color: "#e8b33e" }}>● Unpublished changes</motion.span>
            )}
            {publishing && (
              <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                style={{ fontFamily: T.body, fontSize: 11, color: "rgba(255,255,255,0.5)" }}>Publishing…</motion.span>
            )}
            {justPublished && !dirty && (
              <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                style={{ fontFamily: T.body, fontSize: 11, color: "#5cc87a", display: "inline-flex", alignItems: "center", gap: 5 }}>
                <CheckCircle2 size={13} /> Published — live in about a minute
              </motion.span>
            )}
          </AnimatePresence>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <Btn onClick={publish} small disabled={!dirty || publishing}>
            {publishing ? "Publishing…" : "Publish changes"}
          </Btn>
          <button onClick={() => window.location.hash = ""} style={{ fontFamily: T.body, fontSize: 12, color: "rgba(255,255,255,0.45)", background: "none", border: "none", cursor: "pointer" }}>← Back to site</button>
          <button onClick={() => setChangePwd(true)} style={{ fontFamily: T.body, fontSize: 12, color: "rgba(255,255,255,0.45)", background: "none", border: "none", cursor: "pointer" }}>Change password</button>
          <button onClick={signOut} style={{ fontFamily: T.body, fontSize: 12, color: "rgba(255,255,255,0.45)", background: "none", border: "none", cursor: "pointer" }}>Sign out</button>
        </div>
      </div>

      {publishError && (
        <div style={{ background: "#fdecec", borderBottom: `1px solid ${C.danger}`, padding: "10px 40px", fontFamily: T.body, fontSize: 12, color: C.danger }}>
          {publishError}
        </div>
      )}

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "40px 40px 80px" }}>
        {changePwd
          ? <ChangePasswordInfo onDone={() => setChangePwd(false)} />
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
