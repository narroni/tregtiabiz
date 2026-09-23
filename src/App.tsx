import { useState, useEffect, useRef, useCallback } from "react";
import type React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import tregtiaLogo from "@/assets/tregtia-logo.png";
import { initParticleField } from "./ThreeCanvas";
import AdminPage from "./cms/AdminPage";
import { isSafeHttpUrl } from "./cms/storage";
import siteData from "./content/site-data.json";
import { InstagramIcon, FacebookIcon } from "./icons";

function ParticleField() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { if (ref.current) return initParticleField(ref.current); }, []);
  return <div ref={ref} style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 1 }} />;
}


// ── Palette ───────────────────────────────────────────────────────────────────
const C = {
  bg:       "#F5F6F8",
  surface:  "#E8ECF1",
  brand:    "#1E5AA8",
  electric: "#3E8EF7",
  headline: "#0B1220",
  body:     "#5B6572",
  muted:    "#8A9BAD",
  divider:  "#D6DCE3",
  white:    "#FFFFFF",
} as const;

const T = {
  display: "'Instrument Serif', Georgia, serif",
  body:    "'Geist', 'Inter', system-ui, -apple-system, sans-serif",
} as const;

type Lang = "en" | "sq";
type Page = { type: "home" } | { type: "project"; id: string };

type Localized = { en: string; sq: string };
type Project = {
  id: string; neighborhood: string; location: string; investor: string; use: string;
  img: string; images: string[]; featured: boolean;
  name: Localized; alt: Localized; desc: Localized; specs: Localized;
};

/** Picks the field for the active language, falling back to English if the
 *  Albanian field was left empty (e.g. not translated yet). */
function loc(field: Localized, lang: Lang): string {
  return (lang === "sq" ? field.sq : field.en) || field.en || field.sq;
}

// ── Editable content (projects, hero images, social links) — src/content/site-data.json ──
// This is the single source of truth for CMS-editable content. The admin panel
// (src/cms) writes back to this same file via a GitHub commit; App.tsx just
// renders whatever is currently in it.
const PROJECTS = siteData.projects as Project[];
const HERO_IMAGES: string[] = siteData.heroImages;
const DEFAULT_SOCIAL = siteData.social;

const TIMELINE = [
  { id: "tl-1", year: "1999", titleEn: "Foundation", titleSq: "Themelimi", descEn: "Bedri Prishtina registers Tregtia in Prishtina amid Kosovo's post-war reconstruction, with a conviction that building is inseparable from nation-making.", descSq: "Bedri Prishtina regjistron Tregtia në Prishtinë mes rindërtimit të pasluftës të Kosovës, me bindjen se ndërtimi është i pandashëm nga krijimi i kombit." },
  { id: "tl-2", year: "2003", titleEn: "Concrete Factory", titleSq: "Fabrika e Betonit", descEn: "Purchase of a precast concrete plant brings structural production in-house, establishing the vertical integration that defines Tregtia's quality model.", descSq: "Blerja e një fabrike betoni paraprodhim sjell prodhimin strukturor brenda kompanisë, duke vendosur integrimin vertikal që përcakton modelin e cilësisë të Tregtia." },
  { id: "tl-3", year: "2008", titleEn: "Doors & Windows Factory", titleSq: "Fabrika e Dyerve & Dritareve", descEn: "A dedicated joinery and glazing facility opens. Tregtia becomes the only residential developer in Kosovo controlling its own window and facade supply chain.", descSq: "Hapet një impiant i dedikuar për zdrukthëtari dhe qelq. Tregtia bëhet i vetmi zhvillues rezidencial në Kosovë që kontrollon zinxhirin e vet të furnizimit të dritareve dhe fasadave." },
  { id: "tl-4", year: "2014", titleEn: "Fleet Modernised", titleSq: "Flota e Modernizuar", descEn: "Full renewal of heavy machinery and crane fleet, enabling simultaneous construction across multiple sites with German-standard equipment.", descSq: "Rinovim i plotë i makinerive të rënda dhe flotës së vinçave, duke mundësuar ndërtim të njëkohshëm në shumë kantiere me pajisje të standardit gjerman." },
  { id: "tl-5", year: "2019", titleEn: "ISO 9001 Certified", titleSq: "Çertifikuar ISO 9001", descEn: "European quality-management certification formalises two decades of internal discipline. 127 buildings constructed to this date.", descSq: "Çertifikimi evropian i menaxhimit të cilësisë formalizon dy dekada disipline të brendshme. 127 ndërtesa të ngritura deri në këtë datë." },
  { id: "tl-6", year: "2025", titleEn: "Present Day", titleSq: "Sot", descEn: "300 qualified staff. 5,021 residential units delivered. Kosovo's most trusted residential developer, with the Kodrina masterplan underway.", descSq: "300 staf të kualifikuar. 5,021 njësi rezidenciale të dorëzuara. Zhvilluesi më i besuar rezidencial i Kosovës, me masterplanin Kodrina në zhvillim." },
];

const STATS = [
  { id: "st-1", value: "300",   labelEn: "Qualified Staff",             labelSq: "Staf i Kualifikuar" },
  { id: "st-2", value: "5,021", labelEn: "Residential Units Delivered", labelSq: "Njësi Rezidenciale të Dorëzuara" },
  { id: "st-3", value: "127",   labelEn: "Buildings Constructed",       labelSq: "Ndërtesa të Ngritura" },
  { id: "st-4", value: "1999",  labelEn: "Year Founded",                labelSq: "Viti i Themelimit" },
];

const PROCESS_STEPS = [
  { id: "ps-1", titleEn: "Concept & Urban Design",        titleSq: "Koncepti & Dizajni Urban",       descEn: "Masterplan development, architectural design, permit preparation and planning co-ordination.", descSq: "Zhvillimi i masterplanit, dizajni arkitekturor, përgatitja e lejeve dhe koordinimi i planifikimit." },
  { id: "ps-2", titleEn: "Construction & Execution",      titleSq: "Ndërtimi & Ekzekutimi",          descEn: "Full construction delivery — structure, facade, MEP, fit-out — using Tregtia's own workforce and manufacturing facilities.", descSq: "Dorëzim i plotë i ndërtimit — strukturë, fasadë, MEP, pajisje — duke përdorur fuqinë punëtore dhe objektet e prodhimit të Tregtia." },
  { id: "ps-3", titleEn: "In-House Manufacturing",        titleSq: "Prodhimi i Brendshëm",            descEn: "Precast concrete, PVC windows via the TROCAL system, metal fabrication, glass processing — all produced in Tregtia's own factories.", descSq: "Beton paraprodhim, dritare PVC me sistemin TROCAL, fabrikim metalesh, përpunim xhami — të gjitha prodhuara në fabrikat e veta të Tregtia." },
  { id: "ps-4", titleEn: "Presentation & Sales",          titleSq: "Prezantimi & Shitjet",            descEn: "3D renders, show apartments and digital marketing assets prepared in-house. From construction site to sale.", descSq: "Pamje 3D, apartamente demonstruese dhe asete marketingu dixhital të përgatitura brenda kompanisë. Nga kantieri deri tek shitja." },
];

