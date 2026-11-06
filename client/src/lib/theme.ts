export const THEME_KEY = "nabtety-theme";

/**
 * بيتنفّذ داخل <head> قبل أول رسم للصفحة، فمفيش وميض أبيض في الوضع الداكن.
 * محفوظ كنص عشان يتحط inline من غير مكتبة.
 */
export const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem("${THEME_KEY}");var d=t==="dark"||((!t||t==="system")&&window.matchMedia("(prefers-color-scheme: dark)").matches);if(d)document.documentElement.classList.add("dark");}catch(e){}})();`;