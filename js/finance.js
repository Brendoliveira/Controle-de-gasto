
/* =========================================================
   REGRAS FINANCEIRAS
   Sem dependência de DOM ou IndexedDB.
   Estrutura preparada para futura migração para Java/Python.

   IMPORTANTE:
   Valores monetários armazenados em centavos para evitar
   erros de precisão de ponto flutuante.
========================================================= */

const F = {

  /* -------------------------------------------------------
     CATEGORIAS PADRÃO
  ------------------------------------------------------- */

  DEF_CATS: [
    'Alimentação',
    'Casa',
    'Dívidas',
    'Lazer'
  ],

  INC_CATS: [
    'Salário',
    'Freelance',
    'Benefícios',
    'Outros'
  ],


  /* -------------------------------------------------------
     REFERÊNCIA DE DATA
  ------------------------------------------------------- */

  // Receitas utilizam a data de recebimento.
  // Despesas utilizam a data de vencimento.
  ref: t => t.tipo === 'receita'
    ? t.data
    : t.venc,


  /* -------------------------------------------------------
     VERIFICAR MÊS DA TRANSAÇÃO
  ------------------------------------------------------- */

  inMonth: (t, ym) =>
    (F.ref(t) || '').startsWith(ym),


  /* -------------------------------------------------------
     DETERMINAR STATUS DA TRANSAÇÃO
  ------------------------------------------------------- */

  status(t) {

    if (t.tipo === 'receita') {
      return 'pago';
    }

    if (t.status === 'pago') {
      return 'pago';
    }

    return t.venc < U.today()
      ? 'vencido'
      : 'pendente';

  },


  /* -------------------------------------------------------
     SOMAR VALORES
  ------------------------------------------------------- */

  sum: l =>
    l.reduce((a, t) => a + t.valor, 0),


  /* -------------------------------------------------------
     RESUMO FINANCEIRO
  ------------------------------------------------------- */

  summary(txs, ym) {

    // Filtra transações do mês selecionado
    const m = txs.filter(t => F.inMonth(t, ym));

    // Separa receitas e despesas
    const rec = m.filter(t => t.tipo === 'receita');
    const des = m.filter(t => t.tipo === 'despesa');

    // Separa despesas pagas e pendentes
    const pagas = des.filter(t => t.status === 'pago');
    const pend = des.filter(t => t.status !== 'pago');

    // Calcula os totais
    const R = F.sum(rec);
    const D = F.sum(des);

    return {

      // Totais do mês
      rec: R,
      des: D,

      // Despesas pagas e pendentes
      pagas: F.sum(pagas),
      pend: F.sum(pend),

      // Economia do mês
      eco: R - D,

      // Saldo geral acumulado
      saldo:
        F.sum(txs.filter(t => t.tipo === 'receita')) -
        F.sum(
          txs.filter(t =>
            t.tipo === 'despesa' &&
            t.status === 'pago'
          )
        ),

      // Agrupamento de despesas por categoria
      porCat: des.reduce((o, t) => {

        o[t.categoria] =
          (o[t.categoria] || 0) + t.valor;

        return o;

      }, {})

    };

  },


  /* -------------------------------------------------------
     GERAR PRÓXIMO ID
  ------------------------------------------------------- */

  nextId: txs =>

    String(
      Math.max(
        0,
        ...txs.map(t => parseInt(t.id) || 0)
      ) + 1
    ).padStart(3, '0')

};
