import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
import { createClient } from '@supabase/supabase-js';

async function loadSource(file) {
  const source = await readFile(new URL(`../src/${file}`, import.meta.url), 'utf8');
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } });
  return import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
}
const { validateSupabaseConfig } = await loadSource('supabaseConfig.ts');
const { getAuthErrorMessage } = await loadSource('authErrors.ts');
const url = 'https://ylsfknmzgeiptznapish.supabase.co';
const key = 'sb_publishable_abcdefghijklmnopqrstuvwxyz'; // Ficticia: nunca se envía a la red.

test('rechaza configuración vacía, ejemplos y claves secretas sin revelarlas', () => {
  for (const [u, k] of [[undefined, undefined], ['https://TU-PROYECTO.supabase.co', key], [url, 'sb_publishable_TU_CLAVE_REAL'], [url, 'sb_secret_private'], [url, 'eyJhbGciOiJIUzI1NiJ9.secret']]) {
    const error = validateSupabaseConfig(u, k);
    assert.ok(error);
    if (k) assert.ok(!error.includes(k));
  }
});
test('rechaza URL con rutas de API, parámetros, credenciales y protocolo inseguro', () => {
  for (const u of [url + '/auth/v1', url + '?apikey=private', url + '#private', url.replace('https:', 'http:'), url.replace('https://', 'https://user:pass@'), 'malformed']) {
    assert.ok(validateSupabaseConfig(u, key));
  }
  assert.equal(validateSupabaseConfig(` ${url}/ `, ` ${key} `), '');
});
test('clasifica errores de red, claves, correo, límites, CAPTCHA y trigger', () => {
  assert.match(getAuthErrorMessage({ name: 'AuthRetryableFetchError', message: 'Failed to fetch' }), /conectar/);
  assert.match(getAuthErrorMessage(new Error('Error al obtener')), /conectar/);
  assert.match(getAuthErrorMessage({ status: 401, message: 'Invalid API key' }), /clave publicable/);
  assert.match(getAuthErrorMessage({ code: 'email_not_confirmed' }), /Confirma/);
  assert.match(getAuthErrorMessage({ status: 429 }), /límite/);
  assert.match(getAuthErrorMessage({ code: 'captcha_failed' }), /CAPTCHA/);
  assert.match(getAuthErrorMessage({ status: 500, message: 'Database error saving new user' }), /trigger/);
  assert.ok(!getAuthErrorMessage(new Error('sb_secret_do_not_display')).includes('sb_secret'));
});
test('SDK signUp envía nombre, correo y redirect correctos y contempla confirmación sin sesión', async () => {
  let captured;
  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: async (input, init) => {
      captured = { url: String(input), body: JSON.parse(init.body), headers: new Headers(init.headers) };
      return new Response(JSON.stringify({ id: '11111111-1111-4111-8111-111111111111', email: 'test@example.invalid', identities: [{ id: 'test' }] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    } },
  });
  const { data, error } = await client.auth.signUp({ email: 'test@example.invalid', password: 'test-only-password', options: { data: { nombre: 'Familia de prueba' }, emailRedirectTo: 'http://localhost:8443' } });
  assert.equal(error, null);
  assert.equal(data.session, null);
  assert.ok(data.user);
  const endpoint = new URL(captured.url);
  assert.equal(endpoint.pathname, '/auth/v1/signup');
  assert.equal(endpoint.searchParams.get('redirect_to'), 'http://localhost:8443');
  assert.equal(captured.headers.get('apikey'), key);
  assert.deepEqual(captured.body.data, { nombre: 'Familia de prueba' });
  assert.equal(captured.body.email, 'test@example.invalid');
  assert.ok(!('rol' in captured.body.data));
});
