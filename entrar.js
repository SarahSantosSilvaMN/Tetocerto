/* Entrar / Criar conta: fluxos separados para estudante e proprietário */
(function () {
  'use strict';
  const { $, $$ } = UI;
  const form = $('#auth-form');
  const pill = $('#perfil .seg-pill');
  const copy = $('#auth-copy');
  const hint = $('#role-hint');

  // Contas de demonstração (as mesmas do seed em js/store.js)
  const DEMO = {
    estudante: { email: 'demo.estudante@tetocerto.test', senha: 'demo1234' },
    proprietario: { email: 'demo.proprietario@tetocerto.test', senha: 'demo1234' },
  };

  const TEXTOS = {
    estudante: {
      visual: ['Chegou agora em Diamantina?', 'Busque à vontade sem conta. Ela só serve para comentar e avaliar a segurança de onde você já morou.'],
      hint: '<i class="ph ph-magnifying-glass"></i><span>Você <strong>não precisa de conta</strong> para buscar vagas. <a class="link" href="buscar.html">Buscar sem conta</a></span>',
    },
    proprietario: {
      visual: ['Anuncie de graça para estudantes', 'Com a conta você publica vagas, acompanha os 60 dias de cada anúncio e renova quando precisar.'],
      hint: '<i class="ph ph-house-line"></i><span>A conta é <strong>obrigatória para anunciar</strong> e gerenciar seus anúncios. Não cobramos nenhuma taxa.</span>',
    },
  };

  let perfil = UI.params.get('perfil') === 'proprietario' ? 'proprietario' : 'estudante';
  let modo = UI.params.get('modo') === 'cadastro' ? 'cadastro' : 'entrar';

  // Já entrou? Mostra atalho em vez do formulário.
  const atual = TC.usuarioAtual();
  if (atual) {
    $('#auth-panel').innerHTML = `
      <div class="gate" style="margin:0">
        <i class="ph-fill ph-user-circle-check"></i>
        <h1 style="font-size:1.9rem">Você já entrou</h1>
        <p class="muted">Conectado como <strong>${UI.esc(atual.nome)}</strong> (${atual.role === 'proprietario' ? 'proprietário' : 'estudante'}).</p>
        <div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center">
          <a class="btn btn-primary" href="${atual.role === 'proprietario' ? 'painel.html' : 'buscar.html'}">${atual.role === 'proprietario' ? 'Ir para o painel' : 'Buscar vagas'}</a>
          <button class="btn" type="button" id="trocar">Sair e trocar de conta</button>
        </div>
      </div>`;
    $('#trocar').addEventListener('click', () => { TC.sair(); location.reload(); });
    renderVisual(false);
    return;
  }

  function destino(u) {
    const volta = UI.params.get('volta');
    // Só aceita caminhos internos (evita redirecionar para outro site).
    if (volta && /^[a-z0-9_-]+\.html([?#].*)?$/i.test(volta)) return volta;
    return u.role === 'proprietario' ? 'painel.html' : 'buscar.html';
  }

  function renderVisual(animar) {
    const [t, p] = TEXTOS[perfil].visual;
    const aplicar = () => { copy.innerHTML = `<h2>${t}</h2><p>${p}</p><small data-credito="bomFimRua"></small>`; UI.aplicarFotos(copy); copy.classList.remove('is-switching'); };
    if (!animar || UI.reduzMovimento()) { aplicar(); return; }
    copy.classList.add('is-switching');
    setTimeout(aplicar, 200);
  }

  function moverPill() {
    const lbl = $(`#perfil input[value="${perfil}"]`).closest('label');
    pill.style.width = lbl.offsetWidth + 'px';
    pill.style.transform = `translateX(${lbl.offsetLeft - 4}px)`;
  }

  const campoSenha = (auto) => `
    <div class="field">
      <label for="a-senha">Senha <span class="req">*</span></label>
      <div class="input-group">
        <i class="ph ph-lock-simple"></i>
        <input class="input" id="a-senha" name="senha" type="password" autocomplete="${auto}" ${modo === 'cadastro' ? 'minlength="8"' : ''}>
        <button class="input-btn" type="button" id="ver-senha" aria-label="Mostrar senha"><i class="ph ph-eye"></i></button>
      </div>
      ${modo === 'cadastro' ? '<span class="hint">Pelo menos 8 caracteres.</span>' : ''}
      <span class="field-error" data-erro="senha"></span>
    </div>`;

  function renderForm() {
    const ehProp = perfil === 'proprietario';
    let html = '';
    if (modo === 'cadastro') {
      html += `
        <div class="field">
          <label for="a-nome">Nome completo <span class="req">*</span></label>
          <div class="input-group"><i class="ph ph-user"></i><input class="input" id="a-nome" name="nome" autocomplete="name"></div>
          <span class="field-error" data-erro="nome"></span>
        </div>`;
    }
    html += `
      <div class="field">
        <label for="a-email">E-mail <span class="req">*</span></label>
        <div class="input-group"><i class="ph ph-envelope-simple"></i><input class="input" id="a-email" name="email" type="email" autocomplete="email" inputmode="email"></div>
        <span class="field-error" data-erro="email"></span>
      </div>`;
    if (modo === 'cadastro' && ehProp) {
      html += `
        <div class="field">
          <label for="a-tel">Telefone ou WhatsApp <span class="req">*</span></label>
          <div class="input-group"><i class="ph ph-phone"></i><input class="input" id="a-tel" name="telefone" type="tel" autocomplete="tel" inputmode="tel" placeholder="(38) 99999-9999"></div>
          <span class="field-error" data-erro="telefone"></span>
        </div>`;
    }
    if (modo === 'cadastro' && !ehProp) {
      html += `
        <div class="field">
          <label for="a-curso">Curso na UFVJM <span class="muted" style="font-weight:400">(opcional)</span></label>
          <div class="input-group"><i class="ph ph-graduation-cap"></i><input class="input" id="a-curso" name="curso" placeholder="Ex.: Odontologia"></div>
          <span class="hint">Aparece junto dos seus comentários e avaliações.</span>
        </div>`;
    }
    html += campoSenha(modo === 'cadastro' ? 'new-password' : 'current-password');
    html += `<button class="btn btn-primary btn-block" type="submit">${modo === 'cadastro' ? (ehProp ? 'Criar conta de proprietário' : 'Criar conta de estudante') : 'Entrar'}<i class="ph ph-arrow-right"></i></button>`;
    if (modo === 'entrar') {
      html += `<div class="demo-box">Protótipo: os dados ficam só neste navegador. <button type="button" id="demo">Preencher conta de demonstração</button></div>`;
    } else if (ehProp) {
      html += `<p class="muted" style="font-size:.85rem">Ao publicar cada vaga você aceita o termo de uso: o TetoCerto só divulga o anúncio e não participa de pagamentos nem de contratos.</p>`;
    }
    form.innerHTML = html;
    form.classList.remove('enter'); void form.offsetWidth; form.classList.add('enter');

    const tel = $('#a-tel');
    if (tel) tel.addEventListener('input', () => { tel.value = TC.mascaraTelefone(tel.value); });
    $('#ver-senha').addEventListener('click', (e) => {
      const s = $('#a-senha');
      const mostra = s.type === 'password';
      s.type = mostra ? 'text' : 'password';
      e.currentTarget.innerHTML = `<i class="ph ${mostra ? 'ph-eye-slash' : 'ph-eye'}"></i>`;
      e.currentTarget.setAttribute('aria-label', mostra ? 'Ocultar senha' : 'Mostrar senha');
    });
    const demo = $('#demo');
    if (demo) demo.addEventListener('click', () => { form.email.value = DEMO[perfil].email; form.senha.value = DEMO[perfil].senha; form.querySelector('[type="submit"]').focus(); });
  }

  function aplicarPerfil(animar) {
    $$('#perfil input').forEach((i) => { i.checked = i.value === perfil; });
    hint.innerHTML = TEXTOS[perfil].hint;
    moverPill();
    renderVisual(animar);
    renderForm();
  }

  function aplicarModo() {
    $$('.mode-switch button').forEach((b) => b.setAttribute('aria-selected', b.dataset.modo === modo));
    renderForm();
  }

  $$('#perfil input').forEach((i) => i.addEventListener('change', () => { perfil = i.value; aplicarPerfil(true); }));
  $$('.mode-switch button').forEach((b) => b.addEventListener('click', () => { if (modo === b.dataset.modo) return; modo = b.dataset.modo; aplicarModo(); }));

  UI.limparAoDigitar(form);
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(form).entries());
    d.role = perfil;
    const res = modo === 'cadastro' ? TC.cadastrar(d) : TC.entrar(d);
    if (!res.ok) { UI.mostrarErros(form, res.erros); return; }
    UI.toast(modo === 'cadastro' ? `Conta criada. Bem-vindo(a), ${res.usuario.nome.split(' ')[0]}!` : `Olá, ${res.usuario.nome.split(' ')[0]}!`);
    form.querySelector('[type="submit"]').disabled = true;
    setTimeout(() => { location.href = destino(res.usuario); }, 650);
  });

  aplicarPerfil(false);
  aplicarModo();
  if (document.fonts) document.fonts.ready.then(moverPill);
  window.addEventListener('resize', moverPill);
})();
