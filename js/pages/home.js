/* Página inicial */
(function () {
  'use strict';
  const { $, $$, esc } = UI;

  UI.dividirPalavras($('#hero-title'));

  const ativas = TC.listarVagas({ ordem: 'recentes' });

  // Prévia real da vaga mais recente sobre a foto do hero
  if (ativas[0]) $('#hero-float').innerHTML = UI.cardVaga(ativas[0]);

  // Contagem por categoria
  $$('[data-count]').forEach((el) => {
    const n = ativas.filter((v) => v.tipo === el.dataset.count).length;
    el.textContent = n ? `${n} ${n === 1 ? 'vaga ativa' : 'vagas ativas'}` : 'Ver vagas';
  });

  // Vagas em destaque
  const rail = $('#destaques');
  rail.innerHTML = ativas.length
    ? ativas.slice(0, 8).map((v, i) => UI.cardVaga(v, i)).join('')
    : `<div class="empty" style="grid-column:1/-1"><i class="ph ph-house-line"></i><h3>Nenhuma vaga ativa no momento</h3><p>Novos anúncios aparecem aqui assim que são publicados.</p><a class="btn btn-primary" href="anunciar.html">Anunciar imóvel</a></div>`;
  $$('.vcard', rail).forEach((c) => c.setAttribute('data-reveal', ''));
  rail.setAttribute('data-stagger', '');
  $$('[data-rail]').forEach((b) => b.addEventListener('click', () => {
    const passo = rail.querySelector('.vcard') ? rail.querySelector('.vcard').offsetWidth + 18 : 320;
    rail.scrollBy({ left: passo * Number(b.dataset.rail), behavior: UI.reduzMovimento() ? 'auto' : 'smooth' });
  }));

  // Para quem é
  const PERFIS = {
    estudantes: {
      titulo: 'Para quem vai estudar na UFVJM',
      foto: 'contrato',
      itens: [
        'Busque e filtre por bairro, valor e tipo sem criar conta.',
        'Veja no mapa a distância até o campus antes de chamar o proprietário.',
        'Tire dúvidas nos comentários com quem já mora na cidade.',
      ],
      cta: ['buscar.html', 'Buscar vagas'],
    },
    pais: {
      titulo: 'Para quem acompanha a decisão de longe',
      foto: 'catedral',
      itens: [
        'Fotos reais do imóvel enviadas pelo proprietário.',
        'Avaliação de segurança feita só por estudantes que moraram lá.',
        'Localização exata no Google Maps e contato direto pelo WhatsApp.',
      ],
      cta: ['buscar.html', 'Buscar vagas'],
    },
    proprietarios: {
      titulo: 'Para quem tem casa, quarto ou república',
      foto: 'fachada',
      itens: [
        'Anuncie de graça para um público certo: estudantes.',
        'Cadastro simples, com fotos, valor e localização.',
        'Painel com o status de cada anúncio e renovação em um clique.',
      ],
      cta: ['anunciar.html', 'Anunciar imóvel'],
    },
  };
  const tabs = $$('#aud-tabs .tab');
  const ind = $('#aud-tabs .tab-indicator');
  const painel = $('#aud-panel');
  function moverIndicador(tab) {
    ind.style.width = tab.offsetWidth + 'px';
    ind.style.transform = `translateX(${tab.offsetLeft}px)`;
  }
  function render(chave) {
    const p = PERFIS[chave];
    painel.innerHTML = `
      <div>
        <h3>${p.titulo}</h3>
        <ul>${p.itens.map((t) => `<li><i class="ph-fill ph-check-circle"></i><span>${t}</span></li>`).join('')}</ul>
        <a class="btn btn-primary" href="${p.cta[0]}">${p.cta[1]}<i class="ph ph-arrow-right"></i></a>
      </div>
      <div>
        <div class="media aud-media"><img data-foto="${p.foto}" data-w="960" loading="lazy"></div>
        <p class="photo-credit" data-credito="${p.foto}"></p>
      </div>`;
    UI.aplicarFotos(painel);
  }
  function selecionar(tab, foco) {
    tabs.forEach((t) => { const sel = t === tab; t.setAttribute('aria-selected', sel); t.tabIndex = sel ? 0 : -1; });
    moverIndicador(tab);
    if (foco) tab.focus();
    if (UI.reduzMovimento()) { render(tab.dataset.aud); return; }
    painel.classList.add('is-switching');
    setTimeout(() => { render(tab.dataset.aud); painel.classList.remove('is-switching'); }, 200);
  }
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => selecionar(t));
    t.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      const prox = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
      selecionar(prox, true);
    });
  });
  render('estudantes');
  requestAnimationFrame(() => moverIndicador(tabs[0]));
  if (document.fonts) document.fonts.ready.then(() => moverIndicador($('#aud-tabs .tab[aria-selected="true"]')));
  window.addEventListener('resize', () => moverIndicador($('#aud-tabs .tab[aria-selected="true"]')));

  // Contatos da equipe
  $('#contatos').innerHTML = TC.CONFIG.contatos.map((c) => `
    <a class="contact" href="mailto:${esc(c.email)}" data-reveal>
      <i class="ph ${c.icon} ic"></i>
      <div><h3>${esc(c.titulo)}</h3><p class="muted">${esc(c.descricao)}</p><span class="addr">${esc(c.email)}</span></div>
      <i class="ph ph-arrow-up-right"></i>
    </a>`).join('');
})();
