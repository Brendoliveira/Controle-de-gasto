
// ============================================
// INTERFACE E CONTROLE DAS PÁGINAS
// ============================================

const S = {
    txs: [],
    cats: [],
    ym: U.today().slice(0, 7),
    page: 'dashboard',
    q: '',
    fil: {
        cat: '',
        st: '',
        min: '',
        de: '',
        ate: ''
    },
    calDay: null
};

const $ = s => document.querySelector(s);

const FORMAS = [
    'Dinheiro',
    'PIX',
    'Débito',
    'Crédito',
    'Boleto',
    'Transferência'
];

const ml = (c, cls = '') =>
    `<span class="${cls}">${U.brl(c)}</span>`;


// ============================================
// CARREGAMENTO DOS DADOS
// ============================================

async function load() {
    S.txs = await DB.all('tx');
    S.cats = (await DB.all('cat')).map(c => c.name);

    if (!S.cats.length) {
        S.cats = [...F.DEF_CATS];
        await DB.putMany('cat', S.cats.map(name => ({ name })));
    }
}

const monthTx = () => S.txs.filter(t =>
    F.inMonth(t, S.ym) &&
    (!S.q || (t.desc + t.categoria + (t.obs || ''))
        .toLowerCase()
        .includes(S.q.toLowerCase()))
);


// ============================================
// STATUS E TABELAS
// ============================================

const tag = t => {
    const s = F.status(t);
    return `<span class="tag ${s}">${s.toUpperCase()}</span>`;
};

function rows(list, acts = true) {
    if (!list.length) {
        return '<div class="empty">Nenhuma movimentação encontrada.</div>';
    }

    return `
        <table>
            <tr>
                <th>Descrição</th>
                <th>Categoria</th>
                <th>Data</th>
                <th>Valor</th>
                <th>Status</th>
                ${acts ? '<th></th>' : ''}
            </tr>
            ${list.map(t => `
                <tr>
                    <td>${U.esc(t.desc)}</td>
                    <td>${U.esc(t.categoria)}</td>
                    <td>${U.date(F.ref(t))}</td>
                    <td>${ml(t.valor, t.tipo === 'receita' ? 'pos' : 'neg')}</td>
                    <td>${tag(t)}</td>

                    ${acts ? `
                        <td>
                            ${t.tipo === 'despesa' && t.status !== 'pago'
                                ? `<button onclick="pay('${t.id}')">✔ Pagar</button>`
                                : ''
                            }

                            <button onclick="edit('${t.id}')">✎</button>
                            <button class="dng" onclick="rem('${t.id}')">🗑</button>
                        </td>
                    ` : ''}
                </tr>
            `).join('')}
        </table>
    `;
}


// ============================================
// RENDERIZAÇÃO DA INTERFACE
// ============================================

function render() {
    document.querySelectorAll('#side a').forEach(a => {
        a.classList.toggle('on', a.dataset.p === S.page);
    });

    $('#ym').value = S.ym;

    const v = $('#view');
    v.innerHTML = '';

    V[S.page](v);
}


// ============================================
// PÁGINAS DO SISTEMA
// ============================================

