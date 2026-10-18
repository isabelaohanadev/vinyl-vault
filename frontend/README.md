# Interface do Vinyl Vault

HTML, CSS e JavaScript puros, **sem etapa de build**. Os arquivos em `index.html`, `scripts/` e `styles/` são exatamente o que o navegador recebe.

## Rodando

```bash
npm ci
npm run dev        # http://localhost:5173, com /api encaminhado para http://localhost:3000
```

O `dev-server.js` não tem dependências: entrega os arquivos estáticos (só `index.html`, `scripts`, `styles`, `assets` e `vendor`) e faz o proxy de `/api` para o backend. Variáveis:

| Variável | Padrão | |
| --- | --- | --- |
| `PORT` | `5173` | Porta do servidor |
| `API_TARGET` | `http://localhost:3000` | Onde está o backend |

Em produção quem faz esse papel é o nginx da imagem Docker ([`nginx/`](nginx)), que também aplica a Content-Security-Policy.

## Organização

| Arquivo | Responsabilidade |
| --- | --- |
| `config.js` | Endereço da API quando ela fica em outro domínio (vazio = `/api` na mesma origem) |
| `utils.js` | Escape de HTML, de argumentos de `onclick`, de URLs de imagem e de CSS; redimensionamento de fotos |
| `api.js` | Cliente da API (token, erros, 401) e adaptadores que "achatam" `autor`, `dono` e `ator` |
| `globals.js` | Estado compartilhado, tema, toasts e navegação entre telas |
| `auth.js` | Cadastro em duas etapas, login, recuperação de senha, perfil |
| `collection.js` | Acervo, wishlist, busca automática (iTunes), modal do disco e PDF |
| `player.js` | Vinil que gira e prévia de áudio |
| `rating.js` · `discover.js` · `nowplaying.js` | Estrelas, recomendações e "tocando agora" |
| `market.js` | Classificados |
| `community.js` · `chat_notif.js` · `badges.js` | Timeline, comentários, perfis, chat, notificações e selos |
| `dashboard.js` | Gráficos (Chart.js) |

Os scripts são carregados na ordem do `index.html` e compartilham funções globais, porque as telas usam `onclick="..."`.

## Regras importantes

- **Texto que não é seu nunca entra em `innerHTML` cru.** Nomes, bios, legendas, comentários, mensagens e títulos que vêm do iTunes passam por `escapeHtml`, `jsArg` (argumento de `onclick`), `imgSrc`, `cssUrl` ou `hrefSeguro`. O E2E de segurança injeta *payloads* de XSS em todos esses pontos.
- **O token só vai para a nossa API.** Chamadas ao iTunes usam `fetch` direto, sem `Authorization`.
- Bibliotecas de terceiros ficam em `vendor/` (com as licenças); `npm run vendor` as copia de `node_modules` de novo depois de uma atualização.

## Publicação estática

`npm run build:static` copia só o que o navegador precisa para `dist/` e escreve o `config.js` a partir de `VINYL_API_URL` (por exemplo `https://minha-api.onrender.com`). É o que a Vercel executa (veja [`../vercel.json`](../vercel.json) e [`../docs/DEPLOY-GRATIS.md`](../docs/DEPLOY-GRATIS.md)).

## Qualidade

```bash
npm run lint       # ESLint
npm test           # script de build estático
```

Os testes da interface ficam em [`../e2e`](../e2e) (Playwright).

## Foto da página "Sobre Nós"

`assets/iandj.jpg` não é versionada (é uma foto pessoal). Sem o arquivo, a imagem some e o resto da página continua normal.