const PRODUCTION_TAGS_EN = ["PVC windows — TROCAL system", "Metal fabrication", "Machinery servicing", "Glass processing", "Concrete production"];
const PRODUCTION_TAGS_SQ = ["Dritare PVC — sistemi TROCAL", "Fabrikim metalesh", "Shërbim makinerie", "Përpunim xhami", "Prodhim betoni"];

const NEIGHBORHOODS_EN = ["All", "Kodrina", "Aktash", "Fushë Kosovë"];
const NEIGHBORHOODS_SQ = ["Të gjitha", "Kodrina", "Aktash", "Fushë Kosovë"];
const NEIGHBORHOOD_KEYS = ["All", "Kodrina", "Aktash", "Fushë Kosovë"];

const SLIDESHOW_INTERVAL = 4500;

// ── Scroll helper ─────────────────────────────────────────────────────────────
function scrollToSection(id: string) {
  const el = document.getElementById(id);
  if (el) {
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// ── Hooks ─────────────────────────────────────────────────────────────────────
function useIntersection(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

/** Tracks a CSS media query so layouts can switch at real breakpoints —
 *  needed because this codebase styles with inline `style={{}}` objects
 *  rather than CSS classes, so there's no other way to express "only below
 *  this width" for structural changes (row → column, hidden nav, etc). */
function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mql = window.matchMedia(query);
    const handler = () => setMatches(mql.matches);
    handler();
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [query]);
  return matches;
}

// ── Logo ──────────────────────────────────────────────────────────────────────
function TLogo({ height = 28, dark = false }: { height?: number; dark?: boolean }) {
  return (
    <img src={tregtiaLogo} alt="Tregtia" style={{ height, width: "auto", display: "block", filter: dark ? "brightness(0) invert(1)" : "none", transition: "filter 0.3s" }} />
  );
}

// ── Nav — floating pill ───────────────────────────────────────────────────────
const NAV_LINKS: { id: string; labelEn: string; labelSq: string }[] = [
  { id: "about",    labelEn: "About",    labelSq: "Rreth Nesh" },
  { id: "kodrina",  labelEn: "Kodrina",  labelSq: "Kodrina"    },
  { id: "projects", labelEn: "Projects", labelSq: "Projektet"  },
  { id: "services", labelEn: "Services", labelSq: "Shërbimet"  },
  { id: "contact",  labelEn: "Contact",  labelSq: "Kontakt"    },
];

function Nav({
  lang, onLangChange, currentPage, onGoHome,
}: {
  lang: Lang;
  onLangChange: (l: Lang) => void;
  currentPage: Page;
  onGoHome: () => void;
}) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const isMobile = useMediaQuery("(max-width: 860px)");

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 40);
    h();
    window.addEventListener("scroll", h, { passive: true });
    return () => window.removeEventListener("scroll", h);
  }, []);

  // Collapse the mobile menu automatically if the viewport grows past the
  // breakpoint (e.g. rotating a tablet) so it doesn't get stuck open.
  useEffect(() => { if (!isMobile) setMenuOpen(false); }, [isMobile]);

  const handleLink = (id: string) => {
    setMenuOpen(false);
    if (currentPage.type !== "home") {
      // Go home first, then scroll after a small delay for DOM render
      onGoHome();
      setTimeout(() => scrollToSection(id), 80);
    } else {
      scrollToSection(id);
    }
  };

  const handleLogoClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setMenuOpen(false);
    if (currentPage.type !== "home") {
      onGoHome();
    } else {
      scrollToTop();
    }
  };

  const langSwitcher = (
    <div style={{ display: "flex", borderWidth: 1, borderStyle: "solid", borderColor: C.divider, borderRadius: 8, overflow: "hidden" }}>
      {(["en", "sq"] as Lang[]).map((l) => (
        <button
          key={l}
          onClick={() => onLangChange(l)}
          style={{ fontFamily: T.body, fontSize: 11, fontWeight: 600, background: lang === l ? C.brand : "transparent", color: lang === l ? C.white : C.body, border: "none", padding: "5px 10px", cursor: "pointer", transition: "background 0.15s, color 0.15s", textTransform: "uppercase" }}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );

  return (
    <motion.header
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.22, 0.44, 0.38, 0.96] }}
      style={{
        position: "fixed", top: 12, left: 16, right: 16, zIndex: 50,
        background: scrolled ? "rgba(255,255,255,0.97)" : "rgba(255,255,255,0.92)",
        borderRadius: 14,
        borderWidth: 1, borderStyle: "solid", borderColor: C.divider,
        backdropFilter: "blur(20px)",
        boxShadow: scrolled
          ? "0 8px 32px rgba(11,18,32,0.10), 0 1px 4px rgba(11,18,32,0.06)"
          : "0 2px 12px rgba(11,18,32,0.06)",
        transition: "box-shadow 0.3s ease, background 0.3s ease",
        overflow: "hidden",
      }}
    >
      <div style={{ maxWidth: 1320, margin: "0 auto", padding: "0 clamp(16px,4vw,24px)", display: "flex", alignItems: "center", justifyContent: "space-between", height: 58 }}>
        <a href="#" onClick={handleLogoClick} style={{ textDecoration: "none", flexShrink: 0 }}>
          <TLogo height={24} dark={false} />
        </a>

        {isMobile ? (
          <button
            onClick={() => setMenuOpen((o) => !o)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            style={{ background: "none", border: "none", cursor: "pointer", color: C.headline, display: "flex", alignItems: "center", padding: 6 }}
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        ) : (
          <nav style={{ display: "flex", gap: 4, alignItems: "center" }}>
            {NAV_LINKS.map(({ id, labelEn, labelSq }) => (
              <button
                key={id}
                onClick={() => handleLink(id)}
                style={{ fontFamily: T.body, fontSize: 13, fontWeight: 400, color: C.body, background: "none", border: "none", padding: "6px 12px", cursor: "pointer", borderRadius: 8, transition: "color 0.15s, background 0.15s" }}
                onMouseEnter={(e) => { e.currentTarget.style.color = C.headline; e.currentTarget.style.background = C.surface; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = C.body; e.currentTarget.style.background = "none"; }}
              >
                {lang === "en" ? labelEn : labelSq}
              </button>
            ))}
            <div style={{ width: 1, height: 18, background: C.divider, margin: "0 8px" }} />
            {langSwitcher}
          </nav>
        )}
      </div>

      {/* Mobile dropdown */}
      {isMobile && (
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
              style={{ borderTopWidth: 1, borderTopStyle: "solid", borderTopColor: C.divider }}
            >
              <div style={{ display: "flex", flexDirection: "column", padding: "8px 16px 16px" }}>
                {NAV_LINKS.map(({ id, labelEn, labelSq }) => (
                  <button
                    key={id}
                    onClick={() => handleLink(id)}
                    style={{ fontFamily: T.body, fontSize: 15, fontWeight: 400, color: C.body, background: "none", border: "none", padding: "12px 8px", textAlign: "left", cursor: "pointer" }}
                  >
                    {lang === "en" ? labelEn : labelSq}
                  </button>
                ))}
                <div style={{ height: 1, background: C.divider, margin: "8px 0" }} />
                {langSwitcher}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </motion.header>
  );
}

// ── Hero — photo slideshow + info panel ──────────────────────────────────────
function Hero({ lang, heroImages }: { lang: Lang; heroImages: string[] }) {
  const tl = (en: string, sq: string) => lang === "en" ? en : sq;
  const [current, setCurrent] = useState(0);
  const isMobile = useMediaQuery("(max-width: 860px)");

  useEffect(() => {
    setCurrent(0);
  }, [heroImages]);

  useEffect(() => {
    const t = setInterval(() => setCurrent((c) => (c + 1) % heroImages.length), 6000);
    return () => clearInterval(t);
  }, [heroImages.length]);

  return (
    <section style={{ display: "flex", flexDirection: isMobile ? "column" : "row", height: isMobile ? "auto" : "100vh", minHeight: isMobile ? undefined : 640 }}>
      {/* Left: crossfade photo slideshow */}
      <div style={{ flex: isMobile ? "0 0 auto" : "0 0 58%", width: isMobile ? "100%" : undefined, height: isMobile ? "48vh" : undefined, minHeight: isMobile ? 320 : undefined, position: "relative", overflow: "hidden" }}>
        <AnimatePresence>
          <motion.div
            key={current}
            initial={{ opacity: 0, scale: 1.06 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.4, ease: "easeInOut" }}
            style={{ position: "absolute", inset: 0, backgroundImage: `url(${heroImages[current]})`, backgroundSize: "cover", backgroundPosition: "center 30%", filter: "saturate(0.75) brightness(0.88)" }}
          />
        </AnimatePresence>
        {/* Fade to right (desktop) / bottom (mobile) */}
        <div style={{ position: "absolute", inset: 0, zIndex: 2, background: isMobile ? `linear-gradient(to bottom, transparent 60%, ${C.white} 100%)` : `linear-gradient(to right, transparent 55%, ${C.white} 100%)` }} />
        {/* Slide dots */}
        <div style={{ position: "absolute", bottom: 28, left: 28, zIndex: 3, display: "flex", gap: 6 }}>
          {heroImages.map((_, i) => (
            <button key={i} onClick={() => setCurrent(i)} style={{ width: i === current ? 22 : 6, height: 6, borderRadius: 3, background: i === current ? C.white : "rgba(255,255,255,0.45)", border: "none", cursor: "pointer", padding: 0, transition: "width 0.3s, background 0.2s", boxShadow: "0 1px 4px rgba(0,0,0,0.3)" }} />
          ))}
        </div>
      </div>

      {/* Right: info panel */}
      <div style={{ flex: isMobile ? "1 1 auto" : "0 0 42%", background: C.white, display: "flex", flexDirection: "column", justifyContent: "center", padding: isMobile ? "32px clamp(20px,6vw,40px) 48px" : "80px clamp(28px,4vw,72px) 40px", borderLeft: isMobile ? "none" : `1px solid ${C.divider}` }}>
        <motion.p
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.7 }}
          style={{ fontFamily: T.body, fontSize: 11, color: C.muted, letterSpacing: "0.04em", marginBottom: 20 }}
        >
          Prishtinë · Kosovo · Est. 1999
        </motion.p>
        <motion.h1
          initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45, duration: 0.7 }}
          style={{ fontFamily: T.display, fontSize: "clamp(40px,4.2vw,62px)", fontWeight: 400, lineHeight: 1.0, color: C.headline, margin: "0 0 18px", letterSpacing: "-0.035em" }}
        >
          {tl("26 years of", "26 vjet duke")}<br />
          <em style={{ fontStyle: "italic" }}>{tl("building Kosovo.", "ndërtuar Kosovën.")}</em>
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.7 }}
          style={{ fontFamily: T.body, fontSize: 14, color: C.body, lineHeight: 1.75, margin: "0 0 28px" }}
        >
          {tl("Kosovo's leading residential developer — building communities since 1999.", "Zhvilluesi kryesor rezidencial i Kosovës — duke ndërtuar komunitete që nga viti 1999.")}
        </motion.p>

        {/* Quality statement */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.75, duration: 0.7 }}
          style={{ borderLeftWidth: 2, borderLeftStyle: "solid", borderLeftColor: C.brand, paddingLeft: 16, margin: "0 0 32px" }}
        >
          <p style={{ fontFamily: T.display, fontStyle: "italic", fontSize: "clamp(15px,1.7vw,19px)", color: C.headline, lineHeight: 1.55, margin: 0 }}>
            {tl(
              "Premium build quality — every material sourced, every joint inspected, every unit delivered to standard.",
              "Cilësi ndërtimi premium — çdo material i kontrolluar, çdo bashkim i inspektuar, çdo njësi e dorëzuar sipas standardit."
            )}
          </p>
        </motion.div>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9, duration: 0.7 }}
          style={{ display: "flex", gap: 10 }}
        >
          <button
            onClick={() => scrollToSection("projects")}
            style={{ fontFamily: T.body, fontSize: 13, fontWeight: 500, color: C.white, background: C.brand, padding: "10px 22px", borderRadius: 8, border: "none", cursor: "pointer", transition: "background 0.15s" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#2468BC")}
            onMouseLeave={(e) => (e.currentTarget.style.background = C.brand)}
          >
            {tl("View our work", "Shiko punët tona")}
          </button>
          <button
            onClick={() => scrollToSection("contact")}
            style={{ fontFamily: T.body, fontSize: 13, fontWeight: 400, color: C.body, background: "transparent", padding: "10px 22px", borderRadius: 8, borderWidth: 1, borderStyle: "solid", borderColor: C.divider, cursor: "pointer", transition: "border-color 0.15s, color 0.15s" }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = C.brand; e.currentTarget.style.color = C.brand; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.divider; e.currentTarget.style.color = C.body; }}
          >
            {tl("Contact us", "Na kontaktoni")}
          </button>
        </motion.div>
      </div>
    </section>
  );
}