const V = {

    // ----------------------------------------
    // DASHBOARD
    // ----------------------------------------

    dashboard(v) {
        const s = F.summary(S.txs, S.ym);

        const m = monthTx().sort((a, b) =>
            F.ref(b).localeCompare(F.ref(a))
        );

        const prox = S.txs
            .filter(t => t.tipo === 'despesa' && t.status !== 'pago')
            .sort((a, b) => a.venc.localeCompare(b.venc))
            .slice(0, 5);

        const K = (t, h) => `
            <div class="card">
                <h3>${t}</h3>
                <div class="big">${h}</div>
            </div>
        `;

        v.innerHTML = `
            <div class="grid">
                ${K('Saldo atual', ml(s.saldo, s.saldo < 0 ? 'neg' : 'pos'))}
                ${K('Receitas do mês', ml(s.rec, 'pos'))}
                ${K('Despesas do mês', ml(s.des, 'neg'))}
                ${K('Contas pagas', ml(s.pagas, 'pos'))}
                ${K('Contas pendentes', ml(s.pend, 'pen'))}
                ${K('Economia mensal', ml(s.eco, s.eco < 0 ? 'neg' : 'pos'))}
            </div>

            <div class="grid2">
                <div class="card">
                    <h3>Receitas × Despesas (6 meses)</h3>
                    <canvas id="c1"></canvas>
                </div>

                <div class="card">
                    <h3>Despesas por categoria</h3>
                    <canvas id="c2"></canvas>
                </div>
            </div>

            <div class="grid2">
                <div class="card">
                    <h3>Últimas movimentações</h3>
                    ${rows(m.slice(0, 8), false)}
                </div>

                <div class="card">
                    <h3>Próximos vencimentos</h3>
                    ${rows(prox, false)}
                </div>
            </div>
        `;

        const [y, mo] = S.ym.split('-').map(Number);
        const lb = [], R = [], D = [];

        for (let i = 5; i >= 0; i--) {
            const d = new Date(y, mo - 1 - i, 1);
            const x = F.summary(
                S.txs,
                d.getFullYear() + '-' +
                String(d.getMonth() + 1).padStart(2, '0')
            );

            lb.push(
                String(d.getMonth() + 1).padStart(2, '0') +
                '/' +
                String(d.getFullYear()).slice(2)
            );

            R.push(x.rec);
            D.push(x.des);
        }

        C.bars($('#c1'), lb, [
            { v: R, c: '#34d399' },
            { v: D, c: '#f87171' }
        ]);

        C.donut($('#c2'), s.porCat);
    },


    // ----------------------------------------
    // RECEITAS
    // ----------------------------------------

    receitas(v) {
        v.innerHTML = `
            <h2>Receitas</h2>

            <div class="card">
                ${rows(monthTx().filter(t => t.tipo === 'receita'))}
            </div>
        `;
    },


    // ----------------------------------------
    // DESPESAS
    // ----------------------------------------

    despesas(v) {
        v.innerHTML = `
            <h2>Despesas</h2>

            <div class="row">
                <button onclick="newCat()">+ Nova categoria</button>
            </div>

            <div class="card">
                ${rows(monthTx().filter(t => t.tipo === 'despesa'))}
            </div>
        `;
    },


    // ----------------------------------------
    // CONTROLE DE CONTAS
    // ----------------------------------------

    contas(v) {
        const f = S.fil;

        let l = S.txs.filter(t =>
            t.tipo === 'despesa' &&
            (!S.q || t.desc.toLowerCase().includes(S.q.toLowerCase()))
        );

        if (f.cat) l = l.filter(t => t.categoria === f.cat);
        if (f.st) l = l.filter(t => F.status(t) === f.st);
        if (f.min) l = l.filter(t => t.valor >= U.cents(f.min));
        if (f.de) l = l.filter(t => t.venc >= f.de);
        if (f.ate) l = l.filter(t => t.venc <= f.ate);

        l.sort((a, b) => a.venc.localeCompare(b.venc));

        v.innerHTML = `
            <h2>Controle de contas</h2>

            <div class="row">
                <select id="fc">
                    <option value="">Todas categorias</option>

                    ${S.cats.map(c => `
                        <option ${f.cat === c ? 'selected' : ''}>${c}</option>
                    `).join('')}
                </select>

                <select id="fs">
                    ${['', 'pendente', 'pago', 'vencido'].map(s => `
                        <option value="${s}" ${f.st === s ? 'selected' : ''}>
                            ${s || 'Todos status'}
                        </option>
                    `).join('')}
                </select>

                <input id="fm" type="number" placeholder="Valor mín." value="${f.min}">
                <input id="fd" type="date" value="${f.de}">
                <input id="fa" type="date" value="${f.ate}">
            </div>

            <div class="card">
                ${rows(l)}
            </div>
        `;

        const u = () => {
            S.fil = {
                cat: $('#fc').value,
                st: $('#fs').value,
                min: $('#fm').value,
                de: $('#fd').value,
                ate: $('#fa').value
            };

            render();
        };

        ['fc', 'fs', 'fm', 'fd', 'fa'].forEach(i => {
            $('#' + i).onchange = u;
        });
    },


    // ----------------------------------------
    // CALENDÁRIO
    // ----------------------------------------

    calendario(v) {
        const [y, m] = S.ym.split('-').map(Number);

        const n = new Date(y, m, 0).getDate();
        const off = new Date(y, m - 1, 1).getDay();

        let h = '<div class="cal">' +
            'DSTQQSS'.split('').map(d => `<b>${d}</b>`).join('') +
            '<span></span>'.repeat(off);

        for (let d = 1; d <= n; d++) {
            const iso = `${S.ym}-${String(d).padStart(2, '0')}`;

            const L = S.txs.filter(t =>
                F.ref(t) === iso || t.pgto === iso
            );

            h += `
                <div onclick="S.calDay='${iso}';render()">
                    ${d}

                    ${L.some(t => t.tipo === 'receita')
                        ? '<i class="dot" style="background:var(--g)"></i>'
                        : ''
                    }

                    ${L.some(t => t.tipo === 'despesa' && t.status === 'pago')
                        ? '<i class="dot" style="background:var(--b)"></i>'
                        : ''
                    }

                    ${L.some(t => t.tipo === 'despesa' && t.status !== 'pago')
                        ? '<i class="dot" style="background:var(--y)"></i>'
                        : ''
                    }
                </div>
            `;
        }

        const day = S.calDay && S.calDay.startsWith(S.ym)
            ? S.txs.filter(t =>
                F.ref(t) === S.calDay || t.pgto === S.calDay
            )
            : null;

        v.innerHTML = `
            <h2>Calendário</h2>

            <p>🟩 receita · 🟦 pago · 🟨 pendente</p>

            ${h}</div>

            ${day ? `
                <div class="card" style="margin-top:12px">
                    <h3>${U.date(S.calDay)}</h3>
                    ${rows(day)}
                </div>
            ` : ''}
        `;
    },


    // ----------------------------------------
    // BACKUP E RESTAURAÇÃO
    // ----------------------------------------

    backup(v) {
        v.innerHTML = `
            <h2>Backup e restauração</h2>

            <div class="card">
                <p>${S.txs.length} registros no banco local.</p>

                <div class="row">
                    <button class="pri" onclick="exportTxt()">
                        ⬇ Exportar backup TXT
                    </button>

                    <button onclick="$('#file').click()">
                        ⬆ Importar backup TXT
                    </button>

                    <input type="file" id="file" accept=".txt" hidden>

                    <button onclick="demo()">
                        Carregar dados demonstrativos
                    </button>

                    <button class="dng" onclick="clearDemo()">
                        Remover demonstrativos
                    </button>
                </div>
            </div>
        `;

        $('#file').onchange = importTxt;
    }
};


