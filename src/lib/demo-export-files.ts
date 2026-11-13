/** Arquivos de exemplo do modo demonstração: conteúdo fictício, mas válido para o formato (CSV, XLSX e PDF), entregue como data URL. */
export type DemoExportFormat = 'pdf' | 'xlsx' | 'csv'

interface DemoTable { title: string; header: string[]; rows: string[][] }

const MIME: Record<DemoExportFormat, string> = {
  pdf: 'application/pdf',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  csv: 'text/csv;charset=utf-8',
}

const TABLES: Record<string, DemoTable> = {
  chamados: { title: 'Chamados', header: ['Código', 'Equipamento', 'Prioridade', 'Status', 'Aberto em'], rows: [['CH-2026-001', 'Monitor multiparamétrico', 'Alta', 'Aberto', '2026-11-03'], ['CH-2026-002', 'Ventilador pulmonar', 'Crítica', 'Em andamento', '2026-11-05'], ['CH-2026-003', 'Bomba de infusão', 'Média', 'Resolvido', '2026-11-07']] },
  ordens_trabalho: { title: 'Ordens de trabalho', header: ['Código', 'Tipo', 'Equipamento', 'Status', 'Concluída em'], rows: [['OT-2026-001', 'Corretiva', 'Ventilador pulmonar', 'Concluída', '2026-11-06'], ['OT-2026-002', 'Preventiva', 'Monitor multiparamétrico', 'Em andamento', ''], ['OT-2026-003', 'Preventiva', 'Bomba de infusão', 'Concluída', '2026-11-08']] },
  medicoes: { title: 'Medições', header: ['Equipamento', 'Item', 'Valor', 'Unidade', 'Conforme'], rows: [['Monitor multiparamétrico', 'Tensão de saída', '11,8', 'V', 'Sim'], ['Ventilador pulmonar', 'Pressão máxima', '42', 'cmH2O', 'Sim'], ['Bomba de infusão', 'Vazão', '98', 'mL/h', 'Não']] },
  indicadores: { title: 'Indicadores', header: ['Indicador', 'Valor', 'Unidade'], rows: [['MTTR', '4,2', 'horas'], ['MTBF', '312', 'horas'], ['Disponibilidade', '97,8', '%']] },
  emergencias: { title: 'Emergências', header: ['Código', 'Equipamento', 'Setor', 'Acionada em', 'Situação'], rows: [['EM-2026-001', 'Ventilador pulmonar', 'UTI Adulto', '2026-11-04', 'Atendida'], ['EM-2026-002', 'Desfibrilador', 'Pronto-socorro', '2026-11-09', 'Em atendimento']] },
  laudo_ot: { title: 'Laudo da OT', header: ['Campo', 'Valor'], rows: [['OT', 'OT-2026-003'], ['Equipamento', 'Monitor multiparamétrico'], ['Situação', 'Concluída'], ['Parecer', 'Equipamento liberado para uso']] },
  dossie_equipamento: { title: 'Dossiê do equipamento', header: ['Seção', 'Resumo'], rows: [['Identificação', 'Monitor multiparamétrico'], ['Histórico de OTs', '3 ordens concluídas'], ['Medições', '12 registros conformes']] },
  campanha: { title: 'Campanha preventiva', header: ['Equipamento', 'OT', 'Situação'], rows: [['Monitor multiparamétrico', 'OT-2026-002', 'Gerada'], ['Bomba de infusão', 'OT-2026-003', 'Concluída'], ['Ventilador pulmonar', '', 'Pulada']] },
}

const encoder = new TextEncoder()
const escapeXml = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff
  for (const byte of bytes) {
    crc ^= byte
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1))
  }
  return (crc ^ 0xffffffff) >>> 0
}

const u16 = (n: number) => [n & 255, (n >>> 8) & 255]
const u32 = (n: number) => [n & 255, (n >>> 8) & 255, (n >>> 16) & 255, (n >>> 24) & 255]

