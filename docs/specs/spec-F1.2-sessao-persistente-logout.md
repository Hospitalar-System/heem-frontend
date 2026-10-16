# Spec F1.2 — Sessão persistente e logout

**Status:** especificação pronta; integração de produção depende da configuração do provedor de identidade e do SDK escolhido.
**Story:** F1.2 — Sessão persistente e logout (`docs/epics.md`)
**Issue:** [#2 — Sessão persistente e logout](https://github.com/Hospitalar-System/heem-frontend/issues/2)
**Dependência de produto:** [F1.1 — Login do painel Web](spec-F1.1-login.md)
**Persona:** qualquer usuário autenticado do painel Web.

## Objetivo

Manter a sessão válida enquanto o usuário trabalha, renovando access tokens silenciosamente antes de expirarem e encerrando a sessão com segurança quando o refresh falhar ou o usuário sair. Nenhuma tela protegida pode continuar acessível após o encerramento.

## Contexto atual

- O login local chama `GET /dev/token/admin-cliente` e consulta `GET /api/v1/me`; o token e a identidade ficam somente em memória (`src/features/auth/session.ts`).
- A sessão é perdida ao recarregar a página. Não há ação de logout, integração com SDK OIDC/Auth0 nem renovação de token no frontend.
- O backend não disponibiliza rotas próprias de login, refresh ou logout. Refresh e logout devem ser executados pelo SDK/provedor de identidade; a API HEMM continua validando access tokens Bearer.
- `docs/epics.md` define access token com TTL de até 15 minutos e refresh token com TTL de até 7 dias e rotação single-use (AD-8).

## Escopo

- Renovação silenciosa do access token antes do vencimento, sem interromper a navegação quando o usuário está ativo.
- Atualização do token usado pelo `apiClient` após renovação bem-sucedida.
- Recuperação da sessão no bootstrap da aplicação conforme a sessão/refresh suportado pelo provedor.
- Encerramento local seguro quando o refresh expirar, for inválido, revogado ou falhar de forma irrecuperável.
- Ação “Sair” acessível no shell autenticado, com logout no provedor quando configurado.
- Proteção contra corridas de renovação e respostas 401 concorrentes.
- Comportamento previsível no modo local de desenvolvimento, cujo token de perfil não oferece refresh.

Fora de escopo: emissão ou armazenamento de credenciais, implementação de endpoints de refresh/logout no backend, alteração das regras RBAC, recuperação de senha e sincronização de sessão entre dispositivos.

## Estratégia de autenticação

O provedor é a fonte de verdade para refresh e logout. O frontend não deve implementar rotação de refresh token manualmente nem enviar refresh tokens à API HEMM.

1. Integrar o SDK OIDC definido para o ambiente (Auth0 para o MVP conforme a arquitetura; manter a camada de sessão desacoplada para permitir substituição futura por Keycloak).
2. Configurar o cliente SPA e o provedor para access token curto (até 15 minutos), refresh token com rotação single-use (até 7 dias), audiência da API, callback/logout URLs e escopos necessários. Não presumir que essas configurações já existem.
3. Usar os métodos de renovação silenciosa e logout do SDK. A sessão em memória continua expondo o access token atual e a identidade para o `apiClient` e os componentes protegidos.
4. Não gravar access token, refresh token, ID token ou dados pessoais em `localStorage`/`sessionStorage` próprios da aplicação. Preferir o armazenamento seguro suportado pelo SDK e a sessão do provedor; a escolha final deve considerar o modelo de ameaça XSS e a configuração do tenant.
5. O modo de desenvolvimento `/dev/token/admin-cliente` não oferece renovação. Quando seu token expirar ou houver reload, exigir novo login de desenvolvimento e explicar isso sem simular uma renovação.

## Requisitos funcionais

1. No bootstrap, inicializar o SDK uma única vez antes de liberar rotas protegidas. Enquanto a restauração estiver em andamento, mostrar estado de carregamento sem piscar conteúdo protegido nem redirecionar prematuramente.
2. Com sessão válida, carregar/recuperar o access token atual e a identidade do usuário. O contrato de `/api/v1/me` e o comportamento do F1.1 permanecem a fonte da identidade; não duplicar consultas sem necessidade.
3. Agendar renovação silenciosa antes do `expires_at` do access token, respeitando a margem recomendada pelo SDK e os limites de AD-8. Não esperar o primeiro 401 para iniciar renovação.
4. Renovar apenas enquanto a sessão for elegível; respeitar visibilidade/atividade quando suportado pelo SDK e evitar trabalho desnecessário em abas inativas. Retomar a validação/renovação quando a aba voltar a ficar visível.
5. Atualizar atomicamente o access token em memória após sucesso. Chamadas seguintes do `apiClient` usam o token novo. Se múltiplas chamadas precisarem renovar ao mesmo tempo, compartilhar uma única operação de refresh.
6. Em falha recuperável de rede, seguir a política de retry/backoff limitada do SDK sem apagar imediatamente uma sessão ainda válida. Ao determinar refresh inválido, expirado, revogado ou não recuperável, limpar sessão e caches sensíveis, cancelar estado protegido e navegar para `/login` sem crash.
7. A ação “Sair” deve estar disponível no shell autenticado. Ao acioná-la, bloquear ações repetidas, limpar imediatamente sessão local e caches em memória que contenham dados autenticados, navegar para `/login` e então concluir o logout do provedor conforme o fluxo do SDK. Não manter a UI protegida visível durante o redirecionamento.
8. Requisições que retornem 401 podem solicitar uma renovação única pelo SDK e repetir a requisição uma única vez apenas quando o SDK indicar sucesso. Não criar loop de retry; após falha definitiva, executar encerramento da sessão.
9. Acessar diretamente URL protegida após logout ou refresh inválido deve redirecionar para `/login`. Voltar pelo histórico do navegador não pode restaurar dados protegidos em tela.
10. Falhas de logout no provedor não podem restaurar a sessão local. Informar que a sessão local foi encerrada; o usuário pode tentar novamente ou concluir a saída na tela do provedor, conforme sua resposta.

## Estados e experiência

- **Restaurando sessão:** loader discreto, sem conteúdo autenticado.
- **Autenticado/renovando:** manter a tela atual, sem modal ou navegação visível durante refresh silencioso.
- **Refresh temporariamente indisponível:** preservar a sessão ainda válida e apresentar feedback somente se houver impacto real; retry limitado.
- **Sessão expirada/inválida:** limpar sessão, redirecionar a login e mostrar aviso breve de sessão expirada.
- **Saindo:** desabilitar o comando “Sair” e bloquear navegação protegida enquanto o logout é processado.
- **Logout concluído:** tela de login sem perfil/dados da sessão anterior.

Utilizar os tokens de `docs/design.md`, manter os temas Dark/Light/Auto e garantir que estados e mensagens sejam acessíveis por leitor de tela. O tema escolhido não é limpo pelo logout.

## Contratos e decisões pendentes

| Item | Situação |
|---|---|
| API HEMM para refresh/logout | Não existe e não deve ser criada pelo frontend; operações pertencem ao SDK/provedor. |
| Provedor do MVP | Auth0 previsto na arquitetura; configuração do tenant e SDK no frontend precisam ser confirmados. |
| Substituição futura | A camada da aplicação deve depender de uma interface de sessão, não de chamadas Auth0 espalhadas pelos componentes. |
| Armazenamento persistente do SDK | Definir e revisar com segurança. Não armazenar tokens em storage próprio; comportamento após reload deve ser validado com a estratégia do provedor. |
| Rotas de callback/retorno e logout | Confirmar URLs locais e de produção, domínio do provedor e comportamento de retorno. |
| Token de desenvolvimento | `/dev/token/{perfil}` é útil para login local, mas não implementa refresh nem logout remoto; expiração exige novo login. |

## Critérios de aceite

- [ ] Sessão recuperada no bootstrap não revela telas protegidas antes da validação.
- [ ] Token próximo do vencimento é renovado silenciosamente antes de expirar, sem redirecionar usuário ativo.
- [ ] Chamadas após refresh usam o access token atualizado e refresh concorrente não dispara operações duplicadas.
- [ ] Refresh expirado/inválido/revogado encerra a sessão local e redireciona para `/login` sem erro não tratado.
- [ ] “Sair” encerra a sessão do frontend, limpa dados autenticados em memória e inicia logout no provedor.
- [ ] Após logout, rota protegida direta ou via histórico não exibe dados autenticados.
- [ ] Falha de rede temporária não cria loop de renovação nem encerra antecipadamente uma sessão ainda válida.
- [ ] No modo dev, a ausência de refresh é tratada sem chamada fictícia; novo login é solicitado após expiração/reload.
- [ ] Tokens e dados pessoais não são gravados em `localStorage`/`sessionStorage` pela aplicação.
- [ ] Testes cobrem bootstrap, renovação próxima ao vencimento, refresh compartilhado, falha definitiva, logout, rotas protegidas e modo dev.

## Plano de testes

- Testes unitários do adaptador de sessão/provedor: sessão válida, expiração, refresh bem-sucedido, refresh inválido, erro transitório e logout.
- Testes de concorrência: duas chamadas simultâneas próximas à expiração compartilham o refresh e recebem token atualizado.
- Testes de integração do `apiClient`: bearer atualizado e retry máximo de uma tentativa após 401, sem loop.
- Testes do bootstrap/router: estado de restauração, navegação após sessão inválida, logout e bloqueio de rotas protegidas inclusive após voltar no histórico.
- Testes do modo local de desenvolvimento: nenhum endpoint de refresh/logout inventado; expiração/reload exige novo login.
- Verificação de segurança: tokens e identidade não aparecem em storage próprio, logs ou mensagens de erro.

## Bloqueadores para implementação de produção

1. Disponibilizar configuração do tenant Auth0 e valores de ambiente necessários (issuer/domain, client ID, audience e URLs permitidas), sem incluir segredos no bundle.
2. Definir e instalar o SDK OIDC/estratégia de armazenamento aprovada para a SPA.
3. Confirmar a política de recuperação da sessão após reload e o comportamento de logout global no provedor.
4. Validar expiração/rotação single-use e claims do access token em ambiente integrado.