// ============================================
// CRUD - CADASTRO E EDIÇÃO
// ============================================

function form(tipo, t = {}) {
    const d = $('#dlg');
    const r = tipo === 'receita';
    const cats = r ? F.INC_CATS : S.cats;

    d.innerHTML = `
        <h3>${t.id ? 'Editar' : 'Nova'} ${r ? 'receita' : 'despesa'}</h3>

        <form id="f" method="dialog">

            <label>
                ${r ? 'Descrição' : 'Nome'}
                <input name="desc" required value="${U.esc(t.desc)}">
            </label>

            <label>
                Valor (R$)
                <input
                    name="valor"
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value="${t.valor ? t.valor / 100 : ''}"
                >
            </label>

            <label>
                Categoria
                <select name="categoria">
                    ${cats.map(c => `
                        <option ${t.categoria === c ? 'selected' : ''}>
                            ${c}
                        </option>
                    `).join('')}
                </select>
            </label>

            ${r ? `
                <label>
                    Data de recebimento
                    <input
                        name="data"
                        type="date"
                        required
                        value="${t.data || U.today()}"
                    >
                </label>
            ` : `
                <label>
                    Vencimento
                    <input
                        name="venc"
                        type="date"
                        required
                        value="${t.venc || U.today()}"
                    >
                </label>

                <label>
                    Status
                    <select name="status">
                        <option value="pendente" ${t.status !== 'pago' ? 'selected' : ''}>
                            Pendente
                        </option>

                        <option value="pago" ${t.status === 'pago' ? 'selected' : ''}>
                            Pago
                        </option>
                    </select>
                </label>

                <label>
                    Data de pagamento
                    <input name="pgto" type="date" value="${t.pgto || ''}">
                </label>

                <label>
                    Forma de pagamento
                    <select name="forma">
                        ${FORMAS.map(f => `
                            <option ${t.forma === f ? 'selected' : ''}>
                                ${f}
                            </option>
                        `).join('')}
                    </select>
                </label>
            `}

            <label>
                Observações
                <textarea name="obs">${U.esc(t.obs)}</textarea>
            </label>

            <div class="row">
                <button class="pri">Salvar</button>
                <button type="button" onclick="$('#dlg').close()">Cancelar</button>
            </div>
        </form>
    `;

    d.showModal();

    $('#f').onsubmit = async e => {
        e.preventDefault();

        const o = Object.fromEntries(new FormData(e.target));

        const rec = {
            ...t,
            tipo,
            id: t.id || F.nextId(S.txs),
            desc: o.desc.trim(),
            valor: U.cents(o.valor),
            categoria: o.categoria,
            obs: o.obs
        };

        if (!rec.desc || !(rec.valor > 0)) {
            return U.toast('Preencha descrição e valor válido.', 1);
        }

        if (r) {
            rec.data = o.data;
        } else {
            Object.assign(rec, {
                venc: o.venc,
                status: o.status,
                forma: o.forma,
                pgto: o.pgto
            });

            if (rec.status === 'pago' && !rec.pgto) {
                rec.pgto = U.today();
            }

            if (rec.status !== 'pago') {
                rec.pgto = '';
            }
        }

        try {
            await DB.put('tx', rec);
            await load();

            d.close();
            render();

            U.toast('Registro salvo.');
        } catch (x) {
            U.toast('Erro ao salvar: ' + x.message, 1);
        }
    };
}


