# Contribuindo

Obrigada por querer ajudar! Este guia mostra como rodar o projeto e o que esperamos de uma contribuição.

## Preparando o ambiente

Você precisa de **Node 22+** e **Docker** (para o MySQL).

```bash
npm run install:all
cp backend/.env.example backend/.env      # defina JWT_SECRET: openssl rand -hex 32
npm run db:up                             # MySQL com o schema e o banco de testes
npm run seed                              # dados de demonstração (opcional)
npm run dev                               # API :3000 + app :5173
```

Detalhes e solução de problemas no [README](README.md#como-rodar).

## Antes de abrir um pull request

```bash
npm run lint
npm test            # API, contra um MySQL real
npm run test:frontend
npm run test:e2e    # interface, em navegador real (precisa do app rodando, veja o README)
```

O CI roda tudo isso, inclusive a stack Docker completa com a suíte E2E. Pull requests só entram com o CI verde.

- Mudou o **comportamento**? Escreva ou ajuste testes. No backend, testes de integração em `backend/tests/integration`; na interface, um teste Playwright em `e2e/tests` (a API do iTunes, as capas e o áudio já são simulados pelos *helpers*).
- Mudou o **schema do banco**? Atualize `database/schema.sql` **e** adicione uma migração numerada em `database/migrations/` para quem já tem dados.
- Mudou a **API**? Atualize [docs/API.md](docs/API.md).
- Mudou uma **variável de ambiente**? Atualize o `.env.example` correspondente e a tabela do README.

## Convenção de commits

Usamos [Conventional Commits](https://www.conventionalcommits.org/pt-br/). O título diz *o quê* em poucas palavras e o corpo explica o *porquê*:

```
feat(backend): add rate limiting to the login route
fix(frontend): keep the player from covering modals
docs: explain how to run the seed script
test(backend): cover expired reset tokens
```

Tipos usados: `feat`, `fix`, `refactor`, `test`, `docs`, `build`, `ci`, `chore`, `style`. Prefira commits pequenos e coerentes: cada um deve passar nos testes.

## Estilo de código

- Indentação de 4 espaços, `LF`, aspas simples no código (veja o [.editorconfig](.editorconfig)); o ESLint reforça o resto.
- Sem comentários óbvios: comente o **porquê** de decisões não evidentes.
- Nomes de domínio (`vinil`, `usuario`, `classificados`) ficam em português, como na API. No backend o código em volta é em inglês; a interface (`frontend/`) sempre foi escrita em português e segue assim.
- Regras de negócio e de posse ficam **no servidor**. Nunca confie em ids vindos do cliente: use `req.user.id`.
- Na interface, **todo texto que não é seu** (outros usuários, API do iTunes) passa por `escapeHtml`, `jsArg`, `imgSrc`, `cssUrl` ou `hrefSeguro` (`frontend/scripts/utils.js`) antes de entrar num template. O E2E de segurança confere isso.
