/* Buscar vagas */
(function () {
  'use strict';
  const { $ } = UI;
  const form = $('#filtros');
  const resultados = $('#resultados');
  const contagem = $('#count');
  const range = $('#f-valor');
  const saida = $('#f-valor-out');
  const SEM_LIMITE = Number(range.max);

  $('#f-bairro').insertAdjacentHTML('beforeend', TC.BAIRROS.map((b) => `<option value="${b}">${b}</option>`).join(''));

  // Estado inicial vindo da URL (links das categorias usam ?tipo=)
  const p = UI.params;
  if (p.get('tipo') && TC.TIPOS[p.get('tipo')]) form.querySelector(`input[name="tipo"][value="${p.get('tipo')}"]`).checked = true;
  if (p.get('bairro') && TC.BAIRROS.includes(p.get('bairro'))) form.bairro.value = p.get('bairro');
  if (p.get('max')) range.value = Math.min(SEM_LIMITE, Math.max(Number(range.min), Number(p.get('max')) || SEM_LIMITE));
  if (['recentes', 'menor', 'expiram'].includes(p.get('ordem'))) form.ordem.value = p.get('ordem');
  if (p.get('expiradas') === '1') form.expiradas.checked = true;

  function filtros() {
    const max = Number(range.value);
    return {
      tipo: form.querySelector('input[name="tipo"]:checked').value,
      bairro: form.bairro.value,
      valorMax: max >= SEM_LIMITE ? 0 : max,
      ordem: form.ordem.value,
      incluirExpiradas: form.expiradas.checked,
    };
  }

  function sincronizarUrl(f) {
    const q = new URLSearchParams();
    if (f.tipo) q.set('tipo', f.tipo);
    if (f.bairro) q.set('bairro', f.bairro);
    if (f.valorMax) q.set('max', f.valorMax);
    if (f.ordem !== 'recentes') q.set('ordem', f.ordem);
    if (f.incluirExpiradas) q.set('expiradas', '1');
    const s = q.toString();
    history.replaceState(null, '', s ? `?${s}` : location.pathname);
  }

  function atualizarSaida() {
    const v = Number(range.value);
    saida.textContent = v >= SEM_LIMITE ? 'Sem limite' : `Até ${TC.fmtMoeda(v)}`;
  }

  function render() {
    const f = filtros();
    const lista = TC.listarVagas(f);
    contagem.textContent = lista.length === 0 ? 'Nenhuma vaga encontrada' : `${lista.length} ${lista.length === 1 ? 'vaga encontrada' : 'vagas encontradas'}`;
    if (!lista.length) {
      resultados.innerHTML = `
        <div class="empty" style="grid-column:1/-1">
          <i class="ph ph-magnifying-glass"></i>
          <h3>Nada com esses filtros</h3>
          <p>Tente outro bairro, aumente o valor máximo ou inclua todos os tipos de imóvel.</p>
          <button class="btn" type="button" id="limpar-vazio">Limpar filtros</button>
        </div>`;
      $('#limpar-vazio').addEventListener('click', limpar);
    } else {
      resultados.innerHTML = lista.map((v, i) => UI.cardVaga(v, i)).join('');
    }
    resultados.querySelectorAll('.media img').forEach(UI.estadoImagem);
    UI.observar(resultados);
    sincronizarUrl(f);
  }

  function limpar() {
    form.reset();
    range.value = SEM_LIMITE;
    atualizarSaida();
    render();
  }

  let espera;
  range.addEventListener('input', () => { atualizarSaida(); clearTimeout(espera); espera = setTimeout(render, 140); });
  form.addEventListener('change', (e) => { if (e.target !== range) render(); });
  form.addEventListener('submit', (e) => e.preventDefault());
  $('#limpar').addEventListener('click', limpar);

  const toggle = $('#filtros-toggle');
  toggle.addEventListener('click', () => {
    const aberto = form.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', aberto);
  });

  atualizarSaida();
  render();
})();