// ============================================
// CRUD - EDITAR, EXCLUIR E PAGAR
// ============================================

const edit = id => {
    const t = S.txs.find(x => x.id === id);
    form(t.tipo, t);
};

async function rem(id) {
    if (!confirm('Excluir este registro?')) return;

    await DB.del('tx', id);
    await load();
    render();

    U.toast('Registro excluído.');
}

async function pay(id) {
    const t = S.txs.find(x => x.id === id);

    const d = prompt(
        'Data do pagamento (DD/MM/AAAA):',
        U.date(U.today())
    );

    if (d === null) return;

    const iso = U.iso(d);

    if (!iso) {
        return U.toast('Data inválida.', 1);
    }

    await DB.put('tx', {
        ...t,
        status: 'pago',
        pgto: iso
    });

    await load();
    render();

    U.toast('Conta marcada como paga.');
}

async function newCat() {
    const n = (prompt('Nome da nova categoria:') || '').trim();

    if (!n) return;

    if (S.cats.some(c => U.norm(c) === U.norm(n))) {
        return U.toast('Categoria já existe.', 1);
    }

    await DB.put('cat', { name: n });
    await load();
    render();

    U.toast('Categoria criada.');
}


// ============================================
// BACKUP - EXPORTAÇÃO
// ============================================

function exportTxt() {
    const b = new Blob(
        [B.export(S.txs, S.cats)],
        { type: 'text/plain;charset=utf-8' }
    );

    const a = document.createElement('a');

    a.href = URL.createObjectURL(b);
    a.download = `MeuControle_backup_${U.today()}.txt`;

    a.click();

    U.toast('Backup exportado.');
}


// ============================================
// BACKUP - IMPORTAÇÃO
// ============================================

