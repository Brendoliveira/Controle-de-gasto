
/* =========================================================
   CAMADA DE PERSISTÊNCIA — INDEXEDDB
   Independente da interface.
   Banco de dados: MeuControleDB
========================================================= */

const DB = {

  // Referência ao banco de dados
  _db: null,


  /* -------------------------------------------------------
     ABRIR BANCO DE DADOS
  ------------------------------------------------------- */

  open() {

    return new Promise((ok, no) => {

      const r = indexedDB.open('MeuControleDB', 1);

      // Criação das tabelas na primeira execução
      r.onupgradeneeded = () => {

        const d = r.result;

        d.createObjectStore('tx', {
          keyPath: 'id'
        });

        d.createObjectStore('cat', {
          keyPath: 'name'
        });

        d.createObjectStore('cfg', {
          keyPath: 'key'
        });

      };

      // Banco aberto com sucesso
      r.onsuccess = () => {

        this._db = r.result;
        ok();

      };

      // Erro ao abrir o banco
      r.onerror = () => no(r.error);

    });

  },


  /* -------------------------------------------------------
     MÉTODO INTERNO — OPERAÇÕES NO BANCO
  ------------------------------------------------------- */

  _s(st, mode, fn) {

    return new Promise((ok, no) => {

      const t = this._db.transaction(st, mode);
      const q = fn(t.objectStore(st));

      t.oncomplete = () => ok(q && q.result);

      t.onerror = () => no(t.error);

    });

  },


  /* -------------------------------------------------------
     CONSULTAR TODOS OS REGISTROS
  ------------------------------------------------------- */

  all: st => DB._s(
    st,
    'readonly',
    s => s.getAll()
  ),


  /* -------------------------------------------------------
     INSERIR OU ATUALIZAR REGISTRO
  ------------------------------------------------------- */

  put: (st, o) => DB._s(
    st,
    'readwrite',
    s => s.put(o)
  ),


  /* -------------------------------------------------------
     EXCLUIR REGISTRO
  ------------------------------------------------------- */

  del: (st, k) => DB._s(
    st,
    'readwrite',
    s => s.delete(k)
  ),


  /* -------------------------------------------------------
     LIMPAR TABELA
  ------------------------------------------------------- */

  clear: st => DB._s(
    st,
    'readwrite',
    s => s.clear()
  ),


  /* -------------------------------------------------------
     INSERIR VÁRIOS REGISTROS
  ------------------------------------------------------- */

  putMany(st, list) {

    return new Promise((ok, no) => {

      const t = this._db.transaction(st, 'readwrite');
      const s = t.objectStore(st);

      list.forEach(o => s.put(o));

      t.oncomplete = ok;

      t.onerror = () => no(t.error);

    });

  }

};
