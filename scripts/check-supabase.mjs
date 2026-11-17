import { loadEnv } from 'vite';

// Solo consultas de configuración: no registra usuarios ni imprime la clave.
const env = loadEnv(process.env.NODE_ENV === 'production' ? 'production' : 'development', process.cwd(), 'VITE_');
const url = env.VITE_SUPABASE_URL?.trim().replace(/\/$/, '');
const key = env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();
if (url !== 'https://ylsfknmzgeiptznapish.supabase.co' || !/^sb_publishable_[A-Za-z0-9_-]{20,}$/.test(key ?? '') || /TU_|\.\.\.|…/.test(key ?? '')) {
  console.error('Configuración incompleta o de otro proyecto. Revisa .env.local; la clave no se muestra.');
  process.exitCode = 1;
} else {
  try {
    for (const endpoint of ['/auth/v1/health', '/auth/v1/settings']) {
      const response = await fetch(url + endpoint, { headers: { apikey: key }, signal: AbortSignal.timeout(15000) });
      console.log(`${endpoint}: HTTP ${response.status}`);
      if (!response.ok) { process.exitCode = 1; continue; }
      if (endpoint.endsWith('settings')) {
        const settings = await response.json();
        console.log(JSON.stringify({ emailEnabled: settings.external?.email, signupDisabled: settings.disable_signup, emailAutoConfirm: settings.mailer_autoconfirm }, null, 2));
      }
    }
  } catch (error) {
    console.error('No se pudo conectar:', error.cause?.code ?? error.name);
    process.exitCode = 1;
  }
}
