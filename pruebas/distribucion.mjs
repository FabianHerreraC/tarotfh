// Criterio de aceptación: en 100.000 extracciones simuladas, cada arcano sale
// como primera carta entre 4,3 % y 4,8 % de las veces (esperado 4,55 %).
// Uso: node pruebas/distribucion.mjs
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const raiz = new URL('..', import.meta.url);
const ctx = { crypto: globalThis.crypto };
vm.createContext(ctx);
vm.runInContext(readFileSync(new URL('pi.js', raiz), 'utf8') + ';globalThis.PI_DECIMALES = PI_DECIMALES;', ctx);
vm.runInContext(readFileSync(new URL('azar.js', raiz), 'utf8'), ctx);
const { leerPi, PI_DECIMALES: P } = ctx;

const N = 100_000;
const cuenta = new Array(22).fill(0);
for (let j = 0; j < N; j++) {
  const t = Math.random() * 3_600_000;      // toque en la primera hora de sesión
  const g = 40 + Math.random() * 360;       // gesto de 40 a 400 ms
  cuenta[leerPi(P, t, g, 0, 22).i]++;
}

const pct = cuenta.map((c) => (100 * c) / N);
const fuera = pct.map((p, i) => [i, p]).filter(([, p]) => p < 4.3 || p > 4.8);
console.log(pct.map((p, i) => `${String(i).padStart(2)}: ${p.toFixed(2)} %`).join('\n'));
console.log(`mín ${Math.min(...pct).toFixed(2)} % · máx ${Math.max(...pct).toFixed(2)} %`);
if (fuera.length) { console.error('FALLA:', fuera); process.exit(1); }
console.log('OK: todos entre 4,3 % y 4,8 %');
