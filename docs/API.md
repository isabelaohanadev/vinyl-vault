# Referência da API

Base URL: `/api` (por exemplo `http://localhost:3000/api`). Todas as requisições e respostas usam JSON.

- [Convenções](#convenções)
- [Autenticação](#autenticação) · [Usuários](#usuários) · [Acervo (vinis)](#acervo-vinis) · [Classificados](#classificados) · [Comunidade e seguidores](#comunidade-e-seguidores)
- [Publicações](#publicações) · [Mensagens](#mensagens) · [Notificações](#notificações) · [Feedback](#feedback) · [Saúde](#saúde)
- [Mudanças em relação à API anterior](#mudanças-em-relação-à-api-anterior)

## Convenções

**Autenticação.** Exceto onde indicado, toda rota exige o cabeçalho `Authorization: Bearer <token>`. O token é um JWT devolvido por `/auth/register` e `/auth/login` (validade padrão de 7 dias, configurável em `JWT_EXPIRES_IN`). O usuário que age é **sempre** o dono do token: nenhuma rota aceita um `usuario_id` no corpo para agir em nome de outra pessoa.

**Erros.** O formato é sempre `{ "error": "mensagem em português" }`. Erros de validação trazem também `details`:

```json
{
  "error": "Dados inválidos.",
  "details": [
    { "campo": "email", "mensagem": "E-mail inválido." },
    { "campo": "senha", "mensagem": "Deve ter no mínimo 8 caracteres." }
  ]
}
```

| Status | Quando |
| --- | --- |
| `400` | Validação falhou, corpo inválido ou ação impossível (ex.: seguir a si mesmo) |
| `401` | Sem token, token inválido/expirado ou credenciais erradas |
| `403` | Token válido, mas o recurso pertence a outro usuário |
| `404` | Recurso inexistente |
| `409` | Conflito (nome de usuário ou e-mail já cadastrados) |
| `413` | Corpo maior que `JSON_LIMIT` |
| `429` | Limite de requisições excedido (veja abaixo) |
| `502` | Falha ao enviar e-mail (feedback) |
| `500` | Erro interno (a mensagem nunca expõe detalhes) |

**Limites de requisições** (por IP, janela deslizante; retornam cabeçalhos `RateLimit-*`):

| Escopo | Limite |
| --- | --- |
| API inteira | 1500 / 15 min **por usuário** logado (por IP para quem não está logado) |
| `login`, `register`, `reset-password` | 20 / 15 min (só as tentativas que falham contam) |
| `register` | 10 / hora (conta todas as tentativas) |
| `forgot-password`, `feedback` | 5 / hora |

**Paginação.** Listas aceitam `limite` e `offset`. Os padrões e máximos variam: classificados e comunidade (100, máx. 200), posts (20, máx. 50), seguidores/seguindo (50, máx. 100), notificações (`limite`, 30, máx. 100) e mensagens (`limite` 100, máx. 200, com `antes=<id>` para páginas anteriores).

**Imagens** (`foto`, `foto_perfil`): uma URL `http(s)` (até 2048 caracteres) ou um data URI `data:image/{png,jpeg,webp,gif};base64,...`. String vazia remove a imagem.

**Datas.** Timestamps em ISO 8601 (UTC); datas de nascimento como `YYYY-MM-DD`.

## Autenticação

| Método e rota | Auth | Descrição |
| --- | :-: | --- |
| `POST /auth/register` | – | Cria a conta e já devolve `{ token, usuario }` (`201`) |
| `POST /auth/login` | – | Entra com e-mail **ou** usuário. Devolve `{ token, usuario }` |
| `GET /auth/me` | ✔ | Perfil atual (`{ usuario }`). `401` se a conta não existe mais |
| `POST /auth/forgot-password` | – | Envia o link de recuperação. Responde igual para e-mails cadastrados ou não |
| `POST /auth/reset-password` | – | Troca a senha usando o token recebido por e-mail (uso único, validade de 60 min) |

```http
POST /api/auth/register
{
  "nome_completo": "Ana Souza",       // 2–150
  "username": "ana.souza",            // 3–30; letras, números, "_" e "."
  "email": "ana@example.com",
  "senha": "uma-senha-forte",         // 8+ caracteres, até 72 bytes
  "data_nascimento": "1992-03-14",    // opcional, não pode ser futura
  "bio": "Jazz e bossa nova",         // opcional, até 500
  "foto_perfil": "https://..."        // opcional
}
```

```http
POST /api/auth/login
{ "login": "ana.souza", "senha": "uma-senha-forte" }
→ 200 { "token": "eyJhbGciOi...", "usuario": { "id": 1, "email": "...", "nome_completo": "...", "username": "...", "bio": null, "foto_perfil": null, "tocando_agora": null, "data_nascimento": null } }
→ 401 { "error": "Credenciais inválidas." }       // mesma resposta para senha errada e usuário inexistente
```

```http
POST /api/auth/reset-password
{ "token": "<token do e-mail>", "novaSenha": "outra-senha-forte" }
```

## Usuários

| Método e rota | Descrição |
| --- | --- |
| `GET /usuarios/:id` | Perfil público (sem e-mail nem data de nascimento) |
| `PUT /usuarios/:id` | **Só o próprio usuário.** Atualização parcial: `nome_completo`, `bio`, `foto_perfil` e, para trocar a senha, `senha` + `senha_atual`. `""` limpa `bio` e `foto_perfil`. E-mail e usuário não mudam por aqui |
| `PUT /usuarios/:id/status` | **Só o próprio usuário.** `{ "tocando_agora": "Kind of Blue - Miles Davis" }` (`""` limpa) |
| `DELETE /usuarios/:id` | **Só o próprio usuário.** Apaga a conta e, em cascata, acervo, posts, seguidores, mensagens e notificações |
| `GET /usuarios/:id/vinis` | Acervo de qualquer colecionador (mais recentes primeiro) |
| `GET /usuarios/:id/posts` | Publicações do usuário (`limite`, `offset`) |
| `GET /usuarios/:id/stats` | `{ seguidores, seguindo, total_vinis, total_desejos, total_trocas, total_posts, eu_sigo }` |
| `GET /usuarios/:id/seguidores` · `GET /usuarios/:id/seguindo` | Perfis públicos (`limite`, `offset`) |
| `POST /usuarios/:id/seguir` | Segue o usuário (`201`; `200` se já seguia; `400` se for você mesmo) |
| `DELETE /usuarios/:id/seguir` | Deixa de seguir |

## Acervo (vinis)

| Método e rota | Descrição |
| --- | --- |
| `POST /vinis` | Cadastra um disco. O dono é o usuário do token (`201`, devolve `{ vinil }`) |
| `GET /vinis/:id` | Um disco |
| `PUT /vinis/:id` | **Só o dono** (`403` caso contrário). Atualização parcial |
| `DELETE /vinis/:id` | **Só o dono** |

Campos de um disco:

| Campo | Tipo | Observações |
| --- | --- | --- |
| `nome`, `artista` | string | obrigatórios, até 255 |
| `genero` | string | até 100 |
| `ano` | inteiro | entre 1877 e o próximo ano |
| `estado_capa`, `estado_disco` | enum | `M`, `NM`, `VG+`, `VG`, `G`, `P` |
| `nota` | inteiro | 0 a 5 (padrão 0) |
| `adquirido` | boolean | `true` = na coleção (padrão), `false` = lista de desejos |
| `negociavel` | boolean | aparece nos classificados (padrão `false`) |
| `foto` | imagem | capa |
| `spotify`, `preview_url` | URL `http(s)` | link do Spotify e áudio de preview |

Quando um disco passa a ser negociável, quem tem o mesmo álbum na lista de desejos recebe uma notificação do tipo `match` (uma vez, não a cada edição).

## Classificados

`GET /classificados`: discos negociáveis de **outros** colecionadores, cada um com `dono: { id, nome_completo, username, foto_perfil }`. Parâmetros: `busca` (título ou artista), `limite`, `offset`.

## Comunidade e seguidores

`GET /comunidade`: perfis públicos de todos os outros usuários, com `is_seguindo`. Parâmetros: `busca` (nome ou usuário), `limite`, `offset`.

## Publicações

| Método e rota | Descrição |
| --- | --- |
| `GET /posts` | Linha do tempo, mais recentes primeiro. `hashtag=rock` filtra por hashtag **inteira** (`#rock` não casa com `#rockabilly`) |
| `POST /posts` | `{ "foto"?, "legenda"? }`: precisa de ao menos um dos dois (legenda até 2200) |
| `GET /posts/:id` | Uma publicação |
| `PUT /posts/:id` | **Só o autor.** `{ "legenda" }` (um post sem foto não pode ficar sem legenda) |
| `DELETE /posts/:id` | **Só o autor.** Remove também curtidas e comentários |
| `POST /posts/:id/curtir` | Alterna a curtida. Devolve `{ acao: "adicionada" \| "removida", user_liked, likes_count }` |
| `GET /posts/:id/curtidas` | Quem curtiu (perfis públicos) |
| `GET /posts/:id/comentarios` | Comentários em ordem cronológica |
| `POST /posts/:id/comentarios` | `{ "texto", "parent_id"?, "usuario_mencionado_id"? }` (texto até 1000) |
| `DELETE /comentarios/:id` | O autor do comentário **ou** o dono do post |

Cada post vem como `{ id, usuario_id, foto, legenda, criado_em, likes_count, comments_count, user_liked, autor: { id, username, nome_completo, foto_perfil } }`.

Quem é notificado ao comentar é definido pelo servidor: o usuário mencionado, senão o autor do comentário respondido (`parent_id`), senão o dono do post.

## Mensagens

Somente os dois participantes enxergam uma conversa.

| Método e rota | Descrição |
| --- | --- |
| `POST /mensagens` | `{ "destinatario_id", "texto"?, "vinil_id"? }`: texto e/ou um disco compartilhado. O remetente é o usuário do token |
| `GET /mensagens/:amigo_id` | Histórico em ordem cronológica (`limite`, `antes`) |
| `GET /mensagens/nao-lidas` | `{ total }` |
| `PUT /mensagens/ler` | `{ "amigo_id" }`: marca como lidas as mensagens recebidas dessa pessoa |
| `GET /conversas` | Suas conversas, a mais recente primeiro, com `nao_lidas` e `ultima_mensagem` |

## Notificações

Tipos: `curtida`, `comentario`, `seguir`, `mensagem`, `match`.

| Método e rota | Descrição |
| --- | --- |
| `GET /notificacoes` | Suas notificações, com o `ator` (`limite`, padrão 30) |
| `GET /notificacoes/nao-lidas` | `{ total }` |
| `PUT /notificacoes/:id/ler` | Marca uma como lida (`404` se não for sua) |
| `PUT /notificacoes/ler-todas` | Marca todas como lidas |

## Feedback

`POST /feedback` (público, 5 por hora): `{ "mensagem" (1–2000), "usuario_email"?, "usuario_nome"? }`. Envia um e-mail para `FEEDBACK_TO`. Todo o conteúdo é escapado.

## Saúde

`GET /health` (público): `200 { status: "ok", database: "up", uptime }` ou `503 { status: "error", database: "down" }`. Usado pelo healthcheck do Docker.

## Mudanças em relação à API anterior

Todas as rotas passaram a exigir autenticação (exceto as de login, cadastro, recuperação de senha, feedback e saúde), e as rotas aninhadas foram achatadas.

| Antes | Agora |
| --- | --- |
| `POST /auth/login` com `{ username, senha }`, sem token | `POST /auth/login` com `{ login, senha }`, devolve `token` |
| `POST /forgot-password`, `POST /reset-password` | `POST /auth/forgot-password`, `POST /auth/reset-password` |
| `GET /vinis/:usuario_id` | `GET /usuarios/:id/vinis` |
| `GET /classificados/:meu_id` | `GET /classificados` |
| `GET /comunidade/:meu_id` | `GET /comunidade` |
| `POST /posts/seguir` `{ seguidor_id, seguido_id }` | `POST /usuarios/:id/seguir` |
| `DELETE /posts/seguir/:seguidor_id/:seguido_id` | `DELETE /usuarios/:id/seguir` |
| `GET /posts/perfil/:id/{stats,seguidores,seguindo}` | `GET /usuarios/:id/{stats,seguidores,seguindo}` |
| `GET /posts/timeline` | `GET /posts` |
| `GET /posts/post/:id` | `GET /posts/:id` |
| `GET /posts/posts/:usuario_id` | `GET /usuarios/:id/posts` |
| `POST /posts/posts`, `PUT /posts/posts/:id` | `POST /posts`, `PUT /posts/:id` (e novo `DELETE /posts/:id`) |
| `POST /posts/posts/curtir` | `POST /posts/:id/curtir` |
| `GET /posts/posts/:post_id/curtidas` | `GET /posts/:id/curtidas` |
| `POST /posts/posts/comentar` | `POST /posts/:id/comentarios` |
| `GET /posts/posts/:post_id/comentarios` | `GET /posts/:id/comentarios` |
| `DELETE /posts/posts/comentarios/:id` | `DELETE /comentarios/:id` |
| `GET /notificacoes/:usuario_id` | `GET /notificacoes` |
| `PUT /notificacoes/ler/:id` | `PUT /notificacoes/:id/ler` |
| `GET /mensagens/:meu_id/:amigo_id` | `GET /mensagens/:amigo_id` |
| `GET /mensagens/naolidas/:usuario_id` | `GET /mensagens/nao-lidas` |
| `PUT /mensagens/ler` `{ meu_id, amigo_id }` | `PUT /mensagens/ler` `{ amigo_id }` |
| `GET /mensagens/conversas/:meu_id` | `GET /conversas` |

Ids de usuário no corpo (`usuario_id`, `remetente_id`, `seguidor_id`, `meu_id`, `dono_post_id`) foram removidos: o servidor usa o token e consulta o banco.
