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
  { id: 'equipment-demo-1', setorId: 'sector-demo-1', codigo: 'EQ-1001', nome: 'Monitor multiparamétrico', categoriaId: 'category-demo-1', categoriaNome: 'Monitor Multiparamétrico', modelo: 'MX-500', numeroSerie: 'DEMO-MX500-01', marca: 'MedTech', fotoUrl: null, dadosGerais: {}, classeRiscoAnvisa: 'III', statusCicloVida: 'ATIVO', criticidade: 'ALTA', tipoProtecao: 'CLASSE_I', parteAplicada: 'TIPO_CF', modoOperacao: 'CONTINUO', dataInstalacao: '2024-03-15', dataGarantiaFim: '2027-03-15', nivelRisco: 'ALTO' },
  { id: 'equipment-demo-2', setorId: 'sector-demo-2', codigo: 'EQ-1002', nome: 'Ventilador pulmonar', categoriaId: 'category-demo-2', categoriaNome: 'Ventilador Pulmonar', modelo: 'Vento 4', numeroSerie: 'DEMO-V4-02', marca: 'MedTech', fotoUrl: null, dadosGerais: {}, classeRiscoAnvisa: 'III', statusCicloVida: 'EM_MANUTENCAO', criticidade: 'ALTA', tipoProtecao: 'CLASSE_I', parteAplicada: 'TIPO_BF', modoOperacao: 'CONTINUO', dataInstalacao: '2023-08-10', dataGarantiaFim: '2026-08-10', nivelRisco: 'MEDIO' },
  { id: 'equipment-demo-3', setorId: 'sector-demo-3', codigo: 'EQ-1003', nome: 'Desfibrilador', categoriaId: null, categoriaNome: null, modelo: 'Heart 2', numeroSerie: 'DEMO-H2-03', marca: 'CardioCare', fotoUrl: null, dadosGerais: {}, classeRiscoAnvisa: 'III', statusCicloVida: 'ATIVO', criticidade: 'ALTA', tipoProtecao: 'CLASSE_II', parteAplicada: 'TIPO_BF', modoOperacao: 'INTERMITENTE', dataInstalacao: '2024-01-20', dataGarantiaFim: '2027-01-20', nivelRisco: 'BAIXO' },
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
const workOrders: RecordValue[] = [
  { id: 'order-demo-1', codigo: 'OT-2026-001', tipo: 'PREVENTIVA', status: 'AGENDADA', equipamentoId: equipment[0].id, checklistId: 'checklist-demo-1', tecnicoId: 'user-demo-2', local: 'UTI Adulto', dataAgendada: now, iniciadaEm: null, concluidaEm: null, atrasada: false },
  { id: 'order-demo-2', codigo: 'OT-2026-002', tipo: 'CORRETIVA', status: 'EM_EXECUCAO', equipamentoId: equipment[1].id, checklistId: 'checklist-demo-1', tecnicoId: 'user-demo-2', chamadoId: tickets[1].id, local: 'Centro Cirúrgico', dataAgendada: now, iniciadaEm: now, concluidaEm: null, atrasada: false },
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
  { id: 'user-demo-2', codigo: 'TEC-001', nome: 'Rafael Costa', email: 'rafael.costa@example.test', role: 'tecnico', ativo: true },
  { id: 'user-demo-3', codigo: 'INT-001', nome: 'Marina Alves', email: 'marina.alves@example.test', role: 'interno_hospital', ativo: true },
]
const platformUsers: RecordValue[] = [{ id: 'platform-user-demo-1', codigo: 'SUP-001', nome: 'Alex Santos', email: 'alex.santos@example.test', role: 'super_admin', ativo: true }]
const tenants: RecordValue[] = [{ id: 'tenant-demo-1', cnpj: '00000000000191', nome: 'Rede Hospitalar Exemplo', ativo: true, createdAt: now }]
const labels: RecordValue[] = []
const dayIso = (offset: number) => new Date(Date.now() + offset * 86400000).toISOString().slice(0, 10)
const documents: RecordValue[] = [
  { id: 'doc-demo-1', equipamentoId: 'equipment-demo-1', tipoDocumento: 'CERTIFICADO_CALIBRACAO', nomeArquivo: 'calibracao-mx500.pdf', uploadedEm: now, validadeAte: dayIso(-5) },
  { id: 'doc-demo-2', equipamentoId: 'equipment-demo-1', tipoDocumento: 'LAUDO_SEGURANCA', nomeArquivo: 'laudo-60601.pdf', uploadedEm: now, validadeAte: dayIso(12) },
  { id: 'doc-demo-3', equipamentoId: 'equipment-demo-1', tipoDocumento: 'MANUAL', nomeArquivo: 'manual-mx500.pdf', uploadedEm: now, validadeAte: null },
]
function documentView(item: RecordValue) {
  const validade = item.validadeAte as string | null
  const days = validade ? Math.round((Date.parse(validade) - Date.parse(dayIso(0))) / 86400000) : null
  return { ...item, vencido: days !== null && days < 0, vencendo: days !== null && days >= 0 && days <= 30 }
}
const history: Record<string, RecordValue[]> = {
  [tickets[0].id as string]: [{ acao: 'Chamado aberto', atorId: 'user-demo-1', ocorridoEm: now }],
  [tickets[1].id as string]: [{ acao: 'Chamado atribuído à equipe técnica', atorId: 'user-demo-1', ocorridoEm: now }],
}
const checklistItemsById = new Map<string, RecordValue[]>([[checklists[0].id as string, checklistItems]])
const userHospitals = new Map<string, string[]>(users.map((user) => [user.id as string, [hospitals[0].id as string]]))
const exportsById = new Map<string, RecordValue>()
const importsById = new Map<string, { tipo: string; polls: number }>()
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