async function importTxt(e) {
    const f = e.target.files[0];

    if (!f) return;

    const r = B.parse(await f.text(), S.cats);
    e.target.value = '';

    if (r.errors.length) {
        return U.toast(
            'Backup inválido: ' + r.errors.slice(0, 3).join(' | '),
            1
        );
    }

    const ids = new Set(S.txs.map(t => t.id));
    const novos = r.txs.filter(t => !ids.has(t.id));
    const dup = r.txs.length - novos.length;

    const d = $('#dlg');

    d.innerHTML = `
        <h3>Resumo da importação</h3>

        <p>
            Receitas: ${r.txs.filter(t => t.tipo === 'receita').length}
            ·
            Despesas: ${r.txs.filter(t => t.tipo === 'despesa').length}

            <br>

            Novos: ${novos.length}
            ·
            Já existentes (IDs): ${dup}
        </p>

        <p>
            <b>Mesclar</b>: adiciona só os novos.

            <b>Substituir</b>: apaga tudo e restaura o arquivo.
        </p>

        <div class="row">
            <button class="pri" id="m">Mesclar</button>
            <button class="dng" id="s">Substituir</button>
            <button id="c">Cancelar</button>
        </div>
    `;

    d.showModal();

    $('#c').onclick = () => d.close();

    $('#m').onclick = async () => {
        await DB.putMany('cat', r.cats.map(name => ({ name })));
        await DB.putMany('tx', novos);

        await load();

        d.close();
        render();

        U.toast(`${novos.length} registros importados, ${dup} duplicados ignorados.`);
    };

    $('#s').onclick = async () => {
        if (!confirm('Isso apagará todos os dados atuais. Continuar?')) {
            return;
        }

        await DB.clear('tx');
        await DB.clear('cat');

        await DB.putMany('cat', r.cats.map(name => ({ name })));
        await DB.putMany('tx', r.txs);

        await load();

        d.close();
        render();

        U.toast('Dados restaurados.');
    };
}


// ============================================
// DADOS DEMONSTRATIVOS
// ============================================

async function demo() {
    const m = S.ym;

    const id = () => F.nextId(S.txs.concat(window._d || []));

    window._d = [];

    const add = o => {
        o.id = id();
        o.demo = true;
        window._d.push(o);
    };

    add({
        tipo: 'receita',
        desc: 'Salário',
        valor: 300000,
        data: m + '-05',
        categoria: 'Salário',
        obs: ''
    });

    add({
        tipo: 'despesa',
        desc: 'Mercado',
        valor: 35000,
        categoria: 'Alimentação',
        venc: m + '-12',
        pgto: m + '-12',
        status: 'pago',
        forma: 'PIX',
        obs: ''
    });

    add({
        tipo: 'despesa',
        desc: 'Aluguel',
        valor: 60000,
        categoria: 'Casa',
        venc: m + '-05',
        pgto: m + '-05',
        status: 'pago',
        forma: 'Boleto',
        obs: ''
    });

    add({
        tipo: 'despesa',
        desc: 'Parcela',
        valor: 30000,
        categoria: 'Dívidas',
        venc: m + '-20',
        pgto: '',
        status: 'pendente',
        forma: 'Boleto',
        obs: ''
    });

    await DB.putMany('tx', window._d);

    await load();
    render();

    U.toast('Dados demonstrativos carregados.');
}

async function clearDemo() {
    for (const t of S.txs.filter(t => t.demo)) {
        await DB.del('tx', t.id);
    }

    await load();
    render();

    U.toast('Demonstrativos removidos.');
}


// ============================================
// INICIALIZAÇÃO DO SISTEMA
// ============================================

(async () => {
    try {
        await DB.open();
        await load();

    } catch (e) {
        document.body.innerHTML =
            '<p style="padding:20px">Erro ao abrir o banco local: ' +
            e.message +
            '</p>';

        return;
    }

    document.querySelectorAll('#side a').forEach(a => {
        a.onclick = () => {
            S.page = a.dataset.p;
            render();
        };
    });

    $('#ym').onchange = e => {
        S.ym = e.target.value || S.ym;
        render();
    };

    $('#q').oninput = e => {
        S.q = e.target.value;
        render();
    };

    $('#newR').onclick = () => form('receita');
    $('#newD').onclick = () => form('despesa');

    render();
})();
