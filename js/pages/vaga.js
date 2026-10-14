/* Detalhe da vaga */
(function () {
  'use strict';
  const { $, $$, esc } = UI;
  const raiz = $('#vaga');
  const id = UI.params.get('id');
  const vaga = id ? TC.obterVaga(id) : null;

  if (!vaga) {
    raiz.innerHTML = `
      <div class="empty" style="margin:40px 0 80px">
        <i class="ph ph-house-simple"></i>
        <h3>Anúncio não encontrado</h3>
        <p>Ele pode ter sido removido pelo anunciante. Veja as outras vagas disponíveis.</p>
        <a class="btn btn-primary" href="buscar.html">Buscar vagas</a>
      </div>`;
    return;
  }

  const u = TC.usuarioAtual();
  const c = TC.ciclo(vaga);
  const tipo = TC.TIPOS[vaga.tipo];
  const dono = TC.anunciante(vaga);
  const ehDono = u && u.id === vaga.ownerId;
  const mapa = TC.analisarMaps(vaga.mapsUrl);
  const voltaAqui = `vaga.html?id=${encodeURIComponent(vaga.id)}`;
  document.title = `${vaga.titulo} | TetoCerto`;

  const vindoDaBusca = document.referrer && /buscar\.html/.test(document.referrer);
  const porPessoa = TC.porPessoa(vaga);

  raiz.innerHTML = `
    <a class="crumb" href="buscar.html" id="voltar"><i class="ph ph-arrow-left"></i>${vindoDaBusca ? 'Voltar para a busca' : 'Ver todas as vagas'}</a>
    <div class="detail-head fade-up">
      <div class="detail-tags">
        <span class="chip"><i class="ph ${tipo.icon}"></i>${tipo.label}</span>
        <span class="chip"><i class="ph ph-map-pin"></i>${esc(vaga.bairro)}</span>
        ${UI.badge(c)}
      </div>
      <h1>${esc(vaga.titulo)}</h1>
    </div>

    ${vaga.demo ? `<div class="reminder" style="margin-bottom:20px"><i class="ph ph-flask"></i><span>Anúncio de demonstração do protótipo. Fotos ilustrativas e contato fictício.</span></div>` : ''}
    ${ehDono ? `<div class="reminder" style="margin-bottom:20px"><i class="ph-fill ph-user-circle"></i><span>Este é o seu anúncio. Renove ou encerre pelo <a class="link" href="painel.html">seu painel</a>.</span></div>` : ''}

    <div class="detail-layout">
      <div>
        <section class="gallery" aria-label="Fotos do imóvel">
          <div class="media gallery-main" tabindex="0" aria-roledescription="galeria" aria-label="Foto 1 de ${vaga.fotos.length}. Use as setas para trocar.">
            <img id="g-main" src="${esc(vaga.fotos[0])}" alt="Foto 1 do imóvel: ${esc(vaga.titulo)}" fetchpriority="high">
            ${vaga.fotos.length > 1 ? `
              <span class="gallery-count" id="g-count">1 / ${vaga.fotos.length}</span>
              <div class="gallery-nav">
                <button type="button" data-g="-1" aria-label="Foto anterior"><i class="ph ph-caret-left"></i></button>
                <button type="button" data-g="1" aria-label="Próxima foto"><i class="ph ph-caret-right"></i></button>
              </div>` : ''}
          </div>
          ${vaga.fotos.length > 1 ? `<div class="gallery-thumbs">${vaga.fotos.map((f, i) => `<button type="button" data-idx="${i}" aria-label="Ver foto ${i + 1}"${i === 0 ? ' aria-current="true"' : ''}><img src="${esc(f)}" alt="" loading="lazy"></button>`).join('')}</div>` : ''}
        </section>

        <section class="detail-block">
          <h2><i class="ph ph-text-align-left"></i>Sobre o imóvel</h2>
          <p class="desc">${esc(vaga.descricao)}</p>
          <div class="facts">
            <div class="fact"><small>Tipo</small><b>${tipo.label}</b></div>
            <div class="fact"><small>Vagas disponíveis</small><b>${vaga.vagas}</b></div>
            <div class="fact"><small>Valor por pessoa</small><b>${TC.fmtMoeda(Math.round(porPessoa))}</b></div>
            <div class="fact"><small>Bairro</small><b>${esc(vaga.bairro)}</b></div>
          </div>
        </section>

        <section class="detail-block" id="seguranca" data-reveal></section>

        <section class="detail-block" data-reveal>
          <h2><i class="ph ph-map-trifold"></i>Localização</h2>
          <div class="map-preview" style="aspect-ratio:16/8">
            <iframe src="${esc(TC.mapaEmbed(mapa, vaga.bairro))}" title="Mapa com a localização aproximada do imóvel" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>
          </div>
          ${mapa.coords ? `<ul class="dist">${TC.distancias(mapa.coords).map((d) => `<li><i class="ph ph-graduation-cap"></i>${esc(d.nome)}: ${d.km.toFixed(1).replace('.', ',')} km em linha reta</li>`).join('')}</ul>` : ''}
          <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin-top:16px">
            <a class="btn" href="${esc(mapa.url)}" target="_blank" rel="noopener noreferrer"><i class="ph ph-arrow-square-out"></i>Abrir no Google Maps</a>
            <span class="muted" style="font-size:.88rem">Link enviado pelo anunciante. Confira o trajeto até o campus antes da visita.</span>
          </div>
        </section>

        <section class="detail-block" id="comentarios" data-reveal></section>
      </div>

      <aside class="detail-aside">
        <div class="aside-card">
          <div class="aside-price">
            <strong>${TC.fmtMoeda(vaga.valor)}</strong> <span>${UI.textoModo(vaga)}</span>
            ${vaga.valorModo === 'imovel' && vaga.vagas > 1 ? `<p>Cerca de ${TC.fmtMoeda(Math.round(porPessoa))} por pessoa dividindo entre ${vaga.vagas}.</p>` : ''}
          </div>
          <div class="own-meta"><span><i class="ph ph-bed"></i>${vaga.vagas} ${vaga.vagas === 1 ? 'vaga disponível' : 'vagas disponíveis'}</span></div>
          ${c.status === 'expirada' ? `<div class="reminder" style="background:var(--off-soft)"><i class="ph ph-clock-countdown"></i><span>Este anúncio expirou. A vaga pode já ter sido preenchida.</span></div>` : ''}
          <a class="btn ${c.status === 'expirada' ? '' : 'btn-whats'} btn-block" href="${esc(TC.linkWhatsApp(vaga.whatsapp, vaga.titulo))}" target="_blank" rel="noopener noreferrer"><i class="ph-fill ph-whatsapp-logo"></i>Chamar no WhatsApp</a>
          <p class="muted" style="font-size:.86rem;text-align:center;margin-top:-6px">${esc(dono ? dono.nome : 'Anunciante')} · ${esc(vaga.whatsapp)}</p>
          <div class="reminder"><i class="ph-fill ph-handshake"></i><span>Visita, valores e contrato são combinados <strong>direto com o proprietário</strong>. O TetoCerto não recebe pagamentos. Desconfie de pedidos de depósito antes da visita.</span></div>
        </div>

        <div class="aside-card">
          <h3 style="font-family:var(--font-body);font-size:1rem;letter-spacing:0">Ciclo do anúncio</h3>
          <div class="cycle">
            ${UI.anel(c, true)}
            <dl>
              <dt>Publicado em</dt><dd>${TC.fmtData(vaga.publicadoEm)}</dd>
              ${vaga.renovacoes ? `<dt>Renovado em</dt><dd>${TC.fmtData(vaga.cicloInicio)}</dd>` : ''}
              <dt>${c.status === 'expirada' ? 'Expirou em' : 'Expira em'}</dt><dd>${TC.fmtData(c.expiraEm)}</dd>
            </dl>
          </div>
          <p class="muted" style="font-size:.85rem">${UI.textoDias(c)}. Todo anúncio expira sozinho em ${TC.CONFIG.duracaoDias} dias, e o proprietário pode renovar.</p>
        </div>

        <button class="report-btn" type="button" id="btn-denunciar"><i class="ph ph-flag"></i>Denunciar este anúncio</button>
      </aside>
    </div>`;

  /* ---------- Galeria ---------- */
  if (vaga.fotos.length > 1) {
    let atual = 0;
    const main = $('#g-main');
    const box = $('.gallery-main');
    const mostrar = (i) => {
      atual = (i + vaga.fotos.length) % vaga.fotos.length;
      $$('.gallery-thumbs button').forEach((b, j) => b.setAttribute('aria-current', j === atual ? 'true' : 'false'));
      $('#g-count').textContent = `${atual + 1} / ${vaga.fotos.length}`;
      box.setAttribute('aria-label', `Foto ${atual + 1} de ${vaga.fotos.length}. Use as setas para trocar.`);
      const trocar = () => { main.src = vaga.fotos[atual]; main.alt = `Foto ${atual + 1} do imóvel: ${vaga.titulo}`; };
      if (UI.reduzMovimento()) { trocar(); return; }
      main.classList.add('is-swapping');
      setTimeout(() => {
        trocar();
        const fim = () => main.classList.remove('is-swapping');
        if (main.complete) requestAnimationFrame(fim); else main.addEventListener('load', fim, { once: true });
        setTimeout(fim, 600);
      }, 180);
    };
    $$('[data-g]').forEach((b) => b.addEventListener('click', () => mostrar(atual + Number(b.dataset.g))));
    $$('.gallery-thumbs button').forEach((b) => b.addEventListener('click', () => mostrar(Number(b.dataset.idx))));
    box.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') { e.preventDefault(); mostrar(atual + 1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); mostrar(atual - 1); }
    });
  }

  /* ---------- Avaliação de segurança ---------- */
  function renderSeguranca() {
    const r = TC.resumoSeguranca(vaga.id);
    const lista = TC.avaliacoesDa(vaga.id);
    const chk = TC.podeAvaliar(vaga.id);
    let acao;
    if (chk.pode) acao = `<button class="btn btn-primary" type="button" id="btn-avaliar"><i class="ph ph-shield-check"></i>Já morei aqui, quero avaliar</button>`;
    else if (chk.motivo === 'entrar') acao = `<a class="btn" href="${UI.linkEntrar('estudante', voltaAqui)}"><i class="ph ph-sign-in"></i>Entre como estudante para avaliar</a>`;
    else acao = `<p class="muted" style="font-size:.9rem;display:flex;gap:8px;align-items:center"><i class="ph ph-info"></i>${esc(chk.motivo)}</p>`;

    $('#seguranca').innerHTML = `
      <h2><i class="ph ph-shield-check"></i>Avaliação de segurança</h2>
      <div class="safety">
        <div class="safety-head">
          <i class="ph-fill ph-seal-check" aria-hidden="true"></i>
          <div><b>Preenchida só por quem já morou neste imóvel</b><p>O proprietário ou anunciante não pode avaliar o próprio imóvel. Cada estudante avalia uma vez.</p></div>
        </div>
        <div class="safety-body">
          ${r.total ? `
            <div class="score-row">
              <div class="score-big"><b>${r.geral.toFixed(1).replace('.', ',')}</b><small>de 5 · ${r.total} ${r.total === 1 ? 'avaliação' : 'avaliações'}</small></div>
              <div class="criteria">
                ${TC.CRITERIOS.map((k) => `<div class="crit"><span>${k.label}</span>${UI.estrelas(r.medias[k.id])}</div>`).join('')}
              </div>
            </div>
            <div style="display:grid;gap:10px">
              ${lista.map((a) => `
                <article class="review">
                  <div class="review-top">
                    <div class="review-who"><span class="avatar">${esc(UI.iniciais(a.autorNome))}</span><div><b>${esc(a.autorNome)}</b><small>${esc(a.curso || 'Estudante')} · morou de ${TC.fmtMes(a.periodo.inicio)} a ${TC.fmtMes(a.periodo.fim)}</small></div></div>
                    <span class="verified"><i class="ph-fill ph-seal-check"></i>Ex-morador</span>
                  </div>
                  <div style="display:flex;align-items:center;gap:8px">${UI.estrelas(TC.mediaAvaliacao(a))}<small class="muted">${TC.mediaAvaliacao(a).toFixed(1).replace('.', ',')}</small></div>
                  ${a.texto ? `<p>${esc(a.texto)}</p>` : ''}
                </article>`).join('')}
            </div>` : `
            <p class="muted">Ainda não há avaliações. Se você já morou aqui, sua avaliação ajuda quem está chegando na cidade.</p>`}
          <div>${acao}</div>
        </div>
      </div>`;
    const b = $('#btn-avaliar');
    if (b) b.addEventListener('click', abrirAvaliacao);
    UI.observar($('#seguranca'));
  }

  const formAv = $('#form-avaliar');
  $('#av-criterios').innerHTML = TC.CRITERIOS.map((k) => `
    <div class="field">
      <span class="label" id="lbl-${k.id}">${k.label} <span class="req">*</span></span>
      <div class="star-input" role="radiogroup" aria-labelledby="lbl-${k.id}">
        ${[5, 4, 3, 2, 1].map((n) => `<input type="radio" id="${k.id}-${n}" name="nota_${k.id}" value="${n}"><label for="${k.id}-${n}" aria-label="${n} de 5"><i class="ph-fill ph-star"></i></label>`).join('')}
      </div>
      <span class="field-error" data-erro="nota_${k.id}"></span>
    </div>`).join('');
  formAv.fim.max = formAv.inicio.max = new Date().toISOString().slice(0, 7);
  UI.limparAoDigitar(formAv);
  function abrirAvaliacao() { formAv.reset(); UI.limparErros(formAv); UI.abrirDialogo($('#dlg-avaliar')); }
  formAv.addEventListener('submit', (e) => {
    e.preventDefault();
    const notas = {};
    TC.CRITERIOS.forEach((k) => { const r = formAv.querySelector(`input[name="nota_${k.id}"]:checked`); notas[k.id] = r ? Number(r.value) : 0; });
    const res = TC.avaliar(vaga.id, { inicio: formAv.inicio.value, fim: formAv.fim.value, notas, texto: formAv.texto.value, declaracao: formAv.declaracao.checked });
    if (!res.ok) { UI.mostrarErros(formAv, res.erros); return; }
    $('#dlg-avaliar').close();
    renderSeguranca();
    UI.toast('Avaliação publicada. Obrigado por ajudar outros estudantes!');
  });

  /* ---------- Comentários ---------- */
  function renderComentarios(novoId) {
    const lista = TC.comentariosDa(vaga.id);
    const atual = TC.usuarioAtual();
    $('#comentarios').innerHTML = `
      <h2><i class="ph ph-chats-circle"></i>Comentários <span class="muted" style="font-family:var(--font-body);font-size:1rem;font-weight:500">(${lista.length})</span></h2>
      <p class="muted" style="margin:-4px 0 18px;font-size:.92rem">Espaço de perguntas e respostas entre estudantes: transporte, vizinhança, rotina da casa.</p>
      <div class="comments" id="lista-coment">
        ${lista.length ? lista.map((cm) => `
          <div class="comment${cm.id === novoId ? ' is-new' : ''}">
            <span class="avatar">${esc(UI.iniciais(cm.autorNome))}</span>
            <div class="bubble">
              <div class="meta"><b>${esc(cm.autorNome)}</b>${cm.autorId === vaga.ownerId ? '<span class="tag-owner">Anunciante</span>' : (cm.curso ? `<span>${esc(cm.curso)}</span>` : '')}<span>${TC.fmtRelativo(cm.criadoEm)}</span></div>
              <p>${esc(cm.texto)}</p>
            </div>
          </div>`).join('') : '<p class="muted">Nenhum comentário ainda. Faça a primeira pergunta.</p>'}
      </div>
      ${atual ? `
        <form class="comment-form" id="form-coment" novalidate>
          <label for="coment-texto" class="sr-only">Novo comentário</label>
          <textarea class="input" id="coment-texto" name="texto" maxlength="600" style="min-height:96px" placeholder="Pergunte sobre transporte, vizinhança, contas da casa..."></textarea>
          <span class="field-error" data-erro="texto"></span>
          <div class="row"><small class="muted" id="coment-cont">0 / 600</small><button class="btn btn-primary btn-sm" type="submit"><i class="ph ph-paper-plane-tilt"></i>Publicar comentário</button></div>
        </form>` : `
        <div class="reminder" style="margin-top:16px"><i class="ph ph-chat-circle-dots"></i><span>Para comentar, <a class="link" href="${UI.linkEntrar('estudante', voltaAqui + '#comentarios')}">entre na sua conta</a>. Ler os comentários é livre.</span></div>`}`;
    const f = $('#form-coment');
    if (!f) return;
    const cont = $('#coment-cont');
    f.texto.addEventListener('input', () => { cont.textContent = `${f.texto.value.length} / 600`; f.texto.removeAttribute('aria-invalid'); $('[data-erro="texto"]', f).textContent = ''; });
    f.addEventListener('submit', (e) => {
      e.preventDefault();
      const res = TC.comentar(vaga.id, f.texto.value);
      if (!res.ok) { UI.mostrarErros(f, { texto: res.erro }); return; }
      renderComentarios(res.comentario.id);
      UI.toast('Comentário publicado.');
    });
  }

  /* ---------- Denúncia ---------- */
  const formDen = $('#form-denunciar');
  $('#den-motivos').innerHTML = TC.MOTIVOS_DENUNCIA.map((m, i) => `<label><input type="radio" name="motivo" value="${esc(m)}"${i === 0 ? '' : ''}><span>${esc(m)}</span></label>`).join('');
  $('#btn-denunciar').addEventListener('click', () => { formDen.reset(); UI.limparErros(formDen); UI.abrirDialogo($('#dlg-denunciar')); });
  formDen.addEventListener('change', () => { $('[data-erro="motivo"]', formDen).textContent = ''; });
  formDen.addEventListener('submit', (e) => {
    e.preventDefault();
    const m = formDen.querySelector('input[name="motivo"]:checked');
    if (!m) { UI.mostrarErros(formDen, { motivo: 'Escolha um motivo.' }); return; }
    const res = TC.denunciar(vaga.id, { motivo: m.value, detalhe: formDen.detalhe.value });
    if (!res.ok) { UI.toast(res.erro, 'erro'); return; }
    $('#dlg-denunciar').close();
    UI.toast('Denúncia enviada para a moderação. Obrigado.');
  });

  if (vindoDaBusca) $('#voltar').addEventListener('click', (e) => { e.preventDefault(); history.back(); });

  renderSeguranca();
  renderComentarios();
  if (location.hash === '#comentarios') setTimeout(() => $('#comentarios').scrollIntoView(), 50);
})();