// ── About — horizontal auto slideshow with scroll wheel + buttons ─────────────
function About({ lang }: { lang: Lang }) {
  const tl = (en: string, sq: string) => lang === "en" ? en : sq;
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [progressKey, setProgressKey] = useState(0);
  const { ref, visible } = useIntersection(0.1);
  const sliderRef = useRef<HTMLDivElement>(null);
  const isMobile = useMediaQuery("(max-width: 860px)");

  const goTo = useCallback((i: number) => {
    setActive(Math.max(0, Math.min(TIMELINE.length - 1, i)));
    setProgressKey((k) => k + 1);
  }, []);

  const next = useCallback(() => {
    setActive((c) => (c + 1) % TIMELINE.length);
    setProgressKey((k) => k + 1);
  }, []);

  const prev = useCallback(() => {
    setActive((c) => (c - 1 + TIMELINE.length) % TIMELINE.length);
    setProgressKey((k) => k + 1);
  }, []);

  // Auto-advance when visible and not paused
  useEffect(() => {
    if (!visible || paused) return;
    const timer = setInterval(next, SLIDESHOW_INTERVAL);
    return () => clearInterval(timer);
  }, [visible, paused, next]);

  // Scroll wheel support
  useEffect(() => {
    const el = sliderRef.current;
    if (!el) return;
    let cooldown = false;
    const handler = (e: WheelEvent) => {
      if (cooldown) return;
      e.preventDefault();
      cooldown = true;
      if (e.deltaX > 30 || e.deltaY > 30) next();
      else if (e.deltaX < -30 || e.deltaY < -30) prev();
      setTimeout(() => { cooldown = false; }, 700);
    };
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, [next, prev]);

  const item = TIMELINE[active];

  return (
    <section id="about" ref={ref} style={{ background: C.white, borderTop: `1px solid ${C.divider}`, overflow: "hidden" }}>
      {/* Top: story */}
      <div style={{ maxWidth: 1320, margin: "0 auto", padding: "clamp(80px,12vh,140px) clamp(20px,5vw,40px) clamp(48px,8vh,72px)", display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "clamp(32px,7vw,96px)", alignItems: "start" }}>
        <motion.div
          initial={{ opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }} transition={{ duration: 0.7 }}
        >
          <h2 style={{ fontFamily: T.display, fontSize: "clamp(36px,4.5vw,58px)", fontWeight: 400, lineHeight: 1.05, color: C.headline, margin: "0 0 28px", letterSpacing: "-0.035em" }}>
            {tl("Built from", "Ndërtuar nga")}<br />
            <em style={{ fontStyle: "italic", color: C.muted }}>{tl("the ruins up.", "rrënojat.")}</em>
          </h2>
          <div style={{ borderLeftWidth: 2, borderLeftStyle: "solid", borderLeftColor: C.brand, paddingLeft: 18, marginBottom: 28 }}>
            <blockquote style={{ fontFamily: T.display, fontSize: "clamp(14px,1.6vw,18px)", fontStyle: "italic", color: C.headline, margin: 0, lineHeight: 1.65 }}>
              {tl('"We do not build for today\'s client alone. We build for the next fifty years."', '"Ne nuk ndërtojmë vetëm për klientin e sotëm. Ne ndërtojmë për pesëdhjetë vitet e ardhshme."')}
            </blockquote>
            <cite style={{ fontFamily: T.body, fontSize: 11, fontWeight: 500, color: C.brand, display: "block", marginTop: 10, fontStyle: "normal" }}>— Bedri Prishtina, {tl("Founder", "Themelues")}</cite>
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }} transition={{ duration: 0.7, delay: 0.12 }}
        >
          {[
            tl("In the summer of 1999, as Kosovo emerged from conflict and a generation of infrastructure lay in rubble, Bedri Prishtina founded Tregtia with a single conviction: the act of building was inseparable from the act of nation-making.", "Në verën e vitit 1999, ndërsa Kosova dilte nga konflikti, Bedri Prishtina themeloi Tregtia me një bindje: ndërtimi ishte i pandashëm nga krijimi i kombit."),
            tl("He had no crane, no fleet, three employees. What he had was an understanding of concrete — its weight, its chemistry, its permanence. Within four years he acquired a precast plant. By 2008, Tregtia controlled its own joinery and glazing supply chain.", "Ai nuk kishte vinç, as flotë. Brenda katër vjetësh bleu një fabrikë betoni. Deri në 2008, Tregtia kontrollonte zinxhirin e vet të dyerve dhe xhamit."),
            tl("Today 300 qualified professionals operate under the same ethic. The company has changed scale; its standard has not.", "Sot 300 profesionistë të kualifikuar operojnë nën të njëjtin etikë. Kompania ka ndryshuar shkallë; standardi i saj jo."),
          ].map((text, i) => (
            <p key={i} style={{ fontFamily: T.body, fontSize: 14, lineHeight: 1.85, color: C.body, margin: i < 2 ? "0 0 16px" : 0 }}>{text}</p>
          ))}
        </motion.div>
      </div>

      {/* Horizontal slideshow — dark band */}
      <div
        ref={sliderRef}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        style={{ background: C.headline, position: "relative", opacity: visible ? 1 : 0, transition: "opacity 0.8s ease 0.3s" }}
      >
        {/* Slide viewport */}
        <div style={{ overflow: "hidden" }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={active}
              initial={{ opacity: 0, x: 60 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -60 }}
              transition={{ duration: 0.55, ease: [0.4, 0, 0.2, 1] }}
              style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "clamp(24px,6vw,80px)", maxWidth: 1320, margin: "0 auto", padding: "clamp(40px,8vh,88px) clamp(20px,5vw,40px)" }}
            >
              {/* Giant ghost year */}
              <div style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
                <span style={{ fontFamily: T.display, fontSize: "clamp(80px,14vw,160px)", fontWeight: 400, color: "rgba(255,255,255,0.06)", lineHeight: 1, letterSpacing: "-0.06em", fontVariantNumeric: "tabular-nums", userSelect: "none", display: "block", marginBottom: 14 }}>{item.year}</span>
                <div style={{ fontFamily: T.body, fontSize: 10, fontWeight: 600, color: C.brand, textTransform: "uppercase", letterSpacing: "0.1em" }}>{String(active + 1).padStart(2, "0")} / {String(TIMELINE.length).padStart(2, "0")}</div>
              </div>
              {/* Content */}
              <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", paddingLeft: "clamp(24px,4vw,56px)", borderLeftWidth: 1, borderLeftStyle: "solid", borderLeftColor: "rgba(255,255,255,0.1)" }}>
                <span style={{ fontFamily: T.body, fontSize: 11, color: "rgba(255,255,255,0.35)", letterSpacing: "0.06em", marginBottom: 14, display: "block" }}>{item.year}</span>
                <h3 style={{ fontFamily: T.display, fontSize: "clamp(26px,3vw,40px)", fontWeight: 400, color: C.white, margin: "0 0 18px", letterSpacing: "-0.025em", lineHeight: 1.1 }}>
                  {lang === "en" ? item.titleEn : item.titleSq}
                </h3>
                <p style={{ fontFamily: T.body, fontSize: 14, lineHeight: 1.8, color: "rgba(255,255,255,0.55)", margin: 0, maxWidth: 440 }}>
                  {lang === "en" ? item.descEn : item.descSq}
                </p>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Controls row */}
        <div style={{ maxWidth: 1320, margin: "0 auto", padding: "0 clamp(20px,5vw,40px) 28px", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          {/* Prev / Next */}
          <button onClick={prev} style={{ width: 38, height: 38, borderRadius: 8, borderWidth: 1, borderStyle: "solid", borderColor: "rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.07)", color: C.white, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "background 0.15s" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.14)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.07)")}>
            <svg width="13" height="9" viewBox="0 0 13 9" fill="none"><path d="M12 4.5H1M5 8.5L1 4.5 5 .5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
          <button onClick={next} style={{ width: 38, height: 38, borderRadius: 8, borderWidth: 1, borderStyle: "solid", borderColor: "rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.07)", color: C.white, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "background 0.15s" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.14)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.07)")}>
            <svg width="13" height="9" viewBox="0 0 13 9" fill="none"><path d="M1 4.5h11M8 .5l4 4-4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
          {/* Scroll hint */}
          <span style={{ fontFamily: T.body, fontSize: 10, color: "rgba(255,255,255,0.25)", marginLeft: 4 }}>{tl("Scroll or use arrows", "Rrëshqit ose përdor shigjetat")}</span>
          {/* Dots */}
          <div style={{ display: "flex", gap: 5, marginLeft: "auto", alignItems: "center" }}>
            {TIMELINE.map((_, i) => (
              <button key={i} onClick={() => goTo(i)} style={{ width: i === active ? 22 : 6, height: 6, borderRadius: 3, background: i === active ? C.white : "rgba(255,255,255,0.25)", border: "none", cursor: "pointer", padding: 0, transition: "width 0.25s cubic-bezier(0.4,0,0.2,1), background 0.2s" }} />
            ))}
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 2, background: "rgba(255,255,255,0.07)" }}>
          <div key={`pb-${progressKey}-${active}`} style={{ height: "100%", background: C.brand, animation: paused ? "none" : `progressBar ${SLIDESHOW_INTERVAL}ms linear forwards` }} />
        </div>
      </div>
    </section>
  );
}

