/* ==========================================================================
   TetoCerto · interface compartilhada
   Cabeçalho, rodapé, cartões de vaga, toasts, diálogos, revelação ao rolar.
   ========================================================================== */
(function () {
  'use strict';

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const reduzMovimento = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const params = new URLSearchParams(location.search);

  /* ---------- Fotos de Diamantina (Wikimedia Commons, uso livre com crédito) ----------
     Para a versão final, troque por fotos da própria equipe ou cedidas pela
     Secretaria de Turismo / UFVJM e atualize os créditos aqui. */
  const WM = 'https://upload.wikimedia.org/wikipedia/commons/thumb/';
  const FOTOS = {
    ruaBomFim: { path: '8/85', arquivo: 'Rua_Bom_Fim%2C_Diamantina%2C_Minas_Gerais%2C_MG.jpg', titulo: 'Rua Bom Fim', autor: 'Giorgioglobe', licenca: 'CC BY-SA 4.0' },
    chica: { path: '7/7d', arquivo: 'Casa_de_Chica_da_Silva%2C_Diamantina%2C_Minas_Gerais.jpg', titulo: 'Casa de Chica da Silva', autor: 'Giorgioglobe', licenca: 'CC BY-SA 4.0' },
    amparo: { path: '9/9f', arquivo: 'Rua_do_Amparo%2C_Diamantina%2C_Minas_Gerais.jpg', titulo: 'Rua do Amparo', autor: 'Giorgioglobe', licenca: 'CC BY-SA 4.0' },
    janelas: { path: 'd/d6', arquivo: 'Windows_and_Doors_in_Diamantina_%2819877472194%29.jpg', titulo: 'Janelas e portas do Centro', autor: 'Under the same moon...', licenca: 'CC BY 2.0' },
    cruzeiro: { path: '3/37', arquivo: 'Diamantina_vista_do_Cruzeiro.jpg', titulo: 'Diamantina vista do Cruzeiro', autor: 'Leandro Neumann Ciuffo', licenca: 'CC BY 2.0' },
    contrato: { path: 'e/ed', arquivo: 'Rua_Contrato%2C_Diamantina%2C_Minas_Gerais.jpg', titulo: 'Rua Contrato', autor: 'Giorgioglobe', licenca: 'CC BY-SA 4.0' },
    catedral: { path: 'e/e5', arquivo: 'Catedral_Metropolitana_%28Diamantina%2C_Minas_Gerais%29.jpg', titulo: 'Catedral Metropolitana', autor: 'Rodrigo Tetsuo Argenton', licenca: 'CC BY-SA 4.0' },
    fachada: { path: 'd/df', arquivo: 'Red_on_Green_in_Diamantina_%2820500246685%29.jpg', titulo: 'Fachada colonial', autor: 'Under the same moon...', licenca: 'CC BY 2.0' },
    bomFimRua: { path: 'd/dc', arquivo: 'Rua_Bom_Fim%2C_Diamantina%2C_State_of_Minas_Gerais.jpg', titulo: 'Rua Bom Fim (outra vista)', autor: 'Giorgioglobe', licenca: 'CC BY-SA 4.0' },
    sempreVivas: { path: '9/98', arquivo: 'Vista_dos_Campos_Rupestres_no_Parque_Nacional_das_Sempre-Vivas%2C_em_Diamantina%2C_Minas_Gerais.jpg', titulo: 'Parque Nacional das Sempre-Vivas', autor: 'VitorAraujoSilva', licenca: 'CC BY-SA 4.0' },
  };
  const fotoUrl = (k, w = 1280) => { const f = FOTOS[k]; return f ? `${WM}${f.path}/${f.arquivo}/${w}px-${f.arquivo}` : ''; };
  const fotoPagina = (k) => 'https://commons.wikimedia.org/wiki/File:' + FOTOS[k].arquivo;
  function aplicarFotos(root = document) {
    $$('img[data-foto]', root).forEach((img) => {
      const k = img.dataset.foto;
      if (!FOTOS[k]) return;
      img.src = fotoUrl(k, Number(img.dataset.w) || 1280);
      if (!img.alt) img.alt = FOTOS[k].titulo + ', Diamantina';
    });
    $$('[data-credito]', root).forEach((el) => {
      const f = FOTOS[el.dataset.credito];
      if (f) el.innerHTML = `Foto: ${esc(f.titulo)} · <a href="${fotoPagina(el.dataset.credito)}" target="_blank" rel="noopener">${esc(f.autor)}, ${esc(f.licenca)}</a>`;
    });
  }

  /* ---------- Tema ---------- */
  function temaEscuro() {
    const t = document.documentElement.dataset.theme;
    if (t) return t === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  function alternarTema() {
    const novo = temaEscuro() ? 'light' : 'dark';
    document.documentElement.dataset.theme = novo;
    try { localStorage.setItem('tetocerto:tema', novo); } catch (e) {}
    const btn = $('#tema-btn');
    if (btn) {
      btn.innerHTML = `<i class="ph ${novo === 'dark' ? 'ph-sun' : 'ph-moon'}" aria-hidden="true"></i>`;
      btn.setAttribute('aria-label', novo === 'dark' ? 'Usar tema claro' : 'Usar tema escuro');
    }
  }

  /* ---------- Cabeçalho ---------- */
  const iniciais = (nome) => String(nome || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('');

  function montarHeader() {
    const el = $('#site-header');
    if (!el) return;
    const pagina = document.body.dataset.page;
    const u = TC.usuarioAtual();
    const links = [['inicio', 'index.html', 'Início'], ['buscar', 'buscar.html', 'Buscar vagas'], ['anunciar', 'anunciar.html', 'Anunciar imóvel']];
    if (u && u.role === 'proprietario') links.push(['painel', 'painel.html', 'Meu painel']);
    const escuro = temaEscuro();

    let conta;
    if (u) {
      const itens = u.role === 'proprietario'
        ? `<a href="painel.html"><i class="ph ph-squares-four"></i> Meu painel</a><a href="anunciar.html"><i class="ph ph-plus-circle"></i> Cadastrar nova vaga</a>`
        : `<a href="buscar.html"><i class="ph ph-magnifying-glass"></i> Buscar vagas</a>`;
      conta = `
        <div class="user-menu">
          <button class="user-btn" id="user-btn" aria-haspopup="true" aria-expanded="false" aria-controls="user-pop">
            <span class="avatar">${esc(iniciais(u.nome))}</span><span class="user-name">${esc(u.nome.split(' ')[0])}</span>
          </button>
          <div class="popover" id="user-pop" role="menu">
            <div class="popover-head"><b>${esc(u.nome)}</b><small>${u.role === 'proprietario' ? 'Proprietário' : 'Estudante'} · ${esc(u.email)}</small></div>
            ${itens}
            <button class="item" id="sair-btn" type="button"><i class="ph ph-sign-out"></i> Sair</button>
          </div>
        </div>`;
    } else {
      conta = `<a class="btn btn-sm btn-entrar" href="entrar.html"><i class="ph ph-user-circle"></i><span>Entrar</span></a>`;
    }

    el.innerHTML = `
      <a class="skip" href="#conteudo">Pular para o conteúdo</a>
      <div class="container nav-inner">
        <a class="brand" href="index.html" aria-label="TetoCerto, página inicial"><span class="brand-mark"><i class="ph-fill ph-house-simple"></i></span>TetoCerto</a>
        <nav class="nav-links" id="nav-links" aria-label="Principal">
          ${links.map(([id, href, txt]) => `<a href="${href}"${id === pagina ? ' aria-current="page"' : ''}>${txt}</a>`).join('')}
        </nav>
        <div class="nav-actions">
          <button class="icon-btn" id="tema-btn" type="button" aria-label="${escuro ? 'Usar tema claro' : 'Usar tema escuro'}"><i class="ph ${escuro ? 'ph-sun' : 'ph-moon'}" aria-hidden="true"></i></button>
          ${conta}
          <button class="icon-btn nav-burger" id="burger" type="button" aria-label="Abrir menu" aria-expanded="false" aria-controls="nav-links"><i class="ph ph-list" aria-hidden="true"></i></button>
        </div>
      </div>`;

    $('#tema-btn').addEventListener('click', alternarTema);

    const burger = $('#burger');
    burger.addEventListener('click', () => {
      const aberto = el.classList.toggle('menu-open');
      burger.setAttribute('aria-expanded', aberto);
      burger.setAttribute('aria-label', aberto ? 'Fechar menu' : 'Abrir menu');
      burger.innerHTML = `<i class="ph ${aberto ? 'ph-x' : 'ph-list'}" aria-hidden="true"></i>`;
    });

    const ub = $('#user-btn');
    if (ub) {
      const pop = $('#user-pop');
      const fechar = () => { pop.classList.remove('is-open'); ub.setAttribute('aria-expanded', 'false'); };
      ub.addEventListener('click', (e) => {
        e.stopPropagation();
        const aberto = pop.classList.toggle('is-open');
        ub.setAttribute('aria-expanded', aberto);
      });
      document.addEventListener('click', (e) => { if (!pop.contains(e.target)) fechar(); });
      document.addEventListener('keydown', (e) => { if (e.key === 'Escape') fechar(); });
      $('#sair-btn').addEventListener('click', () => {
        TC.sair();
        toast('Você saiu da sua conta.', 'info');
        setTimeout(() => { location.href = 'index.html'; }, 500);
      });
    }

    // Sombra no cabeçalho depois que a página rola (sem listener de scroll).
    const sentinela = document.createElement('div');
    sentinela.style.cssText = 'position:absolute;top:0;left:0;height:1px;width:1px;pointer-events:none';
    document.body.prepend(sentinela);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([e]) => el.classList.toggle('is-scrolled', !e.isIntersecting)).observe(sentinela);
    }
  }

  /* ---------- Rodapé ---------- */
  function montarFooter() {
    const el = $('#site-footer');
    if (!el) return;
    el.innerHTML = `
      <div class="container">
        <div class="foot-grid">
          <div>
            <a class="brand" href="index.html"><span class="brand-mark"><i class="ph-fill ph-house-simple"></i></span>TetoCerto</a>
            <p class="muted" style="margin-top:14px;max-width:36ch">Conecta estudantes da UFVJM a proprietários de casas e repúblicas em Diamantina. Gratuito, feito por estudantes.</p>
          </div>
          <div><h4>Navegar</h4><ul><li><a href="buscar.html">Buscar vagas</a></li><li><a href="anunciar.html">Anunciar imóvel</a></li><li><a href="entrar.html">Entrar ou criar conta</a></li></ul></div>
          <div><h4>Tipos de imóvel</h4><ul><li><a href="buscar.html?tipo=casa">Casas</a></li><li><a href="buscar.html?tipo=republica">Repúblicas</a></li><li><a href="buscar.html?tipo=quarto">Quartos e kitnets</a></li></ul></div>
          <div><h4>Sobre</h4><ul><li><a href="termos.html">Termo de uso</a></li><li><a href="termos.html#creditos">Créditos das fotos</a></li><li><a href="index.html#equipe">Fale com a equipe</a></li></ul></div>
        </div>
        <div class="foot-legal">
          <span>© ${new Date().getFullYear()} TetoCerto. Projeto estudantil sem vínculo formal com a UFVJM. Não intermediamos pagamentos nem contratos.</span>
          <button type="button" id="reset-demo">Restaurar dados de demonstração</button>
        </div>
      </div>`;
    $('#reset-demo').addEventListener('click', () => {
      if (!confirm('Apagar os dados salvos neste navegador e voltar aos anúncios de demonstração?')) return;
      TC.restaurarDemo();
      location.href = 'index.html';
    });
  }

  /* ---------- Ciclo de 60 dias: anel, selo e texto ---------- */
  const STATUS_LABEL = { ativa: 'Ativa', atencao: 'Expira em breve', expirada: 'Expirada' };
  function badge(c, painel) {
    const txt = painel && c.status === 'atencao' ? 'Atenção: expira em breve' : (c.encerrado && c.status === 'expirada' ? 'Encerrada' : STATUS_LABEL[c.status]);
    return `<span class="badge badge--${c.status}">${txt}</span>`;
  }
  function anel(c, grande) {
    return `<span class="ring ring--${c.status}${grande ? ' ring--lg' : ''}" style="--p:${c.progresso.toFixed(3)}" role="img" aria-label="${c.dias} ${c.dias === 1 ? 'dia restante' : 'dias restantes'} de ${TC.CONFIG.duracaoDias}">
      <svg viewBox="0 0 36 36" aria-hidden="true"><circle class="ring-track" cx="18" cy="18" r="15.5"/><circle class="ring-fill" cx="18" cy="18" r="15.5" pathLength="100"/></svg>
      <span class="ring-num" aria-hidden="true">${c.dias}</span></span>`;
  }
  function textoDias(c) {
    if (c.status === 'expirada') return c.encerrado ? `Encerrada em ${TC.fmtData(c.expiraEm)}` : `Expirou em ${TC.fmtData(c.expiraEm)}`;
    return `${c.dias} ${c.dias === 1 ? 'dia' : 'dias'} para expirar`;
  }
  const textoModo = (v) => (v.valorModo === 'pessoa' ? 'por pessoa/mês' : 'imóvel todo/mês');

  function cardVaga(v, i = 0) {
    const c = TC.ciclo(v);
    const t = TC.TIPOS[v.tipo];
    return `
      <article class="vcard${c.status === 'expirada' ? ' is-expired' : ''}" style="--i:${i}">
        <a class="vcard-link" href="vaga.html?id=${encodeURIComponent(v.id)}">
          <div class="media vcard-media"><img src="${esc(v.fotos[0] || '')}" alt="Foto do imóvel: ${esc(v.titulo)}" loading="lazy" decoding="async"></div>
          <div class="vcard-body">
            <div class="vcard-meta"><span><i class="ph ${t.icon}" aria-hidden="true"></i>${t.label}</span><span><i class="ph ph-map-pin" aria-hidden="true"></i>${esc(v.bairro)}</span></div>
            <h3>${esc(v.titulo)}</h3>
            <div class="vcard-price"><strong>${TC.fmtMoeda(v.valor)}</strong><span>${textoModo(v)}</span></div>
            <div class="vcard-foot">
              <span class="vagas"><i class="ph ph-bed" aria-hidden="true"></i>${v.vagas} ${v.vagas === 1 ? 'vaga' : 'vagas'}</span>
              <span class="vcard-cycle">${badge(c)}${anel(c)}</span>
            </div>
          </div>
        </a>
      </article>`;
  }

  /* ---------- Revelação ao rolar (uma vez só) ---------- */
  let io = null;
  function observar(root = document) {
    $$('[data-stagger]', root).forEach((g) => { $$(':scope > [data-reveal]', g).forEach((el, i) => el.style.setProperty('--i', i)); });
    const alvos = $$('[data-reveal], .ring, [data-observe]', root).filter((el) => !el.classList.contains('is-visible'));
    if (!('IntersectionObserver' in window)) { alvos.forEach(marcar); return; }
    if (!io) {
      io = new IntersectionObserver((entradas) => {
        entradas.forEach((e) => { if (e.isIntersecting) { marcar(e.target); io.unobserve(e.target); } });
      }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    }
    alvos.forEach((el) => io.observe(el));
  }
  function marcar(el) { el.classList.add('is-visible'); if (el.classList.contains('ring')) el.classList.add('is-drawn'); }

  /* ---------- Título com palavras subindo ---------- */
  function dividirPalavras(el) {
    if (!el || reduzMovimento()) return;
    el.setAttribute('aria-label', el.textContent.trim().replace(/\s+/g, ' '));
    let i = 0;
    const walk = (node) => {
      Array.from(node.childNodes).forEach((n) => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach((parte) => {
            if (!parte) return;
            if (/^\s+$/.test(parte)) { frag.appendChild(document.createTextNode(' ')); return; }
            const w = document.createElement('span');
            w.className = 'w';
            w.setAttribute('aria-hidden', 'true');
            const inner = document.createElement('span');
            inner.style.setProperty('--i', i++);
            inner.textContent = parte;
            w.appendChild(inner);
            frag.appendChild(w);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1) {
          n.setAttribute('aria-hidden', 'true');
          walk(n);
        }
      });
    };
    walk(el);
    el.classList.add('split-words');
  }

  /* ---------- Números contando ---------- */
  function contar(el, alvo, dur = 900) {
    if (reduzMovimento() || alvo === 0) { el.textContent = alvo; return; }
    const t0 = performance.now();
    const passo = (t) => {
      const p = Math.min(1, (t - t0) / dur);
      const ease = 1 - Math.pow(1 - p, 4);
      el.textContent = Math.round(alvo * ease);
      if (p < 1) requestAnimationFrame(passo);
    };
    requestAnimationFrame(passo);
  }

  /* ---------- Toast ---------- */
  function toast(msg, tipo = 'ok') {
    let box = $('.toasts');
    if (!box) { box = document.createElement('div'); box.className = 'toasts'; box.setAttribute('role', 'status'); box.setAttribute('aria-live', 'polite'); document.body.appendChild(box); }
    const icon = { ok: 'ph-check-circle', erro: 'ph-warning-circle', info: 'ph-info' }[tipo] || 'ph-info';
    const t = document.createElement('div');
    t.className = `toast toast--${tipo}`;
    t.innerHTML = `<i class="ph-fill ${icon}" aria-hidden="true"></i><span>${esc(msg)}</span>`;
    box.appendChild(t);
    setTimeout(() => {
      t.classList.add('is-leaving');
      t.addEventListener('transitionend', () => t.remove(), { once: true });
      setTimeout(() => t.remove(), 700);
    }, 3800);
  }

  /* ---------- Diálogos ---------- */
  function prepararDialogo(dlg) {
    if (!dlg || dlg.dataset.pronto) return dlg;
    dlg.dataset.pronto = '1';
    dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
    $$('[data-fechar]', dlg).forEach((b) => b.addEventListener('click', () => dlg.close()));
    return dlg;
  }
  function abrirDialogo(dlg) { prepararDialogo(dlg).showModal(); }

  /* ---------- Formulários ---------- */
  function limparErros(form) {
    $$('[data-erro]', form).forEach((el) => { el.textContent = ''; });
    $$('[aria-invalid]', form).forEach((el) => el.removeAttribute('aria-invalid'));
  }
  function mostrarErros(form, erros) {
    limparErros(form);
    let primeiro = null;
    Object.entries(erros).forEach(([campo, msg]) => {
      const slot = $(`[data-erro="${campo}"]`, form);
      if (slot) slot.textContent = msg;
      const input = form.querySelector(`[name="${campo}"]:not([type="radio"]):not([type="checkbox"]):not([type="hidden"])`);
      if (input) input.setAttribute('aria-invalid', 'true');
      const caixa = (slot || input) && (slot || input).closest('.field, .terms-accept, .drop-wrap');
      if (caixa && !reduzMovimento()) { caixa.classList.remove('shake'); void caixa.offsetWidth; caixa.classList.add('shake'); }
      if (!primeiro) primeiro = input || form.querySelector(`[name="${campo}"]`) || slot;
    });
    if (primeiro) {
      primeiro.scrollIntoView({ behavior: reduzMovimento() ? 'auto' : 'smooth', block: 'center' });
      if (primeiro.focus) setTimeout(() => primeiro.focus({ preventScroll: true }), 250);
    }
    if (erros.geral) toast(erros.geral, 'erro');
  }
  function limparAoDigitar(form) {
    form.addEventListener('input', (e) => {
      const nome = e.target.name;
      if (!nome) return;
      e.target.removeAttribute('aria-invalid');
      const slot = $(`[data-erro="${nome}"]`, form);
      if (slot) slot.textContent = '';
    });
  }

  /* ---------- Estrelas ---------- */
  function estrelas(n) {
    const cheio = Math.round(n);
    return `<span class="stars" aria-label="${n.toFixed(1).replace('.', ',')} de 5">${[1, 2, 3, 4, 5].map((i) => `<i class="ph-fill ph-star${i > cheio ? ' off' : ''}" aria-hidden="true"></i>`).join('')}</span>`;
  }

  /* ---------- Imagens: carregada / falhou ---------- */
  function estadoImagem(img) {
    const m = img.closest('.media');
    if (!m) return;
    if (img.complete && img.naturalWidth > 0) m.classList.add('carregada');
    else if (img.complete && img.getAttribute('src')) falhou(img);
  }
  function falhou(img) {
    const m = img.closest('.media');
    if (!m || m.classList.contains('sem-foto')) return;
    m.classList.add('sem-foto');
    img.style.visibility = 'hidden';
    m.insertAdjacentHTML('beforeend', '<i class="ph ph-image fallback-ic" aria-hidden="true"></i>');
  }
  document.addEventListener('load', (e) => { if (e.target.tagName === 'IMG') { const m = e.target.closest('.media'); if (m) { m.classList.add('carregada'); m.classList.remove('sem-foto'); } } }, true);
  document.addEventListener('error', (e) => { if (e.target.tagName === 'IMG') falhou(e.target); }, true);

  /* ---------- Foto do cartão "voa" até a galeria (View Transitions entre páginas) ---------- */
  document.addEventListener('click', (e) => {
    const a = e.target.closest('.vcard-link');
    if (!a || e.metaKey || e.ctrlKey || e.shiftKey) return;
    $$('[style*="view-transition-name"]').forEach((el) => { el.style.viewTransitionName = ''; });
    const img = a.querySelector('img');
    if (img) img.style.viewTransitionName = 'foto-vaga';
  });
  window.addEventListener('pageshow', () => { $$('.vcard-link img').forEach((img) => { img.style.viewTransitionName = ''; }); });

  /* ---------- Link para entrar e voltar depois ---------- */
  const linkEntrar = (perfil, volta) => `entrar.html?perfil=${perfil}&volta=${encodeURIComponent(volta || (location.pathname.split('/').pop() + location.search))}`;

  function iniciar() {
    montarHeader();
    montarFooter();
    aplicarFotos();
    $$('.media img').forEach(estadoImagem);
    observar();
  }

  window.UI = {
    $, $$, esc, params, reduzMovimento, FOTOS, fotoUrl, fotoPagina, aplicarFotos,
    cardVaga, badge, anel, textoDias, textoModo, estrelas, iniciais,
    observar, dividirPalavras, contar, toast, abrirDialogo, prepararDialogo,
    mostrarErros, limparErros, limparAoDigitar, linkEntrar, estadoImagem, montarHeader,
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else iniciar();
})();
