# Pendências do texto jurídico (Story L4)

As páginas `/privacidade` e `/termos` são **provisórias** (versão `provisoria-1`, a mesma gravada no servidor em
`heem.leads.politica-versao`). Todo trecho `[PENDENTE: ...]` aparece destacado na tela e deve ser preenchido pelo
Pedro/jurídico em `conteudo.ts` (mesma pasta). Ao publicar o texto definitivo: trocar `VERSAO_POLITICA` e
`heem.leads.politica-versao` do backend juntos, retirar o aviso de provisório e esvaziar esta lista.

## Política de Privacidade
- [ ] Controlador: razão social e CNPJ
- [ ] Encarregado (DPO): nome e e-mail
- [ ] Compartilhamento: com quem e para quê (operadores/suboperadores)
- [ ] Retenção: prazo e critério de eliminação dos dados do formulário
- [ ] Segurança: medidas adicionais no servidor validadas pela área responsável
- [ ] Data da última atualização

## Termos de Uso
- [ ] Prestador: razão social e CNPJ
- [ ] Acesso e contratação: condições, planos e prazos
- [ ] Uso aceitável: revisão jurídica das regras e consequências
- [ ] Propriedade intelectual: titularidade e licença de uso
- [ ] Limitação de responsabilidade
- [ ] Lei aplicável e foro
- [ ] Data da última atualização

## Fora do texto
- [ ] E-mail de contato (`EMAIL_CONTATO` em `../brand.ts`)
- [ ] Domínio e `VITE_SITE_URL`
