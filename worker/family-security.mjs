// Web Crypto only: shared by Cloudflare Workers and the security tests.
const encoder = new TextEncoder();
const hex = bytes => Array.from(bytes, x => x.toString(16).padStart(2, '0')).join('');
const unhex = value => Uint8Array.from(value.match(/../g), x => parseInt(x, 16));
export function token() { return hex(crypto.getRandomValues(new Uint8Array(32))); }
export async function digest(value) {
  return hex(new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(value))));
}
export function username(value) {
  if (typeof value !== 'string' || !/^[a-zA-Z0-9_]{3,32}$/.test(value)) throw new Error('Username harus 3–32 huruf, angka, atau garis bawah.');
  return value.toLowerCase();
}
export function validatePassword(value) {
  if (typeof value !== 'string' || value.length < 12 || value.length > 128) throw new Error('Password harus 12–128 karakter.');
}
async function derive(password, salt, iterations) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  return hex(new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: unhex(salt), iterations, hash: 'SHA-256' }, key, 256)));
}
// Cloudflare Workers rejects PBKDF2 above 100 000 iterations, so that is the ceiling here.
// shortcut: below the 600 000 OWASP guidance for PBKDF2-SHA256; upgrade to client-side stretching or Argon2/WASM if the threat model grows.
const iterations = 100000;
export async function hashPassword(password) {
  validatePassword(password);
  const salt = hex(crypto.getRandomValues(new Uint8Array(16)));
  return `pbkdf2-sha256$${iterations}$${salt}$${await derive(password, salt, iterations)}`;
}
export async function verifyPassword(password, stored) {
  if (typeof password !== 'string' || password.length > 128 || typeof stored !== 'string') return false;
  const parts = stored.split('$');
  if (parts.length !== 4 || parts[0] !== 'pbkdf2-sha256' || parts[1] !== String(iterations) || !/^[a-f0-9]{32}$/.test(parts[2]) || !/^[a-f0-9]{64}$/.test(parts[3])) return false;
  const actual = await derive(password, parts[2], iterations);
  let difference = 0;
  for (let i = 0; i < actual.length; i++) difference |= actual.charCodeAt(i) ^ parts[3].charCodeAt(i);
  return difference === 0;
}
export function sameOrigin(request) {
  return request.headers.get('Origin') === new URL(request.url).origin;
}
export function sessionCookie(value, maxAge = 604800) {
  if (!/^[a-f0-9]{64}$/.test(value)) throw new Error('Invalid session token');
  return `__Host-sd_session=${value}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`;
}
