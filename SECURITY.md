# Política de segurança

## Reportando uma vulnerabilidade

**Não abra uma issue pública.** Use os *security advisories* privados do GitHub:
**Security → Report a vulnerability** neste repositório. Descreva o problema, os passos para reproduzir e o impacto que você enxerga. Respondemos o mais rápido possível.

## O que já está implementado

Autenticação JWT, autorização por dono no servidor, validação de entrada, senhas com bcrypt, proteção contra enumeração de contas, limites de requisição, cabeçalhos de segurança (Helmet no backend, CSP no nginx) e e-mails com conteúdo escapado. O detalhamento está na seção [Segurança do README](README.md#segurança).

## Limitações conhecidas

- O token de sessão fica no `localStorage`. A CSP reduz o risco de XSS, mas uma sessão por cookie `httpOnly` seria mais robusta.
- O cadastro não verifica o e-mail.
- O limite de requisições é mantido em memória, por instância. Com várias réplicas, use um *store* compartilhado (por exemplo, Redis).
- Imagens são referenciadas por URL e carregadas pelo navegador de quem as vê (isso revela o IP do visitante ao servidor da imagem).

## Boas práticas ao publicar

- Use um `JWT_SECRET` aleatório de 32+ caracteres e troque as senhas do MySQL.
- Rode com `NODE_ENV=production`, atrás de HTTPS, e configure `TRUST_PROXY` conforme o número de proxies.
- Nunca versione o arquivo `.env`.