// Kodrina section removed

// ── Services — 3D scene + animated text ──────────────────────────────────────
function Services({ lang }: { lang: Lang }) {
  const tl = (en: string, sq: string) => lang === "en" ? en : sq;
  const tags = lang === "en" ? PRODUCTION_TAGS_EN : PRODUCTION_TAGS_SQ;
  const isMobile = useMediaQuery("(max-width: 860px)");
  return (
    <section id="services" style={{ background: C.surface, borderTop: `1px solid ${C.divider}`, padding: "clamp(60px,8vh,100px) 0" }}>
      <div style={{ maxWidth: 1320, margin: "0 auto", padding: "0 clamp(20px,5vw,40px)" }}>

        {/* Compact header row */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }} transition={{ duration: 0.6 }}
          style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "12px clamp(32px,5vw,80px)", alignItems: isMobile ? "start" : "end", marginBottom: 40, paddingBottom: 32, borderBottomWidth: 1, borderBottomStyle: "solid", borderBottomColor: C.divider }}
        >
          <h2 style={{ fontFamily: T.display, fontSize: "clamp(32px,3.5vw,48px)", fontWeight: 400, lineHeight: 1.0, color: C.headline, margin: 0, letterSpacing: "-0.03em" }}>
            {tl("What we", "Çfarë")}&nbsp;<em style={{ fontStyle: "italic", color: C.muted }}>{tl("deliver.", "ofrojmë.")}</em>
          </h2>
          <p style={{ fontFamily: T.body, fontSize: 14, color: C.body, lineHeight: 1.7, margin: 0 }}>
            {tl("From concept to completed building — entirely in-house. One company, every stage.", "Nga koncepti deri tek ndërtesa e përfunduar — tërësisht brenda kompanisë. Një kompani, çdo fazë.")}
          </p>
        </motion.div>

        {/* Steps — 2-column grid, compact (1 column on mobile) */}
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "1px", background: C.divider, borderWidth: 1, borderStyle: "solid", borderColor: C.divider, borderRadius: 8, overflow: "hidden", marginBottom: 28 }}>
          {PROCESS_STEPS.map((step, i) => (
            <motion.div
              key={step.id}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.5, delay: i * 0.06 }}
              style={{ background: C.surface, padding: "28px 28px 28px 0", paddingLeft: 28, display: "flex", gap: 18, alignItems: "start" }}
            >
              <span style={{ fontFamily: T.display, fontStyle: "italic", fontSize: 32, fontWeight: 400, color: C.divider, lineHeight: 1, fontVariantNumeric: "tabular-nums", flexShrink: 0, marginTop: 2 }}>0{i + 1}</span>
              <div>
                <h3 style={{ fontFamily: T.display, fontSize: "clamp(16px,1.6vw,20px)", fontWeight: 400, color: C.headline, margin: "0 0 6px", letterSpacing: "-0.015em", lineHeight: 1.25 }}>
                  {lang === "en" ? step.titleEn : step.titleSq}
                </h3>
                <p style={{ fontFamily: T.body, fontSize: 13, color: C.body, margin: 0, lineHeight: 1.65 }}>
                  {lang === "en" ? step.descEn : step.descSq}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Tags row */}
        <motion.div
          initial={{ opacity: 0 }} whileInView={{ opacity: 1 }}
          viewport={{ once: true }} transition={{ duration: 0.5 }}
          style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}
        >
          <span style={{ fontFamily: T.body, fontSize: 10, fontWeight: 600, color: C.muted, letterSpacing: "0.06em", textTransform: "uppercase", marginRight: 4 }}>{tl("In-house", "Brendshëm")}:</span>
          {tags.map((tag, i) => (
            <motion.span
              key={i}
              initial={{ opacity: 0, scale: 0.92 }} whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }} transition={{ duration: 0.3, delay: i * 0.04 }}
              style={{ fontFamily: T.body, fontSize: 12, color: C.body, background: C.white, borderWidth: 1, borderStyle: "solid", borderColor: C.divider, borderRadius: 20, padding: "4px 12px" }}
            >{tag}</motion.span>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

// ── Projects — featured card + photo grid ─────────────────────────────────────
function ProjectCard({ p, i, lang, onSelectProject }: { p: Project; i: number; lang: Lang; onSelectProject: (id: string) => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <motion.button
      key={p.id}
      initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }} transition={{ duration: 0.5, delay: i * 0.06, ease: [0.25, 0.1, 0.25, 1] }}
      onClick={() => onSelectProject(p.id)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ position: "relative", aspectRatio: "4/3", borderRadius: 8, overflow: "hidden", border: "none", cursor: "pointer", display: "block", padding: 0 }}
    >
      <motion.img
        src={p.img} alt={loc(p.alt, lang)}
        animate={{ scale: hovered ? 1.06 : 1, filter: hovered ? "saturate(0.95) brightness(0.98)" : "saturate(0.78) brightness(0.88)" }}
        transition={{ duration: 0.55, ease: [0.25, 0.1, 0.25, 1] }}
        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
      />
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(11,18,32,0.78) 0%, transparent 55%)", pointerEvents: "none" }} />
      <motion.div
        animate={{ y: hovered ? -4 : 0, opacity: 1 }}
        transition={{ duration: 0.3 }}
        style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "22px 20px", pointerEvents: "none" }}
      >
        <motion.div
          animate={{ opacity: hovered ? 1 : 0, y: hovered ? 0 : 6 }}
          transition={{ duration: 0.25 }}
          style={{ fontFamily: T.body, fontSize: 9, fontWeight: 600, color: "rgba(255,255,255,0.55)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 5 }}
        >{p.neighborhood} · {p.location}</motion.div>
        <div style={{ fontFamily: T.display, fontSize: "clamp(14px,1.4vw,20px)", fontWeight: 400, color: C.white, letterSpacing: "-0.015em", lineHeight: 1.2 }}>{loc(p.name, lang)}</div>
        <motion.div
          animate={{ opacity: hovered ? 1 : 0, y: hovered ? 0 : 6 }}
          transition={{ duration: 0.25, delay: 0.05 }}
          style={{ fontFamily: T.body, fontSize: 11, color: "rgba(255,255,255,0.55)", marginTop: 6, display: "flex", alignItems: "center", gap: 5 }}
        >
          View project <span style={{ fontSize: 13 }}>→</span>
        </motion.div>
      </motion.div>
    </motion.button>
  );
}