/** ZIP sem compressão (método "stored"), suficiente para um .xlsx válido. */
function zipStored(files: Array<{ name: string; content: string }>) {
  const locals: number[][] = []
  const centrals: number[][] = []
  let offset = 0
  for (const file of files) {
    const name = Array.from(encoder.encode(file.name))
    const data = encoder.encode(file.content)
    const common = [...u16(20), ...u16(0x0800), ...u16(0), ...u16(0), ...u16(0x21), ...u32(crc32(data)), ...u32(data.length), ...u32(data.length), ...u16(name.length), ...u16(0)]
    const local = [...u32(0x04034b50), ...common, ...name, ...Array.from(data)]
    centrals.push([...u32(0x02014b50), ...u16(20), ...common, ...u16(0), ...u16(0), ...u16(0), ...u32(0), ...u32(offset), ...name])
    locals.push(local)
    offset += local.length
  }
  const centralSize = centrals.reduce((sum, entry) => sum + entry.length, 0)
  const end = [...u32(0x06054b50), ...u16(0), ...u16(0), ...u16(files.length), ...u16(files.length), ...u32(centralSize), ...u32(offset), ...u16(0)]
  return Uint8Array.from([...locals.flat(), ...centrals.flat(), ...end])
}

function buildXlsx(table: DemoTable) {
  const column = (index: number) => String.fromCharCode(65 + index)
  const sheetRows = [table.header, ...table.rows].map((row, r) => `<row r="${r + 1}">${row.map((cell, c) => `<c r="${column(c)}${r + 1}" t="inlineStr"><is><t>${escapeXml(cell)}</t></is></c>`).join('')}</row>`).join('')
  const xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
  const rels = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
  return zipStored([
    { name: '[Content_Types].xml', content: `${xml}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>` },
    { name: '_rels/.rels', content: `${xml}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${rels}/officeDocument" Target="xl/workbook.xml"/></Relationships>` },
    { name: 'xl/workbook.xml', content: `${xml}<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="${rels}"><sheets><sheet name="${escapeXml(table.title.slice(0, 31))}" sheetId="1" r:id="rId1"/></sheets></workbook>` },
    { name: 'xl/_rels/workbook.xml.rels', content: `${xml}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${rels}/worksheet" Target="worksheets/sheet1.xml"/></Relationships>` },
    { name: 'xl/worksheets/sheet1.xml', content: `${xml}<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${sheetRows}</sheetData></worksheet>` },
  ])
}

// Helvetica/WinAnsi: acentos Latin-1 viram escapes octais, então o stream do PDF fica ASCII puro.
function pdfText(value: string) {
  return Array.from(value).map((char) => {
    const code = char.charCodeAt(0)
    if (char === '(' || char === ')' || char === '\\') return `\\${char}`
    return code < 128 ? char : `\\${(code < 256 ? code : 63).toString(8).padStart(3, '0')}`
  }).join('')
}

function buildPdf(table: DemoTable) {
  const lines = [`Relatório de exemplo: ${table.title}`, 'Modo demonstração, dados fictícios.', '', table.header.join(' | '), ...table.rows.map((row) => row.join(' | '))]
  const stream = `BT /F1 12 Tf 50 780 Td 18 TL ${lines.map((line) => `(${pdfText(line)}) Tj T*`).join(' ')} ET`
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
  ]
  let pdf = '%PDF-1.4\n'
  const offsets: number[] = []
  objects.forEach((body, index) => { offsets.push(pdf.length); pdf += `${index + 1} 0 obj\n${body}\nendobj\n` })
  const xref = pdf.length
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.map((offset) => `${String(offset).padStart(10, '0')} 00000 n \n`).join('')}trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`
  return Uint8Array.from(pdf, (char) => char.charCodeAt(0) & 255)
}

function buildCsv(table: DemoTable) {
  const quote = (cell: string) => (/[";\n]/.test(cell) ? `"${cell.replace(/"/g, '""')}"` : cell)
  const text = `${[table.header, ...table.rows].map((row) => row.map(quote).join(';')).join('\r\n')}\r\n`
  return Uint8Array.from([0xef, 0xbb, 0xbf, ...encoder.encode(text)]) // BOM UTF-8 para o Excel abrir os acentos
}

function toBase64(bytes: Uint8Array) {
  let binary = ''
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(binary)
}

/** Data URL de um arquivo de exemplo real; baixa direto pelo atributo download, sem rede. */
export function demoExportDataUrl(conteudo: string, formato: DemoExportFormat) {
  const table = TABLES[conteudo] ?? TABLES.chamados
  const bytes = formato === 'xlsx' ? buildXlsx(table) : formato === 'pdf' ? buildPdf(table) : buildCsv(table)
  return `data:${MIME[formato]};base64,${toBase64(bytes)}`
}
