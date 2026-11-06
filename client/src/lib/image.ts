const MARK = "/image/upload/";

/**
 * يحوّل رابط Cloudinary لنسخة مصغّرة ومضغوطة. أي رابط تاني (blob: أو غيره) بيرجع زي ما هو.
 * الرابط الأصلي المخزّن ما بيتغيرش، التحويل وقت العرض بس.
 */
export function cloudUrl(url: string | null | undefined, width: number): string | undefined {
  if (!url) return undefined;
  if (!url.startsWith("https://res.cloudinary.com/")) return url;
  const i = url.indexOf(MARK);
  if (i === -1) return url;
  const rest = url.slice(i + MARK.length);
  // لو الرابط فيه تحويلات أصلاً (مش بيبدأ بـ v123/) ما نلمسوش
  if (!/^v\d+\//.test(rest)) return url;
  return `${url.slice(0, i + MARK.length)}c_limit,w_${width},f_auto,q_auto/${rest}`;
}