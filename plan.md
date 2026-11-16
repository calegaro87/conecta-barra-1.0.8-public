# Conecta Barra — plano de evolução administrativa

## Objetivo

Manter o fluxo real já publicado e tornar a área administrativa segura e utilizável com milhares de cadastros e solicitações, sem expor a experiência do morador para contas administrativas.

## Decisões de implementação

- Usuários e solicitações serão consultados com paginação limitada no backend, busca server-side, filtros server-side e ordenação estável. A ordenação padrão de usuários será Nome A–Z, com `id` como desempate.
- A fila administrativa será ordenada por data de criação decrescente, exibirá data e hora, permitirá paginação e manterá o filtro por bairro.
- Solicitações terão marcação persistente de urgência (`isUrgent`) com migração Drizzle/SQL. O alerta administrativo também contará solicitações sem resposta (status recebido há pelo menos 24 horas) e atrasadas (solicitações abertas há pelo menos 72 horas). Esses limiares ficam explícitos na interface.
- A tela administrativa terá um card de atenção que abre a fila já filtrada; o administrador poderá marcar/desmarcar urgência na fila e no detalhe.
- O layout das abas do morador verificará a sessão e redirecionará administradores para `/admin`, evitando acesso à navegação e aos formulários de morador.
- O avatar será passado para a barra inferior e renderizado em miniatura na aba Conta, preservando fallback e cache.
- Textos de confirmação do e-mail não mencionarão aprovação administrativa; o bloqueio de conta continuará sendo respeitado.

## Estrutura afetada

- `server/db.ts` e `server/routers.ts`: consultas paginadas, resumo da fila, urgência e contratos tRPC.
- `drizzle/schema.ts` e `drizzle/0003_admin_queue.sql`: campo e índices administrativos.
- `app/admin.tsx`, `app/admin/residents.tsx` e `app/admin/request-detail.tsx`: filtros, paginação, alertas e ações.
- `app/(tabs)/_layout.tsx` e `components/floating-tab-bar.tsx`: proteção de role e avatar.
- `app/login.tsx`: texto do fluxo de confirmação.

## Restrições

Não adicionar dependências desnecessárias, não expor segredos, preservar push/criptografia/cadastro existentes e só considerar a alteração completa após `npm run check`, build do servidor, geração de assets e validação de configuração Expo. O teste em aparelho Android físico continua fora deste ambiente.
