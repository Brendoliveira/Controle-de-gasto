
// ============================================
// BACKUP E RESTAURAÇÃO TXT
// Formato versionado 1.0
// ============================================

const B = {

    VER: '1.0',

    // ========================================
    // EXPORTAÇÃO DO BACKUP
    // ========================================

    export(txs, cats) {
        const L = [];
        const bar = '='.repeat(36);
        const d = new Date().toLocaleDateString('pt-BR');

        // Cabeçalho
        L.push(
            bar,
            '        MEUCONTROLE FINANCEIRO',
            bar,
            '',
            `VERSÃO DO BACKUP: ${B.VER}`,
            `DATA DO BACKUP: ${d}`,
            '',
            '[CONFIGURACOES]',
            'Moeda: BRL',
            '',
            '[CATEGORIAS]',
            `Lista: ${cats.join('|')}`,
            ''
        );

        // ------------------------------------
        // Exportação de receitas
        // ------------------------------------

        L.push('[RECEITAS]');

        txs
            .filter(t => t.tipo === 'receita')
            .sort((a, b) => a.id.localeCompare(b.id))
            .forEach(t => {
                L.push(
                    `ID: ${t.id}`,
                    `Descricao: ${t.desc}`,
                    `Valor: ${(t.valor / 100).toFixed(2)}`,
                    `Data: ${U.date(t.data)}`,
                    `Categoria: ${t.categoria}`,
                    `Obs: ${(t.obs || '').replace(/\n/g, ' ')}`,
                    ''
                );
            });

        L.push('');

        // ------------------------------------
        // Exportação de despesas por categoria
        // ------------------------------------

        cats.forEach(c => {

            L.push(`[${U.norm(c)}]`);

            txs
                .filter(t =>
                    t.tipo === 'despesa' &&
                    t.categoria === c
                )
                .sort((a, b) => a.id.localeCompare(b.id))
                .forEach(t => {
                    L.push(
                        `ID: ${t.id}`,
                        `Descricao: ${t.desc}`,
                        `Valor: ${(t.valor / 100).toFixed(2)}`,
                        `DataVencimento: ${U.date(t.venc)}`,
                        `DataPagamento: ${U.date(t.pgto)}`,
                        `Status: ${t.status === 'pago' ? 'PAGO' : 'PENDENTE'}`,
                        `Forma: ${t.forma || ''}`,
                        `Obs: ${(t.obs || '').replace(/\n/g, ' ')}`,
                        ''
                    );
                });

            L.push('');
        });

        // Rodapé
        L.push(
            bar,
            '           FIM DO BACKUP',
            bar
        );

        return L.join('\r\n');
    },


    // ========================================
    // IMPORTAÇÃO E VALIDAÇÃO DO BACKUP
    // ========================================

    parse(text, known) {

        const errors = [];
        const txs = [];
        const cats = [...known];

        // ------------------------------------
        // Verificação do arquivo
        // ------------------------------------

        if (
            !/MEUCONTROLE/.test(text) ||
            !/FIM DO BACKUP/.test(text)
        ) {
            return {
                errors: [
                    'Arquivo não é um backup do MeuControle (cabeçalho/rodapé ausente).'
                ],
                txs,
                cats
            };
        }

        // ------------------------------------
        // Verificação da versão
        // ------------------------------------

        const v = /VERS[ÃA]O DO BACKUP:\s*([\d.]+)/.exec(text);

        if (!v) {
            errors.push('Versão do backup não encontrada.');
        } else if (
            v[1].split('.')[0] !== B.VER.split('.')[0]
        ) {
            errors.push(
                `Versão ${v[1]} incompatível (suportada: ${B.VER}).`
            );
        }

        if (errors.length) {
            return { errors, txs, cats };
        }

        // ------------------------------------
        // Mapeamento de categorias
        // ------------------------------------

        const map = {};

        [...F.DEF_CATS, ...known].forEach(c => {
            map[U.norm(c)] = c;
        });

        let sec = '';
        let cur = null;


        // ====================================
        // FINALIZAÇÃO E VALIDAÇÃO DE REGISTROS
        // ====================================

        const flush = () => {

            if (!cur) return;

            const bad = m => errors.push(
                `Registro ${cur.ID || '?'} em [${sec}]: ${m}`
            );

            // Validações básicas
            if (!cur.ID) return bad('sem ID');

            if (!cur.Descricao) {
                return bad('sem descrição');
            }

            const val = U.cents(cur.Valor);

            if (isNaN(val) || val < 0) {
                return bad('valor inválido');
            }

            // --------------------------------
            // Conversão de receitas
            // --------------------------------

            if (sec === 'RECEITAS') {

                const d = U.iso(cur.Data);

                if (!d) {
                    return bad('data inválida');
                }

                txs.push({
                    id: cur.ID,
                    tipo: 'receita',
                    desc: cur.Descricao,
                    valor: val,
                    data: d,
                    categoria: cur.Categoria || 'Outros',
                    obs: cur.Obs || ''
                });

            } else {

                // ----------------------------
                // Conversão de despesas
                // ----------------------------

                const ve = U.iso(cur.DataVencimento);

                if (!ve) {
                    return bad('vencimento inválido');
                }

                const st = (cur.Status || '').toUpperCase();

                if (!['PAGO', 'PENDENTE'].includes(st)) {
                    return bad('status inválido');
                }

                // Identificação da categoria
                const cat = map[sec] ||
                    sec.charAt(0) + sec.slice(1).toLowerCase();

                if (!cats.includes(cat)) {
                    cats.push(cat);
                    map[sec] = cat;
                }

                txs.push({
                    id: cur.ID,
                    tipo: 'despesa',
                    desc: cur.Descricao,
                    valor: val,
                    categoria: cat,
                    venc: ve,
                    pgto: U.iso(cur.DataPagamento),
                    status: st === 'PAGO' ? 'pago' : 'pendente',
                    forma: cur.Forma || '',
                    obs: cur.Obs || ''
                });
            }

            cur = null;
        };


        // ====================================
        // LEITURA E INTERPRETAÇÃO DO TXT
        // ====================================

        for (const raw of text.split(/\r?\n/)) {

            const l = raw.trim();

            // Identificação de seções
            const m = /^\[(.+)\]$/.exec(l);

            if (m) {
                flush();
                sec = m[1];
                continue;
            }

            // Leitura de campos
            const kv = /^([A-Za-z]+):\s?(.*)$/.exec(l);

            if (!kv) continue;

            // --------------------------------
            // Leitura das categorias
            // --------------------------------

            if (sec === 'CATEGORIAS') {

                if (kv[1] === 'Lista') {

                    kv[2]
                        .split('|')
                        .filter(Boolean)
                        .forEach(c => {

                            if (!cats.includes(c)) {
                                cats.push(c);
                            }

                            map[U.norm(c)] = c;
                        });
                }

                continue;
            }

            // Ignora configurações e cabeçalho
            if (sec === '' || sec === 'CONFIGURACOES') {
                continue;
            }

            // --------------------------------
            // Identificação de novos registros
            // --------------------------------

            if (kv[1] === 'ID') {
                flush();
                cur = {};
            }

            if (cur) {
                cur[kv[1]] = kv[2].trim();
            }
        }

        // Finaliza último registro
        flush();

        return {
            errors,
            txs,
            cats
        };
    }
};