const demoPreventive = { atrasadas: 2, concluidasNoPrazo: 19, concluidasForaDoPrazo: 3, percentualNoPrazo: 86.4, canceladas: 1 }

function demoIndicators(agrupar: unknown) {
  const total = { mtbfHoras: 186, mttaHoras: 1.8, triagemHoras: 3.2, mttrHoras: 5.4, esperaPecaHoras: 12.5, slaAtendimentoPct: 94.5, slaResolucaoPct: 88.2, disponibilidadePercentual: 98.6, qtdOtsPreventivas: 24, qtdOtsCorretivas: 8, preventiva: demoPreventive }
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
  return { ...total, severidadesConsideradas: ['ALTA', 'CRITICA'], grupos: groups }
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

const demoTopEquipment = [
  { equipamentoId: 'equipment-demo-2', codigo: 'EQ-1002', nome: 'Ventilador pulmonar', qtdChamados: 7, mtbfHoras: 96.5 },
  { equipamentoId: 'equipment-demo-1', codigo: 'EQ-1001', nome: 'Monitor multiparamétrico', qtdChamados: 4, mtbfHoras: 168 },
  { equipamentoId: 'equipment-demo-3', codigo: 'EQ-1003', nome: 'Desfibrilador', qtdChamados: 1, mtbfHoras: null },
]

function handleRequest(method: string, path: string, body: RecordValue, params?: Record<string, unknown>): unknown {
  if (path.startsWith('/campanhas-preventivas')) return handleCampaigns(method, path, body, params)
  if (path === '/planos-preventivos' && method === 'get') {
    return preventivePlans.filter((plan) => (!params?.equipamentoId || plan.equipamentoId === params.equipamentoId) && (params?.ativo === undefined || plan.ativo === params.ativo))
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
    return plan
  }
  if (path === '/relatorios/dashboard') return dashboard
  if (path === '/relatorios/indicadores') return demoIndicators(params?.agrupar)
  if (path === '/relatorios/backlog') return demoBacklog
  if (path === '/relatorios/top-equipamentos') return demoTopEquipment
  if (path === '/relatorios/conformidade') return ['CRITICO', 'ALTO', 'MEDIO', 'BAIXO'].map((nivelRisco, index) => ({ nivelRisco, percentualConforme: [96, 92, 98, 100][index], totalMedicoes: [25, 38, 54, 12][index] }))
  if (path === '/relatorios/exportacoes' && method === 'post') {
    const id = makeId('export')
    const result = { id, status: 'concluido', urlDownload: 'https://example.test/demo-relatorio.csv' }
    exportsById.set(id, result)
    return result
  }
  if (path.startsWith('/relatorios/exportacoes/')) return exportsById.get(lastPart(path)) ?? { id: lastPart(path), status: 'concluido', urlDownload: 'https://example.test/demo-relatorio.csv' }
  if (path === '/importacoes' && method === 'post') return startDemoImport(body)
  if (path.startsWith('/importacoes/') && method === 'get') return pollDemoImport(lastPart(path))
  if (path === '/sla/politica') {
    if (method === 'put') slaPolicy = body as unknown as RecordValue[]
    return slaPolicy
  }
  const categoryResult = handleCategories(method, path, body, params)
  if (categoryResult !== undefined) return categoryResult
  if (path === '/equipamentos' && method === 'post') return createRecord(equipment, { ...categorizedBody(body), ativo: true })
  const equipmentUpdate = path.match(/^\/equipamentos\/([^/]+)$/)
  if (equipmentUpdate && method === 'put') {
    const record = equipment.find((item) => item.id === equipmentUpdate[1])
    if (record) { Object.assign(record, categorizedBody(body)); return record }
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
  if (path === '/equipamentos' && (params?.categoriaId || params?.semCategoria)) {
    collection = collection.filter((item) => params.semCategoria ? !item.categoriaId : item.categoriaId === params.categoriaId)
  }
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
type DemoCampaignPlan = { total: number; geradas: number; puladas: number; pendencias: DemoPending[] }
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
  let geradas = 0
  for (const item of eligible) {
    const category = categories.find((entry) => entry.id === item.categoriaId)
    const motivo = !category ? 'SEM_CATEGORIA' : !category.checklistPadraoId ? 'CATEGORIA_SEM_CHECKLIST' : undefined
    if (motivo) pendencias.push({ equipamentoId: item.id as string, codigo: item.codigo as string, motivo })
    else geradas += 1
  }
  return { total: eligible.length, geradas, puladas: 0, pendencias }
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
    distribuicaoPorTecnico: body.modoAtribuicao === 'sem_responsavel' || plan.geradas === 0 ? [] : [{ tecnicoId: technician.id, nome: technician.nome, quantidade: plan.geradas }],
  }
}

function campaignView(campaign: RecordValue, detail: boolean): RecordValue {
  const plan = campaignPlans.get(campaign.id as string)
  if (!plan) return { ...campaign, pendenciasDetalhe: [] }
  let { status } = campaign as { status: string }
  const polls = campaignPolls.get(campaign.id as string) ?? 0
  const step = Math.max(1, Math.ceil(plan.total / 3))
  const processadas = status === 'cancelada' ? (campaign.execucao as { processadas: number }).processadas : Math.min(plan.total, polls * step)
  if (status !== 'cancelada' && processadas >= plan.total) status = 'concluida'
  else if (status !== 'cancelada') status = polls === 0 ? 'pendente' : 'processando'
  const done = status === 'concluida'
  const generated = done ? plan.geradas : Math.floor(plan.geradas * (processadas / Math.max(1, plan.total)))
  Object.assign(campaign, { status, execucao: { totalEquipamentos: plan.total, processadas, geradas: generated, puladas: plan.puladas, pendencias: done ? plan.pendencias.length : 0 }, ots: { total: generated, agendadas: generated, emExecucao: 0, concluidas: 0, canceladas: 0, atrasadas: 0 } })
  return { ...campaign, pendenciasDetalhe: detail && done ? plan.pendencias : [] }
}

function seedDemoCampaign() {
  const body = { hospitalId: hospitals[0].id, nome: 'Preventiva semestral UTI', setorIds: [sectors[0].id], categoriaIds: [], dataInicio: dayIso(-10), dataFim: null, recorrencia: 'meses', intervalo: 6, modoAtribuicao: 'equilibrado', tecnicoId: null }
  const id = 'campaign-demo-1'
  campaigns.push({ id, ...body, proximaData: dayIso(170), status: 'concluida', ativa: true, janelaAtual: dayIso(-10), criadaEm: now, canceladaEm: null, execucao: { totalEquipamentos: 0, processadas: 0, geradas: 0, puladas: 0, pendencias: 0 }, ots: { total: 0, agendadas: 0, emExecucao: 0, concluidas: 0, canceladas: 0, atrasadas: 0 } })
  campaignPlans.set(id, planCampaign(body))
  campaignPolls.set(id, 99)
}
seedDemoCampaign()

function handleCampaigns(method: string, path: string, body: RecordValue, params?: Record<string, unknown>): unknown {
  if (path === '/campanhas-preventivas/previa' && method === 'post') return previewCampaign(body)
  if (path === '/campanhas-preventivas' && method === 'post') {
    const id = makeId('campaign-demo')
    const periodic = body.recorrencia !== 'avulsa'
    campaigns.unshift({ id, setorIds: [], categoriaIds: [], dataFim: null, intervalo: null, tecnicoId: null, ...body, proximaData: periodic ? body.dataInicio : null, status: 'pendente', ativa: true, janelaAtual: body.dataInicio, criadaEm: now, canceladaEm: null, execucao: { totalEquipamentos: 0, processadas: 0, geradas: 0, puladas: 0, pendencias: 0 }, ots: { total: 0, agendadas: 0, emExecucao: 0, concluidas: 0, canceladas: 0, atrasadas: 0 } })
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
