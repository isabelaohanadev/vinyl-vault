# Vinyl Vault: API

API REST em Express 5 + MySQL. A visão geral, a configuração e o deploy estão no [README da raiz](../README.md); os endpoints, em [docs/API.md](../docs/API.md).

```bash
cp .env.example .env     # defina JWT_SECRET (openssl rand -hex 32)
npm install
npm run dev              # http://localhost:3000, recarrega ao salvar
```

| Script | O que faz |
| --- | --- |
| `npm start` | Inicia a API |
| `npm run dev` | Inicia com `--watch` |
| `npm test` | Testes (precisam de um MySQL; veja abaixo) |
| `npm run test:coverage` | Testes com cobertura |
| `npm run lint` | ESLint |
| `npm run seed` | Dados de demonstração (`-- --reset` recria) |

## Testes

Os testes de integração usam um MySQL real e **apagam todas as tabelas** do banco de teste. O padrão é `127.0.0.1:3307`, usuário `vinyl`, banco `vinylvault_test`, que o `npm run db:up` (na raiz) já prepara. Para outro servidor:

```bash
TEST_DB_HOST=127.0.0.1 TEST_DB_PORT=3306 TEST_DB_USER=root TEST_DB_PASSWORD=senha TEST_DB_NAME=meu_banco_test npm test
```

O nome do banco precisa terminar em `_test`; caso contrário o `tests/setup.js` aborta. O arquivo `backend/.env` nunca é lido durante os testes.

## Estrutura

`src/app.js` monta o Express (sem abrir porta, para ser testável); `src/server.js` valida o ambiente, confere o MySQL e escuta a porta, encerrando com elegância em `SIGTERM`. O fluxo de uma requisição é `routes → middlewares/validate (schemas Zod) → controllers → MySQL`, com `middlewares/auth` protegendo as rotas privadas e `middlewares/errorHandler` formatando os erros.
