/* Painel do proprietário */
(function () {
  'use strict';
  const { $, $$, esc } = UI;
  const raiz = $('#painel');
  const u = TC.usuarioAtual();

  if (!u || u.role !== 'proprietario') {
    raiz.innerHTML = `
      <div class="gate">
        <i class="ph-fill ph-squares-four"></i>
        <h1 style="font-size:1.8rem">Painel do proprietário</h1>
        <p class="muted">${u ? 'Você entrou como estudante. O painel é para quem anuncia imóveis.' : 'Entre com sua conta de proprietário para ver e renovar seus anúncios.'}</p>
        <a class="btn btn-primary" href="${UI.linkEntrar('proprietario', 'painel.html')}">Entrar como proprietário</a>
      </div>`;
    return;
  }

  const PRIORIDADE = { atencao: 0, ativa: 1, expirada: 2 };
  let primeiraVez = true;

  raiz.innerHTML = `
    <section class="page-head h-row" style="padding-bottom:32px">
      <div class="fade-up">
        <h1>Meu painel</h1>
        <p class="lead">Olá, ${esc(u.nome.split(' ')[0])}. Acompanhe os 60 dias de cada anúncio e renove quando precisar.</p>
      </div>
      <a class="btn btn-primary fade-up" style="--d:100ms" href="anunciar.html"><i class="ph ph-plus"></i>Cadastrar nova vaga</a>
    </section>
    <div class="stats" id="stats"></div>
    <div class="h-row" style="margin-bottom:16px">
      <h2 style="font-size:1.6rem">Seus anúncios</h2>
      <span class="muted" style="font-size:.9rem;display:inline-flex;gap:8px;align-items:center"><i class="ph ph-info"></i>A renovação libera nos últimos ${TC.CONFIG.avisoDias} dias ou depois de expirar.</span>
    </div>
    <div class="own-list" id="lista"></div>`;

  function renderStats() {
    const minhas = TC.vagasDoProprietario(u.id);
    const ativas = minhas.filter((v) => TC.ciclo(v).status !== 'expirada');
    const totalVagas = ativas.reduce((s, v) => s + v.vagas, 0);
    $('#stats').innerHTML = `
      <div class="stat"><i class="ph ph-megaphone"></i><b data-n="${ativas.length}">${ativas.length}</b><small>${ativas.length === 1 ? 'anúncio ativo' : 'anúncios ativos'}</small></div>
      <div class="stat"><i class="ph ph-bed"></i><b data-n="${totalVagas}">${totalVagas}</b><small>vagas ofertadas nos anúncios ativos</small></div>
      <div class="stat"><i class="ph ph-calendar-blank"></i><b data-n="${TC.CONFIG.duracaoDias}">${TC.CONFIG.duracaoDias}</b><small>dias de duração de cada anúncio</small></div>`;
    if (primeiraVez) $$('#stats [data-n]').forEach((b) => UI.contar(b, Number(b.dataset.n)));
  }

  function linha(v, i) {
    const c = TC.ciclo(v);
    const t = TC.TIPOS[v.tipo];
    return `
      <article class="own" data-id="${esc(v.id)}" style="--i:${i}">
        <a class="media" href="vaga.html?id=${encodeURIComponent(v.id)}" tabindex="-1" aria-hidden="true"><img src="${esc(v.fotos[0] || '')}" alt="" loading="lazy"></a>
        <div>
          <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:6px">${UI.badge(c, true)}${v.renovacoes ? `<span class="muted" style="font-size:.8rem">Renovado ${v.renovacoes}x</span>` : ''}</div>
          <h3><a href="vaga.html?id=${encodeURIComponent(v.id)}" style="text-decoration:none">${esc(v.titulo)}</a></h3>
          <div class="own-meta">
            <span><i class="ph ${t.icon}"></i>${t.label}</span>
            <span><i class="ph ph-map-pin"></i>${esc(v.bairro)}</span>
            <span><i class="ph ph-currency-circle-dollar"></i>${TC.fmtMoeda(v.valor)} ${UI.textoModo(v)}</span>
            <span><i class="ph ph-bed"></i>${v.vagas} ${v.vagas === 1 ? 'vaga' : 'vagas'}</span>
          </div>
        </div>
        <div class="own-side">
          <div class="own-days">${UI.anel(c)}<div><b>${c.status === 'expirada' ? (c.encerrado ? 'Encerrada' : 'Expirada') : `${c.dias} ${c.dias === 1 ? 'dia' : 'dias'}`}</b><small>${c.status === 'expirada' ? `desde ${TC.fmtData(c.expiraEm)}` : `até ${TC.fmtData(c.expiraEm)}`}</small></div></div>
          <div class="own-actions">
            <button class="btn btn-sm ${c.podeRenovar ? 'btn-primary' : ''}" type="button" data-renovar="${esc(v.id)}" ${c.podeRenovar ? '' : `aria-disabled="true" title="Disponível nos últimos ${TC.CONFIG.avisoDias} dias"`}><i class="ph ph-arrow-clockwise"></i>Renovar +${TC.CONFIG.duracaoDias} dias</button>
            ${c.status !== 'expirada' ? `<button class="btn btn-sm btn-ghost" type="button" data-encerrar="${esc(v.id)}"><i class="ph ph-check-square-offset"></i>Vaga preenchida</button>` : ''}
          </div>
        </div>
      </article>`;
  }

  function renderLista() {
    const minhas = TC.vagasDoProprietario(u.id).sort((a, b) => {
      const ca = TC.ciclo(a), cb = TC.ciclo(b);
      return PRIORIDADE[ca.status] - PRIORIDADE[cb.status] || ca.expiraEm - cb.expiraEm;
    });
    const el = $('#lista');
    if (!minhas.length) {
      el.innerHTML = `
        <div class="empty">
          <i class="ph ph-house-line"></i>
          <h3>Você ainda não tem anúncios</h3>
          <p>Cadastre sua primeira vaga. Leva poucos minutos e é gratuito.</p>
          <a class="btn btn-primary" href="anunciar.html"><i class="ph ph-plus"></i>Cadastrar nova vaga</a>
        </div>`;
      return;
    }
    el.innerHTML = minhas.map(linha).join('');
    if (!primeiraVez) $$('.own', el).forEach((r) => { r.style.animation = 'none'; });
    $$('.media img', el).forEach(UI.estadoImagem);
    UI.observar(el);
  }

  function render() { renderStats(); renderLista(); primeiraVez = false; }

  // Renovar: o anel enche de novo a partir do valor antigo.
  $('#painel').addEventListener('click', (e) => {
    const r = e.target.closest('[data-renovar]');
    if (r) {
      if (r.getAttribute('aria-disabled') === 'true') { UI.toast(`A renovação fica disponível nos últimos ${TC.CONFIG.avisoDias} dias do anúncio.`, 'info'); return; }
      const id = r.dataset.renovar;
      const antes = TC.ciclo(TC.obterVaga(id)).progresso;
      const res = TC.renovarVaga(id);
      if (!res.ok) { UI.toast(res.erro, 'erro'); return; }
      render();
      const row = $(`.own[data-id="${CSS.escape(id)}"]`);
      if (row) {
        const ring = $('.ring', row);
        const depois = ring.style.getPropertyValue('--p');
        ring.classList.add('is-drawn', 'is-visible');
        ring.style.setProperty('--p', antes);
        void ring.offsetWidth;
        requestAnimationFrame(() => ring.style.setProperty('--p', depois));
        row.classList.add('is-renewed');
        row.scrollIntoView({ behavior: UI.reduzMovimento() ? 'auto' : 'smooth', block: 'center' });
      }
      UI.toast(`Renovado! Ativo até ${TC.fmtData(TC.ciclo(res.vaga).expiraEm)}.`);
      return;
    }
    const enc = e.target.closest('[data-encerrar]');
    if (enc) {
      const dlg = $('#dlg-encerrar');
      dlg.dataset.id = enc.dataset.encerrar;
      UI.abrirDialogo(dlg);
    }
  });
  $('#confirmar-encerrar').addEventListener('click', () => {
    const dlg = $('#dlg-encerrar');
    const res = TC.encerrarVaga(dlg.dataset.id);
    dlg.close();
    if (!res.ok) { UI.toast(res.erro, 'erro'); return; }
    render();
    UI.toast('Anúncio encerrado. Ele não aparece mais na busca.');
  });

  render();
})();
