import type { AxiosAdapter, AxiosResponse, InternalAxiosRequestConfig } from 'axios'

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
  { id: 'equipment-demo-1', setorId: 'sector-demo-1', codigo: 'EQ-1001', nome: 'Monitor multiparamétrico', modelo: 'MX-500', numeroSerie: 'DEMO-MX500-01', marca: 'MedTech', fotoUrl: null, dadosGerais: {}, classeRiscoAnvisa: 'III', statusCicloVida: 'ATIVO', criticidade: 'ALTA', tipoProtecao: 'CLASSE_I', parteAplicada: 'TIPO_CF', modoOperacao: 'CONTINUO', dataInstalacao: '2024-03-15', dataGarantiaFim: '2027-03-15', nivelRisco: 'ALTO' },
  { id: 'equipment-demo-2', setorId: 'sector-demo-2', codigo: 'EQ-1002', nome: 'Ventilador pulmonar', modelo: 'Vento 4', numeroSerie: 'DEMO-V4-02', marca: 'MedTech', fotoUrl: null, dadosGerais: {}, classeRiscoAnvisa: 'III', statusCicloVida: 'EM_MANUTENCAO', criticidade: 'ALTA', tipoProtecao: 'CLASSE_I', parteAplicada: 'TIPO_BF', modoOperacao: 'CONTINUO', dataInstalacao: '2023-08-10', dataGarantiaFim: '2026-08-10', nivelRisco: 'MEDIO' },
  { id: 'equipment-demo-3', setorId: 'sector-demo-3', codigo: 'EQ-1003', nome: 'Desfibrilador', modelo: 'Heart 2', numeroSerie: 'DEMO-H2-03', marca: 'CardioCare', fotoUrl: null, dadosGerais: {}, classeRiscoAnvisa: 'III', statusCicloVida: 'ATIVO', criticidade: 'ALTA', tipoProtecao: 'CLASSE_II', parteAplicada: 'TIPO_BF', modoOperacao: 'INTERMITENTE', dataInstalacao: '2024-01-20', dataGarantiaFim: '2027-01-20', nivelRisco: 'BAIXO' },
]
const tickets: RecordValue[] = [
  { id: 'ticket-demo-1', hospitalId: hospitals[0].id, setorId: sectors[0].id, equipamentoId: equipment[0].id, abertoPor: 'user-demo-1', descricao: 'Leitura de SpO2 oscilando durante o monitoramento.', severidade: 'ALTA', status: 'ABERTO', abertoEm: now, slaStatus: 'em_risco', codigo: 'CH-0001', tecnicoResponsavelId: null, primeiraRespostaEm: null, canceladoEm: null, solucao: null, causaCategoria: null, reaberturas: 0, prontoParaResolver: false },
  { id: 'ticket-demo-2', hospitalId: hospitals[0].id, setorId: sectors[1].id, equipamentoId: equipment[1].id, abertoPor: 'user-demo-2', descricao: 'Alarme de pressão recorrente durante o autoteste.', severidade: 'MEDIA', status: 'EM_ANDAMENTO', abertoEm: now, slaStatus: 'no_prazo', codigo: 'CH-0002', tecnicoResponsavelId: 'user-demo-2', primeiraRespostaEm: now, canceladoEm: null, solucao: null, causaCategoria: null, reaberturas: 0, prontoParaResolver: true },
]
const workOrders: RecordValue[] = [
  { id: 'order-demo-1', codigo: 'OT-2026-001', tipo: 'PREVENTIVA', status: 'AGENDADA', equipamentoId: equipment[0].id, checklistId: 'checklist-demo-1', tecnicoId: 'user-demo-2', local: 'UTI Adulto', dataAgendada: now, iniciadaEm: null, concluidaEm: null, atrasada: false },
  { id: 'order-demo-2', codigo: 'OT-2026-002', tipo: 'CORRETIVA', status: 'EM_EXECUCAO', equipamentoId: equipment[1].id, checklistId: 'checklist-demo-1', tecnicoId: 'user-demo-2', chamadoId: tickets[1].id, local: 'Centro Cirúrgico', dataAgendada: now, iniciadaEm: now, concluidaEm: null, atrasada: false },
]
const checklists: RecordValue[] = [{ id: 'checklist-demo-1', codigo: 'CHK-ROT-01', nome: 'Inspeção funcional', descricao: 'Verificação operacional de rotina', ativo: true, quantidadeItens: 3 }]
const checklistItems: RecordValue[] = [
  { id: 'check-item-demo-1', descricao: 'Inspecionar cabos e conectores', tipo: 'BOOLEANO', unidade: null, obrigatorio: true, ordem: 0 },
  { id: 'check-item-demo-2', descricao: 'Verificar alarmes sonoros', tipo: 'BOOLEANO', unidade: null, obrigatorio: true, ordem: 1 },
  { id: 'check-item-demo-3', descricao: 'Registrar resultado do autoteste', tipo: 'NUMERICO', unidade: 'resultado', obrigatorio: false, ordem: 2 },
]
const users: RecordValue[] = [
  { id: 'user-demo-1', codigo: 'ADM-001', nome: 'Clara Mendes', email: 'clara.mendes@example.test', role: 'admin_cliente', ativo: true },
  { id: 'user-demo-2', codigo: 'TEC-001', nome: 'Rafael Costa', email: 'rafael.costa@example.test', role: 'tecnico', ativo: true },
  { id: 'user-demo-3', codigo: 'INT-001', nome: 'Marina Alves', email: 'marina.alves@example.test', role: 'interno_hospital', ativo: true },
]
const platformUsers: RecordValue[] = [{ id: 'platform-user-demo-1', codigo: 'SUP-001', nome: 'Alex Santos', email: 'alex.santos@example.test', role: 'super_admin', ativo: true }]
const tenants: RecordValue[] = [{ id: 'tenant-demo-1', cnpj: '00000000000191', nome: 'Rede Hospitalar Exemplo', ativo: true, createdAt: now }]
const labels: RecordValue[] = []
const history: Record<string, RecordValue[]> = {
  [tickets[0].id as string]: [{ acao: 'Chamado aberto', atorId: 'user-demo-1', ocorridoEm: now }],
  [tickets[1].id as string]: [{ acao: 'Chamado atribuído à equipe técnica', atorId: 'user-demo-1', ocorridoEm: now }],
}
const checklistItemsById = new Map<string, RecordValue[]>([[checklists[0].id as string, checklistItems]])
const userHospitals = new Map<string, string[]>(users.map((user) => [user.id as string, [hospitals[0].id as string]]))
const exportsById = new Map<string, RecordValue>()
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
  const data = handleRequest(method, path, body, config.params as Record<string, unknown> | undefined)
  return {
    config,
    data,
    headers: {},
    status: method === 'post' ? 201 : 200,
    statusText: 'OK',
  } as AxiosResponse
}

