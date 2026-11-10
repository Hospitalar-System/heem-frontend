# Pendências do texto jurídico

As páginas `/privacidade` e `/termos` passaram a usar o texto aprovado pelo Pedro em 09/11/2026
(`_bmad-output/implementation-artifacts/textos-legais-2026-11-09.md`), mantendo o nome **HEMM** como na fonte (o nome
oficial do produto ainda não foi decidido). A **revisão jurídica segue pendente**: por isso o aviso de texto provisório
continua na tela e a versão continua `provisoria-1` (a mesma gravada no servidor em `heem.leads.politica-versao`).
Ao publicar a versão revisada: trocar `VERSAO_POLITICA` e `heem.leads.politica-versao` do backend juntos, retirar o
aviso de provisório e esvaziar esta lista. Todo trecho `[PENDENTE: ...]` que voltar a existir em `conteudo.ts` aparece
destacado na tela.

## O que mudou em 09/11/2026
- [x] Data da última atualização: 09/11/2026 (política e termos)
- [x] Responsável e encarregado pelo tratamento de dados: Pedro Widholzer
- [x] Contato: pedrocostaw222@gmail.com
- [x] Retenção: formulário 60 dias; dados de conta removidos ou anonimizados em até 7 dias após o encerramento do contrato do Cliente, por procedimento operacional
- [x] Compartilhamento: Render, Vercel, Supabase e Resend, com transferência internacional (EUA)

## Ainda pendente
- [ ] **Revisão jurídica de toda a política e de todos os termos** (nada foi validado por advogado)
- [ ] Controlador como pessoa jurídica: razão social e CNPJ (hoje o texto cita só o responsável pessoa física)
- [ ] Termos: condições de contratação, planos e prazos (o texto remete ao contrato entre as partes)
- [ ] Termos: titularidade e licença de uso do software; limitação de responsabilidade; foro competente
- [ ] Alinhar com o backend: a retenção de 60 dias dos leads (job de limpeza) e a de 7 dias dos dados de conta
- [ ] Trocar a versão (`VERSAO_POLITICA`) junto com `heem.leads.politica-versao` quando o texto revisado for publicado

## Fora do texto
- [ ] E-mail de contato da landing (`EMAIL_CONTATO` em `../brand.ts`), se for exibido fora das páginas legais
- [ ] Domínio e `VITE_SITE_URL`
- [ ] Nome oficial do produto (HEMM ou HEEM): os textos legais seguem com HEMM até a decisão
