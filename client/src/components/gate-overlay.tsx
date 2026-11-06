"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  GATE_GRID,
  GATE_ID,
  GATE_IMAGES,
  GATE_KEY,
  GATE_TIMING,
  GATE_TOTAL_MS,
  ONCE_PER_SESSION,
  RESPECT_REDUCED_MOTION,
} from "@/lib/gate";

// أرقام عشوائية ثابتة: نفس الشكل في السيرفر والمتصفح
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Tile {
  box: { left: string; top: string; width: string; height: string };
  img: { left: string; top: string; width: string; height: string };
  clip: string;
  delay: number;
  duration: number;
  tx: number;
  ty: number;
  rot: number;
  scale: number;
}

const pct = (n: number) => `${n.toFixed(3)}%`;

// بنقسّم الشاشة لقطع غير منتظمة (شبكة نقاطها متحركة شوية) فيها تداخل بسيط عشان ما يظهرش خطوط بينها
function buildTiles(): Tile[] {
  const { cols, rows } = GATE_GRID;
  const r = mulberry32(2026);

  const lattice: { x: number; y: number }[][] = [];
  for (let j = 0; j <= rows; j++) {
    const line: { x: number; y: number }[] = [];
    for (let i = 0; i <= cols; i++) {
      const jx = (r() - 0.5) * (100 / cols) * 0.7;
      const jy = (r() - 0.5) * (100 / rows) * 0.7;
      line.push({
        x: (i / cols) * 100 + (i > 0 && i < cols ? jx : 0),
        y: (j / rows) * 100 + (j > 0 && j < rows ? jy : 0),
      });
    }
    lattice.push(line);
  }
  const at = (j: number, i: number) => lattice[j]![i]!;

  const tiles: Tile[] = [];
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const quad = [at(j, i), at(j, i + 1), at(j + 1, i + 1), at(j + 1, i)];
      const cx = quad.reduce((s, p) => s + p.x, 0) / 4;
      const cy = quad.reduce((s, p) => s + p.y, 0) / 4;
      const grown = quad.map((p) => ({ x: cx + (p.x - cx) * 1.07, y: cy + (p.y - cy) * 1.07 }));

      const minX = Math.min(...grown.map((p) => p.x));
      const maxX = Math.max(...grown.map((p) => p.x));
      const minY = Math.min(...grown.map((p) => p.y));
      const maxY = Math.max(...grown.map((p) => p.y));
      const w = maxX - minX;
      const h = maxY - minY;

      // الترتيب: القطع القريبة من خط النص تطير الأول، وبعدين الأبعد
      const order = Math.min(1, (Math.abs(cx - 50) / 50) * 0.8 + (Math.abs(cy - 50) / 50) * 0.1 + r() * 0.1);
      const side = cx < 50 ? -1 : 1;

      tiles.push({
        box: { left: pct(minX), top: pct(minY), width: pct(w), height: pct(h) },
        // الصورة بحجم الشاشة كلها ومزاحة، فكل القطع تكمّل بعض
        img: { left: pct(-(minX / w) * 100), top: pct(-(minY / h) * 100), width: pct(10000 / w), height: pct(10000 / h) },
        clip: `polygon(${grown.map((p) => `${pct(((p.x - minX) / w) * 100)} ${pct(((p.y - minY) / h) * 100)}`).join(",")})`,
        delay: GATE_TIMING.breakAt + order * GATE_TIMING.spread,
        duration: GATE_TIMING.flight * (0.85 + r() * 0.3),
        tx: side * (28 + r() * 55), // vw
        ty: (r() - 0.7) * 70, // vh (ميل لفوق زي الريح)
        rot: (r() - 0.5) * 600, // deg
        scale: 0.35 + r() * 0.45,
      });
    }
  }
  return tiles;
}

const TILES = buildTiles();

function markSeen() {
  try {
    sessionStorage.setItem(GATE_KEY, "1");
  } catch {
    /* التخزين غير متاح */
  }
}

