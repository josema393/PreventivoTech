// Validación local: no sustituye la comprobación de la clave contra Supabase.
export function validateSupabaseConfig(rawUrl?: string, rawKey?: string): string {
  const url = rawUrl?.trim();
  const key = rawKey?.trim();
  if (!url || !key) return "Falta configurar VITE_SUPABASE_URL y VITE_SUPABASE_PUBLISHABLE_KEY. Guarda .env.local y reinicia la aplicación.";
  if (/TU[-_]|YOUR[-_]|\.\.\.|…/i.test(url + key)) return "La conexión contiene valores de ejemplo. Reemplaza la URL y la clave publicable por los datos reales de tu proyecto Supabase.";
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" || parsed.username || parsed.password || parsed.search || parsed.hash || !["", "/"].includes(parsed.pathname) || !/^[a-z0-9]{20}\.supabase\.co$/.test(parsed.hostname)) {
      return "VITE_SUPABASE_URL debe ser la URL HTTPS raíz de tu proyecto: https://ID_DEL_PROYECTO.supabase.co, sin /auth/v1 ni otros parámetros.";
    }
  } catch {
    return "VITE_SUPABASE_URL no es una dirección válida. Copia la Project URL desde Supabase.";
  }
  if (!/^sb_publishable_[A-Za-z0-9_-]{20,}$/.test(key)) return "VITE_SUPABASE_PUBLISHABLE_KEY debe contener la clave publicable completa (sb_publishable_...). No uses una clave secreta ni service_role.";
  return "";
}
