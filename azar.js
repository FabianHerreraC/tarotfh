// Ecuación de aleatoriedad basada en π.
//   k = (t + 314·g + 1592·m) mod (L − 7)
//   u = 0.PkPk+1Pk+2Pk+3Pk+4Pk+5      i = ⌊u · n⌋
// El séptimo dígito Pk+6 decide la orientación (impar = invertida).

(function (raiz) {
  // P: cadena de decimales · t, g en ms · m: ya extraídas · n: restantes
  function leerPi(P, t, g, m, n, opciones = {}) {
    const modulo = P.length - 7;
    const bruto = Math.round(t) + 314 * Math.round(g) + 1592 * m;
    const k = ((bruto % modulo) + modulo) % modulo;
    const digitos = P.substr(k, 6);
    const u = Number(digitos) / 1e6;
    return {
      k,
      digitos,
      u,
      i: Math.floor(u * n),
      invertida: !!opciones.invertidas && Number(P[k + 6]) % 2 === 1,
    };
  }

  raiz.leerPi = leerPi;
})(typeof window !== 'undefined' ? window : globalThis);
