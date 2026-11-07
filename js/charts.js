
/* =========================================================
   GRÁFICOS EM CANVAS
   Gráficos próprios, funcionando 100% offline.
========================================================= */

const C = {

  /* -------------------------------------------------------
     GRÁFICO DE BARRAS
  ------------------------------------------------------- */

  bars(cv, labels, series) {

    const w = cv.width = cv.clientWidth * 2;
    const h = cv.height = cv.clientHeight * 2;
    const x = cv.getContext('2d');

    x.clearRect(0, 0, w, h);

    const mx = Math.max(1, ...series.flatMap(s => s.v));
    const n = labels.length;
    const gw = (w - 80) / n;

    x.font = '22px sans-serif';

    labels.forEach((l, i) => {

      series.forEach((s, j) => {

        const bh = (h - 70) * s.v[i] / mx;
        const bw = gw / (series.length + 1);

        x.fillStyle = s.c;

        x.fillRect(
          60 + i * gw + j * bw + bw / 2,
          h - 40 - bh,
          bw * 0.9,
          bh
        );

      });

      x.fillStyle = '#8b97b0';
      x.fillText(l, 60 + i * gw + 4, h - 12);

    });

    x.fillText(U.brl(mx), 0, 20);

  },


  /* -------------------------------------------------------
     GRÁFICO DE ROSCA (DONUT)
  ------------------------------------------------------- */

  donut(cv, data) {

    const w = cv.width = cv.clientWidth * 2;
    const h = cv.height = cv.clientHeight * 2;
    const x = cv.getContext('2d');

    x.clearRect(0, 0, w, h);

    const e = Object.entries(data);
    const tot = e.reduce((a, [, v]) => a + v, 0);

    // Verifica se existem despesas para exibir
    if (!tot) {

      x.fillStyle = '#8b97b0';
      x.font = '26px sans-serif';

      x.fillText(
        'Sem despesas no mês',
        w / 2 - 130,
        h / 2
      );

      return;
    }

    // Paleta de cores
    const pal = [
      '#60a5fa',
      '#34d399',
      '#fbbf24',
      '#f87171',
      '#a78bfa',
      '#f472b6',
      '#2dd4bf'
    ];

    let a = -Math.PI / 2;

    const r = h / 2 - 20;

    // Desenha as fatias e a legenda
    e.forEach(([k, v], i) => {

      const s = v / tot * 2 * Math.PI;

      x.beginPath();
      x.moveTo(h / 2, h / 2);

      x.arc(
        h / 2,
        h / 2,
        r,
        a,
        a + s
      );

      x.fillStyle = pal[i % 7];
      x.fill();

      a += s;

      // Marcador de cor da legenda
      x.fillRect(
        h + 10,
        30 + i * 34,
        20,
        20
      );

      x.fillStyle = '#e6eaf2';
      x.font = '22px sans-serif';

      x.fillText(
        `${k} ${Math.round(v / tot * 100)}%`,
        h + 40,
        48 + i * 34
      );

    });

    // Cria o espaço central do gráfico
    x.globalCompositeOperation = 'destination-out';

    x.beginPath();

    x.arc(
      h / 2,
      h / 2,
      r * 0.55,
      0,
      7
    );

    x.fill();

    x.globalCompositeOperation = 'source-over';

  }

};
