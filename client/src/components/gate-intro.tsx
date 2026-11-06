import { GateOverlay } from "@/components/gate-overlay";
import { GATE_ID, GATE_KEY, ONCE_PER_SESSION, RESPECT_REDUCED_MOTION } from "@/lib/gate";

// بيخفي البوابة قبل أول رسم حسب الإعدادات في lib/gate.ts. ?gate=1 بيجبرها تظهر.
const HIDE_SCRIPT =
  `(function(){try{var e=document.getElementById("${GATE_ID}");if(!e)return;` +
  `if(/[?&]gate=1/.test(location.search))return;var hide=false;` +
  (ONCE_PER_SESSION ? `if(sessionStorage.getItem("${GATE_KEY}")==="1")hide=true;` : "") +
  (RESPECT_REDUCED_MOTION
    ? `if(window.matchMedia("(prefers-reduced-motion: reduce)").matches)hide=true;`
    : "") +
  `if(hide)e.style.display="none"}catch(_){}})();`;

export function GateIntro() {
  return (
    <>
      <GateOverlay />
      <script dangerouslySetInnerHTML={{ __html: HIDE_SCRIPT }} />
    </>
  );
}