function Projects({ lang, projects, onSelectProject }: { lang: Lang; projects: Project[]; onSelectProject: (id: string) => void }) {
  const tl = (en: string, sq: string) => lang === "en" ? en : sq;
  const [filterKey, setFilterKey] = useState("All");
  const [showAll, setShowAll] = useState(false);

  // CMS operators can mark specific projects as "featured" to curate what the
  // homepage leads with. If none are marked, everything shows (no behavior
  // change from before that feature existed).
  const curated = projects.filter((p) => p.featured);
  const hasCuration = curated.length > 0 && curated.length < projects.length;
  const baseList = hasCuration && !showAll ? curated : projects;

  const filtered = filterKey === "All" ? baseList : baseList.filter((p) => p.neighborhood === filterKey);
  const neighborLabels = lang === "en" ? NEIGHBORHOODS_EN : NEIGHBORHOODS_SQ;
  const heroCard = filtered[0];
  const rest = filtered.slice(1);

  return (
    <section id="projects" style={{ background: C.bg, padding: "clamp(80px,12vh,120px) 0", borderTop: `1px solid ${C.divider}` }}>
      <div style={{ maxWidth: 1320, margin: "0 auto", padding: "0 clamp(20px,5vw,40px)" }}>

        {/* Header + filter */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }} transition={{ duration: 0.55 }}
          style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 20 }}
        >
          <h2 style={{ fontFamily: T.display, fontSize: "clamp(28px,3.5vw,44px)", fontWeight: 400, color: C.headline, margin: 0, letterSpacing: "-0.03em" }}>
            {tl("Projects", "Projektet")}
          </h2>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {NEIGHBORHOOD_KEYS.map((key, i) => {
              const active = key === filterKey;
              return (
                <motion.button
                  key={key} onClick={() => setFilterKey(key)}
                  whileTap={{ scale: 0.95 }}
                  style={{ fontFamily: T.body, fontSize: 11, fontWeight: active ? 600 : 400, color: active ? C.white : C.body, background: active ? C.brand : "rgba(11,18,32,0.05)", border: "none", padding: "5px 12px", cursor: "pointer", borderRadius: 20, transition: "background 0.18s, color 0.18s" }}
                >
                  {neighborLabels[i]}
                </motion.button>
              );
            })}
          </div>
        </motion.div>

        {/* Featured large card */}
        <AnimatePresence mode="wait">
          {heroCard && (
            <motion.button
              key={heroCard.id + "-featured"}
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
              onClick={() => onSelectProject(heroCard.id)}
              style={{ position: "relative", width: "100%", height: "clamp(280px,38vh,460px)", borderRadius: 10, overflow: "hidden", border: "none", cursor: "pointer", display: "block", padding: 0, marginBottom: 12 }}
              whileHover="hover"
            >
              <motion.img
                src={heroCard.img} alt={loc(heroCard.alt, lang)}
                variants={{ hover: { scale: 1.04, filter: "saturate(0.9) brightness(0.95)" } }}
                transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", filter: "saturate(0.8) brightness(0.88)" }}
              />
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(11,18,32,0.7) 0%, transparent 50%)", pointerEvents: "none" }} />
              <div style={{ position: "absolute", bottom: 32, left: 32, right: 32, pointerEvents: "none" }}>
                <motion.div
                  variants={{ hover: { opacity: 1, y: 0 } }}
                  initial={{ opacity: 0, y: 8 }}
                  style={{ fontFamily: T.body, fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.55)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}
                >{heroCard.neighborhood} · {heroCard.location}</motion.div>
                <div style={{ fontFamily: T.display, fontSize: "clamp(22px,3vw,38px)", fontWeight: 400, color: C.white, letterSpacing: "-0.025em", lineHeight: 1.1 }}>{loc(heroCard.name, lang)}</div>
                <div style={{ fontFamily: T.body, fontSize: 12, color: "rgba(255,255,255,0.5)", marginTop: 8 }}>{loc(heroCard.specs, lang)}</div>
              </div>
            </motion.button>
          )}
        </AnimatePresence>

        {/* Remaining grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
          {rest.map((p, i) => (
            <ProjectCard key={p.id} p={p} i={i} lang={lang} onSelectProject={onSelectProject} />
          ))}
        </div>

        {hasCuration && !showAll && (
          <div style={{ display: "flex", justifyContent: "center", marginTop: 32 }}>
            <button
              onClick={() => setShowAll(true)}
              style={{ fontFamily: T.body, fontSize: 13, fontWeight: 500, color: C.brand, background: "transparent", padding: "10px 24px", borderRadius: 8, borderWidth: 1, borderStyle: "solid", borderColor: C.brand, cursor: "pointer", transition: "background 0.15s, color 0.15s" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = C.brand; e.currentTarget.style.color = C.white; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = C.brand; }}
            >
              {tl(`View all ${projects.length} projects`, `Shiko të gjitha ${projects.length} projektet`)} →
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

// ── Project detail page ───────────────────────────────────────────────────────
function ProjectPage({ projectId, lang, projects, onBack }: { projectId: string; lang: Lang; projects: Project[]; onBack: () => void }) {
  const tl = (en: string, sq: string) => lang === "en" ? en : sq;
  const project = projects.find((p) => p.id === projectId);
  const [activeImg, setActiveImg] = useState(0);
  const isMobile = useMediaQuery("(max-width: 860px)");
  useEffect(() => { window.scrollTo(0, 0); }, []);
  if (!project) return null;

  const specs = [
    { key: tl("Neighbourhood", "Lagja"),   val: project.neighborhood },
    { key: tl("Location", "Vendndodhja"),  val: project.location },
    { key: tl("Investor", "Investitori"),  val: project.investor },
    { key: tl("Use", "Përdorimi"),         val: project.use },
    { key: tl("Specs", "Specifikimet"),    val: loc(project.specs, lang) },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }} style={{ background: C.bg, minHeight: "100vh", paddingTop: 82 }}>
      {/* Hero image */}
      <div style={{ height: "clamp(360px,55vh,600px)", overflow: "hidden", position: "relative" }}>
        <AnimatePresence mode="wait">
          <motion.img
            key={activeImg}
            src={project.images[activeImg]}
            alt={loc(project.alt, lang)}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            style={{ width: "100%", height: "100%", objectFit: "cover", filter: "saturate(0.82) contrast(1.04) brightness(0.88)", position: "absolute", inset: 0 }}
          />
        </AnimatePresence>
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(11,18,32,0.35) 0%, transparent 35%, rgba(11,18,32,0.65) 100%)" }} />
        <button onClick={onBack} style={{ position: "absolute", top: 20, left: "clamp(16px,5vw,40px)", display: "inline-flex", alignItems: "center", gap: 8, fontFamily: T.body, fontSize: 12, fontWeight: 500, color: C.white, background: "rgba(255,255,255,0.12)", backdropFilter: "blur(12px)", borderWidth: 1, borderStyle: "solid", borderColor: "rgba(255,255,255,0.25)", padding: "8px 16px", borderRadius: 8, cursor: "pointer", transition: "background 0.15s" }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.2)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.12)")}>
          <svg width="14" height="10" viewBox="0 0 14 10" fill="none"><path d="M13 5H1M6 9L1 5l5-4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>
          {tl("All projects", "Të gjitha projektet")}
        </button>
        {/* Image counter */}
        <div style={{ position: "absolute", top: 24, right: "clamp(16px,5vw,40px)", fontFamily: T.body, fontSize: 11, fontWeight: 500, color: "rgba(255,255,255,0.55)", fontVariantNumeric: "tabular-nums" }}>
          {String(activeImg + 1).padStart(2, "0")} / {String(project.images.length).padStart(2, "0")}
        </div>
        <div style={{ position: "absolute", bottom: 28, left: "clamp(16px,5vw,40px)", right: "clamp(16px,5vw,40px)" }}>
          <span style={{ fontFamily: T.body, fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.65)", textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginBottom: 8 }}>{project.neighborhood} · {project.location}</span>
          <h1 style={{ fontFamily: T.display, fontSize: "clamp(28px,4vw,52px)", fontWeight: 400, color: C.white, margin: 0, letterSpacing: "-0.03em" }}>{loc(project.name, lang)}</h1>
        </div>
        {/* Arrow nav on hero */}
        {project.images.length > 1 && (
          <>
            <button onClick={() => setActiveImg((i) => (i - 1 + project.images.length) % project.images.length)} style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", width: 40, height: 40, borderRadius: 8, background: "rgba(255,255,255,0.1)", backdropFilter: "blur(10px)", borderWidth: 1, borderStyle: "solid", borderColor: "rgba(255,255,255,0.2)", color: C.white, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="13" height="9" viewBox="0 0 13 9" fill="none"><path d="M12 4.5H1M5 8.5L1 4.5 5 .5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
            <button onClick={() => setActiveImg((i) => (i + 1) % project.images.length)} style={{ position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)", width: 40, height: 40, borderRadius: 8, background: "rgba(255,255,255,0.1)", backdropFilter: "blur(10px)", borderWidth: 1, borderStyle: "solid", borderColor: "rgba(255,255,255,0.2)", color: C.white, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="13" height="9" viewBox="0 0 13 9" fill="none"><path d="M1 4.5h11M8 .5l4 4-4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
          </>
        )}
      </div>

      {/* Thumbnail strip */}
      {project.images.length > 1 && (
        <div style={{ background: C.white, borderBottomWidth: 1, borderBottomStyle: "solid", borderBottomColor: C.divider, padding: "12px clamp(20px,5vw,40px)", display: "flex", gap: 8, overflowX: "auto" }}>
          {project.images.map((src, i) => (
            <button key={i} onClick={() => setActiveImg(i)} style={{ flexShrink: 0, width: 80, height: 56, borderRadius: 6, overflow: "hidden", borderWidth: 2, borderStyle: "solid", borderColor: i === activeImg ? C.brand : "transparent", padding: 0, cursor: "pointer", transition: "border-color 0.15s" }}>
              <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", filter: i === activeImg ? "none" : "saturate(0.5) brightness(0.85)" }} />
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      <div style={{ maxWidth: 1320, margin: "0 auto", padding: "48px clamp(20px,5vw,40px) 80px", display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 380px", gap: isMobile ? 32 : 64, alignItems: "start" }}>
        <div>
          <h2 style={{ fontFamily: T.display, fontSize: "clamp(22px,2.5vw,30px)", fontWeight: 400, color: C.headline, margin: "0 0 16px", letterSpacing: "-0.025em" }}>{tl("About this project", "Rreth këtij projekti")}</h2>
          <p style={{ fontFamily: T.body, fontSize: 15, lineHeight: 1.85, color: C.body, margin: "0 0 32px" }}>{loc(project.desc, lang)}</p>
          <button onClick={onBack} style={{ fontFamily: T.body, fontSize: 13, fontWeight: 500, color: C.brand, background: "none", borderWidth: 1, borderStyle: "solid", borderColor: C.brand, padding: "10px 22px", borderRadius: 8, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8, transition: "background 0.15s, color 0.15s" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = C.brand; e.currentTarget.style.color = C.white; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = C.brand; }}>
            ← {tl("Back to portfolio", "Kthehu te portofoli")}
          </button>
        </div>
        <div style={{ background: C.white, borderWidth: 1, borderStyle: "solid", borderColor: C.divider, borderRadius: 8, overflow: "hidden", position: isMobile ? "static" : "sticky", top: 80 }}>
          <div style={{ fontFamily: T.body, fontSize: 10, fontWeight: 600, color: C.muted, letterSpacing: "0.1em", textTransform: "uppercase", padding: "12px 18px", background: C.surface, borderBottomWidth: 1, borderBottomStyle: "solid", borderBottomColor: C.divider }}>{tl("Project data", "Të dhënat")}</div>
          <dl style={{ margin: 0 }}>
            {specs.map((s, i) => (
              <div key={s.key} style={{ display: "grid", gridTemplateColumns: "130px 1fr", borderBottomWidth: i < specs.length - 1 ? 1 : 0, borderBottomStyle: "solid", borderBottomColor: C.divider }}>
                <dt style={{ fontFamily: T.body, fontSize: 12, fontWeight: 500, color: C.muted, padding: "12px 18px", borderRightWidth: 1, borderRightStyle: "solid", borderRightColor: C.divider, background: C.surface, margin: 0 }}>{s.key}</dt>
                <dd style={{ fontFamily: T.body, fontSize: 13, color: C.headline, padding: "12px 18px", margin: 0 }}>{s.val}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </motion.div>
  );
}

// Heritage section removed — stats no longer shown

// ── Contact ───────────────────────────────────────────────────────────────────
function Contact({ lang }: { lang: Lang }) {
  const tl = (en: string, sq: string) => lang === "en" ? en : sq;
  const isMobile = useMediaQuery("(max-width: 860px)");
  return (
    <section id="contact" style={{ background: C.bg, borderTop: `1px solid ${C.divider}`, padding: "clamp(60px,12vh,140px) 0" }}>
      <div style={{ maxWidth: 1320, margin: "0 auto", padding: "0 clamp(20px,5vw,40px)", display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1.3fr", gap: "clamp(40px,7vw,96px)", alignItems: "start" }}>
        <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-60px" }} transition={{ duration: 0.7 }}>
          <h2 style={{ fontFamily: T.display, fontSize: "clamp(34px,4vw,52px)", fontWeight: 400, lineHeight: 1.06, color: C.headline, margin: "0 0 12px", letterSpacing: "-0.03em" }}>
            {tl("Get in touch.", "Na kontaktoni.")}
          </h2>
          <p style={{ fontFamily: T.body, fontSize: 14, color: C.body, lineHeight: 1.75, margin: "0 0 44px" }}>
            {tl("Reach us directly by phone or email. Monday–Saturday, 08:00–16:00.", "Na kontaktoni drejtpërdrejt. E hënë–E shtunë, 08:00–16:00.")}
          </p>
          {[
            { label: tl("Telephone", "Telefon"), value: "038 601 028", href: "tel:038601028", sub: "Mon–Sat 08:00–16:00" },
            { label: tl("Mobile", "Mobil"), value: "044/45 158 794", href: "tel:04445158794", sub: "Mon–Sat 08:00–16:00" },
            { label: "Email", value: "info@tregtia.biz", href: "mailto:info@tregtia.biz", sub: tl("Response within one business day", "Përgjigje brenda një dite pune") },
          ].map(({ label, value, href, sub }, i) => (
            <div key={i} style={{ paddingTop: 20, paddingBottom: 20, borderTopWidth: 1, borderTopStyle: "solid", borderTopColor: C.divider }}>
              <div style={{ fontFamily: T.body, fontSize: 10, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>{label}</div>
              <a href={href} style={{ fontFamily: T.display, fontSize: "clamp(20px,2.2vw,28px)", fontWeight: 400, color: C.headline, textDecoration: "none", display: "block", marginBottom: 4, letterSpacing: "-0.02em", transition: "color 0.15s" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = C.brand)}
                onMouseLeave={(e) => (e.currentTarget.style.color = C.headline)}>{value}</a>
              <div style={{ fontFamily: T.body, fontSize: 12, color: C.muted }}>{sub}</div>
            </div>
          ))}
          <div style={{ paddingTop: 20, borderTopWidth: 1, borderTopStyle: "solid", borderTopColor: C.divider }}>
            <div style={{ fontFamily: T.body, fontSize: 10, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>{tl("Address", "Adresa")}</div>
            <div style={{ fontFamily: T.body, fontSize: 14, color: C.body, lineHeight: 1.65 }}>Magjistralja Prishtinë – Fushë Kosovë<br /><span style={{ color: C.muted }}>Republic of Kosovo</span></div>
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-60px" }} transition={{ duration: 0.7, delay: 0.12 }}>
          <div style={{ borderRadius: 8, overflow: "hidden", borderWidth: 1, borderStyle: "solid", borderColor: C.divider, boxShadow: "0 2px 16px rgba(0,0,0,0.06)" }}>
            <iframe src="https://maps.google.com/maps?q=42.6444,21.1133&z=14&output=embed" width="100%" height="480" style={{ border: 0, display: "block" }} loading="lazy" title={tl("Tregtia location", "Vendndodhja Tregtia")} />
          </div>
          <p style={{ fontFamily: T.body, fontSize: 11, color: C.muted, marginTop: 10, fontStyle: "italic" }}>Magjistralja Prishtinë – Fushë Kosovë, Republic of Kosovo</p>
        </motion.div>
      </div>
    </section>
  );
}

// ── Footer ────────────────────────────────────────────────────────────────────
function Footer({ lang, social }: { lang: Lang; social: { instagram: string; facebook: string } }) {
  const tl = (en: string, sq: string) => lang === "en" ? en : sq;
  const isMobile = useMediaQuery("(max-width: 860px)");
  // Guard against unsafe URI schemes (e.g. javascript:) ending up in an <a href>,
  // regardless of how they got into storage.
  const safeInstagram = isSafeHttpUrl(social.instagram) ? social.instagram : "";
  const safeFacebook = isSafeHttpUrl(social.facebook) ? social.facebook : "";
  return (
    <footer style={{ background: C.headline, padding: "36px 0" }}>
      <div style={{ maxWidth: 1320, margin: "0 auto", padding: "0 clamp(20px,5vw,40px)", display: "flex", justifyContent: isMobile ? "center" : "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px 24px" }}>
        <TLogo height={22} dark />
        <span style={{ fontFamily: T.body, fontSize: 12, color: "rgba(244,246,249,0.3)" }}>© 1999–2026 Tregtia Sh.p.k. {tl("All rights reserved.", "Të gjitha të drejtat e rezervuara.")}</span>
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          {["info@tregtia.biz", "038 601 028"].map((item) => (
            <span key={item} style={{ fontFamily: T.body, fontSize: 12, color: "rgba(244,246,249,0.3)" }}>{item}</span>
          ))}
          {/* Social links */}
          {safeInstagram ? (
            <a href={safeInstagram} target="_blank" rel="noopener noreferrer" title="Instagram"
              style={{ color: "rgba(244,246,249,0.45)", textDecoration: "none", display: "flex", alignItems: "center", transition: "color 0.15s" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = C.white)}
              onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(244,246,249,0.45)")}>
              <InstagramIcon />
            </a>
          ) : (
            <span title={tl("Instagram — add link in CMS", "Instagram — shto link në CMS")}
              style={{ color: "rgba(244,246,249,0.2)", display: "flex", alignItems: "center", cursor: "default" }}>
              <InstagramIcon />
            </span>
          )}
          {safeFacebook ? (
            <a href={safeFacebook} target="_blank" rel="noopener noreferrer" title="Facebook"
              style={{ color: "rgba(244,246,249,0.45)", textDecoration: "none", display: "flex", alignItems: "center", transition: "color 0.15s" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = C.white)}
              onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(244,246,249,0.45)")}>
              <FacebookIcon />
            </a>
          ) : (
            <span title={tl("Facebook — add link in CMS", "Facebook — shto link në CMS")}
              style={{ color: "rgba(244,246,249,0.2)", display: "flex", alignItems: "center", cursor: "default" }}>
              <FacebookIcon />
            </span>
          )}
        </div>
      </div>
    </footer>
  );
}

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  const [lang, setLang] = useState<Lang>("en");
  const [page, setPage] = useState<Page>({ type: "home" });
  const [isAdmin, setIsAdmin] = useState(window.location.hash === "#admin");

  // Listen for hash changes to enter/exit admin
  useEffect(() => {
    const onHash = () => setIsAdmin(window.location.hash === "#admin");
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  // Content is baked into the build from src/content/site-data.json. The admin
  // panel edits that same file (via a GitHub commit), which triggers a redeploy —
  // there's no runtime override to merge here.
  const activeProjects = PROJECTS;
  const activeHeroImages = HERO_IMAGES;
  const activeSocial = DEFAULT_SOCIAL;

  const goHome = useCallback(() => {
    setPage({ type: "home" });
    setTimeout(() => scrollToTop(), 10);
  }, []);

  const goHomeAndScroll = useCallback((id: string) => {
    setPage({ type: "home" });
    setTimeout(() => scrollToSection(id), 80);
  }, []);

  if (isAdmin) {
    return <AdminPage />;
  }

  return (
    <div style={{ background: C.bg, minHeight: "100vh" }}>
      <Nav
        lang={lang}
        onLangChange={setLang}
        currentPage={page}
        onGoHome={goHome}
      />
      <AnimatePresence mode="wait">
        {page.type === "home" ? (
          <motion.div key="home" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.35 }}>
            <Hero lang={lang} heroImages={activeHeroImages} />
            <About lang={lang} />
            <Services lang={lang} />
            <Projects lang={lang} projects={activeProjects} onSelectProject={(id) => { setPage({ type: "project", id }); window.scrollTo(0, 0); }} />
            <Contact lang={lang} />
            <Footer lang={lang} social={activeSocial} />
          </motion.div>
        ) : (
          <ProjectPage
            key="project"
            projectId={(page as { type: "project"; id: string }).id}
            projects={activeProjects}
            lang={lang}
            onBack={goHome}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
