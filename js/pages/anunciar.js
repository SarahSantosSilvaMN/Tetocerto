/* Cadastro de vaga (proprietário) */
(function () {
  'use strict';
  const { $, $$, esc } = UI;
  const raiz = $('#anunciar-raiz');
  const u = TC.usuarioAtual();

  // Só proprietário com conta anuncia.
  if (!u || u.role !== 'proprietario') {
    raiz.innerHTML = `
      <div class="gate">
        <i class="ph-fill ph-key"></i>
        <h2 style="font-size:1.8rem">${u ? 'Esta é uma conta de estudante' : 'Entre como proprietário para anunciar'}</h2>
        <p class="muted">${u
          ? 'Para cadastrar vagas, use uma conta de proprietário. Estudantes podem buscar, comentar e avaliar.'
          : 'A conta é gratuita e serve para você publicar, acompanhar e renovar seus anúncios.'}</p>
        <div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center">
          ${u ? '<button class="btn" type="button" id="sair-trocar">Sair desta conta</button>' : ''}
          <a class="btn btn-primary" href="${UI.linkEntrar('proprietario', 'anunciar.html')}&modo=cadastro">Criar conta de proprietário</a>
          <a class="btn" href="${UI.linkEntrar('proprietario', 'anunciar.html')}">Já tenho conta</a>
        </div>
      </div>`;
    const s = $('#sair-trocar');
    if (s) s.addEventListener('click', () => { TC.sair(); location.reload(); });
    return;
  }

  const form = $('#form-vaga');
  const fotos = []; // dataURLs comprimidas
  let vagas = 1;

  /* ---------- montar opções ---------- */
  $('#tipos').innerHTML = Object.entries(TC.TIPOS).map(([k, t]) => `
    <label class="type-opt"><input type="radio" name="tipo" value="${k}"><span><i class="ph ${t.icon}"></i><b>${t.label}</b><small>${t.desc}</small></span></label>`).join('');
  $('#v-bairro').insertAdjacentHTML('beforeend', TC.BAIRROS.map((b) => `<option value="${b}">${b}</option>`).join(''));
  $('#termo').innerHTML = TC.TERMO.map((p) => `<p>${p}</p>`).join('') + '<p><a class="link" href="termos.html" target="_blank" rel="noopener">Ler o termo completo em outra aba</a></p>';
  if (u.telefone) form.whatsapp.value = u.telefone;

  /* ---------- título: contador ---------- */
  form.titulo.addEventListener('input', () => { $('#titulo-cont').textContent = `${form.titulo.value.length} / 90`; });
  form.whatsapp.addEventListener('input', () => { form.whatsapp.value = TC.mascaraTelefone(form.whatsapp.value); });

  /* ---------- valor por pessoa / imóvel ---------- */
  const modoPill = $('#modo .seg-pill');
  function moverModo() {
    const lbl = $('#modo input:checked').closest('label');
    modoPill.style.width = lbl.offsetWidth + 'px';
    modoPill.style.transform = `translateX(${lbl.offsetLeft - 4}px)`;
  }
  $$('#modo input').forEach((i) => i.addEventListener('change', moverModo));

  /* ---------- vagas ---------- */
  const out = $('#vagas-out');
  $$('[data-step]').forEach((b) => b.addEventListener('click', () => {
    const novo = Math.min(20, Math.max(1, vagas + Number(b.dataset.step)));
    if (novo === vagas) return;
    vagas = novo;
    form.vagas.value = vagas;
    out.textContent = vagas;
    out.classList.remove('bump'); void out.offsetWidth; out.classList.add('bump');
    atualizar();
  }));
  function textoPorPessoa() {
    const valor = Number(form.valor.value);
    const modo = form.valorModo.value;
    const el = $('#por-pessoa');
    if (!valor || modo !== 'imovel' || vagas < 2) { el.textContent = ''; return; }
    el.textContent = `Os estudantes vão ver cerca de ${TC.fmtMoeda(Math.round(valor / vagas))} por pessoa.`;
  }

  /* ---------- Google Maps ---------- */
  const mStatus = $('#maps-status');
  const mPrev = $('#maps-preview');
  let mapaUrlAtual = '';
  let esperaMapa;
  function checarMapa() {
    const v = form.mapsUrl.value.trim();
    if (!v) { mStatus.className = 'status-line'; mStatus.textContent = ''; mPrev.hidden = true; mapaUrlAtual = ''; return; }
    const info = TC.analisarMaps(v);
    if (!info.valido) {
      mStatus.className = 'status-line bad';
      mStatus.innerHTML = `<i class="ph-fill ph-x-circle"></i>${esc(info.erro)}`;
      mPrev.hidden = true;
      return;
    }
    mStatus.className = 'status-line ok';
    mStatus.innerHTML = info.coords
      ? `<i class="ph-fill ph-check-circle"></i>Localização reconhecida. ${TC.distancias(info.coords).map((d) => `${d.nome}: ${d.km.toFixed(1).replace('.', ',')} km`).join(' · ')}`
      : '<i class="ph-fill ph-check-circle"></i>Link do Google Maps aceito. A prévia mostra o bairro; o estudante abre o ponto exato no Maps.';
    const src = TC.mapaEmbed(info, form.bairro.value);
    if (src !== mapaUrlAtual) {
      mapaUrlAtual = src;
      mPrev.innerHTML = `<iframe src="${esc(src)}" title="Prévia da localização" loading="lazy"></iframe>`;
    }
    mPrev.hidden = false;
  }
  form.mapsUrl.addEventListener('input', () => { clearTimeout(esperaMapa); esperaMapa = setTimeout(checarMapa, 400); });
  form.bairro.addEventListener('change', () => { if (form.mapsUrl.value) checarMapa(); });

  /* ---------- Fotos ---------- */
  const drop = $('#drop');
  const inputFotos = $('#v-fotos');
  const thumbs = $('#thumbs');
  function comprimir(file) {
    return new Promise((res, rej) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const max = 1024;
        const k = Math.min(1, max / Math.max(img.width, img.height));
        const cv = document.createElement('canvas');
        cv.width = Math.round(img.width * k);
        cv.height = Math.round(img.height * k);
        cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
        URL.revokeObjectURL(url);
        res(cv.toDataURL('image/jpeg', 0.72));
      };
      img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('imagem inválida')); };
      img.src = url;
    });
  }
  async function adicionar(lista) {
    const arquivos = Array.from(lista).filter((f) => f.type.startsWith('image/'));
    if (!arquivos.length) { UI.toast('Escolha arquivos de imagem (JPG ou PNG).', 'erro'); return; }
    const livres = TC.CONFIG.maxFotos - fotos.length;
    if (livres <= 0) { UI.toast(`Limite de ${TC.CONFIG.maxFotos} fotos atingido.`, 'erro'); return; }
    if (arquivos.length > livres) UI.toast(`Só cabem mais ${livres} ${livres === 1 ? 'foto' : 'fotos'}. As demais foram ignoradas.`, 'info');
    for (const f of arquivos.slice(0, livres)) {
      try { fotos.push(await comprimir(f)); renderThumbs(true); }
      catch (e) { UI.toast(`Não foi possível ler "${f.name}".`, 'erro'); }
    }
    $('[data-erro="fotos"]').textContent = '';
    atualizar();
  }
  function renderThumbs(soUltima) {
    if (soUltima && thumbs.children.length === fotos.length - 1) {
      thumbs.insertAdjacentHTML('beforeend', thumbHtml(fotos.length - 1));
    } else {
      thumbs.innerHTML = fotos.map((_, i) => thumbHtml(i)).join('');
    }
  }
  const thumbHtml = (i) => `<div class="thumb"><img src="${fotos[i]}" alt="Foto ${i + 1} enviada">${i === 0 ? '<span class="capa">Capa</span>' : ''}<button type="button" data-rm="${i}" aria-label="Remover foto ${i + 1}"><i class="ph ph-x"></i></button></div>`;
  thumbs.addEventListener('click', (e) => {
    const b = e.target.closest('[data-rm]');
    if (!b) return;
    const el = b.closest('.thumb');
    const i = Number(b.dataset.rm);
    const remover = () => { fotos.splice(i, 1); renderThumbs(false); atualizar(); };
    if (UI.reduzMovimento()) { remover(); return; }
    el.classList.add('is-leaving');
    setTimeout(remover, 180);
  });
  inputFotos.addEventListener('change', () => { adicionar(inputFotos.files); inputFotos.value = ''; });
  ['dragenter', 'dragover'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add('is-over'); }));
  ['dragleave', 'drop'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove('is-over'); }));
  drop.addEventListener('drop', (e) => { if (e.dataTransfer && e.dataTransfer.files.length) adicionar(e.dataTransfer.files); });

  /* ---------- Estado, prévia e checklist ---------- */
  function dados() {
    const t = form.querySelector('input[name="tipo"]:checked');
    return {
      tipo: t ? t.value : '',
      titulo: form.titulo.value,
      bairro: form.bairro.value,
      valor: form.valor.value === '' ? NaN : Number(form.valor.value),
      valorModo: form.valorModo.value,
      vagas,
      whatsapp: form.whatsapp.value,
      mapsUrl: form.mapsUrl.value,
      descricao: form.descricao.value,
      fotos: fotos.slice(),
      termoAceito: form.termo.checked,
    };
  }
  const ITENS = [
    ['tipo', 'Tipo de imóvel'], ['titulo', 'Título do anúncio'], ['bairro', 'Bairro'], ['descricao', 'Descrição'],
    ['valor', 'Valor mensal'], ['vagas', 'Número de vagas'], ['whatsapp', 'WhatsApp para contato'],
    ['mapsUrl', 'Link do Google Maps'], ['fotos', 'Pelo menos 1 foto'], ['termo', 'Termo de uso aceito'],
  ];
  const lista = $('#checklist');
  lista.innerHTML = ITENS.map(([k, t]) => `<li data-item="${k}"><span class="tick"><i class="ph ph-check" aria-hidden="true"></i></span>${t}</li>`).join('') + '<li class="progress-txt" id="progresso" aria-live="polite"></li>';

  const preview = $('#preview');
  function atualizar() {
    const d = dados();
    const { erros } = TC.validarVaga(Object.assign({}, d, { valor: Number.isNaN(d.valor) ? 0 : d.valor }));
    let feitos = 0;
    ITENS.forEach(([k]) => {
      const ok = !erros[k] && !(k === 'valor' && erros.valorModo);
      $(`[data-item="${k}"]`, lista).classList.toggle('done', ok);
      if (ok) feitos++;
    });
    $('#progresso').textContent = feitos === ITENS.length ? 'Tudo certo para publicar.' : `${feitos} de ${ITENS.length} itens obrigatórios`;
    textoPorPessoa();

    const agora = Date.now();
    const v = {
      id: 'previa', tipo: d.tipo || 'republica', titulo: d.titulo.trim() || 'Título do seu anúncio', bairro: d.bairro || 'Bairro',
      valor: Number.isNaN(d.valor) ? 0 : d.valor, valorModo: d.valorModo, vagas, fotos: [fotos[0] || ''], publicadoEm: agora, cicloInicio: agora, encerradoEm: null,
    };
    preview.innerHTML = UI.cardVaga(v);
    const a = $('.vcard-link', preview);
    a.removeAttribute('href');
    a.setAttribute('aria-disabled', 'true');
    if (!fotos[0]) { const m = $('.media', preview); m.classList.add('sem-foto', 'carregada'); $('img', m).remove(); m.insertAdjacentHTML('beforeend', '<i class="ph ph-image fallback-ic" aria-hidden="true"></i>'); }
    $$('.ring', preview).forEach((r) => r.classList.add('is-drawn', 'is-visible'));
  }
  UI.limparAoDigitar(form);
  form.addEventListener('input', atualizar);
  form.addEventListener('change', (e) => {
    atualizar();
    if (e.target.name === 'tipo') $('[data-erro="tipo"]').textContent = '';
    if (e.target.name === 'termo') $('[data-erro="termo"]').textContent = '';
  });

  /* ---------- Publicar ---------- */
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const d = dados();
    const res = TC.criarVaga(d);
    if (!res.ok) { UI.mostrarErros(form, res.erros); return; }
    const c = TC.ciclo(res.vaga);
    $('#dlg-ok-txt').innerHTML = `Ele fica ativo até <strong>${TC.fmtData(c.expiraEm)}</strong> (${TC.CONFIG.duracaoDias} dias). Antes de expirar, você renova pelo painel.`;
    $('#ok-ver').href = `vaga.html?id=${encodeURIComponent(res.vaga.id)}`;
    const dlg = $('#dlg-ok');
    UI.abrirDialogo(dlg);
    // Fechou o aviso (Esc ou fora)? Vai para o painel, para não publicar duas vezes.
    dlg.addEventListener('close', () => { location.href = 'painel.html'; }, { once: true });
  });

  atualizar();
  requestAnimationFrame(moverModo);
  if (document.fonts) document.fonts.ready.then(moverModo);
  window.addEventListener('resize', moverModo);
})();
