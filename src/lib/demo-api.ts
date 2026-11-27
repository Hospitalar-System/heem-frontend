import type { AxiosAdapter, AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import { getAuthState } from '@/features/auth/session'
import { isValidCnpj } from '@/lib/br-documents'
import { demoExportDataUrl } from '@/lib/demo-export-files'
import type { DemoExportFormat } from '@/lib/demo-export-files'


type RecordValue = Record<string, unknown>

const now = new Date().toISOString()
const hospitals: RecordValue[] = [
  { id: 'hospital-demo-1', nome: 'Hospital São Lucas', cnpj: '00000000000191' },
  { id: 'hospital-demo-2', nome: 'Clínica Vital Norte', cnpj: '00000000000272' },
]
const sectors: RecordValue[] = [
  { id: 'sector-demo-1', hospitalId: 'hospital-demo-1', codigo: 'UTI-01', nome: 'UTI Adulto', andar: '2º andar', classificacaoRisco: 'CRITICO', grupoInstalacao: 'GRUPO_2' },
  { id: 'sector-demo-2', hospitalId: 'hospital-demo-1', codigo: 'CC-01', nome: 'Centro Cirúrgico', andar: '3º andar', classificacaoRisco: 'CRITICO', grupoInstalacao: 'GRUPO_2' },
  { id: 'sector-demo-3', hospitalId: 'hospital-demo-2', codigo: 'EM-01', nome: 'Emergência', andar: 'Térreo', classificacaoRisco: 'SEMI_CRITICO', grupoInstalacao: 'GRUPO_1' },
]
const equipment: RecordValue[] = [
  { id: 'equipment-demo-1', setorId: 'sector-demo-1', codigo: 'EQ-1001', nome: 'Monitor multiparamétrico', categoriaId: 'category-demo-1', categoriaNome: 'Monitor Multiparamétrico', modelo: 'MX-500', numeroSerie: 'DEMO-MX500-01', marca: 'MedTech', fotoUrl: null, dadosGerais: {}, classeRiscoAnvisa: 'III', statusCicloVida: 'ATIVO', criticidade: 'ALTA', tipoProtecao: 'CLASSE_I', parteAplicada: 'TIPO_CF', modoOperacao: 'CONTINUO', dataInstalacao: '2024-03-15', dataGarantiaFim: '2027-03-15', nivelRisco: 'ALTO' },
  { id: 'equipment-demo-2', setorId: 'sector-demo-2', codigo: 'EQ-1002', nome: 'Ventilador pulmonar', categoriaId: 'category-demo-2', categoriaNome: 'Ventilador Pulmonar', modelo: 'Vento 4', numeroSerie: 'DEMO-V4-02', marca: 'MedTech', fotoUrl: null, dadosGerais: {}, classeRiscoAnvisa: 'III', statusCicloVida: 'EM_MANUTENCAO', descricaoEstado: 'Aguardando troca da válvula expiratória', estadoAtualizadoEm: '2026-11-08T14:20:00Z', criticidade: 'ALTA', tipoProtecao: 'CLASSE_I', parteAplicada: 'TIPO_BF', modoOperacao: 'CONTINUO', dataInstalacao: '2023-08-10', dataGarantiaFim: '2026-08-10', nivelRisco: 'MEDIO' },
  { id: 'equipment-demo-3', setorId: 'sector-demo-3', codigo: 'EQ-1003', nome: 'Desfibrilador', categoriaId: null, categoriaNome: null, modelo: 'Heart 2', numeroSerie: 'DEMO-H2-03', marca: 'CardioCare', fotoUrl: null, dadosGerais: {}, classeRiscoAnvisa: 'III', statusCicloVida: 'NAO_APTO', descricaoEstado: 'Falha no teste de carga da bateria', estadoAtualizadoEm: '2026-11-10T09:05:00Z', criticidade: 'ALTA', tipoProtecao: 'CLASSE_II', parteAplicada: 'TIPO_BF', modoOperacao: 'INTERMITENTE', dataInstalacao: '2024-01-20', dataGarantiaFim: '2027-01-20', nivelRisco: 'BAIXO' },
]
/** Movimentações de exemplo (Stories 24.2/24.5): uma com tipo e uma anterior à 24.5, sem tipo ("Não informado"). */
const movements: RecordValue[] = [
  { id: 'mov-demo-1', equipamentoId: 'equipment-demo-1', movimentadoEm: '2026-11-04T13:30:00Z', setorOrigemId: 'sector-demo-2', setorOrigemNome: 'Centro Cirúrgico', hospitalOrigemId: 'hospital-demo-1', hospitalOrigemNome: 'Hospital São Lucas', setorDestinoId: 'sector-demo-1', setorDestinoNome: 'UTI Adulto', hospitalDestinoId: 'hospital-demo-1', hospitalDestinoNome: 'Hospital São Lucas', movimentadoPor: 'user-demo-2', movimentadoPorNome: 'Rafael Costa', motivo: 'Leito novo da UTI, empréstimo até a chegada do monitor próprio', tipoMotivo: 'emprestimo', clientId: null },
  { id: 'mov-demo-0', equipamentoId: 'equipment-demo-1', movimentadoEm: '2026-09-18T10:00:00Z', setorOrigemId: 'sector-demo-3', setorOrigemNome: 'Emergência', hospitalOrigemId: 'hospital-demo-2', hospitalOrigemNome: 'Clínica Vital Norte', setorDestinoId: 'sector-demo-2', setorDestinoNome: 'Centro Cirúrgico', hospitalDestinoId: 'hospital-demo-1', hospitalDestinoNome: 'Hospital São Lucas', movimentadoPor: 'user-demo-1', movimentadoPorNome: 'Clara Mendes', motivo: 'Remanejamento entre unidades', tipoMotivo: null, clientId: null },
]
const categories: RecordValue[] = [
  { id: 'category-demo-1', nome: 'Monitor Multiparamétrico', ativa: true, checklistPadraoId: 'checklist-demo-1', origem: 'manual', revisada: true },
  { id: 'category-demo-2', nome: 'Ventilador Pulmonar', ativa: true, checklistPadraoId: null, origem: 'carga', revisada: false },
  { id: 'category-demo-3', nome: 'Desfibrilador', ativa: true, checklistPadraoId: null, origem: 'carga', revisada: false },
]
const tickets: RecordValue[] = [
  { id: 'ticket-demo-1', hospitalId: hospitals[0].id, setorId: sectors[0].id, equipamentoId: equipment[0].id, abertoPor: 'user-demo-1', descricao: 'Leitura de SpO2 oscilando durante o monitoramento.', severidade: 'ALTA', status: 'ABERTO', abertoEm: now, slaStatus: 'em_risco', codigo: 'CH-0001', tecnicoResponsavelId: null, primeiraRespostaEm: null, canceladoEm: null, solucao: null, causaCategoria: null, reaberturas: 0, prontoParaResolver: false },
  { id: 'ticket-demo-2', hospitalId: hospitals[0].id, setorId: sectors[1].id, equipamentoId: equipment[1].id, abertoPor: 'user-demo-2', descricao: 'Alarme de pressão recorrente durante o autoteste.', severidade: 'MEDIA', status: 'EM_ANDAMENTO', abertoEm: now, slaStatus: 'no_prazo', codigo: 'CH-0002', tecnicoResponsavelId: 'user-demo-2', primeiraRespostaEm: now, canceladoEm: null, solucao: null, causaCategoria: null, reaberturas: 0, prontoParaResolver: true },
]
tickets.push({ id: 'ticket-demo-3', hospitalId: hospitals[0].id, setorId: sectors[0].id, equipamentoId: equipment[0].id, abertoPor: 'user-demo-2', descricao: 'Aguardando retorno do fornecedor sobre o sensor.', severidade: 'MEDIA', status: 'PAUSADO', abertoEm: now, slaStatus: 'no_prazo', codigo: 'CH-0003', tecnicoResponsavelId: 'user-demo-2', primeiraRespostaEm: now, canceladoEm: null, solucao: null, causaCategoria: null, reaberturas: 0, prontoParaResolver: false, pausaMotivo: 'aguardando_fornecedor', pausaDescricao: 'Sensor em cotação', pausadoEm: now })
const workOrders: RecordValue[] = [
  { id: 'order-demo-1', codigo: 'OT-2026-001', tipo: 'PREVENTIVA', status: 'AGENDADA', equipamentoId: equipment[0].id, checklistId: 'checklist-demo-1', tecnicoId: 'user-demo-2', local: 'UTI Adulto', dataAgendada: now, iniciadaEm: null, concluidaEm: null, atrasada: false, planoPreventivoId: 'plan-demo-1', campanhaPreventivaId: null },
  { id: 'order-demo-2', codigo: 'OT-2026-002', tipo: 'CORRETIVA', status: 'EM_EXECUCAO', equipamentoId: equipment[1].id, checklistId: 'checklist-demo-1', tecnicoId: 'user-demo-2', chamadoId: tickets[1].id, local: 'Centro Cirúrgico', dataAgendada: now, iniciadaEm: now, concluidaEm: null, atrasada: false, planoPreventivoId: null, campanhaPreventivaId: null },
  { id: 'order-demo-3', codigo: 'OT-2026-003', tipo: 'PREVENTIVA', status: 'CONCLUIDA', equipamentoId: equipment[0].id, checklistId: 'checklist-demo-1', tecnicoId: 'user-demo-2', local: 'UTI Adulto', dataAgendada: now, iniciadaEm: now, concluidaEm: now, atrasada: false, planoPreventivoId: 'plan-demo-1', campanhaPreventivaId: null },
  // Story 23.7: preventiva encerrada sem execução porque o equipamento estava em uso.
  { id: 'order-demo-5', codigo: 'OT-2026-005', tipo: 'PREVENTIVA', status: 'NAO_REALIZADA', equipamentoId: equipment[1].id, checklistId: 'checklist-demo-1', tecnicoId: 'user-demo-2', local: 'Centro Cirúrgico', dataAgendada: now, iniciadaEm: null, concluidaEm: null, atrasada: false, planoPreventivoId: null, campanhaPreventivaId: null, naoRealizada: { em: now, por: 'user-demo-2', motivo: 'em_uso', observacao: 'Ventilador em uso em paciente da sala 2; equipamento visivelmente apto.' } },
  // Campanha no modo "sem responsável": a OT não tem técnico.
  { id: 'order-demo-4', codigo: 'OT-2026-004', tipo: 'PREVENTIVA', status: 'AGENDADA', equipamentoId: equipment[0].id, checklistId: 'checklist-demo-1', tecnicoId: null, local: 'UTI Adulto', dataAgendada: now, iniciadaEm: null, concluidaEm: null, atrasada: false, planoPreventivoId: null, campanhaPreventivaId: 'campaign-demo-1' },
]
const checklists: RecordValue[] = [{ id: 'checklist-demo-1', codigo: 'CHK-ROT-01', nome: 'Inspeção funcional', descricao: 'Verificação operacional de rotina', ativo: true, quantidadeItens: 3 }]
const preventivePlans: RecordValue[] = [
  { id: 'plan-demo-1', equipamentoId: equipment[0].id, checklistId: 'checklist-demo-1', tecnicoPadraoId: 'user-demo-2', intervaloDias: 30, dataAncora: '2026-01-05', proximaData: nextPlanDate('2026-01-05', 30), ativo: true, pendencia: false, createdAt: now, updatedAt: now },
  { id: 'plan-demo-2', equipamentoId: equipment[1].id, checklistId: 'checklist-demo-1', tecnicoPadraoId: 'user-demo-2', intervaloDias: 90, dataAncora: '2026-02-10', proximaData: nextPlanDate('2026-02-10', 90), ativo: true, pendencia: true, createdAt: now, updatedAt: now },
]
const checklistItems: RecordValue[] = [
  { id: 'check-item-demo-1', descricao: 'Inspecionar cabos e conectores', tipo: 'BOOLEANO', unidade: null, obrigatorio: true, ordem: 0 },
  { id: 'check-item-demo-2', descricao: 'Verificar alarmes sonoros', tipo: 'BOOLEANO', unidade: null, obrigatorio: true, ordem: 1 },
  { id: 'check-item-demo-3', descricao: 'Registrar resultado do autoteste', tipo: 'NUMERICO', unidade: 'resultado', obrigatorio: false, ordem: 2 },
]
const users: RecordValue[] = [
  { id: 'user-demo-1', codigo: 'ADM-001', nome: 'Clara Mendes', email: 'clara.mendes@example.test', role: 'admin_cliente', ativo: true },
  { id: 'user-demo-2', codigo: 'TEC-001', nome: 'Rafael Costa', email: 'rafael.costa@example.test', role: 'tecnico', ativo: true, crea: 'CREA-RS 123456' },
  { id: 'user-demo-3', codigo: 'INT-001', nome: 'Marina Alves', email: 'marina.alves@example.test', role: 'interno_hospital', ativo: true },
]
const platformUsers: RecordValue[] = [{ id: 'platform-user-demo-1', codigo: 'SUP-001', nome: 'Alex Santos', email: 'alex.santos@example.test', role: 'super_admin', ativo: true }]
const tenants: RecordValue[] = [{ id: 'tenant-demo-1', cnpj: '00000000000191', nome: 'Rede Hospitalar Exemplo', ativo: true, createdAt: now }]
const labels: RecordValue[] = []
const dayIso = (offset: number) => new Date(Date.now() + offset * 86400000).toISOString().slice(0, 10)
/** Story 23.8: o ventilador da demo é reincidente (3 chamados de falha em 90 dias). */
equipment[1].reincidencia = { chamados: 3, dias: 90 }
const documents: RecordValue[] = [
  { id: 'doc-demo-1', equipamentoId: 'equipment-demo-1', tipoDocumento: 'CERTIFICADO_CALIBRACAO', nomeArquivo: 'calibracao-mx500.pdf', uploadedEm: now, validadeAte: dayIso(-5) },
  { id: 'doc-demo-2', equipamentoId: 'equipment-demo-1', tipoDocumento: 'LAUDO_SEGURANCA', nomeArquivo: 'laudo-60601.pdf', uploadedEm: now, validadeAte: dayIso(12) },
  { id: 'doc-demo-3', equipamentoId: 'equipment-demo-1', tipoDocumento: 'MANUAL', nomeArquivo: 'manual-mx500.pdf', uploadedEm: now, validadeAte: null },
]
/** Setor com a situação e as contagens que o servidor calcula (ativos = ATIVO, NAO_APTO ou EM_MANUTENCAO). */
function sectorView(sector: RecordValue) {
  const items = equipment.filter((item) => item.setorId === sector.id && item.ativo !== false)
  return { ativo: true, ...sector, equipamentosAtivos: items.filter((item) => ['ATIVO', 'NAO_APTO', 'EM_MANUTENCAO'].includes(String(item.statusCicloVida))).length, equipamentosTotal: items.length }
}
/** Histórico de estado simulado (contrato #208): mais recente primeiro ao listar. */
const stateHistory: RecordValue[] = [
  { id: 'est-1', equipamentoId: 'equipment-demo-2', estadoAnterior: 'ATIVO', estadoNovo: 'EM_MANUTENCAO', descricao: 'Aguardando troca da válvula expiratória', alteradoPorId: 'user-demo-2', alteradoPorNome: 'Bruno Técnico', alteradoEm: '2026-11-08T14:20:00Z', origem: 'MANUAL', ordemTrabalhoId: null, origemManutencao: { tipo: 'justificativa', ordemTrabalhoId: null, retiradoPorId: 'user-demo-2', retiradoPorNome: 'Bruno Técnico', destino: 'manutencao_externa', fornecedor: 'Assistência Técnica Sul', justificativa: 'Válvula expiratória enviada ao fornecedor para troca.' } },
  { id: 'est-2', equipamentoId: 'equipment-demo-3', estadoAnterior: 'ATIVO', estadoNovo: 'NAO_APTO', descricao: 'Falha no teste de carga da bateria', alteradoPorId: 'user-demo-2', alteradoPorNome: 'Bruno Técnico', alteradoEm: '2026-11-10T09:05:00Z', origem: 'MANUAL', ordemTrabalhoId: null },
]
const STATE_ENUM = ['ATIVO', 'NAO_APTO', 'EM_MANUTENCAO', 'OBSOLETO', 'INATIVO', 'DESATIVADO', 'DESCARTADO']
/** Story 23.1: origem obrigatória ao ENTRAR em EM_MANUTENCAO (OT do mesmo equipamento ou justificativa). */
function maintenanceOrigin(record: RecordValue, body: RecordValue, userId: string | null, userName: string | null) {
  const text = (value: unknown) => (typeof value === 'string' ? value.trim() : '')
  if (body.ordemTrabalhoId) {
    const order = workOrders.find((item) => item.id === body.ordemTrabalhoId)
    if (!order || order.equipamentoId !== record.id) throw demoProblem(400, { code: 'OT_DE_OUTRO_EQUIPAMENTO' })
    return { tipo: 'ordem_trabalho', ordemTrabalhoId: order.id, retiradoPorId: null, retiradoPorNome: null, destino: null, fornecedor: null, justificativa: null }
  }
  const destino = text(body.destino), fornecedor = text(body.fornecedor), justificativa = text(body.justificativa)
  if (!destino && !fornecedor && !justificativa && !body.retiradoPor) throw demoProblem(400, { code: 'ORIGEM_OBRIGATORIA' })
  if (destino !== 'manutencao_hospital' && destino !== 'manutencao_externa') throw demoProblem(400, { code: 'VALIDACAO_FALHOU' })
  if (destino === 'manutencao_externa' && !fornecedor) throw demoProblem(400, { code: 'FORNECEDOR_OBRIGATORIO' })
  if (!justificativa) throw demoProblem(400, { code: 'JUSTIFICATIVA_OBRIGATORIA' })
  const who = body.retiradoPor ? users.find((item) => item.id === body.retiradoPor) : null
  return { tipo: 'justificativa', ordemTrabalhoId: null, retiradoPorId: who?.id ?? userId, retiradoPorNome: (who?.nome as string | undefined) ?? userName, destino, fornecedor: fornecedor || null, justificativa }
}
/** PATCH /equipamentos/{id}/estado com as regras do contrato (papel, descrição, DESCARTADO terminal). */
function changeEquipmentState(record: RecordValue, body: RecordValue) {
  const estado = String(body.estado ?? '').trim().toUpperCase()
  const raw = typeof body.descricao === 'string' ? body.descricao.trim() : ''
  const { user } = getAuthState()
  const roles = user?.roles ?? []
  const admin = roles.includes('admin_cliente')
  if (!admin && !roles.includes('tecnico')) throw demoProblem(403, { code: 'ACESSO_NEGADO' })
  if (!STATE_ENUM.includes(estado) || raw.length > 200) throw demoProblem(400, { code: 'VALIDACAO_FALHOU' })
  if (estado === 'EM_MANUTENCAO' && !raw) throw demoProblem(400, { code: 'DESCRICAO_OBRIGATORIA' })
  // técnico não sai de INATIVO/DESCARTADO nem vai para eles; esse 403 vem antes do DESCARTADO terminal
  if (!admin && (['INATIVO', 'DESCARTADO'].includes(String(record.statusCicloVida)) || estado === 'INATIVO' || estado === 'DESCARTADO')) throw demoProblem(403, { code: 'ACESSO_NEGADO' })
  const descricao = estado === 'ATIVO' ? null : raw || null
  if (record.statusCicloVida === estado && (record.descricaoEstado ?? null) === descricao) return record
  if (record.statusCicloVida === 'DESCARTADO') throw demoProblem(409, { code: 'TRANSICAO_INVALIDA' })
  // Story 23.6: entrar em OBSOLETO exige um laudo de obsolescência anexado ao equipamento.
  const laudo = estado === 'OBSOLETO' && record.statusCicloVida !== 'OBSOLETO' ? documents.find((item) => item.equipamentoId === record.id && item.tipoDocumento === 'LAUDO_OBSOLESCENCIA') : null
  if (estado === 'OBSOLETO' && record.statusCicloVida !== 'OBSOLETO' && !laudo) throw demoProblem(400, { code: 'LAUDO_OBSOLESCENCIA_OBRIGATORIO' })
  const origemManutencao = estado === 'EM_MANUTENCAO' && record.statusCicloVida !== 'EM_MANUTENCAO' ? maintenanceOrigin(record, body, user?.id ?? null, user?.name ?? null) : null
  const alteradoEm = new Date().toISOString()
  stateHistory.push({ id: makeId('est'), equipamentoId: record.id, estadoAnterior: record.statusCicloVida, estadoNovo: estado, descricao, alteradoPorId: user?.id ?? null, alteradoPorNome: user?.name ?? 'Usuário demo', alteradoEm, origem: 'MANUAL', ordemTrabalhoId: null, origemManutencao, laudoDocumentoId: (laudo?.id as string | undefined) ?? null })
  Object.assign(record, { statusCicloVida: estado, descricaoEstado: descricao, estadoAtualizadoEm: alteradoEm })
  return record
}
function demoProblem(status: number, data: Record<string, unknown>) {
  return Object.assign(new Error(String(data.code)), { response: { status, data } })
}
function documentView(item: RecordValue) {
  const validade = item.validadeAte as string | null
  const days = validade ? Math.round((Date.parse(validade) - Date.parse(dayIso(0))) / 86400000) : null
  return { ...item, vencido: days !== null && days < 0, vencendo: days !== null && days >= 0 && days <= 30 }
}
/** Lista de equipamentos: contagens de documentos vigentes (vencidos / vencendo em 30 dias) e filtros vencendoEm/documentoVencido. */
function withDocumentStats(collection: RecordValue[], params?: Record<string, unknown>) {
  const today = dayIso(0)
  const withStats = collection.map((item) => {
    const dated = documents.filter((doc) => doc.equipamentoId === item.id && doc.validadeAte).map((doc) => doc.validadeAte as string)
    const expired = dated.filter((date) => date < today).length
    const expiring = dated.filter((date) => date >= today && date <= dayIso(30)).length
    return { ...item, documentosVencidos: expired, documentosVencendo: expiring, proximaValidade: dated.length ? [...dated].sort()[0] : null }
  })
  const until = typeof params?.vencendoEm === 'string' ? params.vencendoEm : null
  return withStats.filter((item) => {
    if (params?.documentoVencido && item.documentosVencidos === 0) return false
    if (until && !(item.proximaValidade && item.proximaValidade <= until)) return false
    return true
  })
}
const history: Record<string, RecordValue[]> = {
  [tickets[0].id as string]: [{ acao: 'Chamado aberto', atorId: 'user-demo-1', ocorridoEm: now }],
  [tickets[1].id as string]: [{ acao: 'Chamado atribuído à equipe técnica', atorId: 'user-demo-1', ocorridoEm: now }],
}
/** Execuções de checklist de exemplo (mais recente primeiro) para a ficha do equipamento. */
function checklistExecutionsFor(equipmentId: string): RecordValue[] {
  if (equipmentId !== 'equipment-demo-1') return []
  return [
    { otId: 'order-demo-10', otCodigo: 'OT-2026-010', concluidaEm: '2026-10-20T14:30:00Z', tecnicoNome: 'Técnico Demo', parecerTecnico: 'Equipamento operando dentro do esperado após a inspeção funcional. Recomenda-se nova verificação do alarme na próxima preventiva, pois houve oscilação leve durante os testes de bancada e o cabo de alimentação apresenta desgaste visível.', itens: [
      { itemId: 'check-item-demo-2', descricao: 'Verificar alarmes sonoros', tipo: 'BOOLEANO', valor: true, unidade: null, conforme: true, faixaMin: null, faixaMax: null, valorReferencia: null },
      { itemId: 'check-item-demo-4', descricao: 'Tensão de saída', tipo: 'NUMERICO', valor: 14.2, unidade: 'V', conforme: false, faixaMin: 11, faixaMax: 13, valorReferencia: null },
      { itemId: 'check-item-demo-3', descricao: 'Registrar resultado do autoteste', tipo: 'NUMERICO', valor: null, unidade: 'resultado', conforme: null, faixaMin: null, faixaMax: null, valorReferencia: null },
    ] },
    { otId: 'order-demo-11', otCodigo: 'OT-2026-007', concluidaEm: '2026-07-18T10:00:00Z', tecnicoNome: 'Técnico Demo', parecerTecnico: null, itens: [
      { itemId: 'check-item-demo-2', descricao: 'Verificar alarmes sonoros', tipo: 'BOOLEANO', valor: true, unidade: null, conforme: true, faixaMin: null, faixaMax: null, valorReferencia: null },
      { itemId: 'check-item-demo-4', descricao: 'Tensão de saída', tipo: 'NUMERICO', valor: 12.1, unidade: 'V', conforme: true, faixaMin: 11, faixaMax: 13, valorReferencia: null },
    ] },
    { otId: 'order-demo-12', otCodigo: 'OT-2026-003', concluidaEm: '2026-04-02T09:15:00Z', tecnicoNome: 'Outro Técnico', parecerTecnico: 'Sem observações.', itens: [
      { itemId: 'check-item-demo-5', descricao: 'Modo de operação', tipo: 'SELECAO', valor: 'Contínuo', unidade: null, conforme: true, faixaMin: null, faixaMax: null, valorReferencia: 'Contínuo' },
    ] },
    { otId: 'order-demo-13', otCodigo: 'OT-2026-001', concluidaEm: '2026-01-12T11:00:00Z', tecnicoNome: 'Técnico Demo', parecerTecnico: null, itens: [
      { itemId: 'check-item-demo-4', descricao: 'Tensão de saída', tipo: 'NUMERICO', valor: 12.6, unidade: 'V', conforme: true, faixaMin: 11, faixaMax: 13, valorReferencia: null },
    ] },
    { otId: 'order-demo-14', otCodigo: 'OT-2025-044', concluidaEm: '2025-10-05T08:45:00Z', tecnicoNome: 'Outro Técnico', parecerTecnico: null, itens: [
      { itemId: 'check-item-demo-4', descricao: 'Tensão de saída', tipo: 'NUMERICO', valor: 11.8, unidade: 'V', conforme: true, faixaMin: 11, faixaMax: 13, valorReferencia: null },
    ] },
  ]
}
const checklistItemsById = new Map<string, RecordValue[]>([[checklists[0].id as string, checklistItems]])
const userHospitals = new Map<string, string[]>(users.map((user) => [user.id as string, [hospitals[0].id as string]]))
const exportsById = new Map<string, RecordValue>()
const importsById = new Map<string, { tipo: string; polls: number }>()
/** Story 23.2: configuração do cliente (janela da qualidade da análise). */
let clientConfig: RecordValue = { janelaQualidadeAnaliseDias: 30, padrao: true, atualizadoEm: null, atualizadoPor: null, reincidenciaChamados: 3, reincidenciaDias: 90 }
let slaPolicy: RecordValue[] = [
  { severidade: 'CRITICA', atendimentoMin: 15, resolucaoMin: 120, padrao: true },
  { severidade: 'ALTA', atendimentoMin: 30, resolucaoMin: 240, padrao: true },
  { severidade: 'MEDIA', atendimentoMin: 120, resolucaoMin: 1440, padrao: true },
  { severidade: 'BAIXA', atendimentoMin: 240, resolucaoMin: 2880, padrao: true },
]

export const demoApiAdapter: AxiosAdapter = async (config) => {
  const method = (config.method ?? 'get').toLowerCase()
  const path = getPath(config)
  const body = parseBody(config.data)
  const params = config.params as Record<string, unknown> | undefined
  const { data, headers } = paginate(method, path, handleRequest(method, path, body, params), params)
  return {
    config,
    data,
    headers,
    status: method === 'post' ? (path === '/relatorios/exportacoes' && (data as { status?: string }).status === 'pendente' ? 202 : 201) : 200,
    statusText: 'OK',
  } as AxiosResponse
}

/** Rotas que o backend pagina (`pagina` 0-based + `tamanho`, total em X-Total-Count). */
const PAGINATED_PATHS = new Set(['/chamados', '/ordens-de-trabalho', '/users', '/hospitais', '/planos-preventivos', '/campanhas-preventivas', '/checklists', '/equipamentos', '/categorias-equipamento'])
const PAGINATED_PATTERNS = [/^\/equipamentos\/[^/]+\/historico-estado$/, /^\/equipamentos\/[^/]+\/movimentacoes$/, /^\/hospitais\/[^/]+\/setores$/, /^\/equipamentos\/[^/]+\/documentos$/, /^\/equipamentos\/[^/]+\/execucoes-checklist$/]

const SEVERITY_RANK: Record<string, number> = { CRITICA: 0, ALTA: 1, MEDIA: 2, BAIXA: 3 }
const SORTABLE: Record<string, string[]> = {
  '/chamados': ['severidade', 'abertoEm', 'slaResolucaoAte'],
  '/ordens-de-trabalho': ['dataAgendada', 'status', 'codigo', 'concluidaEm'],
  '/equipamentos': ['nome', 'codigo', 'categoria', 'criadoEm'],
}
const EQUIPMENT_SORT_FIELDS: Record<string, string> = { nome: 'nome', codigo: 'codigo', categoria: 'categoriaNome', criadoEm: 'criadoEm' }
const foldText = (value: unknown) => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR')

/** GET /equipamentos: texto sem acento/caixa; sem categoria por último (mesmo com direcao=desc). */
function sortEquipment(rows: RecordValue[], field: string, sign: number) {
  const column = EQUIPMENT_SORT_FIELDS[field]
  return [...rows].sort((a, b) => {
    const left = a[column]
    const right = b[column]
    if (column === 'categoriaNome' && (!left || !right)) return !left && !right ? 0 : !left ? 1 : -1
    return foldText(left).localeCompare(foldText(right), 'pt-BR') * sign
  })
}

/** Espelha `ordenar`/`direcao` do backend (chamados, OTs e equipamentos); nulos vão por último e, em chamados, severidade desempata por abertoEm e id. */
function sortRows(path: string, rows: RecordValue[], params?: Record<string, unknown>) {
  const field = typeof params?.ordenar === 'string' ? params.ordenar : ''
  if (!field || !SORTABLE[path]) return rows
  if (!SORTABLE[path].includes(field)) throw Object.assign(new Error('Ordenação inválida'), { response: { status: 400, data: { code: 'ORDENACAO_INVALIDA' } } })
  const sign = params?.direcao === 'desc' ? -1 : 1
  if (path === '/equipamentos') return sortEquipment(rows, field, sign)
  const key = (row: RecordValue) => field === 'severidade' ? (SEVERITY_RANK[String(row.severidade)] ?? 9) : (row[field] as string | null | undefined)
  const compare = (a: unknown, b: unknown) => (a === b ? 0 : (a as string | number) < (b as string | number) ? -1 : 1)
  return [...rows].sort((a, b) => {
    const ka = key(a)
    const kb = key(b)
    if ((ka == null) !== (kb == null)) return ka == null ? 1 : -1
    const primary = compare(ka, kb) * sign
    if (primary !== 0 || field !== 'severidade') return primary
    return compare(a.abertoEm, b.abertoEm) || compare(a.id, b.id)
  })
}

/** Espelha `Paginacao` do backend: o total sempre vai no header; sem `pagina`/`tamanho` a lista vem inteira. */
function paginate(method: string, path: string, data: unknown, params?: Record<string, unknown>) {
  if (method !== 'get' || !(PAGINATED_PATHS.has(path) || PAGINATED_PATTERNS.some((pattern) => pattern.test(path))) || !Array.isArray(data)) return { data, headers: {} as Record<string, string> }
  const sorted = sortRows(path, data as RecordValue[], params)
  const headers = { 'x-total-count': String(sorted.length) }
  if (params?.pagina === undefined && params?.tamanho === undefined) return { data: sorted, headers }
  const page = Math.max(0, Number(params?.pagina ?? 0))
  const size = Math.min(200, Math.max(1, Number(params?.tamanho ?? 50)))
  return { data: sorted.slice(page * size, page * size + size), headers }
}

const demoPreventive = { atrasadas: 2, concluidasNoPrazo: 19, concluidasForaDoPrazo: 3, percentualNoPrazo: 86.4, canceladas: 1 }

function demoIndicators(agrupar: unknown) {
  const total = { mtbfHoras: 186, mttaHoras: 1.8, triagemHoras: 3.2, mttrHoras: 5.4, esperaPecaHoras: 12.5, slaAtendimentoPct: 94.5, slaResolucaoPct: 88.2, disponibilidadePercentual: 98.6, qtdOtsPreventivas: 24, qtdOtsCorretivas: 8, preventiva: demoPreventive }
  // Story 29.2 (só no total): resolvidos com e sem OT e assinaturas pendentes.
  const sinais = { chamadosResolvidosComOt: 6, chamadosResolvidosSemOt: 4, resolvidosSemOtPct: 40, assinaturasPendentes: { ots: 2, chamados: 1, campanhas: 0 } }
  const groups = agrupar === 'setor'
    ? [
      { grupoId: 'sector-demo-1', grupoNome: 'UTI Adulto', ...total, mttaHoras: 1.2, mttrHoras: 4.1, qtdOtsPreventivas: 10, qtdOtsCorretivas: 3 },
      { grupoId: 'sector-demo-2', grupoNome: 'Centro Cirúrgico', ...total, mttaHoras: 2.1, mttrHoras: 6.3, qtdOtsPreventivas: 8, qtdOtsCorretivas: 3 },
      { grupoId: 'sector-demo-3', grupoNome: 'Emergência', ...total, mttaHoras: 2.4, mttrHoras: 6.9, qtdOtsPreventivas: 6, qtdOtsCorretivas: 2 },
    ]
    : agrupar === 'hospital'
      ? [
        { grupoId: 'hospital-demo-1', grupoNome: 'Hospital São Lucas', ...total, mttaHoras: 1.6, mttrHoras: 5.1, qtdOtsPreventivas: 18, qtdOtsCorretivas: 6 },
        { grupoId: 'hospital-demo-2', grupoNome: 'Clínica Vital Norte', ...total, mttaHoras: 2.4, mttrHoras: 6.9, qtdOtsPreventivas: 6, qtdOtsCorretivas: 2 },
      ]
      : null
  return { ...total, ...sinais, severidadesConsideradas: ['ALTA', 'CRITICA'], grupos: groups }
}

const demoBacklog = {
  porSeveridade: [
    { severidade: 'BAIXA', ate24h: 2, de1a3Dias: 1, maisDe3Dias: 0, total: 3 },
    { severidade: 'MEDIA', ate24h: 3, de1a3Dias: 2, maisDe3Dias: 1, total: 6 },
    { severidade: 'ALTA', ate24h: 1, de1a3Dias: 2, maisDe3Dias: 1, total: 4 },
    { severidade: 'CRITICA', ate24h: 1, de1a3Dias: 0, maisDe3Dias: 0, total: 1 },
  ],
  total: 14,
}

/** Story 23.4: qualidade da análise de exemplo (janela da configuração do cliente, dois técnicos, casos recentes). */
function demoQualityAnalysis() {
  const janelaDias = Number((clientConfig as { janelaQualidadeAnaliseDias?: number }).janelaQualidadeAnaliseDias ?? 30)
  return {
    janelaDias,
    aptos: 42,
    comChamado: 4,
    percentual: 9.5,
    tecnicos: [
      { tecnicoId: 'user-demo-2', nome: 'Rafael Costa', aptos: 27, comChamado: 3, percentual: 11.1 },
      { tecnicoId: 'user-demo-5', nome: 'Juliana Prado', aptos: 15, comChamado: 1, percentual: 6.7 },
    ],
    casos: [
      { tecnicoId: 'user-demo-2', tecnicoNome: 'Rafael Costa', equipamentoCodigo: 'EQ-1002', equipamentoNome: 'Ventilador pulmonar', aptoEm: '2026-11-03T13:00:00Z', chamadoCodigo: 'CH-2026-0118', chamadoAbertoEm: '2026-11-12T09:30:00Z', diasDepois: 9 },
      { tecnicoId: 'user-demo-5', tecnicoNome: 'Juliana Prado', equipamentoCodigo: 'EQ-1003', equipamentoNome: 'Desfibrilador', aptoEm: '2026-10-28T15:20:00Z', chamadoCodigo: 'CH-2026-0109', chamadoAbertoEm: '2026-11-02T08:10:00Z', diasDepois: 5 },
      { tecnicoId: 'user-demo-2', tecnicoNome: 'Rafael Costa', equipamentoCodigo: 'EQ-1001', equipamentoNome: 'Monitor multiparamétrico', aptoEm: '2026-10-20T11:00:00Z', chamadoCodigo: 'CH-2026-0097', chamadoAbertoEm: '2026-11-01T17:45:00Z', diasDepois: 12 },
    ],
    casosTruncados: false,
  }
}

const demoTopEquipment = [
  { equipamentoId: 'equipment-demo-2', codigo: 'EQ-1002', nome: 'Ventilador pulmonar', qtdChamados: 7, mtbfHoras: 96.5 },
  { equipamentoId: 'equipment-demo-1', codigo: 'EQ-1001', nome: 'Monitor multiparamétrico', qtdChamados: 4, mtbfHoras: 168 },
  { equipamentoId: 'equipment-demo-3', codigo: 'EQ-1003', nome: 'Desfibrilador', qtdChamados: 1, mtbfHoras: null },
]

function handleRequest(method: string, path: string, body: RecordValue, params?: Record<string, unknown>): unknown {
  const signatureResult = handleSignatures(method, path, body)
  if (signatureResult !== undefined) return signatureResult
  if (path.startsWith('/campanhas-preventivas')) return handleCampaigns(method, path, body, params)
  if (path === '/planos-preventivos' && method === 'get') {
    return preventivePlans.filter((plan) => (!params?.equipamentoId || plan.equipamentoId === params.equipamentoId) && (params?.ativo === undefined || plan.ativo === params.ativo)).map(planView)
  }
  if (path === '/planos-preventivos' && method === 'post') {
    const plan = { id: makeId('plan-demo'), ...body, proximaData: nextPlanDate(body.dataAncora as string, Number(body.intervaloDias)), ativo: true, pendencia: false, createdAt: now, updatedAt: now }
    preventivePlans.push(plan)
    return plan
  }
  const planRoute = path.match(/^\/planos-preventivos\/([^/]+)(\/desativar)?$/)
  if (planRoute) {
    const plan = preventivePlans.find((item) => item.id === planRoute[1])
    if (!plan) return null
    if (planRoute[2] && method === 'post') Object.assign(plan, { ativo: false, updatedAt: now })
    else if (method === 'put') Object.assign(plan, body, { proximaData: nextPlanDate(body.dataAncora as string, Number(body.intervaloDias)), updatedAt: now })
    return planView(plan)
  }
  if (path === '/relatorios/dashboard') return dashboard
  if (path === '/relatorios/indicadores') return demoIndicators(params?.agrupar)
  if (path === '/relatorios/backlog') return demoBacklog
  if (path === '/relatorios/qualidade-analise') return demoQualityAnalysis()
  if (path === '/relatorios/top-equipamentos') return demoTopEquipment
  if (path === '/relatorios/trocas-pecas') return demoPartReplacements()
  if (path === '/relatorios/reincidentes') return { chamadosMinimos: Number(clientConfig.reincidenciaChamados ?? 3), dias: Number(clientConfig.reincidenciaDias ?? 90), equipamentos: [{ equipamentoId: 'equipment-demo-2', codigo: 'EQ-1002', nome: 'Ventilador pulmonar', hospitalId: 'hospital-demo-1', hospitalNome: 'Hospital São Lucas', setorId: 'sector-demo-2', setorNome: 'Centro Cirúrgico', chamados: 3 }] }
  if (path === '/relatorios/visitas-nao-realizadas') return demoNotDoneVisits
  if (path === '/relatorios/avaliacoes-chamados') return { quantidade: 9, media: 4.4, porTecnico: [{ id: 'user-demo-2', nome: 'Bruno Técnico', quantidade: 7, media: 4.6 }, { id: null, nome: 'Sem responsável', quantidade: 2, media: 3.5 }], porHospital: [{ id: 'hospital-demo-1', nome: 'Hospital São Lucas', quantidade: 9, media: 4.4 }] }
  if (path === '/relatorios/conformidade') return ['CRITICO', 'ALTO', 'MEDIO', 'BAIXO'].map((nivelRisco, index) => ({ nivelRisco, percentualConforme: [96, 92, 98, 100][index], totalMedicoes: [25, 38, 54, 12][index] }))
  if (path === '/relatorios/exportacoes' && method === 'post') {
    const id = makeId('export')
    // Efetivos como o backend: nível padrão COMPLETO; orientação só em PDF (padrão PAISAGEM nas listagens, RETRATO nos demais).
    const isPdf = body.formato === 'pdf'
    const nivel = String(body.nivel ?? 'COMPLETO').toUpperCase()
    const orientacao = isPdf ? String(body.orientacao ?? (['chamados', 'ordens_trabalho', 'medicoes'].includes(String(body.conteudo)) ? 'PAISAGEM' : 'RETRATO')).toUpperCase() : null
    if (['campanha', 'laudo_ot', 'dossie_equipamento'].includes(String(body.conteudo))) {
      // Relatório da campanha: nasce pendente e conclui na consulta seguinte (exercita o polling). Arquivo de exemplo local, sem dado real.
      const format = ['pdf', 'xlsx', 'csv'].includes(body.formato as string) ? body.formato : 'pdf'
      exportsById.set(id, { id, status: 'pendente', urlDownload: null, polls: 0, format, nivel, orientacao, content: body.conteudo })
      return { id, status: 'pendente', urlDownload: null, nivel, orientacao }
    }
    // Parâmetros extras (hospitalId, setorId, desde, ate, agrupar) são aceitos e ignorados; a extensão segue o formato pedido.
    const extension = ['pdf', 'xlsx', 'csv'].includes(body.formato as string) ? body.formato : 'csv'
    const result = { id, status: 'concluido', urlDownload: demoExportDataUrl(String(body.conteudo), extension as DemoExportFormat), nivel, orientacao }
    exportsById.set(id, result)
    return result
  }
  const pendingExport = path.startsWith('/relatorios/exportacoes/') ? exportsById.get(lastPart(path)) : undefined
  if (pendingExport && 'polls' in pendingExport) {
    const polls = Number(pendingExport.polls) + 1
    pendingExport.polls = polls
    const { nivel, orientacao } = pendingExport
    if (polls < 2) return { id: pendingExport.id, status: 'pendente', urlDownload: null, nivel, orientacao }
    // PDF da campanha: amostra real do backend (public/demo, sem dado sensível); os demais formatos são arquivos mínimos gerados no cliente.
    const urlDownload = pendingExport.content !== 'campanha' ? demoExportDataUrl(String(pendingExport.content), 'pdf') : pendingExport.format === 'pdf' && typeof window !== 'undefined'
      ? `${window.location.origin}/demo/campanha-${pendingExport.nivel === 'RESUMO' ? 'resumo' : 'completa'}.pdf`
      : demoExportDataUrl('campanha', pendingExport.format as DemoExportFormat)
    return { id: pendingExport.id, status: 'concluido', urlDownload, nivel, orientacao }
  }
  if (path.startsWith('/relatorios/exportacoes/')) return exportsById.get(lastPart(path)) ?? { id: lastPart(path), status: 'concluido', urlDownload: demoExportDataUrl('chamados', 'csv') }
  if (path === '/importacoes' && method === 'post') return startDemoImport(body)
  if (path.startsWith('/importacoes/') && method === 'get') return pollDemoImport(lastPart(path))
  if (path === '/configuracao-cliente') {
    if (method === 'put') {
      const stamp = { atualizadoEm: new Date().toISOString(), atualizadoPor: getAuthState().user?.id ?? null }
      if (body.reincidenciaChamados !== undefined || body.reincidenciaDias !== undefined) {
        const n = Number(body.reincidenciaChamados), d = Number(body.reincidenciaDias)
        if (!Number.isInteger(n) || n < 2 || n > 20 || !Number.isInteger(d) || d < 7 || d > 365) throw demoProblem(400, { code: 'REINCIDENCIA_INVALIDA' })
        clientConfig = { ...clientConfig, reincidenciaChamados: n, reincidenciaDias: d, ...stamp }
      }
      if (body.janelaQualidadeAnaliseDias !== undefined) {
        const dias = Number(body.janelaQualidadeAnaliseDias)
        if (!Number.isInteger(dias) || dias < 7 || dias > 365) throw demoProblem(400, { code: 'JANELA_INVALIDA' })
        clientConfig = { ...clientConfig, janelaQualidadeAnaliseDias: dias, padrao: false, ...stamp }
      }
    }
    return clientConfig
  }
  if (path === '/sla/politica') {
    if (method === 'put') slaPolicy = body as unknown as RecordValue[]
    return slaPolicy
  }
  const categoryResult = handleCategories(method, path, body, params)
  if (categoryResult !== undefined) return categoryResult
  if (path === '/equipamentos' && method === 'post') return createRecord(equipment, { ...categorizedBody(body), ativo: true })
  const stateChange = path.match(/^\/equipamentos\/([^/]+)\/estado$/)
  if (stateChange && method === 'patch') {
    const record = equipment.find((item) => item.id === stateChange[1])
    if (!record) throw demoProblem(404, { code: 'EQUIPAMENTO_NAO_ENCONTRADO' })
    return changeEquipmentState(record, body)
  }
  // Stories 24.1/24.2/24.5: transferência (idempotente por clientId) e histórico de movimentações.
  const transferMatch = path.match(/^\/equipamentos\/([^/]+)\/transferencias$/)
  if (transferMatch && method === 'post') {
    const record = equipment.find((item) => item.id === transferMatch[1])
    if (!record) throw demoProblem(404, { code: 'EQUIPAMENTO_NAO_ENCONTRADO' })
    const repetida = movements.find((item) => item.clientId && item.clientId === body.clientId)
    if (repetida) return repetida
    if (body.setorDestinoId === record.setorId) throw demoProblem(400, { code: 'DESTINO_IGUAL_ORIGEM' })
    const origem = sectors.find((item) => item.id === record.setorId)
    const destino = sectors.find((item) => item.id === body.setorDestinoId)
    if (!destino) throw demoProblem(404, { code: 'SETOR_NAO_ENCONTRADO' })
    const hospitalNome = (id: unknown) => hospitals.find((item) => item.id === id)?.nome ?? null
    const entry = {
      id: makeId('mov'), equipamentoId: record.id, movimentadoEm: (body.movimentadoEm as string | undefined) ?? new Date().toISOString(),
      setorOrigemId: record.setorId ?? null, setorOrigemNome: origem?.nome ?? null, hospitalOrigemId: origem?.hospitalId ?? null, hospitalOrigemNome: hospitalNome(origem?.hospitalId),
      setorDestinoId: destino.id, setorDestinoNome: destino.nome, hospitalDestinoId: destino.hospitalId, hospitalDestinoNome: hospitalNome(destino.hospitalId),
      movimentadoPor: getAuthState().user?.id ?? null, movimentadoPorNome: getAuthState().user?.name ?? null, motivo: body.motivo ?? null, tipoMotivo: body.tipoMotivo ?? 'outro', clientId: body.clientId ?? null,
    }
    movements.push(entry)
    record.setorId = destino.id
    return entry
  }
  const movementsMatch = path.match(/^\/equipamentos\/([^/]+)\/movimentacoes$/)
  if (movementsMatch && method === 'get') return movements.filter((item) => item.equipamentoId === movementsMatch[1]).sort((a, b) => String(b.movimentadoEm).localeCompare(String(a.movimentadoEm))).map(({ equipamentoId, clientId, ...entry }) => { void equipamentoId; void clientId; return entry })
  const stateHistoryMatch = path.match(/^\/equipamentos\/([^/]+)\/historico-estado$/)
  if (stateHistoryMatch && method === 'get') return stateHistory.filter((item) => item.equipamentoId === stateHistoryMatch[1]).sort((a, b) => String(b.alteradoEm).localeCompare(String(a.alteradoEm))).map(({ equipamentoId, ...entry }) => { void equipamentoId; return entry })
  const equipmentUpdate = path.match(/^\/equipamentos\/([^/]+)$/)
  if (equipmentUpdate && method === 'put') {
    const record = equipment.find((item) => item.id === equipmentUpdate[1])
    if (record) { Object.assign(record, categorizedBody(body)); return record }
  }
  if (path === '/chamados' && method === 'post') {
    const target = equipment.find((item) => item.id === body.equipamentoId)
    if (!target) throw Object.assign(new Error('Equipamento não encontrado'), { response: { status: 404, data: { code: 'EQUIPAMENTO_NAO_ENCONTRADO' } } })
    const sector = sectors.find((item) => item.id === target.setorId)
    const created = {
      id: (body.id as string | undefined) ?? makeId('ticket-demo'), hospitalId: sector?.hospitalId ?? hospitals[0].id, setorId: target.setorId, equipamentoId: target.id,
      abertoPor: 'user-demo-1', descricao: body.descricao, severidade: body.severidade ?? 'MEDIA', status: 'ABERTO', abertoEm: now, slaStatus: 'no_prazo',
      codigo: `CH-${String(tickets.length + 1).padStart(4, '0')}`, tecnicoResponsavelId: (body.tecnicoResponsavelId as string | undefined) ?? null, primeiraRespostaEm: null, canceladoEm: null, solucao: null, causaCategoria: null, reaberturas: 0, prontoParaResolver: false,
    }
    tickets.unshift(created)
    return created
  }
  if (path === '/tenants' || path === '/hospitais' || path === '/equipamentos' || path === '/ordens-de-trabalho' || path === '/checklists' || path === '/chamados' || path === '/users' || path === '/platform-users') {
    const collection = routeCollection(path)
    if (method === 'get' && path === '/ordens-de-trabalho') return filterCollection(collection, path, params).map(workOrderListView)
    if (method === 'get') return path === '/equipamentos' ? withDocumentStats(filterCollection(collection, path, params), params) : filterCollection(collection, path, params)
    if (method === 'post') {
      const created = { id: makeId('demo'), ativo: true, ...body }
      collection.push(created)
      if (path === '/checklists' && Array.isArray(body.itens)) {
        checklistItemsById.set(created.id as string, body.itens.map((item, index) => ({ ...(item as RecordValue), id: makeId('check-item'), ordem: index })))
      }
      if (path === '/tenants') return { ...created, tenantId: created.id, createdAt: now, adminInicialId: makeId('admin'), adminInicialEmail: body.adminEmail }
      return created
    }
  }
  if (path === '/hospitais' && method === 'post') return createRecord(hospitals, body)

  const checklistExecutions = path.match(/^\/equipamentos\/([^/]+)\/execucoes-checklist$/)
  if (checklistExecutions && method === 'get') return checklistExecutionsFor(checklistExecutions[1])
  const equipmentDocuments = path.match(/^\/equipamentos\/([^/]+)\/documentos(?:\/([^/]+))?(?:\/(download-url|validade))?$/)
  if (equipmentDocuments) {
    const [, equipmentId, documentId, action] = equipmentDocuments
    if (!documentId && method === 'get') return documents.filter((item) => item.equipamentoId === equipmentId).map(documentView)
    if (documentId === 'upload-url' && method === 'post') return { url: 'demo://upload', chave: `demo/documentos/${body.nomeArquivo ?? 'documento'}`, expiraEm: now }
    if (!documentId && method === 'post') return documentView(createRecord(documents, { equipamentoId: equipmentId, tipoDocumento: body.tipoDocumento, nomeArquivo: body.nomeArquivo, uploadedEm: new Date().toISOString(), validadeAte: body.validadeAte ?? null }))
    if (action === 'download-url' && method === 'get') return { url: 'https://example.test/demo-document.pdf', chave: 'demo', expiraEm: now }
    if (action === 'validade' && method === 'patch') {
      const record = documents.find((item) => item.id === documentId)
      if (record) record.validadeAte = body.validadeAte ?? null
      return record ? documentView(record) : null
    }
    if (documentId && !action && method === 'delete') { removeRecord(documents, documentId); return null }
  }
  const equipmentLabels = path.match(/^\/equipamentos\/([^/]+)\/etiquetas(?:\/([^/]+))?$/)
  if (equipmentLabels) {
    if (method === 'get') return labels.filter((item) => item.equipamentoId === equipmentLabels[1])
    if (method === 'post') return createRecord(labels, { ...body, equipamentoId: equipmentLabels[1], vinculadoPor: 'demo-admin', vinculadoEm: now })
    if (method === 'delete') { removeRecord(labels, equipmentLabels[2]); return null }
  }
  const userHospitalMatch = path.match(/^\/users\/([^/]+)\/hospitais(?:\/([^/]+))?$/)
  if (userHospitalMatch) {
    const [userId, hospitalId] = userHospitalMatch.slice(1)
    const linked = userHospitals.get(userId) ?? []
    if (method === 'get') return linked
    if (hospitalId && method === 'post' && !linked.includes(hospitalId)) linked.push(hospitalId)
    if (hospitalId && method === 'delete') userHospitals.set(userId, linked.filter((id) => id !== hospitalId))
    userHospitals.set(userId, linked)
    return null
  }
  const checklistRoute = path.match(/^\/checklists\/([^/]+)\/itens(?:\/ordem)?$/)
  if (checklistRoute) {
    const checklistId = checklistRoute[1]
    const items = checklistItemsById.get(checklistId) ?? []
    if (path.endsWith('/ordem') && method === 'put') {
      const orderItems = Array.isArray(body.itens) ? body.itens as RecordValue[] : []
      const sorted = [...items].sort((a, b) => orderItems.findIndex((entry) => entry.id === a.id) - orderItems.findIndex((entry) => entry.id === b.id))
      sorted.forEach((item, index) => { item.ordem = index })
      return null
    }
    if (method === 'get') return items
    if (method === 'post') return createRecord(items, { ...body, ordem: items.length })
  }
  if (path.startsWith('/checklists/itens/') && method === 'put') {
    const id = lastPart(path)
    for (const items of checklistItemsById.values()) {
      const index = items.findIndex((item) => item.id === id)
      if (index >= 0) { items[index] = { ...items[index], ...body }; return items[index] }
    }
    return { id, ...body }
  }
  const hospitalSectors = path.match(/^\/hospitais\/([^/]+)\/setores$/)
  if (hospitalSectors) {
    if (method === 'get') {
      const filtro = params?.ativo === undefined ? 'true' : String(params.ativo)
      if (!['true', 'false', 'todos'].includes(filtro)) throw demoProblem(400, { code: 'VALIDACAO_FALHOU' })
      return sectors.filter((sector) => sector.hospitalId === hospitalSectors[1]).map(sectorView).filter((sector) => filtro === 'todos' || String(sector.ativo) === filtro)
    }
    if (method === 'post') {
      if (sectors.some((sector) => sector.hospitalId === hospitalSectors[1] && sector.codigo === body.codigo)) throw demoProblem(409, { code: 'CODIGO_JA_CADASTRADO' })
      return sectorView(createRecord(sectors, { ...body, hospitalId: hospitalSectors[1], ativo: true }))
    }
  }
  if (path === '/equipamentos/foto-upload-url' && method === 'post') {
    return { url: 'https://example.test/upload', chave: `demo/${body.nomeArquivo ?? 'foto'}`, expiraEm: now }
  }
  const companyResult = handleCompany(method, path, body)
  if (companyResult !== undefined) return companyResult
  const photoResult = handlePhotos(method, path, body)
  if (photoResult !== undefined) return photoResult
  if (path === '/ordens-de-trabalho/preventivas' || path === '/ordens-de-trabalho/corretivas') {
    if (method === 'post') return createRecord(workOrders, { tipo: path.endsWith('preventivas') ? 'PREVENTIVA' : 'CORRETIVA', status: 'AGENDADA', local: null, iniciadaEm: null, concluidaEm: null, ...body })
  }
  const ticketAction = path.match(/^\/chamados\/([^/]+)\/(assumir|responsavel|status|reabrir)$/)
  if (ticketAction && (method === 'put' || method === 'post')) {
    const record = tickets.find((item) => item.id === ticketAction[1])
    if (!record) return null
    if (ticketAction[2] === 'assumir') Object.assign(record, { tecnicoResponsavelId: 'user-demo-2', primeiraRespostaEm: record.primeiraRespostaEm ?? now })
    if (ticketAction[2] === 'responsavel') Object.assign(record, { tecnicoResponsavelId: body.tecnicoId })
    if (ticketAction[2] === 'status') {
      const novoStatus = body.novoStatus as string
      demoCheckStatusParts(record, novoStatus, body.pecas)
      Object.assign(record, { status: novoStatus })
      if (novoStatus === 'CANCELADO') record.canceladoEm = now
      if (novoStatus === 'RESOLVIDO') Object.assign(record, { solucao: body.solucao ?? null, causaCategoria: body.causaCategoria ?? null })
    }
    if (ticketAction[2] === 'reabrir') Object.assign(record, { status: 'EM_ANDAMENTO', reaberturas: Number(record.reaberturas ?? 0) + 1 })
    return record
  }
  const sectorRoute = path.match(/^\/setores\/([^/]+)$/)
  if (sectorRoute && ['get', 'put', 'patch'].includes(method)) {
    const sector = sectors.find((item) => item.id === sectorRoute[1])
    if (!sector) throw demoProblem(404, { code: 'NAO_ENCONTRADO' })
    if (method === 'put') Object.assign(sector, body)
    if (method === 'patch') {
      const view = sectorView(sector)
      if (body.ativo === false && view.equipamentosAtivos > 0) throw demoProblem(409, { code: 'SETOR_COM_EQUIPAMENTOS_ATIVOS', equipamentosAtivos: view.equipamentosAtivos })
      sector.ativo = body.ativo !== false
    }
    return sectorView(sector)
  }
  // Story 25: tipo do chamado e peças trocadas (append-only), mesmas regras do backend.
  const ticketTypeMatch = path.match(/^\/chamados\/([^/]+)\/tipo$/)
  if (ticketTypeMatch && method === 'put') return demoSetTicketType(ticketTypeMatch[1], body.tipo)
  const ticketPartsMatch = path.match(/^\/chamados\/([^/]+)\/pecas$/)
  if (ticketPartsMatch) return method === 'post' ? demoAddParts(ticketPartsMatch[1], body.pecas) : demoParts.filter((part) => part.chamadoId === ticketPartsMatch[1])
  const equipmentPartsMatch = path.match(/^\/equipamentos\/([^/]+)\/pecas-trocadas$/)
  if (equipmentPartsMatch) return demoEquipmentParts(equipmentPartsMatch[1])
  const detailRoutes = [
    ['/hospitais/', hospitals], ['/setores/', sectors], ['/equipamentos/', equipment], ['/ordens-de-trabalho/', workOrders], ['/chamados/', tickets], ['/users/', users], ['/platform-users/', platformUsers], ['/tenants/', tenants],
  ] as const
  for (const [prefix, collection] of detailRoutes) {
    if (!path.startsWith(prefix)) continue
    const rest = path.slice(prefix.length).split('/')
    const id = rest[0]
    const action = rest[1]
    const record = collection.find((item) => item.id === id)
    if (action === 'historico' && method === 'get') return history[id] ?? []
    if (action === 'foto-url' && method === 'get') return { url: record?.fotoUrl ?? '' }
    if (action === 'foto-upload-url' && method === 'post') return { url: 'https://example.test/upload', chave: `demo/${body.nomeArquivo ?? 'foto'}`, expiraEm: now }
    if (action === 'desativar' && method === 'post') { if (record) record.ativo = false; return null }
    if (action === 'anonimizar-cpf' && method === 'post') return null
    if (action === 'cancelar' && method === 'post') { if (record) record.status = 'CANCELADA'; return record }
    if (action === 'status' && record && (method === 'post' || method === 'put')) { Object.assign(record, body); return record }
    if (!record) return method === 'get' ? null : { id, ...body }
    if (method === 'get') return record
    if (method === 'put') { Object.assign(record, body); return record }
    if (method === 'delete') { removeRecord(collection, id); return null }
  }
  if (path.startsWith('/ordens-de-trabalho/')) {
    const id = lastPart(path)
    return workOrders.find((order) => order.id === id) ?? null
  }
  if (method === 'get') return []
  if (method === 'post') return { id: makeId('demo'), ...body }
  if (method === 'put') return body
  return null
}

// Fotos (Stories 13.1/13.2): sem storage real no demo; o PUT para demo:// é pulado e as imagens são SVGs locais.
const demoPhotoColors = ['#17B88E', '#F5A623', '#5B8DEF', '#B66DFF', '#FF7A59']
function demoPhotoUrl(seed: string, size: number) {
  const hash = [...seed].reduce((total, char) => total + char.charCodeAt(0), 0)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100"><rect width="100" height="100" fill="${demoPhotoColors[hash % demoPhotoColors.length]}"/><circle cx="50" cy="45" r="18" fill="#ffffff" fill-opacity="0.8"/><rect x="25" y="68" width="50" height="10" rx="5" fill="#ffffff" fill-opacity="0.8"/></svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}
const orderPhotos = new Map<string, RecordValue[]>()
function demoUploadUrls(prefix: string, body: RecordValue) {
  const target = (type: unknown, kind: string) => ({ url: `demo://${prefix}/${kind}`, chave: `demo/${prefix}/${kind}-${makeId('foto')}`, expiraEm: now, contentType: (type as string) ?? 'image/jpeg' })
  return { original: target(body.tipoOriginal, 'original'), miniatura: target(body.tipoMiniatura ?? body.tipoOriginal, 'miniatura') }
}

function handlePhotos(method: string, path: string, body: RecordValue): unknown {
  const equipmentPhoto = path.match(/^\/equipamentos\/([^/]+)\/foto(\/upload-url|\/miniatura)?$/)
  if (equipmentPhoto) {
    const record = equipment.find((item) => item.id === equipmentPhoto[1])
    if (!record) return undefined
    if (equipmentPhoto[2] === '/upload-url' && method === 'post') return demoUploadUrls(`equipamentos/${record.id}`, body)
    if (method === 'put' && !equipmentPhoto[2]) { record.fotoVersao = new Date().toISOString(); return { fotoVersao: record.fotoVersao } }
    if (method === 'delete' && !equipmentPhoto[2]) { record.fotoVersao = null; return null }
    if (method === 'get') return { url: demoPhotoUrl(`${record.id}${record.fotoVersao ?? ''}`, equipmentPhoto[2] ? 160 : 640) }
  }
  const orderPhoto = path.match(/^\/ordens-de-trabalho\/([^/]+)\/fotos(\/upload-url|\/[^/]+)?$/)
  if (orderPhoto) {
    const record = workOrders.find((item) => item.id === orderPhoto[1])
    if (!record) return undefined
    const list = orderPhotos.get(record.id as string) ?? []
    orderPhotos.set(record.id as string, list)
    const sync = () => { record.fotosCount = list.length }
    if (orderPhoto[2] === '/upload-url' && method === 'post') return demoUploadUrls(`ordens/${record.id}`, body)
    if (!orderPhoto[2] && method === 'get') return list.map((item) => ({ ...item, urlOriginal: demoPhotoUrl(item.id as string, 640), urlMiniatura: demoPhotoUrl(item.id as string, 160) }))
    if (!orderPhoto[2] && method === 'post') {
      const created = { id: makeId('foto'), criadoEm: new Date().toISOString() }
      list.push(created)
      sync()
      return created
    }
    if (orderPhoto[2] && method === 'delete') {
      const index = list.findIndex((item) => item.id === orderPhoto[2].slice(1))
      if (index >= 0) list.splice(index, 1)
      sync()
      return null
    }
  }
  return undefined
}

function categoryName(id: unknown) { return (categories.find((item) => item.id === id)?.nome as string | undefined) ?? null }

function categorizedBody(body: RecordValue): RecordValue {
  if (!body.categoriaId) return { ...body, categoriaId: null, categoriaNome: null }
  return { ...body, categoriaNome: categoryName(body.categoriaId) }
}

function withCount(category: RecordValue): RecordValue {
  return { ...category, quantidadeEquipamentos: equipment.filter((item) => item.categoriaId === category.id).length }
}

function handleCategories(method: string, path: string, body: RecordValue, params?: Record<string, unknown>): unknown {
  if (path === '/categorias-equipamento') {
    if (method === 'get') {
      return categories
        .filter((item) => params?.ativa === undefined || item.ativa === params.ativa)
        .filter((item) => !params?.revisar || (item.origem === 'carga' && !item.revisada))
        .filter((item) => typeof params?.q !== 'string' || !params.q.trim() || foldText(item.nome).includes(foldText(params.q.trim())))
        .map(withCount)
    }
    if (method === 'post') {
      const created = { id: makeId('category'), origem: 'manual', revisada: true, ativa: true, checklistPadraoId: null, ...body }
      categories.push(created)
      return withCount(created)
    }
  }
  const route = path.match(/^\/categorias-equipamento\/([^/]+)(?:\/(revisada|mesclar))?$/)
  if (!route) return undefined
  const record = categories.find((item) => item.id === route[1])
  if (!record) return null
  if (route[2] === 'revisada' && method === 'put') { record.revisada = true; return withCount(record) }
  if (route[2] === 'mesclar' && method === 'post') {
    const origin = categories.find((item) => item.id === body.origemId)
    if (origin) {
      equipment.filter((item) => item.categoriaId === origin.id).forEach((item) => Object.assign(item, { categoriaId: record.id, categoriaNome: record.nome }))
      origin.ativa = false
      if (!record.checklistPadraoId) record.checklistPadraoId = origin.checklistPadraoId
    }
    return withCount(record)
  }
  if (method === 'get') return withCount(record)
  if (method === 'put') { Object.assign(record, body); equipment.filter((item) => item.categoriaId === record.id).forEach((item) => { item.categoriaNome = record.nome }); return withCount(record) }
  if (method === 'delete') { record.ativa = false; return null }
  return undefined
}

function filterCollection(collection: RecordValue[], path: string, params?: Record<string, unknown>) {
  if (path === '/equipamentos' && typeof params?.q === 'string' && params.q.trim()) {
    const term = foldText(params.q.trim())
    collection = collection.filter((item) => [item.codigo, item.nome, item.modelo, item.numeroSerie, item.categoriaNome].some((value) => foldText(value).includes(term)))
  }
  if (path === '/equipamentos' && typeof params?.status === 'string' && params.status) {
    const status = params.status.toLowerCase()
    collection = collection.filter((item) => String(item.statusCicloVida ?? '').toLowerCase() === status)
  }
  if (path === '/equipamentos' && (params?.categoriaId || params?.semCategoria)) {
    collection = collection.filter((item) => params.semCategoria ? !item.categoriaId : item.categoriaId === params.categoriaId)
  }
  if (path === '/equipamentos' && params?.hospitalId) {
    const sectorIds = new Set(sectors.filter((item) => item.hospitalId === params.hospitalId).map((item) => item.id))
    return collection.filter((item) => sectorIds.has(item.setorId as string) && (!params.setorId || item.setorId === params.setorId))
  }
  if (path === '/ordens-de-trabalho' && params?.equipamentoId) return collection.filter((item) => item.equipamentoId === params.equipamentoId)
  if (path === '/ordens-de-trabalho' && params?.status) collection = collection.filter((item) => item.status === params.status)
  if (path === '/ordens-de-trabalho' && params?.tipo) collection = collection.filter((item) => item.tipo === params.tipo)
  if (path === '/chamados' && params?.status) collection = collection.filter((item) => item.status === params.status)
  if (path === '/chamados' && params?.hospitalId) collection = collection.filter((item) => item.hospitalId === params.hospitalId)
  if (path === '/users' && params?.role) collection = collection.filter((item) => item.role === params.role)
  if (path === '/users' && params?.ativo !== undefined) collection = collection.filter((item) => item.ativo === params.ativo)
  if (path === '/ordens-de-trabalho' && params?.atrasadas) collection = collection.filter((item) => item.atrasada)
  if (path === '/ordens-de-trabalho') {
    if (params?.hospitalId) collection = collection.filter((item) => orderLocation(item).hospitalId === params.hospitalId)
    if (params?.setorId) collection = collection.filter((item) => orderLocation(item).setorId === params.setorId)
    if (params?.planoPreventivoId) collection = collection.filter((item) => item.planoPreventivoId === params.planoPreventivoId)
    if (params?.campanhaPreventivaId) collection = collection.filter((item) => item.campanhaPreventivaId === params.campanhaPreventivaId)
  }
  return collection
}

/** Hospital e setor da OT, resolvidos pelo equipamento (só a lista os devolve, como no backend 18.2). */
function orderLocation(order: RecordValue) {
  const sector = sectors.find((item) => item.id === equipment.find((entry) => entry.id === order.equipamentoId)?.setorId)
  const hospital = hospitals.find((item) => item.id === sector?.hospitalId)
  return { hospitalId: hospital?.id ?? null, hospitalNome: hospital?.nome ?? null, setorId: sector?.id ?? null, setorNome: sector?.nome ?? null }
}
function workOrderListView(order: RecordValue): RecordValue {
  return { planoPreventivoId: null, campanhaPreventivaId: null, ...order, ...orderLocation(order) }
}

/** Plano com o progresso agregado das OTs (otsGeradas/otsConcluidas/proximaExecucao), como no backend 18.2. */
function planView(plan: RecordValue): RecordValue {
  const generated = workOrders.filter((order) => order.planoPreventivoId === plan.id)
  return { ...plan, otsGeradas: generated.length, otsConcluidas: generated.filter((order) => order.status === 'CONCLUIDA').length, proximaExecucao: plan.proximaData }
}

function routeCollection(path: string) {
  if (path === '/hospitais') return hospitals
  if (path === '/equipamentos') return equipment
  if (path === '/ordens-de-trabalho') return workOrders
  if (path === '/checklists') return checklists
  if (path === '/chamados') return tickets
  if (path === '/users') return users
  if (path === '/platform-users') return platformUsers
  return tenants
}

function createRecord(collection: RecordValue[], data: RecordValue) {
  const record = { id: makeId('demo'), ...data }
  collection.push(record)
  return record
}

function removeRecord(collection: RecordValue[], id?: string) {
  const index = collection.findIndex((item) => item.id === id)
  if (index >= 0) collection.splice(index, 1)
}

function getPath(config: InternalAxiosRequestConfig) {
  const url = new URL(config.url ?? '/', config.baseURL ?? window.location.origin)
  return url.pathname.replace(/^\/api\/v1/, '') || '/'
}

function parseBody(value: unknown): RecordValue {
  if (typeof value === 'string') {
    try { return JSON.parse(value) as RecordValue } catch { return {} }
  }
  return typeof value === 'object' && value !== null ? value as RecordValue : {}
}

/** Importação em lote simulada: 120 linhas, 40 a cada consulta; algumas linhas com erro (sem dado real). */
const DEMO_IMPORT_TOTAL = 120
const DEMO_IMPORT_STEP = 40
const demoImportErrors: RecordValue[] = [
  { linha: 7, codigo: 'EQ-2007', code: 'CATEGORIA_NAO_ENCONTRADA', mensagem: 'Categoria nao encontrada ou desativada.' },
  { linha: 18, codigo: 'EQ-2018', code: 'CAMPO_OBRIGATORIO', mensagem: "Coluna 'categoria' obrigatoria." },
  { linha: 33, codigo: 'EQ-2033', code: 'SETOR_NAO_ENCONTRADO', mensagem: 'Setor nao encontrado: cadastre o setor antes dos equipamentos.' },
  { linha: 54, codigo: 'EQ-2054', code: 'DATA_INVALIDA', mensagem: "Data invalida na coluna 'data_instalacao': use yyyy-MM-dd ou dd/MM/yyyy." },
]

function startDemoImport(body: RecordValue) {
  const form = body as unknown as { get?: (name: string) => unknown }
  const tipo = String(typeof form.get === 'function' ? form.get('tipo') : body.tipo ?? 'equipamentos')
  const id = makeId('import-demo')
  importsById.set(id, { tipo, polls: 0 })
  return demoImportState(id, tipo, 0)
}

function pollDemoImport(id: string) {
  const entry = importsById.get(id) ?? { tipo: 'equipamentos', polls: 0 }
  entry.polls += 1
  importsById.set(id, entry)
  return demoImportState(id, entry.tipo, entry.polls)
}

function demoImportState(id: string, tipo: string, polls: number) {
  const processadas = Math.min(DEMO_IMPORT_TOTAL, polls * DEMO_IMPORT_STEP)
  const done = processadas >= DEMO_IMPORT_TOTAL
  const erros = demoImportErrors.filter((error) => (error.linha as number) <= processadas)
  return {
    id,
    tipo,
    status: done ? 'concluido' : polls === 0 ? 'pendente' : 'processando',
    total: DEMO_IMPORT_TOTAL,
    processadas,
    criados: Math.max(0, processadas - erros.length - Math.floor(processadas / 12)),
    ignorados: Math.floor(processadas / 12),
    comErro: erros.length,
    erros,
    errosTruncados: false,
    criadoEm: now,
    concluidoEm: done ? now : null,
  }
}

/**
 * Campanha de preventiva simulada (Story 15.2): a prévia usa os equipamentos de exemplo; a execução avança a cada
 * consulta do painel (1/3 dos equipamentos por vez) para exercitar o polling. Sem dado real.
 */
type DemoPending = { equipamentoId: string; codigo: string; motivo: string }
type DemoSkipped = { equipamentoId: string; codigo: string; motivo: string; otCodigo: string | null }
type DemoCampaignPlan = { total: number; geradas: number; puladas: number; puladasDetalhe: DemoSkipped[]; pendencias: DemoPending[] }
const campaignPlans = new Map<string, DemoCampaignPlan>()
const campaignPolls = new Map<string, number>()
const campaigns: RecordValue[] = []
const campaignReasons = ['SEM_CATEGORIA', 'CATEGORIA_SEM_CHECKLIST', 'CHECKLIST_INDISPONIVEL', 'SEM_TECNICO_DISPONIVEL']

function planCampaign(body: RecordValue) {
  const sectorIds = (body.setorIds as string[] | undefined) ?? []
  const categoryIds = (body.categoriaIds as string[] | undefined) ?? []
  const hospitalSectors = sectors.filter((sector) => sector.hospitalId === body.hospitalId).map((sector) => sector.id)
  const eligible = equipment.filter((item) => hospitalSectors.includes(item.setorId)
    && (sectorIds.length === 0 || sectorIds.includes(item.setorId as string))
    && (categoryIds.length === 0 || categoryIds.includes(item.categoriaId as string))
    && item.statusCicloVida !== 'INATIVO')
  const pendencias: DemoPending[] = []
  const puladasDetalhe: DemoSkipped[] = []
  let geradas = 0
  for (const item of eligible) {
    const category = categories.find((entry) => entry.id === item.categoriaId)
    const motivo = !category ? 'SEM_CATEGORIA' : !category.checklistPadraoId ? 'CATEGORIA_SEM_CHECKLIST' : undefined
    if (motivo) pendencias.push({ equipamentoId: item.id as string, codigo: item.codigo as string, motivo })
    else geradas += 1
  }
  return { total: eligible.length, geradas, puladas: puladasDetalhe.length, puladasDetalhe, pendencias }
}

function previewCampaign(body: RecordValue) {
  const plan = planCampaign(body)
  const pendenciasPorMotivo = Object.fromEntries(campaignReasons.map((reason) => [reason, plan.pendencias.filter((item) => item.motivo === reason).length]))
  const technician = users.find((user) => user.id === body.tecnicoId) ?? users[1]
  return {
    totalEquipamentos: plan.total,
    aGerar: plan.geradas,
    puladas: plan.puladas,
    totalPendencias: plan.pendencias.length,
    pendenciasPorMotivo,
    pendencias: plan.pendencias,
    puladasDetalhe: plan.puladasDetalhe,
    distribuicaoPorTecnico: body.modoAtribuicao === 'sem_responsavel' || plan.geradas === 0 ? [] : [{ tecnicoId: technician.id, nome: technician.nome, quantidade: plan.geradas }],
  }
}

function campaignView(campaign: RecordValue, detail: boolean): RecordValue {
  const plan = campaignPlans.get(campaign.id as string)
  if (!plan) return { ...campaign, pendenciasDetalhe: [], puladasDetalhe: [] }
  let { status } = campaign as { status: string }
  const polls = campaignPolls.get(campaign.id as string) ?? 0
  const step = Math.max(1, Math.ceil(plan.total / 3))
  const processadas = status === 'cancelada' ? (campaign.execucao as { processadas: number }).processadas : Math.min(plan.total, polls * step)
  if (status !== 'cancelada' && processadas >= plan.total) status = 'concluida'
  else if (status !== 'cancelada') status = polls === 0 ? 'pendente' : 'processando'
  const done = status === 'concluida'
  const generated = done ? plan.geradas : Math.floor(plan.geradas * (processadas / Math.max(1, plan.total)))
  Object.assign(campaign, { status, execucao: { totalEquipamentos: plan.total, processadas, geradas: generated, puladas: plan.puladas, pendencias: done ? plan.pendencias.length : 0 }, ots: { total: generated, agendadas: generated, emExecucao: 0, concluidas: 0, canceladas: 0, atrasadas: 0, naoRealizadas: 0 } })
  return { ...campaign, pendenciasDetalhe: detail && done ? plan.pendencias : [], puladasDetalhe: detail && done ? plan.puladasDetalhe : [] }
}

function seedDemoCampaign() {
  const body = { hospitalId: hospitals[0].id, nome: 'Preventiva semestral UTI', setorIds: [sectors[0].id], categoriaIds: [], dataInicio: dayIso(-10), dataFim: null, recorrencia: 'meses', intervalo: 6, modoAtribuicao: 'equilibrado', tecnicoId: null }
  const id = 'campaign-demo-1'
  campaigns.push({ id, ...body, proximaData: dayIso(170), status: 'concluida', ativa: true, janelaAtual: dayIso(-10), criadaEm: now, canceladaEm: null, execucao: { totalEquipamentos: 0, processadas: 0, geradas: 0, puladas: 0, pendencias: 0 }, ots: { total: 0, agendadas: 0, emExecucao: 0, concluidas: 0, canceladas: 0, atrasadas: 0, naoRealizadas: 0 } })
  const plan = planCampaign(body)
  // Uma pulada de exemplo (equipamento que já tem OT preventiva aberta) para exercitar a tabela de puladas no painel.
  const skipped: DemoSkipped = { equipamentoId: equipment[1].id as string, codigo: equipment[1].codigo as string, motivo: 'JA_TEM_OT_PREVENTIVA_ABERTA', otCodigo: 'OT-2026-001' }
  campaignPlans.set(id, { ...plan, total: plan.total + 1, puladas: 1, puladasDetalhe: [skipped] })
  campaignPolls.set(id, 99)
}
seedDemoCampaign()

function handleCampaigns(method: string, path: string, body: RecordValue, params?: Record<string, unknown>): unknown {
  if (path === '/campanhas-preventivas/previa' && method === 'post') return previewCampaign(body)
  if (path === '/campanhas-preventivas' && method === 'post') {
    const id = makeId('campaign-demo')
    const periodic = body.recorrencia !== 'avulsa'
    campaigns.unshift({ id, setorIds: [], categoriaIds: [], dataFim: null, intervalo: null, tecnicoId: null, ...body, proximaData: periodic ? body.dataInicio : null, status: 'pendente', ativa: true, janelaAtual: body.dataInicio, criadaEm: now, canceladaEm: null, execucao: { totalEquipamentos: 0, processadas: 0, geradas: 0, puladas: 0, pendencias: 0 }, ots: { total: 0, agendadas: 0, emExecucao: 0, concluidas: 0, canceladas: 0, atrasadas: 0, naoRealizadas: 0 } })
    campaignPlans.set(id, planCampaign(body))
    campaignPolls.set(id, 0)
    return { id, status: 'pendente' }
  }
  if (path === '/campanhas-preventivas' && method === 'get') {
    return campaigns.filter((item) => (!params?.hospitalId || item.hospitalId === params.hospitalId) && (!params?.status || campaignView(item, false).status === params.status)).map((item) => campaignView(item, false))
  }
  const route = path.match(/^\/campanhas-preventivas\/([^/]+)(\/cancelar)?$/)
  const campaign = route ? campaigns.find((item) => item.id === route[1]) : undefined
  if (!campaign) throw Object.assign(new Error('Campanha não encontrada'), { response: { status: 404, data: { code: 'CAMPANHA_NAO_ENCONTRADA' } } })
  if (route?.[2] && method === 'post') {
    campaignView(campaign, true)
    if (campaign.status !== 'cancelada') Object.assign(campaign, { status: 'cancelada', ativa: false, proximaData: null, canceladaEm: now })
    return campaignView(campaign, true)
  }
  campaignPolls.set(campaign.id as string, (campaignPolls.get(campaign.id as string) ?? 0) + 1)
  return campaignView(campaign, true)
}

function lastPart(path: string) { return path.split('/').filter(Boolean).at(-1) ?? '' }
const DEMO_TICKET_TYPES = ['falha', 'peca_reposicao', 'instalacao', 'outro']
const demoParts: RecordValue[] = []

function demoOpenTicket(id: string) {
  const record = tickets.find((item) => item.id === id)
  if (!record) throw demoProblem(404, { code: 'NAO_ENCONTRADO' })
  if (record.status === 'RESOLVIDO' || record.status === 'CANCELADO') throw demoProblem(409, { code: 'CHAMADO_ENCERRADO' })
  return record
}

function demoSetTicketType(id: string, tipo: unknown) {
  if (tipo !== null && tipo !== undefined && !DEMO_TICKET_TYPES.includes(String(tipo))) throw demoProblem(400, { code: 'TIPO_INVALIDO' })
  const record = demoOpenTicket(id)
  record.tipo = tipo ?? null
  return record
}

function demoAddParts(id: string, pecas: unknown) {
  const record = demoOpenTicket(id)
  const list = Array.isArray(pecas) ? pecas as RecordValue[] : []
  if (!list.length || list.some((part) => !String(part.descricao ?? '').trim())) throw demoProblem(400, { code: 'PECA_INVALIDA' })
  const { user } = getAuthState()
  list.forEach((part) => demoParts.push({ id: makeId('peca'), chamadoId: id, equipamentoId: record.equipamentoId, chamadoCodigo: record.codigo, descricao: String(part.descricao).trim(), quantidade: Number(part.quantidade ?? 1), codigo: part.codigo ?? null, registradoPor: user?.id ?? null, registradoPorNome: user?.name ?? 'Usuário demo', registradoEm: new Date().toISOString() }))
  return demoParts.filter((part) => part.chamadoId === id)
}

// Epic 22 (assinatura na finalização): sem storage real no demo; o PUT para demo:// é pulado e a imagem é um SVG local.
const demoSignatureImage = `data:image/svg+xml;utf8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="320" height="80" viewBox="0 0 320 80"><polyline points="10,60 60,20 90,55 140,15 170,60 230,25 300,50" fill="none" stroke="#0f172a" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>')}`
const demoSignatures: RecordValue[] = []
/** Seeds para o Admin ver a OT assinada e a lista de finalizações (no web, OT e campanha só são assinadas pelo app). */
const demoSignature = (id: string, alvoId: string, papel: string, nome: string, extra: RecordValue) => ({ id, alvoTipo: 'ot', alvoId, papel, clientId: id, nome, registroProfissional: null, cargo: null, assinadoEm: now, registradoEm: now, urlImagem: demoSignatureImage, ...extra })
const seededOrder = workOrders.find((item) => item.id === 'order-demo-3')
if (seededOrder) {
  seededOrder.assinaturas = [
    demoSignature('assinatura-demo-1', 'order-demo-3', 'tecnico', 'Rafael Souza', { registroProfissional: '123456/SP' }),
    demoSignature('assinatura-demo-2', 'order-demo-3', 'responsavel_hospital', 'Carla Gestora', { cargo: 'Coordenadora de enfermagem' }),
  ]
  seededOrder.assinada = true
}
const demoFinalizedOts = [
  { id: 'order-demo-c1', codigo: 'OT-2026-101', equipamentoId: 'eq-demo', concluidaEm: now, veredito: 'ATIVO' },
  { id: 'order-demo-c2', codigo: 'OT-2026-102', equipamentoId: 'eq-demo', concluidaEm: now, veredito: 'ATIVO' },
  { id: 'order-demo-c3', codigo: 'OT-2026-103', equipamentoId: 'eq-demo', concluidaEm: now, veredito: 'NAO_APTO' },
  { id: 'order-demo-c4', codigo: 'OT-2026-104', equipamentoId: 'eq-demo', concluidaEm: now, veredito: 'EM_MANUTENCAO' },
  // Campanha grande: o painel mostra só 5 códigos e "e mais N".
  ...Array.from({ length: 8 }, (_, index) => ({ id: `order-demo-c${index + 5}`, codigo: `OT-2026-${105 + index}`, equipamentoId: 'eq-demo', concluidaEm: now, veredito: 'ATIVO' })),
]
const demoFinalizations: RecordValue[] = [
  { id: 'finalizacao-demo-1', campanhaId: 'campaign-demo-1', tecnicoId: 'user-demo-2', clientId: 'finalizacao-demo-1', finalizadoEm: now, resumo: { totalOts: 12, aptos: 9, naoAptos: 1, emManutencao: 1, semVeredito: 0, emUso: 1, ots: demoFinalizedOts } },
]

function handleSignatures(method: string, path: string, body: RecordValue): unknown {
  if (path === '/assinaturas/upload-url' && method === 'post') return { url: 'demo://assinaturas', chave: `demo/assinaturas/${makeId('assinatura')}.png`, expiraEm: now }
  if (path === '/assinaturas' && method === 'post') {
    const repeated = demoSignatures.find((item) => item.clientId === body.clientId)
    if (repeated) return repeated
    const alvo = body.alvoTipo === 'ot' ? workOrders.find((item) => item.id === body.alvoId) : body.alvoTipo === 'chamado' ? tickets.find((item) => item.id === body.alvoId) : undefined
    if (!alvo) throw demoProblem(404, { code: 'ALVO_NAO_ENCONTRADO' })
    const status = String(alvo.status ?? '').toUpperCase()
    if ((body.alvoTipo === 'ot' && status !== 'CONCLUIDA') || (body.alvoTipo === 'chamado' && status !== 'RESOLVIDO')) throw demoProblem(409, { code: 'ALVO_NAO_FINALIZADO' })
    const list = (alvo.assinaturas as RecordValue[] | undefined) ?? []
    if (body.papel === 'responsavel_hospital' && !list.some((item) => item.papel === 'tecnico')) throw demoProblem(409, { code: 'ASSINATURA_TECNICO_AUSENTE' })
    const { user } = getAuthState()
    const tecnico = body.papel === 'tecnico'
    const created = { id: makeId('assinatura'), alvoTipo: body.alvoTipo, alvoId: body.alvoId, papel: body.papel, clientId: body.clientId, nome: tecnico ? user?.name ?? 'Técnico demo' : body.nome, registroProfissional: tecnico ? '123456/SP' : null, cargo: tecnico ? null : body.cargo, assinadoEm: body.assinadoEm, registradoEm: new Date().toISOString(), urlImagem: demoSignatureImage }
    demoSignatures.push(created)
    const next = [...list, created]
    alvo.assinaturas = next
    alvo.assinada = next.some((item) => item.papel === 'tecnico')
    return created
  }
  const finalization = path.match(/^\/campanhas-preventivas\/([^/]+)\/finalizacoes$/)
  if (finalization && method === 'get') return demoFinalizations.filter((item) => item.campanhaId === finalization[1])
  return undefined
}

/** Peças na transição de status do chamado no demo: mesmas regras do backend (Story 25.2). */
function demoCheckStatusParts(record: RecordValue, novoStatus: string, pecas: unknown) {
  const novas = Array.isArray(pecas) ? pecas : []
  if (novas.length && novoStatus !== 'AGUARDANDO_PECA' && novoStatus !== 'RESOLVIDO') throw demoProblem(400, { code: 'PECA_INVALIDA' })
  const id = String(record.id)
  const hasParts = demoParts.some((part) => part.chamadoId === id)
  if (novoStatus === 'RESOLVIDO' && record.tipo === 'peca_reposicao' && !hasParts && !novas.length) throw demoProblem(400, { code: 'PECA_OBRIGATORIA' })
  if (novas.length) demoAddParts(id, novas)
}

function demoEquipmentParts(equipamentoId: string) {
  return demoParts.filter((part) => part.equipamentoId === equipamentoId).slice().reverse()
}

/** Story 23.7: amostra fixa das visitas não realizadas por equipamento em uso. */
const demoNotDoneVisits = {
  encerradas: 24, naoRealizadas: 3, percentual: 12.5,
  porHospital: [{ id: 'hospital-demo-1', nome: 'Hospital São Lucas', encerradas: 24, naoRealizadas: 3, percentual: 12.5 }],
  porSetor: [{ id: 'sector-demo-1', nome: 'UTI Adulto', encerradas: 15, naoRealizadas: 2, percentual: 13.3 }, { id: 'sector-demo-2', nome: 'Centro Cirúrgico', encerradas: 9, naoRealizadas: 1, percentual: 11.1 }],
  porTecnico: [{ id: 'user-demo-2', nome: 'Bruno Técnico', encerradas: 24, naoRealizadas: 3, percentual: 12.5 }],
  emUsoSeguidas: [{ equipamentoId: 'equipment-demo-2', codigo: 'EQ-1002', nome: 'Ventilador pulmonar', hospitalNome: 'Hospital São Lucas', setorNome: 'Centro Cirúrgico', seguidas: 2, ultimaEm: now }],
}
function demoPartReplacements() {
  const byEquipment = new Map<string, { trocas: number; pecas: number; chamados: Set<string> }>()
  demoParts.forEach((part) => {
    const key = String(part.equipamentoId)
    const row = byEquipment.get(key) ?? { trocas: 0, pecas: 0, chamados: new Set<string>() }
    row.trocas += 1
    row.pecas += Number(part.quantidade)
    row.chamados.add(String(part.chamadoId))
    byEquipment.set(key, row)
  })
  return [...byEquipment.entries()].map(([equipamentoId, row]) => {
    const item = equipment.find((candidate) => candidate.id === equipamentoId)
    return { equipamentoId, codigo: item?.codigo ?? null, nome: item?.nome ?? null, trocas: row.trocas, pecas: row.pecas, chamados: row.chamados.size }
  }).sort((left, right) => right.trocas - left.trocas)
}

function makeId(prefix: string) { return `${prefix}-${Math.random().toString(36).slice(2, 9)}` }

const dashboard = {
  agendadas: 1,
  emExecucao: 1,
  concluidas: 4,
  canceladas: 0,
  equipamentosAtivos: equipment.length,
  chamadosAbertosPorSeveridade: { BAIXA: 0, MEDIA: 1, ALTA: 1, CRITICA: 0 },
  chamadosSlaVencido: 1,
  disponibilidadePercentual: 98.6,
  otsPreventivasAtrasadas: 0,
  documentosVencendo30d: 2,
  chamadosRecentes: tickets.map((ticket, index) => ({
    id: ticket.id,
    codigo: `CH-${index + 1}`,
    hospitalId: ticket.hospitalId,
    equipamentoId: ticket.equipamentoId,
    severidade: String(ticket.severidade).toLowerCase(),
    status: String(ticket.status).toLowerCase(),
    abertoEm: now,
    slaStatus: ticket.slaStatus,
  })),
}

/** Primeira data >= hoje na sequência âncora + k * intervalo (mesma regra do backend, D5). */
function nextPlanDate(anchor: string, intervalDays: number) {
  const day = 86_400_000
  const start = Date.parse(`${anchor}T00:00:00Z`)
  const today = Date.parse(`${new Date().toISOString().slice(0, 10)}T00:00:00Z`)
  if (!Number.isFinite(start) || intervalDays < 1 || start >= today) return anchor
  return new Date(start + Math.ceil((today - start) / (intervalDays * day)) * intervalDays * day).toISOString().slice(0, 10)
}

// Perfil da empresa prestadora (heem-backend#209): em memória; o PUT para demo:// é pulado e o logo vira data URL local.
const DEMO_BRAND_DEFAULT = '#3ED597'
const demoCompany: RecordValue = { razaoSocial: null, cnpj: null, endereco: { logradouro: null, numero: null, complemento: null, bairro: null, cidade: null, uf: null, cep: null }, contatoTelefone: null, contatoEmail: null, responsavelTecnicoNome: null, responsavelTecnicoCrea: null, contratoNumero: null, corMarca: DEMO_BRAND_DEFAULT, logoChave: null, atualizadoEm: null }
const demoLogoSvg = `data:image/svg+xml;utf8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="160" height="60" viewBox="0 0 160 60"><rect width="160" height="60" rx="8" fill="#17B88E"/><text x="80" y="36" text-anchor="middle" font-family="sans-serif" font-size="18" fill="#ffffff">LOGO DEMO</text></svg>')}`
function companyView(): RecordValue {
  const { logoChave, ...rest } = demoCompany
  return { cadastrada: Boolean(rest.razaoSocial && rest.cnpj), ...rest, logoUrl: logoChave ? demoLogoSvg : null }
}
function requireCompanyAdmin() {
  if (!(getAuthState().user?.roles ?? []).includes('admin_cliente')) throw demoProblem(403, { code: 'ACESSO_NEGADO' })
}
const tooLong = (value: unknown, max: number) => typeof value === 'string' && value.length > max
function handleCompany(method: string, path: string, body: RecordValue): unknown {
  if (!path.startsWith('/prestadora')) return undefined
  if (path === '/prestadora' && method === 'get') return companyView()
  requireCompanyAdmin()
  const invalid = () => demoProblem(400, { code: 'VALIDACAO_FALHOU' })
  if (path === '/prestadora' && method === 'put') {
    const address = (body.endereco ?? {}) as RecordValue
    const razao = String(body.razaoSocial ?? '').trim()
    const uf = address.uf as string | null | undefined
    const cep = address.cep as string | null | undefined
    if (!razao || razao.length > 150 || !isValidCnpj(String(body.cnpj ?? ''))) throw invalid()
    if (uf && !/^[A-Z]{2}$/.test(uf)) throw invalid()
    if (cep && !/^\d{5}-?\d{3}$/.test(cep)) throw invalid()
    if (['logradouro', 'numero', 'complemento', 'bairro', 'cidade'].some((field) => tooLong(address[field], 100))) throw invalid()
    if (tooLong(body.contatoTelefone, 30) || tooLong(body.contatoEmail, 180) || tooLong(body.responsavelTecnicoNome, 150) || tooLong(body.responsavelTecnicoCrea, 30) || tooLong(body.contratoNumero, 60)) throw invalid()
    if (body.contatoEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(body.contatoEmail))) throw invalid()
    const pick = (field: string) => (body[field] as string | null | undefined) ?? null
    Object.assign(demoCompany, {
      razaoSocial: razao, cnpj: String(body.cnpj).replace(/\D/g, '').replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5'), contatoTelefone: pick('contatoTelefone'), contatoEmail: pick('contatoEmail'),
      responsavelTecnicoNome: pick('responsavelTecnicoNome'), responsavelTecnicoCrea: pick('responsavelTecnicoCrea'), contratoNumero: pick('contratoNumero'),
      endereco: { logradouro: null, numero: null, complemento: null, bairro: null, cidade: null, uf: null, cep: null, ...address }, atualizadoEm: new Date().toISOString(),
    })
    return companyView()
  }
  if (path === '/prestadora/marca' && method === 'put') {
    const cor = body.corMarca as string | null | undefined
    if (cor != null && !/^#[0-9A-Fa-f]{6}$/.test(cor)) throw invalid()
    demoCompany.corMarca = cor ? cor.toUpperCase() : DEMO_BRAND_DEFAULT
    demoCompany.atualizadoEm = new Date().toISOString()
    return companyView()
  }
  if (path === '/prestadora/logo/upload-url' && method === 'post') {
    if (body.contentType !== 'image/png' && body.contentType !== 'image/jpeg') throw invalid()
    return { chave: `demo/prestadora/logo-${makeId('logo')}`, uploadUrl: 'demo://prestadora/logo', expiraEm: now }
  }
  if (path === '/prestadora/logo' && method === 'put') {
    if (typeof body.chave !== 'string' || !body.chave.startsWith('demo/prestadora/')) throw invalid()
    demoCompany.logoChave = body.chave
    return companyView()
  }
  if (path === '/prestadora/logo' && method === 'delete') { demoCompany.logoChave = null; return null }
  return undefined
}