function handleRequest(method: string, path: string, body: RecordValue, params?: Record<string, unknown>): unknown {
  if (path === '/relatorios/dashboard') return dashboard
  if (path === '/relatorios/indicadores') return { mtbfHoras: 186, tempoMedioAtendimentoHoras: 1.8, tempoMedioResolucaoHoras: 5.4, disponibilidadePercentual: 98.6, qtdOtsPreventivas: 24, qtdOtsCorretivas: 8 }
  if (path === '/relatorios/conformidade') return ['CRITICO', 'ALTO', 'MEDIO', 'BAIXO'].map((nivelRisco, index) => ({ nivelRisco, percentualConforme: [96, 92, 98, 100][index], totalMedicoes: [25, 38, 54, 12][index] }))
  if (path === '/relatorios/exportacoes' && method === 'post') {
    const id = makeId('export')
    const result = { id, status: 'concluido', urlDownload: 'https://example.test/demo-relatorio.csv' }
    exportsById.set(id, result)
    return result
  }
  if (path.startsWith('/relatorios/exportacoes/')) return exportsById.get(lastPart(path)) ?? { id: lastPart(path), status: 'concluido', urlDownload: 'https://example.test/demo-relatorio.csv' }
  if (path === '/sla/politica') {
    if (method === 'put') slaPolicy = body as unknown as RecordValue[]
    return slaPolicy
  }
  if (path === '/tenants' || path === '/hospitais' || path === '/equipamentos' || path === '/ordens-de-trabalho' || path === '/checklists' || path === '/chamados' || path === '/users' || path === '/platform-users') {
    const collection = routeCollection(path)
    if (method === 'get') return filterCollection(collection, path, params)
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
    if (method === 'get') return sectors.filter((sector) => sector.hospitalId === hospitalSectors[1])
    if (method === 'post') return createRecord(sectors, { ...body, hospitalId: hospitalSectors[1] })
  }
  if (path === '/equipamentos/foto-upload-url' && method === 'post') {
    return { url: 'https://example.test/upload', chave: `demo/${body.nomeArquivo ?? 'foto'}`, expiraEm: now }
  }
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
      Object.assign(record, { status: novoStatus })
      if (novoStatus === 'CANCELADO') record.canceladoEm = now
      if (novoStatus === 'RESOLVIDO') Object.assign(record, { solucao: body.solucao ?? null, causaCategoria: body.causaCategoria ?? null })
    }
    if (ticketAction[2] === 'reabrir') Object.assign(record, { status: 'EM_ANDAMENTO', reaberturas: Number(record.reaberturas ?? 0) + 1 })
    return record
  }
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

function filterCollection(collection: RecordValue[], path: string, params?: Record<string, unknown>) {
  if (path === '/equipamentos' && params?.hospitalId) {
    const sectorIds = new Set(sectors.filter((item) => item.hospitalId === params.hospitalId).map((item) => item.id))
    return collection.filter((item) => sectorIds.has(item.setorId as string) && (!params.setorId || item.setorId === params.setorId))
  }
  if (path === '/ordens-de-trabalho' && params?.equipamentoId) return collection.filter((item) => item.equipamentoId === params.equipamentoId)
  if (path === '/ordens-de-trabalho' && params?.status) return collection.filter((item) => item.status === params.status)
  if (path === '/ordens-de-trabalho' && params?.atrasadas) return collection.filter((item) => item.atrasada)
  return collection
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

function lastPart(path: string) { return path.split('/').filter(Boolean).at(-1) ?? '' }
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
