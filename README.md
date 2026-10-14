# TetoCerto

Site gratuito que conecta estudantes que chegam a Diamantina para estudar na UFVJM com proprietários de casas, repúblicas e quartos. O site não processa pagamentos nem contratos: ele só aproxima as partes.

Este repositório é um **protótipo funcional**: HTML, CSS e JavaScript puros, sem build. Contas, anúncios, comentários, avaliações e denúncias funcionam de verdade, mas ficam salvos **só no navegador de quem usa** (localStorage).

## Como abrir

Qualquer servidor estático serve. Com Python:

```bash
python -m http.server 5500
```

Depois abra http://localhost:5500. (Abrir o `index.html` direto com dois cliques também funciona, mas as transições entre páginas e alguns navegadores ficam melhores com servidor.)

Para publicar de graça: GitHub Pages, Netlify ou Cloudflare Pages (é só subir a pasta).

## Páginas

| Arquivo | O que tem |
|---|---|
| `index.html` | Início: apresentação, faixa de valores, categorias, como funciona, diferenciais, vagas em destaque, para quem é, equipe |
| `buscar.html` | Busca com filtros (bairro, valor máximo por pessoa, tipo, ordenação) e anúncios expirados opcionais |
| `vaga.html?id=...` | Galeria, descrição, avaliação de segurança, localização com mapa e distância até os campi, comentários, WhatsApp, ciclo de 60 dias, denúncia |
| `entrar.html` | Entrar ou criar conta, com fluxos separados para estudante e proprietário |
| `anunciar.html` | Cadastro de vaga com todos os campos obrigatórios, upload de fotos, prévia ao vivo e termo de uso |
| `painel.html` | Painel do proprietário: resumo, status de cada anúncio, renovar +60 dias, marcar vaga preenchida |
| `termos.html` | Termo de uso e créditos das fotos |

## Contas de demonstração

Senha de todas: `demo1234`

- Proprietária: `demo.proprietario@tetocerto.test`
- Estudante: `demo.estudante@tetocerto.test`

Na tela de entrar há um botão “Preencher conta de demonstração”. No rodapé, “Restaurar dados de demonstração” apaga o que foi salvo no navegador e volta ao estado inicial.

## Onde ficam as regras de negócio

Todas em `js/store.js`, no topo do arquivo:

- **Sem transação:** não existe nenhum campo ou fluxo de pagamento.
- **Expiração em 60 dias:** `CONFIG.duracaoDias`. A função `ciclo()` calcula status (Ativa, Expira em breve nos últimos 7 dias, Expirada). Só o dono renova, e só quando faltam 7 dias ou menos.
- **Avaliação sem conflito de interesse:** `podeAvaliar()` bloqueia proprietários, o próprio anunciante e avaliação repetida. O estudante declara que morou no imóvel e informa o período.
- **Gratuito:** nada é cobrado.
- **Termo de uso obrigatório:** `criarVaga()` recusa o anúncio sem o aceite.
- **Perfis:** estudante e proprietário têm contas separadas; pais navegam sem conta.

## O que a equipe precisa trocar antes de publicar

1. **E-mails de contato** em `CONFIG.contatos` (`js/store.js`).
2. **Coordenadas dos campi** em `CONFIG.campi`: são aproximadas, confira no Google Maps.
3. **Lista de bairros** em `BAIRROS`.
4. **Fotos da cidade:** hoje vêm do Wikimedia Commons (licenças livres, com crédito em `termos.html`). Para a versão final, troque por fotos da equipe ou cedidas pela Secretaria de Turismo / UFVJM, editando `FOTOS` em `js/ui.js`.
5. **Anúncios de demonstração** (`seed()` em `js/store.js`): fotos e telefones são fictícios.
6. **Texto do termo** (`TERMO`): vale pedir uma revisão jurídica.

## Próximo passo: backend de verdade

Com localStorage, cada pessoa vê só o que foi salvo no próprio navegador. Para o site ser usado de verdade, troque as funções de `js/store.js` por chamadas a um backend (Supabase ou Firebase têm plano gratuito), mantendo os mesmos nomes e regras:

- autenticação no servidor (o hash de senha atual é só para o protótipo e **não é seguro**);
- expiração calculada no servidor;
- armazenamento das fotos (Supabase Storage / Firebase Storage);
- verificação mais forte de quem pode avaliar (por exemplo, o proprietário confirmar ex-moradores, ou comprovante);
- painel de moderação para as denúncias.

## Acessibilidade e movimento

- Tema claro e escuro (segue o sistema, com botão para trocar).
- Animações só com `transform`/`opacity`, e quem ativa “reduzir movimento” no sistema recebe versões sem deslocamento.
- Navegação por teclado nas abas, galeria e formulários; erros aparecem abaixo de cada campo. 