export function GateOverlay() {
  const rootRef = useRef<HTMLDivElement>(null);
  const leavingRef = useRef(false);
  const [visible, setVisible] = useState(true);

  const skip = useCallback(() => {
    if (leavingRef.current) return;
    leavingRef.current = true;
    rootRef.current?.animate?.([{ opacity: 1 }, { opacity: 0 }], {
      duration: 350,
      easing: "ease",
      fill: "forwards",
    });
    window.setTimeout(() => {
      markSeen();
      setVisible(false);
    }, 380);
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!visible || !root) return;

    let seen = false;
    try {
      const force = /[?&]gate=1/.test(window.location.search);
      seen =
        !force &&
        ((ONCE_PER_SESSION && sessionStorage.getItem(GATE_KEY) === "1") ||
          (RESPECT_REDUCED_MOTION &&
            window.matchMedia("(prefers-reduced-motion: reduce)").matches));
    } catch {
      /* تجاهل */
    }

    if (seen || typeof root.animate !== "function") {
      const t = window.setTimeout(
        () => {
          markSeen();
          setVisible(false);
        },
        seen ? 0 : GATE_TOTAL_MS,
      );
      return () => window.clearTimeout(t);
    }

    const T = GATE_TIMING;
    const anims: Animation[] = [];

    // 1) قطع السياج بتطير
    root.querySelectorAll<HTMLElement>(".gate-tile").forEach((el, i) => {
      const t = TILES[i];
      if (!t) return;
      anims.push(
        el.animate(
          [
            { transform: "translate3d(0,0,0) rotate(0deg) scale(1)", opacity: 1, offset: 0 },
            { opacity: 1, offset: 0.5 },
            {
              transform: `translate3d(${t.tx.toFixed(1)}vw, ${t.ty.toFixed(1)}vh, 0) rotate(${t.rot.toFixed(0)}deg) scale(${t.scale.toFixed(2)})`,
              opacity: 0,
              offset: 1,
            },
          ],
          { duration: t.duration * 1000, delay: t.delay * 1000, easing: "cubic-bezier(.45,0,.35,1)", fill: "both" },
        ),
      );
    });

    // 2) الشعار: يظهر بهدوء ويختفي قبل التطاير
    const seal = root.querySelector<HTMLElement>(".gate-seal");
    if (seal) {
      anims.push(
        seal.animate(
          [
            { opacity: 0, transform: "translateY(14px) scale(.94)" },
            { opacity: 1, transform: "none" },
          ],
          { duration: 1100, delay: T.sealIn * 1000, easing: "ease", fill: "both" },
        ),
        seal.animate(
          [
            { opacity: 1, transform: "none" },
            { opacity: 0, transform: "scale(1.12)" },
          ],
          { duration: 1300, delay: (T.breakAt - 0.2) * 1000, easing: "ease-in", fill: "forwards" },
        ),
      );
    }

    // 3) نور دافي بيتسرب من النص مع بداية التطاير
    const glow = root.querySelector<HTMLElement>(".gate-glow");
    if (glow) {
      anims.push(
        glow.animate(
          [
            { opacity: 0, transform: "scale(.35)", offset: 0 },
            { opacity: 0.85, offset: 0.35 },
            { opacity: 0, transform: "scale(1.2)", offset: 1 },
          ],
          { duration: 3600, delay: (T.breakAt - 0.1) * 1000, easing: "ease-in-out", fill: "both" },
        ),
      );
    }

    const done = window.setTimeout(() => {
      markSeen();
      setVisible(false);
    }, GATE_TOTAL_MS);

    return () => {
      window.clearTimeout(done);
      anims.forEach((a) => a.cancel());
    };
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") skip();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [visible, skip]);

  if (!visible) return null;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div ref={rootRef} id={GATE_ID} className="gate-root" role="presentation" onClick={skip} suppressHydrationWarning>
        {TILES.map((t, i) => (
          <div key={i} className="gate-tile" style={{ ...t.box, clipPath: t.clip }}>
            <div className="gate-tile-img" style={t.img} />
          </div>
        ))}

        <div className="gate-glow" />

        <div className="gate-seal-pos" aria-hidden="true">
          <div className="gate-seal">
            <svg width="112" height="112" viewBox="0 0 160 160" aria-hidden="true">
              <circle cx="80" cy="80" r="74" fill="rgba(8,24,15,.55)" stroke="#f1e6c8" strokeOpacity=".85" strokeWidth="2.5" />
              <path d="M80 114V74" stroke="#f1e6c8" strokeWidth="4" strokeLinecap="round" fill="none" />
              <path d="M80 92C58 92 46 80 44 62C64 62 78 72 80 92Z" fill="#f1e6c8" />
              <path d="M80 82C100 82 114 70 116 52C96 52 82 62 80 82Z" fill="#f1e6c8" />
            </svg>
            <p className="font-display text-4xl font-bold text-[#f6f1e4]" style={{ textShadow: "0 2px 18px rgba(0,0,0,.7)" }}>
              نبتتي
            </p>
          </div>
        </div>

        <button
          type="button"
          className="gate-skip"
          onClick={(e) => {
            e.stopPropagation();
            skip();
          }}
        >
          تخطي
        </button>
      </div>
    </>
  );
}

// CSS ثابت بس (من غير keyframes): كل الحركة بتتم بـ JavaScript
const CSS = `
.gate-root{position:fixed;inset:0;z-index:100;overflow:hidden}
.gate-tile{position:absolute;overflow:hidden;background:#143a27}
.gate-tile-img{position:absolute;background:url(${GATE_IMAGES.hedge}) center/cover no-repeat #143a27}
.gate-glow{position:absolute;left:50%;top:48%;width:130vmax;height:130vmax;margin:-65vmax 0 0 -65vmax;border-radius:50%;pointer-events:none;opacity:0;mix-blend-mode:screen;background:radial-gradient(closest-side,rgba(255,246,208,.95),rgba(255,226,150,.4) 40%,rgba(255,226,150,0) 72%)}
.gate-seal-pos{position:absolute;inset:0;display:grid;place-items:center;pointer-events:none}
.gate-seal{display:flex;flex-direction:column;align-items:center;gap:14px;opacity:0;filter:drop-shadow(0 10px 30px rgba(0,0,0,.6))}
.gate-skip{position:absolute;left:50%;bottom:max(1.5rem,env(safe-area-inset-bottom));transform:translateX(-50%);padding:.55rem 1.3rem;border-radius:999px;border:1px solid rgba(246,241,228,.35);background:rgba(246,241,228,.14);color:#f6f1e4;font-weight:700;cursor:pointer;-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px)}
`;