# Tarot FH

Web app de tiradas de los 22 Arcanos Mayores: barajador, mesa libre y una frase de tres oraciones como pista.
Spec: «Spec: web app de tiradas de tarot» (Claude Docs). Página estática, sin backend ni framework.

| Archivo | Qué es |
| --- | --- |
| `index.html` | Cabecera con opciones, mesa, frase, aviso de reinicio |
| `style.css` | Lámina técnica: línea fina, cotas, índices `[01]`; tinta (oscuro) y papel (claro) |
| `app.js` | Barajador, arrastre, volteo, frase, versión móvil, reinicio |
| `azar.js` | La ecuación de π: `k = (t + 314g + 1592m) mod (L − 7)`, `i = ⌊u·n⌋` |
| `pi.js` | 100.000 decimales de π (fórmula de Machin) |
| `arcanos.json` | Las 22 cartas: frase de tres oraciones y `explicacion`, tres párrafos que despliegan cada oración (del doc «Los 22 arcanos en tres párrafos») |
| `img/` | Las 22 ilustraciones Rider-Waite-Smith (1909) |
| `fuentes/` | IBM Plex Mono 400 (latín y latín extendido) y su licencia OFL |
| `tema.js` | Aplica el tema guardado antes de pintar |
| `pruebas/distribucion.mjs` | Criterio de aceptación: 100.000 extracciones, cada arcano entre 4,3 % y 4,8 % |

Necesita servirse por HTTP (carga `arcanos.json` con `fetch`):

```bash
python3 -m http.server 8000
```

## Desviaciones del spec

- **100.000 decimales en vez de 10.000.** Con 10.000 la frecuencia de cada arcano como
  primera carta va de 4,13 % a 4,96 % sobre todas las posiciones de π, fuera del criterio.
  Con 100.000 va de 4,40 % a 4,68 %. La fórmula no cambia; `L` es el largo de la cadena.
  `pi.js` pesa ~100 KB (≈ 45 KB comprimido).
- **Tinta por defecto.** Siguiendo las láminas de referencia, arranca en oscuro (#141312);
  el botón [05] pasa a papel (#FAF8F4) y se recuerda en el navegador.
- **Anversos: Rider-Waite-Smith (1909).** Ilustraciones de Pamela Colman Smith, dominio
  público, tomadas de Wikimedia Commons (`RWS Tarot 00 Fool.jpg` … `RWS Tarot 21 World.jpg`).
  En `img/` van a 600 px de ancho, JPEG calidad 50 (~150 KB cada una, 3,4 MB en total).
  Si una imagen no carga, la carta muestra la lámina de línea en SVG que hay debajo.
  Ojo: «Rider-Waite» es marca registrada de U.S. Games Systems; las imágenes de 1909 son
  libres, pero conviene no usar ese nombre como marca del producto.

## Contador de barajadas

El número bajo «TAROT FH» cuenta las barajadas de todas las personas que usan la app.
Como la página es estática, el total vive en [Abacus](https://v2.jasoncameron.dev/abacus),
un contador público y gratuito sin cuentas: cada barajada llama a `/hit/tarotfh/barajadas`.
En `localhost` usa la clave `tarotfh/barajadas-prueba`, para que las pruebas no inflen el real.
Sin red, el contador muestra `······` y esa barajada no se cuenta.
Límites del servicio: 30 peticiones cada 10 s por IP, y el contador caduca tras 6 meses sin uso.

## Opciones de la cabecera

- [01] Invertidas: apagada.
- [02] Frase: encendida. Al tocar una carta volteada, su frase aparece abajo a la derecha en una línea (dos como máximo).
- [03] Rastro π: encendido. Al pie de la mesa, solo el segmento de seis dígitos que eligió cada carta.
- [04] Sonido: apagado; roce de papel sintetizado con Web Audio.
- [05] Tinta / papel.
- Con sal: descartado; el azar es solo π (el mismo gesto en el mismo instante repite la carta).

## Atajos

- Shift + arrastrar en horizontal: gira la carta en pasos de 15°.
- Con teclado: Tab hasta una carta, Enter voltea o lee; flechas la mueven; R / Shift+R la gira.
- Doble clic (o doble toque) en una carta: la amplía a su resolución nativa, sin pasar de 1 px de imagen por px de pantalla. Clic o Esc la cierra. Con teclado: Shift+Enter.
- Rueda (botón de la mira, arriba a la derecha): gira con arrastre, rueda del mouse o flechas; el número que queda bajo la marca se trae con el centro o Enter. Llega boca arriba y en el rastro figura como RUEDA. Los números que ya salieron se ven apagados.
- Foto (botón de la cámara, arriba a la derecha): dibuja la mesa en un PNG al doble de resolución, con cotas, mazo, cartas, rastro π, frase visible y fecha. En escritorio lo descarga; en el teléfono abre el menú de compartir.
- Zoom de la mesa (escritorio, hasta 300 %): lupas a la derecha de la mesa, pellizco del trackpad (hacia donde apunta el cursor) o teclas + y −; 0 o un clic en el porcentaje vuelve al 100 %. Ampliada, la mesa se desplaza con dos dedos o arrastrando el fondo. La foto siempre sale sin zoom.
- Leer más: junto a la frase de cada carta hay un botón «+» que abre su explicación amplia (ilustración, frase y tres párrafos). Se cierra con Esc, la ✕ o un clic fuera.

## Seguridad y privacidad

- Todo se sirve desde este sitio: la fuente IBM Plex Mono está en `fuentes/` (SIL OFL 1.1),
  así que ninguna visita llama a Google.
- Única conexión externa: el contador de barajadas (Abacus). Recibe la IP de quien baraja;
  la app escribe su respuesta como texto, nunca como HTML.
- `Content-Security-Policy` en una etiqueta `meta`: scripts solo propios y sin código en línea,
  conexiones solo a este sitio y a Abacus, sin `object`, `base` ni formularios.
- `referrer: no-referrer`: Abacus no sabe desde qué página llega la petición.
- Sin dependencias de npm, sin claves ni secretos, sin datos de quien la usa (solo el tema
  elegido, en su propio navegador). Las fotos se generan en el navegador y no se suben.
- GitHub Pages no permite cabeceras propias (por ejemplo `frame-ancestors`); como la app no
  tiene acciones sensibles, que otro sitio la muestre en un iframe no tiene consecuencias.
