// Tema antes de pintar: oscuro por defecto (como las láminas de referencia).
try {
  var t = localStorage.getItem('tarotfh-tema');
  if (t) document.documentElement.dataset.theme = t;
} catch (e) {}
