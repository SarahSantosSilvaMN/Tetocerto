/* ==========================================================================
   TetoCerto · camada de dados do protótipo
   Tudo fica no localStorage do navegador de quem usa. Para a versão pública,
   troque estas funções por chamadas a um backend (ex.: Supabase ou Firebase)
   mantendo as MESMAS regras de negócio, que estão concentradas aqui:
     1. Sem transação pela plataforma (não existe nada de pagamento no modelo).
     2. Expiração automática em 60 dias, renovável pelo proprietário.
     3. Avaliação de segurança só por estudante que morou no imóvel, nunca pelo anunciante.
     4. Gratuito.
     5. Termo de uso obrigatório no cadastro da vaga.
     6. Perfis distintos: estudante e proprietário (pais navegam sem conta).
   ========================================================================== */
(function () {
  'use strict';

  const DIA_MS = 86400000;
  const STORAGE_KEY = 'tetocerto:db:v1';
  const SESSAO_KEY = 'tetocerto:sessao';

  const CONFIG = {
    duracaoDias: 60,
    avisoDias: 7,
    maxFotos: 8,
    // Coordenadas aproximadas dos campi em Diamantina. Conferir no Google Maps antes de publicar.
    campi: [
      { nome: 'Campus JK', lat: -18.2020, lng: -43.5740 },
      { nome: 'Campus I (Centro)', lat: -18.2397, lng: -43.6006 },
    ],
    // Trocar pelos e-mails reais da equipe.
    contatos: [
      { id: 'estudante', titulo: 'Suporte ao estudante', descricao: 'Dúvidas sobre busca, comentários e avaliações.', email: 'estudantes@tetocerto.app', icon: 'ph-student' },
      { id: 'proprietario', titulo: 'Suporte ao proprietário', descricao: 'Ajuda para cadastrar, renovar ou encerrar anúncios.', email: 'proprietarios@tetocerto.app', icon: 'ph-key' },
      { id: 'moderacao', titulo: 'Moderação e segurança', descricao: 'Denúncias, anúncios suspeitos e avaliações indevidas.', email: 'moderacao@tetocerto.app', icon: 'ph-shield-check' },
    ],
  };

  const TIPOS = {
    casa: { label: 'Casa', plural: 'Casas', icon: 'ph-house-line', desc: 'O imóvel inteiro, para dividir com amigos.' },
    republica: { label: 'República', plural: 'Repúblicas', icon: 'ph-users-three', desc: 'Vaga em casa compartilhada com outros estudantes.' },
    quarto: { label: 'Quarto / Kitnet', plural: 'Quartos e kitnets', icon: 'ph-bed', desc: 'Espaço individual, mais privacidade.' },
  };

  // Lista inicial de bairros. A equipe pode revisar e completar.
  const BAIRROS = [
    'Centro', 'Palha', 'Rio Grande', 'Bela Vista', 'Consolação', 'Alto da Jacuba',
    'Arraial dos Forros', 'Bom Jesus', 'Cazuza', 'Jardim Imperial', 'Largo Dom João',
    'Romana', 'Vila Operária', 'Outro bairro',
  ];

  const CRITERIOS = [
    { id: 'iluminacao', label: 'Iluminação da rua' },
    { id: 'acesso', label: 'Portas, portão e fechaduras' },
    { id: 'trajeto', label: 'Trajeto a pé à noite' },
    { id: 'instalacoes', label: 'Instalações (elétrica, gás, água)' },
  ];

  const MOTIVOS_DENUNCIA = [
    'A vaga já foi preenchida',
    'Fotos ou informações falsas',
    'Pedido de pagamento antecipado suspeito',
    'Conteúdo ofensivo ou discriminatório',
    'Outro motivo',
  ];

  const TERMO = [
    '<strong>O TetoCerto apenas divulga anúncios.</strong> É um serviço gratuito que publica a sua vaga para estudantes e responsáveis interessados em moradia em Diamantina.',
    '<strong>Não participamos de pagamentos nem de contratos.</strong> O TetoCerto não intermedeia, não recebe e não processa pagamentos, cauções, reservas, contratos ou assinaturas. Visita, valores e contrato são combinados diretamente entre você e o interessado, sob responsabilidade exclusiva das partes.',
    'Você declara que as informações e as fotos do anúncio são verdadeiras, que tem autorização para anunciar o imóvel e que vai mantê-lo atualizado.',
    'Todo anúncio expira automaticamente 60 dias após a publicação. Você pode renová-lo pelo seu painel, o que reinicia a contagem de 60 dias.',
    'A avaliação de segurança do imóvel é feita apenas por estudantes que já moraram nele. O anunciante não pode avaliar o próprio imóvel.',
    'Anúncios denunciados podem ser revisados, suspensos ou removidos pela moderação da equipe.',
    'O TetoCerto é mantido por uma equipe de estudantes e não possui vínculo formal com a UFVJM.',
  ];

  /* ---------- utilidades ---------- */
  // cyrb53: só para o protótipo não guardar a senha em texto puro. NÃO é segurança real;
  // na versão pública a autenticação precisa ficar no servidor.
  function hash(str) {
    let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
    for (let i = 0, ch; i < str.length; i++) {
      ch = str.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16);
  }
  const uid = (p) => p + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const limpar = (s) => String(s == null ? '' : s).trim();
  const soDigitos = (s) => String(s || '').replace(/\D/g, '');
  const emailValido = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);

  /* ---------- persistência ---------- */
  let cache = null;
  function ler() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) { /* armazenamento bloqueado: segue em memória */ }
    return null;
  }
  function salvar() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
    } catch (e) {
      if (e && (e.name === 'QuotaExceededError' || e.code === 22)) {
        const err = new Error('Sem espaço no navegador para salvar. Tente enviar menos fotos.');
        err.codigo = 'ESPACO';
        throw err;
      }
    }
  }
  function db() {
    if (!cache) {
      cache = ler();
      if (!cache || !cache.vagas) { cache = seed(); salvar(); }
    }
    return cache;
  }
  function restaurarDemo() {
    try { localStorage.removeItem(STORAGE_KEY); localStorage.removeItem(SESSAO_KEY); } catch (e) {}
    cache = null;
    db();
  }

  /* ---------- dados de demonstração ---------- */
  function seed() {
    const agora = Date.now();
    const atras = (dias, horas = 0) => agora - dias * DIA_MS - horas * 3600000;
    const foto = (slug, n) => `https://picsum.photos/seed/tetocerto-${slug}-${n}/1200/800`;
    const fotos = (slug, qtd) => Array.from({ length: qtd }, (_, i) => foto(slug, i + 1));
    const maps = (lat, lng) => `https://www.google.com/maps/@${lat},${lng},17z`;
    const senha = hash('demo1234');

    const usuarios = [
      { id: 'u_marta', role: 'proprietario', nome: 'Marta Quintão', email: 'demo.proprietario@tetocerto.test', telefone: '(38) 90000-0101', senha, criadoEm: atras(120) },
      { id: 'u_geraldo', role: 'proprietario', nome: 'Geraldo Pimenta', email: 'geraldo.demo@tetocerto.test', telefone: '(38) 90000-0102', senha, criadoEm: atras(95) },
      { id: 'u_luana', role: 'estudante', nome: 'Luana Ferreira', email: 'demo.estudante@tetocerto.test', curso: 'Odontologia', senha, criadoEm: atras(80) },
      { id: 'u_caio', role: 'estudante', nome: 'Caio Mendes', email: 'caio.demo@tetocerto.test', curso: 'Engenharia Florestal', senha, criadoEm: atras(400) },
      { id: 'u_bruna', role: 'estudante', nome: 'Bruna Teixeira', email: 'bruna.demo@tetocerto.test', curso: 'Nutrição', senha, criadoEm: atras(500) },
      { id: 'u_otavio', role: 'estudante', nome: 'Otávio Rezende', email: 'otavio.demo@tetocerto.test', curso: 'Sistemas de Informação', senha, criadoEm: atras(300) },
    ];

    const v = (o) => Object.assign({ demo: true, encerradoEm: null, renovacoes: 0, termoAceitoEm: o.publicadoEm, cicloInicio: o.publicadoEm }, o);
    const vagas = [
      v({ id: 'v_mercado', ownerId: 'u_marta', tipo: 'republica', titulo: 'República feminina a duas quadras da Praça do Mercado', bairro: 'Centro', valor: 620, valorModo: 'pessoa', vagas: 2, whatsapp: '(38) 90000-0101', mapsUrl: maps(-18.2388, -43.6002), publicadoEm: atras(6, 3), fotos: fotos('mercado', 4),
        descricao: 'Casarão reformado com 5 moradoras, todas da UFVJM. Quartos mobiliados (cama, guarda-roupa e escrivaninha).\nInternet de 200 mega, máquina de lavar e cozinha equipada.\nRegras da casa: sem festas durante a semana, limpeza em escala semanal.\nCerca de 5 minutos a pé do Campus I e ponto do ônibus para o Campus JK na esquina.' }),
      v({ id: 'v_jk', ownerId: 'u_geraldo', tipo: 'quarto', titulo: 'Kitnet independente a 8 minutos a pé do Campus JK', bairro: 'Alto da Jacuba', valor: 780, valorModo: 'imovel', vagas: 1, whatsapp: '(38) 90000-0102', mapsUrl: maps(-18.2049, -43.5771), publicadoEm: atras(21, 5), fotos: fotos('jk', 3),
        descricao: 'Kitnet com entrada independente, banheiro privativo e cozinha americana.\nMobiliada com cama de casal, geladeira, fogão cooktop e mesa de estudos.\nInternet inclusa. Água e luz por conta do inquilino.\nRua asfaltada e iluminada, cerca de 8 minutos a pé do Campus JK.' }),
      v({ id: 'v_palha', ownerId: 'u_marta', tipo: 'casa', titulo: 'Casa de 3 quartos com quintal para grupo de amigos', bairro: 'Palha', valor: 1650, valorModo: 'imovel', vagas: 3, whatsapp: '(38) 90000-0101', mapsUrl: maps(-18.2462, -43.5961), publicadoEm: atras(34, 2), fotos: fotos('palha', 5),
        descricao: 'Casa inteira com 3 quartos, sala, cozinha, área de serviço e quintal com varal.\nSem mobília (apenas armários na cozinha). Aceita pets de pequeno porte.\nContrato direto com a proprietária, mínimo de 12 meses.\nAproximadamente 15 minutos a pé do Campus I.' }),
      v({ id: 'v_belavista', ownerId: 'u_geraldo', tipo: 'republica', titulo: 'Vaga em república mista com internet de 300 mega', bairro: 'Bela Vista', valor: 540, valorModo: 'pessoa', vagas: 1, whatsapp: '(38) 90000-0102', mapsUrl: maps(-18.2336, -43.5934), publicadoEm: atras(55, 4), fotos: fotos('belavista', 3),
        descricao: 'República mista com 6 moradores de cursos diferentes. Quarto individual sem mobília.\nContas divididas igualmente (média de R$ 90 por pessoa).\nRegras: silêncio depois das 23h em dias de semana, visitas avisadas no grupo.\nUns 20 minutos a pé do Campus I, ônibus para o JK na rua de cima.' }),
      v({ id: 'v_riogrande', ownerId: 'u_marta', tipo: 'quarto', titulo: 'Quarto mobiliado em casa de família, contas inclusas', bairro: 'Rio Grande', valor: 700, valorModo: 'pessoa', vagas: 1, whatsapp: '(38) 90000-0101', mapsUrl: maps(-18.2481, -43.6079), publicadoEm: atras(12, 1), fotos: fotos('riogrande', 3),
        descricao: 'Quarto individual em casa de família tranquila, com café da manhã incluso.\nÁgua, luz e internet já estão no valor. Roupa de cama fornecida.\nPreferência por estudante que não fume.\nCerca de 12 minutos a pé do Campus I.' }),
      v({ id: 'v_consolacao', ownerId: 'u_geraldo', tipo: 'casa', titulo: 'Casa geminada de 2 quartos em rua tranquila', bairro: 'Consolação', valor: 1200, valorModo: 'imovel', vagas: 2, whatsapp: '(38) 90000-0102', mapsUrl: maps(-18.2442, -43.5978), publicadoEm: atras(58, 6), fotos: fotos('consolacao', 4),
        descricao: 'Casa geminada com 2 quartos, sala conjugada e cozinha. Portão eletrônico.\nSemimobiliada: camas, geladeira e fogão.\nRua sem saída, pouco movimento de carros.\nAproximadamente 10 minutos a pé do Campus I.' }),
      v({ id: 'v_casarao', ownerId: 'u_marta', tipo: 'republica', titulo: 'República masculina tradicional em casarão do Centro', bairro: 'Centro', valor: 500, valorModo: 'pessoa', vagas: 3, whatsapp: '(38) 90000-0101', mapsUrl: maps(-18.2405, -43.6021), publicadoEm: atras(64), fotos: fotos('casarao', 3),
        descricao: 'Casarão histórico com 9 moradores. Quartos duplos e individuais.\nInternet, faxineira quinzenal e área de churrasco.\n3 minutos a pé do Campus I.' }),
      v({ id: 'v_domjoao', ownerId: 'u_geraldo', tipo: 'quarto', titulo: 'Quarto com banheiro privativo e mesa de estudo', bairro: 'Largo Dom João', valor: 650, valorModo: 'pessoa', vagas: 1, whatsapp: '(38) 90000-0102', mapsUrl: maps(-18.2421, -43.5990), publicadoEm: atras(2, 2), fotos: fotos('domjoao', 3),
        descricao: 'Suíte em casa com outros 2 estudantes. Cama, guarda-roupa, escrivaninha e cadeira.\nInternet de 300 mega e lavanderia compartilhada.\nCerca de 8 minutos a pé do Campus I.' }),
    ];

    const comentarios = [
      { id: 'c1', vagaId: 'v_mercado', autorId: 'u_caio', autorNome: 'Caio Mendes', autorRole: 'estudante', curso: 'Engenharia Florestal', texto: 'Alguém sabe se o ônibus para o JK passa cedo nesse ponto? Tenho aula às 7h.', criadoEm: atras(4, 2) },
      { id: 'c2', vagaId: 'v_mercado', autorId: 'u_bruna', autorNome: 'Bruna Teixeira', autorRole: 'estudante', curso: 'Nutrição', texto: 'Passa sim, o primeiro sai umas 6h20. Morei ali perto ano passado e nunca tive problema.', criadoEm: atras(4) },
      { id: 'c3', vagaId: 'v_mercado', autorId: 'u_marta', autorNome: 'Marta Quintão', autorRole: 'proprietario', texto: 'Complementando: a casa tem bicicletário coberto também.', criadoEm: atras(3, 20) },
      { id: 'c4', vagaId: 'v_jk', autorId: 'u_otavio', autorNome: 'Otávio Rezende', autorRole: 'estudante', curso: 'Sistemas de Informação', texto: 'A subida até o JK é puxada, mas dá pra ir a pé tranquilo. Tem mercadinho na rua de baixo.', criadoEm: atras(15) },
      { id: 'c5', vagaId: 'v_palha', autorId: 'u_luana', autorNome: 'Luana Ferreira', autorRole: 'estudante', curso: 'Odontologia', texto: 'Como é a vizinhança à noite? Penso em dividir com duas colegas.', criadoEm: atras(20) },
    ];

    const av = (o) => Object.assign({ declaracao: true }, o);
    const avaliacoes = [
      av({ id: 'a1', vagaId: 'v_mercado', autorId: 'u_bruna', autorNome: 'Bruna Teixeira', curso: 'Nutrição', periodo: { inicio: '2023-03', fim: '2024-12' }, notas: { iluminacao: 5, acesso: 4, trajeto: 4, instalacoes: 5 }, texto: 'Rua bem iluminada e movimentada até tarde. A fechadura do portão foi trocada enquanto eu morava lá.', criadoEm: atras(30) }),
      av({ id: 'a2', vagaId: 'v_mercado', autorId: 'u_otavio', autorNome: 'Otávio Rezende', curso: 'Sistemas de Informação', periodo: { inicio: '2022-02', fim: '2023-01' }, notas: { iluminacao: 4, acesso: 4, trajeto: 3, instalacoes: 4 }, texto: 'Casa segura. O trajeto até o JK à noite eu fazia de ônibus.', criadoEm: atras(200) }),
      av({ id: 'a3', vagaId: 'v_palha', autorId: 'u_caio', autorNome: 'Caio Mendes', curso: 'Engenharia Florestal', periodo: { inicio: '2021-03', fim: '2023-07' }, notas: { iluminacao: 3, acesso: 5, trajeto: 3, instalacoes: 4 }, texto: 'Portão e grades bons. A rua de trás é escura, melhor voltar pela principal.', criadoEm: atras(60) }),
      av({ id: 'a4', vagaId: 'v_casarao', autorId: 'u_otavio', autorNome: 'Otávio Rezende', curso: 'Sistemas de Informação', periodo: { inicio: '2020-02', fim: '2021-12' }, notas: { iluminacao: 5, acesso: 3, trajeto: 5, instalacoes: 3 }, texto: 'Localização excelente. A parte elétrica é antiga, pedir revisão antes de mudar.', criadoEm: atras(400) }),
    ];

    return { versao: 1, usuarios, vagas, comentarios, avaliacoes, denuncias: [] };
  }

  /* ---------- sessão / contas ---------- */
  function usuarioAtual() {
    let id = null;
    try { id = localStorage.getItem(SESSAO_KEY); } catch (e) {}
    if (!id) return null;
    const u = db().usuarios.find((x) => x.id === id);
    return u ? publico(u) : null;
  }
  function publico(u) { const { senha, ...resto } = u; return resto; }
  function abrirSessao(id) { try { localStorage.setItem(SESSAO_KEY, id); } catch (e) {} }
  function sair() { try { localStorage.removeItem(SESSAO_KEY); } catch (e) {} }

  function cadastrar(d) {
    const erros = {};
    const role = d.role === 'proprietario' ? 'proprietario' : 'estudante';
    const nome = limpar(d.nome);
    const email = limpar(d.email).toLowerCase();
    const senha = String(d.senha || '');
    if (nome.length < 3) erros.nome = 'Informe seu nome completo.';
    if (!emailValido(email)) erros.email = 'Digite um e-mail válido.';
    else if (db().usuarios.some((u) => u.email === email)) erros.email = 'Já existe uma conta com este e-mail.';
    if (senha.length < 8) erros.senha = 'A senha precisa ter pelo menos 8 caracteres.';
    let telefone = '';
    if (role === 'proprietario') {
      telefone = limpar(d.telefone);
      const dg = soDigitos(telefone);
      if (dg.length < 10 || dg.length > 13) erros.telefone = 'Informe um telefone com DDD.';
    }
    if (Object.keys(erros).length) return { ok: false, erros };
    const u = { id: uid('u'), role, nome, email, senha: hash(senha), criadoEm: Date.now() };
    if (role === 'proprietario') u.telefone = telefone;
    else u.curso = limpar(d.curso);
    db().usuarios.push(u);
    salvar();
    abrirSessao(u.id);
    return { ok: true, usuario: publico(u) };
  }

  function entrar(d) {
    const email = limpar(d.email).toLowerCase();
    const u = db().usuarios.find((x) => x.email === email);
    if (!u || u.senha !== hash(String(d.senha || ''))) return { ok: false, erros: { senha: 'E-mail ou senha incorretos.' } };
    if (d.role && u.role !== d.role) {
      const outro = u.role === 'proprietario' ? 'Sou proprietário' : 'Sou estudante';
      return { ok: false, erros: { email: `Esta conta foi criada em "${outro}". Troque a opção acima para entrar.` } };
    }
    abrirSessao(u.id);
    return { ok: true, usuario: publico(u) };
  }

  /* ---------- ciclo de 60 dias ---------- */
  function ciclo(vaga, agora = Date.now()) {
    const total = CONFIG.duracaoDias * DIA_MS;
    const expiraPrevisto = vaga.cicloInicio + total;
    const fim = vaga.encerradoEm ? Math.min(vaga.encerradoEm, expiraPrevisto) : expiraPrevisto;
    const restante = fim - agora;
    const dias = Math.max(0, Math.ceil(restante / DIA_MS));
    let status = 'ativa';
    if (restante <= 0) status = 'expirada';
    else if (dias <= CONFIG.avisoDias) status = 'atencao';
    return {
      inicio: vaga.cicloInicio,
      publicadoEm: vaga.publicadoEm,
      expiraEm: fim,
      dias,
      status,
      encerrado: !!vaga.encerradoEm,
      progresso: Math.max(0, Math.min(1, restante / total)),
      podeRenovar: status !== 'ativa',
    };
  }

  /* ---------- vagas ---------- */
  const porPessoa = (v) => (v.valorModo === 'pessoa' ? v.valor : v.valor / Math.max(1, v.vagas));

  function listarVagas(f = {}) {
    let lista = db().vagas.filter((v) => !v.removidoEm);
    if (!f.incluirExpiradas) lista = lista.filter((v) => ciclo(v).status !== 'expirada');
    if (f.tipo && TIPOS[f.tipo]) lista = lista.filter((v) => v.tipo === f.tipo);
    if (f.bairro) lista = lista.filter((v) => v.bairro === f.bairro);
    if (f.valorMax) lista = lista.filter((v) => porPessoa(v) <= f.valorMax);
    const ordem = f.ordem || 'recentes';
    const expiradaPorUltimo = (a, b) => (ciclo(a).status === 'expirada') - (ciclo(b).status === 'expirada');
    lista.sort((a, b) => {
      const e = expiradaPorUltimo(a, b);
      if (e) return e;
      if (ordem === 'menor') return porPessoa(a) - porPessoa(b);
      if (ordem === 'expiram') return ciclo(a).expiraEm - ciclo(b).expiraEm;
      return b.cicloInicio - a.cicloInicio;
    });
    return lista;
  }
  const obterVaga = (id) => db().vagas.find((v) => v.id === id && !v.removidoEm) || null;
  const vagasDoProprietario = (ownerId) => db().vagas.filter((v) => v.ownerId === ownerId && !v.removidoEm).sort((a, b) => b.cicloInicio - a.cicloInicio);
  const anunciante = (vaga) => { const u = db().usuarios.find((x) => x.id === vaga.ownerId); return u ? publico(u) : null; };

  function validarVaga(d) {
    const erros = {};
    if (!TIPOS[d.tipo]) erros.tipo = 'Escolha o tipo de imóvel.';
    const titulo = limpar(d.titulo);
    if (titulo.length < 10) erros.titulo = 'Use pelo menos 10 caracteres no título.';
    else if (titulo.length > 90) erros.titulo = 'O título pode ter no máximo 90 caracteres.';
    if (!BAIRROS.includes(d.bairro)) erros.bairro = 'Escolha o bairro.';
    const valor = Number(d.valor);
    if (!Number.isFinite(valor) || valor < 50) erros.valor = 'Informe o valor mensal.';
    else if (valor > 20000) erros.valor = 'Confira o valor informado.';
    if (!['pessoa', 'imovel'].includes(d.valorModo)) erros.valorModo = 'Indique se o valor é por pessoa ou pelo imóvel.';
    const vagas = Number(d.vagas);
    if (!Number.isInteger(vagas) || vagas < 1 || vagas > 20) erros.vagas = 'Informe de 1 a 20 vagas.';
    const dg = soDigitos(d.whatsapp);
    if (dg.length < 10 || dg.length > 13) erros.whatsapp = 'Informe o WhatsApp com DDD.';
    const mapa = analisarMaps(d.mapsUrl);
    if (!mapa.valido) erros.mapsUrl = mapa.erro;
    if (limpar(d.descricao).length < 40) erros.descricao = 'Descreva melhor o imóvel (mínimo de 40 caracteres).';
    if (!Array.isArray(d.fotos) || d.fotos.length < 1) erros.fotos = 'Envie pelo menos uma foto do imóvel.';
    else if (d.fotos.length > CONFIG.maxFotos) erros.fotos = `Envie no máximo ${CONFIG.maxFotos} fotos.`;
    if (d.termoAceito !== true) erros.termo = 'É preciso aceitar o termo de uso para publicar.';
    return { erros, mapa };
  }

  function criarVaga(d) {
    const u = usuarioAtual();
    if (!u || u.role !== 'proprietario') return { ok: false, erros: { geral: 'Entre com uma conta de proprietário para anunciar.' } };
    const { erros, mapa } = validarVaga(d);
    if (Object.keys(erros).length) return { ok: false, erros };
    const agora = Date.now();
    const vaga = {
      id: uid('v'), ownerId: u.id, tipo: d.tipo, titulo: limpar(d.titulo), bairro: d.bairro,
      valor: Math.round(Number(d.valor)), valorModo: d.valorModo, vagas: Number(d.vagas),
      whatsapp: limpar(d.whatsapp), mapsUrl: mapa.url, descricao: limpar(d.descricao), fotos: d.fotos.slice(),
      publicadoEm: agora, cicloInicio: agora, encerradoEm: null, renovacoes: 0, termoAceitoEm: agora,
    };
    db().vagas.push(vaga);
    try { salvar(); } catch (e) { db().vagas.pop(); return { ok: false, erros: { geral: e.message } }; }
    return { ok: true, vaga };
  }

  function donoDa(id) {
    const u = usuarioAtual();
    const vaga = obterVaga(id);
    if (!u || !vaga || vaga.ownerId !== u.id) return null;
    return vaga;
  }
  function renovarVaga(id) {
    const vaga = donoDa(id);
    if (!vaga) return { ok: false, erro: 'Só o anunciante pode renovar este anúncio.' };
    if (!ciclo(vaga).podeRenovar) return { ok: false, erro: `A renovação fica disponível nos últimos ${CONFIG.avisoDias} dias do anúncio.` };
    vaga.cicloInicio = Date.now();
    vaga.encerradoEm = null;
    vaga.renovacoes = (vaga.renovacoes || 0) + 1;
    salvar();
    return { ok: true, vaga };
  }
  function encerrarVaga(id) {
    const vaga = donoDa(id);
    if (!vaga) return { ok: false, erro: 'Só o anunciante pode encerrar este anúncio.' };
    vaga.encerradoEm = Date.now();
    salvar();
    return { ok: true, vaga };
  }

  /* ---------- comentários ---------- */
  const comentariosDa = (vagaId) => db().comentarios.filter((c) => c.vagaId === vagaId).sort((a, b) => a.criadoEm - b.criadoEm);
  function comentar(vagaId, texto) {
    const u = usuarioAtual();
    if (!u) return { ok: false, erro: 'Entre na sua conta para comentar.' };
    if (!obterVaga(vagaId)) return { ok: false, erro: 'Anúncio não encontrado.' };
    const t = limpar(texto);
    if (t.length < 3) return { ok: false, erro: 'Escreva um pouco mais.' };
    if (t.length > 600) return { ok: false, erro: 'O comentário pode ter até 600 caracteres.' };
    const c = { id: uid('c'), vagaId, autorId: u.id, autorNome: u.nome, autorRole: u.role, curso: u.curso || '', texto: t, criadoEm: Date.now() };
    db().comentarios.push(c);
    salvar();
    return { ok: true, comentario: c };
  }

  /* ---------- avaliação de segurança ---------- */
  const avaliacoesDa = (vagaId) => db().avaliacoes.filter((a) => a.vagaId === vagaId).sort((a, b) => b.criadoEm - a.criadoEm);

  // Diz se o usuário atual pode avaliar e, se não puder, por quê.
  function podeAvaliar(vagaId) {
    const u = usuarioAtual();
    const vaga = obterVaga(vagaId);
    if (!vaga) return { pode: false, motivo: 'Anúncio não encontrado.' };
    if (!u) return { pode: false, motivo: 'entrar' };
    if (u.role !== 'estudante') return { pode: false, motivo: 'Proprietários não avaliam imóveis. A avaliação é feita só por estudantes que moraram no local.' };
    const dono = anunciante(vaga);
    if (vaga.ownerId === u.id || (dono && dono.email === u.email)) return { pode: false, motivo: 'O anunciante não pode avaliar o próprio imóvel.' };
    if (db().avaliacoes.some((a) => a.vagaId === vagaId && a.autorId === u.id)) return { pode: false, motivo: 'Você já avaliou este imóvel. Obrigado!' };
    return { pode: true };
  }

  function avaliar(vagaId, d) {
    const chk = podeAvaliar(vagaId);
    if (!chk.pode) return { ok: false, erros: { geral: chk.motivo === 'entrar' ? 'Entre como estudante para avaliar.' : chk.motivo } };
    const erros = {};
    if (d.declaracao !== true) erros.declaracao = 'Confirme que você morou neste imóvel.';
    const mesAtual = new Date().toISOString().slice(0, 7);
    const ini = limpar(d.inicio), fim = limpar(d.fim);
    if (!/^\d{4}-\d{2}$/.test(ini) || !/^\d{4}-\d{2}$/.test(fim)) erros.periodo = 'Informe quando você morou lá (mês de entrada e de saída).';
    else if (ini > fim) erros.periodo = 'O mês de saída precisa ser depois do mês de entrada.';
    else if (fim > mesAtual) erros.periodo = 'O período não pode estar no futuro.';
    const notas = {};
    CRITERIOS.forEach((c) => {
      const n = Number(d.notas && d.notas[c.id]);
      if (!Number.isInteger(n) || n < 1 || n > 5) erros['nota_' + c.id] = 'Dê uma nota de 1 a 5.';
      else notas[c.id] = n;
    });
    const texto = limpar(d.texto);
    if (texto.length > 600) erros.texto = 'Use até 600 caracteres.';
    if (Object.keys(erros).length) return { ok: false, erros };
    const u = usuarioAtual();
    const a = { id: uid('a'), vagaId, autorId: u.id, autorNome: u.nome, curso: u.curso || '', periodo: { inicio: ini, fim }, notas, texto, declaracao: true, criadoEm: Date.now() };
    db().avaliacoes.push(a);
    salvar();
    return { ok: true, avaliacao: a };
  }

  function resumoSeguranca(vagaId) {
    const lista = avaliacoesDa(vagaId);
    if (!lista.length) return { total: 0 };
    const medias = {};
    CRITERIOS.forEach((c) => { medias[c.id] = lista.reduce((s, a) => s + a.notas[c.id], 0) / lista.length; });
    const geral = Object.values(medias).reduce((s, n) => s + n, 0) / CRITERIOS.length;
    return { total: lista.length, medias, geral };
  }
  const mediaAvaliacao = (a) => CRITERIOS.reduce((s, c) => s + a.notas[c.id], 0) / CRITERIOS.length;

  /* ---------- denúncia ---------- */
  function denunciar(vagaId, d) {
    if (!obterVaga(vagaId)) return { ok: false, erro: 'Anúncio não encontrado.' };
    if (!MOTIVOS_DENUNCIA.includes(d.motivo)) return { ok: false, erro: 'Escolha um motivo.' };
    const u = usuarioAtual();
    db().denuncias.push({ id: uid('d'), vagaId, motivo: d.motivo, detalhe: limpar(d.detalhe).slice(0, 600), autorId: u ? u.id : null, criadoEm: Date.now() });
    salvar();
    return { ok: true };
  }

  /* ---------- Google Maps ---------- */
  function analisarMaps(url) {
    const bruto = limpar(url);
    if (!bruto) return { valido: false, erro: 'Cole o link do Google Maps com a localização do imóvel.' };
    let u;
    try { u = new URL(bruto); } catch (e) { return { valido: false, erro: 'Cole o link completo, começando com https://' }; }
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return { valido: false, erro: 'Link inválido.' };
    const host = u.hostname.replace(/^www\./, '');
    const ehGoogle = /^google\.(com|com\.br)$/.test(host) && u.pathname.startsWith('/maps');
    const ehMaps = host === 'maps.google.com' || host === 'maps.google.com.br';
    const curto = host === 'maps.app.goo.gl' || (host === 'goo.gl' && u.pathname.startsWith('/maps'));
    if (!ehGoogle && !ehMaps && !curto) return { valido: false, erro: 'O link precisa ser do Google Maps (google.com/maps ou maps.app.goo.gl).' };
    let texto = u.href;
    try { texto = decodeURIComponent(u.href); } catch (e) {}
    const m = texto.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/)
      || texto.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/)
      || texto.match(/[?&](?:q|query|ll|destination)=(-?\d+\.\d+),\s*(-?\d+\.\d+)/);
    let coords = null;
    if (m) {
      const lat = parseFloat(m[1]), lng = parseFloat(m[2]);
      if (Math.abs(lat) <= 90 && Math.abs(lng) <= 180) coords = { lat, lng };
    }
    u.protocol = 'https:';
    return { valido: true, url: u.href, coords, curto };
  }
  function mapaEmbed(info, bairro) {
    if (info && info.coords) return `https://maps.google.com/maps?q=${info.coords.lat},${info.coords.lng}&z=16&output=embed`;
    return `https://maps.google.com/maps?q=${encodeURIComponent((bairro || 'Centro') + ', Diamantina - MG')}&z=15&output=embed`;
  }
  function distancias(coords) {
    if (!coords) return [];
    const rad = (g) => (g * Math.PI) / 180;
    return CONFIG.campi.map((c) => {
      const dLat = rad(c.lat - coords.lat), dLng = rad(c.lng - coords.lng);
      const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(coords.lat)) * Math.cos(rad(c.lat)) * Math.sin(dLng / 2) ** 2;
      const km = 6371 * 2 * Math.asin(Math.sqrt(h));
      return { nome: c.nome, km };
    });
  }

  /* ---------- formatação ---------- */
  const fmtMoeda = (n) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: n % 1 ? 2 : 0 }).format(n);
  const fmtData = (ms) => new Date(ms).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const fmtDataCurta = (ms) => new Date(ms).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' }).replace('.', '');
  const fmtMes = (ym) => { const [a, m] = ym.split('-').map(Number); return new Date(a, m - 1, 1).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }).replace('.', ''); };
  function fmtRelativo(ms) {
    const s = Math.round((Date.now() - ms) / 1000);
    if (s < 60) return 'agora';
    const min = Math.round(s / 60); if (min < 60) return `há ${min} min`;
    const h = Math.round(min / 60); if (h < 24) return `há ${h} h`;
    const d = Math.round(h / 24); if (d < 30) return `há ${d} ${d === 1 ? 'dia' : 'dias'}`;
    return `em ${fmtData(ms)}`;
  }
  function linkWhatsApp(numero, titulo) {
    let dg = soDigitos(numero);
    if (dg.length <= 11) dg = '55' + dg;
    const msg = `Olá! Vi o anúncio "${titulo}" no TetoCerto e gostaria de saber mais sobre a vaga.`;
    return `https://wa.me/${dg}?text=${encodeURIComponent(msg)}`;
  }
  function mascaraTelefone(v) {
    const d = soDigitos(v).slice(0, 11);
    if (d.length <= 2) return d.length ? `(${d}` : '';
    if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
    if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  }

  window.TC = {
    CONFIG, TIPOS, BAIRROS, CRITERIOS, MOTIVOS_DENUNCIA, TERMO, DIA_MS,
    usuarioAtual, cadastrar, entrar, sair,
    listarVagas, obterVaga, vagasDoProprietario, anunciante, validarVaga, criarVaga, renovarVaga, encerrarVaga, ciclo, porPessoa,
    comentariosDa, comentar,
    avaliacoesDa, podeAvaliar, avaliar, resumoSeguranca, mediaAvaliacao,
    denunciar,
    analisarMaps, mapaEmbed, distancias,
    fmtMoeda, fmtData, fmtDataCurta, fmtMes, fmtRelativo, linkWhatsApp, mascaraTelefone,
    restaurarDemo,
  };
})();
