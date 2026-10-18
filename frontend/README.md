# Vinyl Vault: Frontend

Aplicação React 19 + Vite. A visão geral, a configuração e o deploy estão no [README da raiz](../README.md).

```bash
npm install
npm run dev              # http://localhost:5173 (o /api é encaminhado para a API em :3000)
```

| Script | O que faz |
| --- | --- |
| `npm run dev` | Servidor de desenvolvimento com HMR |
| `npm run build` | Build de produção em `dist/` |
| `npm run preview` | Serve o build localmente |
| `npm test` | Testes (Vitest + Testing Library) |
| `npm run lint` | ESLint |

## Como funciona

- O cliente HTTP (`src/lib/api.js`) usa a origem atual (`/api`), anexa o token JWT e desloga o usuário quando a API responde 401 com uma sessão ativa. Para uma API em outro domínio, defina `VITE_API_URL` (veja `.env.example`).
- `AuthProvider` guarda a sessão, valida-a com `/auth/me` ao abrir o app e expõe `login`, `register`, `logout` e `updateUser` (`useAuth`).
- `PlayerProvider` mantém um único `<audio>` para o app inteiro; o `Player` da barra inferior e o modal de detalhes o controlam (`usePlayer`).
- `useFetch` e `usePagedFetch` concentram o carregamento de dados (estados de carregando/erro, tentar de novo, cancelamento e paginação).
- Em produção, o `nginx/` serve o build, faz o proxy de `/api` e aplica os cabeçalhos de segurança.
