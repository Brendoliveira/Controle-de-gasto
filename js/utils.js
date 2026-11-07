
/* =========================================================
   UTILITÁRIOS
   Formatação monetária, datas, textos e notificações.
========================================================= */

const U = {

  /* -------------------------------------------------------
     FORMATAR VALORES EM REAL (BRL)
     Recebe valores em centavos.
  ------------------------------------------------------- */

  brl: c =>
    (c / 100).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }),


  /* -------------------------------------------------------
     CONVERTER VALOR PARA CENTAVOS
  ------------------------------------------------------- */

  cents: v =>
    Math.round(
      parseFloat(
        String(v).replace(',', '.')
      ) * 100
    ),


  /* -------------------------------------------------------
     FORMATAR DATA: AAAA-MM-DD → DD/MM/AAAA
  ------------------------------------------------------- */

  date: i =>
    i
      ? i.split('-').reverse().join('/')
      : '',


  /* -------------------------------------------------------
     CONVERTER DATA: DD/MM/AAAA → AAAA-MM-DD
  ------------------------------------------------------- */

  iso(d) {

    const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(
      (d || '').trim()
    );

    return m
      ? `${m[3]}-${m[2]}-${m[1]}`
      : '';

  },


  /* -------------------------------------------------------
     DATA ATUAL
  ------------------------------------------------------- */

  today: () =>
    new Date().toISOString().slice(0, 10),


  /* -------------------------------------------------------
     ESCAPAR HTML
     Ajuda a evitar injeção de HTML em textos dinâmicos.
  ------------------------------------------------------- */

  esc: s =>
    String(s ?? '').replace(
      /[&<>"]/g,
      c => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;'
      }[c])
    ),


  /* -------------------------------------------------------
     NORMALIZAR TEXTO
     Remove acentos, converte para maiúsculas e remove
     espaços nas extremidades.
  ------------------------------------------------------- */

  norm: s =>
    s
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase()
      .trim(),


  /* -------------------------------------------------------
     NOTIFICAÇÕES (TOAST)
  ------------------------------------------------------- */

  toast(m, err) {

    const t = document.createElement('div');

    t.className = 'toast' + (err ? ' err' : '');
    t.textContent = m;

    document.getElementById('toasts').append(t);

    setTimeout(() => t.remove(), 3500);

  }

};
