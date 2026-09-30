/**
 * OBSIDIAN NEXUS — Auto Data Engine & Schema Profiler (Versão V4 - Header Auto-Detection & Ultra-Numeric Parsing)
 * Identifica a linha real de cabeçalho mesmo em planilhas com títulos mesclados na linha 1 (ex: "Controle Financeiro"),
 * parseia valores numéricos em formato R$, $, contabilidade (1.500,00) e popula os gráficos automaticamente.
 */

export interface ColumnProfile {
  name: string;
  type: 'numeric' | 'datetime' | 'categorical' | 'text';
  sampleValues: any[];
  uniqueCount: number;
  sum?: number;
  avg?: number;
  min?: number;
  max?: number;
}

export interface ParsedDataset {
  name: string;
  sheetName: string;
  availableSheets: string[];
  rowCount: number;
  columnCount: number;
  columns: ColumnProfile[];
  rawRows: Record<string, any>[];
  timeColumn?: string;
  primaryNumericColumn?: string;
  secondaryNumericColumn?: string;
  primaryCategoryColumn?: string;
  generatedKpis: GeneratedKpi[];
  timeSeriesData: any[];
  categoryDistribution: any[];
}

export interface GeneratedKpi {
  label: string;
  value: string | number;
  subtext: string;
  type: 'sum' | 'avg' | 'count' | 'max';
  iconType: 'dollar' | 'users' | 'target' | 'activity';
}

// Ignorar abas de metadados/instruções ao escolher a aba padrão
export const IGNORED_SHEET_KEYWORDS = ['instruçoes', 'instruções', 'instructions', 'capa', 'readme', 'help', 'sobre', 'menu', 'config', 'modelo'];

// Detectar se o valor é uma data válida ou serial do Excel
export function isDateValue(val: any): boolean {
  if (val === null || val === undefined || val === '') return false;
  if (val instanceof Date && !isNaN(val.getTime())) return true;
  if (typeof val === 'number') {
    return val > 35000 && val < 60000;
  }
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (trimmed.length < 4) return false;
    const parsed = Date.parse(trimmed);
    return !isNaN(parsed) && (trimmed.includes('-') || trimmed.includes('/') || trimmed.includes(':'));
  }
  return false;
}

// Parser ultra-flexível de valores numéricos para moedas (R$ 1.500,00, $1,500.00, (500,00), etc)
export function parseNumericValue(val: any): number | null {
  if (val === null || val === undefined || val === '') return null;
  if (typeof val === 'number') return isNaN(val) ? null : val;
  if (typeof val === 'boolean') return null;
  
  let str = String(val).trim();
  if (!str) return null;

  // Suporte a valores negativos no formato contábil: (1.500,00) -> -1500.00
  let isNegative = str.includes('-');
  if (str.startsWith('(') && str.endsWith(')')) {
    isNegative = true;
    str = str.slice(1, -1);
  }

  // Extrair caracteres numéricos e separadores de milhar/decimal
  const cleaned = str.replace(/[^\d.,]/g, '');
  if (!cleaned) return null;

  let normalized = cleaned;
  if (normalized.includes(',') && normalized.includes('.')) {
    if (normalized.indexOf('.') < normalized.indexOf(',')) {
      // 1.500,50 -> 1500.50
      normalized = normalized.replace(/\./g, '').replace(',', '.');
    } else {
      // 1,500.50 -> 1500.50
      normalized = normalized.replace(/,/g, '');
    }
  } else if (normalized.includes(',')) {
    normalized = normalized.replace(',', '.');
  }

  const num = parseFloat(normalized);
  if (isNaN(num)) return null;
  return isNegative ? -Math.abs(num) : num;
}

// Motor Principal de Perfilamento de Dados
export function profileDataset(
  dataName: string, 
  rawRows: Record<string, any>[], 
  sheetName: string = 'Dados',
  availableSheets: string[] = []
): ParsedDataset {
  // 1. Filtrar linhas completamente nulas
  const cleanRows = rawRows.filter((row) => {
    if (!row || typeof row !== 'object') return false;
    return Object.values(row).some((v) => v !== null && v !== undefined && String(v).trim() !== '');
  });

  if (cleanRows.length === 0) {
    throw new Error(`A aba "${sheetName}" não possui registros legíveis.`);
  }

  // 2. Filtrar colunas válidas (excluindo __EMPTY nulos)
  const allKeys = Object.keys(cleanRows[0]);
  const validKeys = allKeys.filter((k) => {
    if (!k) return false;
    if (k.startsWith('__EMPTY') && cleanRows.every(r => !r[k] || String(r[k]).trim() === '')) return false;
    return true;
  });

  const finalKeys = validKeys.length > 0 ? validKeys : allKeys;

  const sanitizedRows = cleanRows.map((row) => {
    const newRow: Record<string, any> = {};
    finalKeys.forEach((key) => {
      // Garantir nome de coluna limpo sem __EMPTY
      const cleanHeaderName = key.startsWith('__EMPTY') ? `Coluna_${key.replace('__EMPTY_', '')}` : key;
      newRow[cleanHeaderName] = row[key];
    });
    return newRow;
  });

  const columnNames = Object.keys(sanitizedRows[0]);
  const rowCount = sanitizedRows.length;
  const columnProfiles: ColumnProfile[] = [];

  columnNames.forEach((col) => {
    const values = sanitizedRows.map((r) => r[col]).filter((v) => v !== null && v !== undefined && String(v).trim() !== '');
    const uniqueCount = new Set(values.map(v => String(v))).size;
    const sampleValues = values.slice(0, 5);

    let numericCount = 0;
    let dateCount = 0;
    let sum = 0;
    let min = Infinity;
    let max = -Infinity;

    values.forEach((v) => {
      const num = parseNumericValue(v);
      if (num !== null) {
        numericCount++;
        sum += num;
        if (num < min) min = num;
        if (num > max) max = num;
      }
      if (isDateValue(v)) {
        dateCount++;
      }
    });

    let type: ColumnProfile['type'] = 'text';

    // Se pelo menos 25% dos valores preenchidos forem numéricos (ou se a coluna se chamar 'Valor', 'Receita', etc), considerar numérica!
    const colLower = col.toLowerCase();
    const isNamedLikeNumeric = colLower.includes('valor') || colLower.includes('receita') || colLower.includes('faturamento') || colLower.includes('preço') || colLower.includes('preco') || colLower.includes('custo') || colLower.includes('total') || colLower.includes('saldo');

    if (values.length > 0 && (numericCount / values.length >= 0.25 || (isNamedLikeNumeric && numericCount > 0))) {
      type = 'numeric';
    } else if (values.length > 0 && dateCount / values.length >= 0.3) {
      type = 'datetime';
    } else if (uniqueCount <= Math.max(25, rowCount * 0.4)) {
      type = 'categorical';
    }

    columnProfiles.push({
      name: col,
      type,
      sampleValues,
      uniqueCount,
      sum: type === 'numeric' ? sum : (numericCount > 0 ? sum : undefined),
      avg: type === 'numeric' && numericCount > 0 ? sum / numericCount : undefined,
      min: type === 'numeric' && min !== Infinity ? min : undefined,
      max: type === 'numeric' && max !== -Infinity ? max : undefined,
    });
  });

  // Forçar ao menos a primeira coluna com valores numéricos como 'numeric' se nenhuma foi detectada
  let numericCols = columnProfiles.filter((c) => c.type === 'numeric' || c.sum !== undefined);
  if (numericCols.length === 0) {
    // Buscar qualquer coluna com soma > 0
    const fallbackNumeric = columnProfiles.find(c => c.sampleValues.some(v => parseNumericValue(v) !== null));
    if (fallbackNumeric) {
      fallbackNumeric.type = 'numeric';
      numericCols = [fallbackNumeric];
    }
  }

  const timeCol = columnProfiles.find((c) => c.type === 'datetime')?.name || columnProfiles.find(c => c.name.toLowerCase().includes('data') || c.name.toLowerCase().includes('date') || c.name.toLowerCase().includes('mês') || c.name.toLowerCase().includes('ano'))?.name;
  const categoryCols = columnProfiles.filter((c) => (c.type === 'categorical' || c.type === 'text') && !c.name.startsWith('__EMPTY'));

  const primaryNumeric = numericCols[0]?.name;
  const secondaryNumeric = numericCols[1]?.name;
  const primaryCategory = categoryCols.find(c => c.type === 'categorical')?.name || categoryCols[0]?.name;

  // Gerar KPIs automáticos
  const generatedKpis: GeneratedKpi[] = [];

  generatedKpis.push({
    label: 'Total de Linhas Processadas',
    value: rowCount.toLocaleString('pt-BR'),
    subtext: `${columnProfiles.length} Colunas Detectadas`,
    type: 'count',
    iconType: 'users',
  });

  numericCols.forEach((numCol) => {
    const formattedSum = numCol.sum !== undefined 
      ? numCol.sum >= 1000000 
        ? `R$ ${(numCol.sum / 1000000).toFixed(2)}M` 
        : numCol.sum >= 1000 
          ? `R$ ${(numCol.sum / 1000).toFixed(1)}k`
          : `R$ ${numCol.sum.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}`
      : 'R$ 0,00';

    const formattedAvg = numCol.avg !== undefined ? numCol.avg.toLocaleString('pt-BR', { maximumFractionDigits: 2 }) : '0';

    generatedKpis.push({
      label: `Soma Total (${numCol.name})`,
      value: formattedSum,
      subtext: `Média: R$ ${formattedAvg}`,
      type: 'sum',
      iconType: 'dollar',
    });
  });

  // Gerar Dados Séries Temporais para o Gráfico de Área
  let timeSeriesData: any[] = [];
  if (timeCol && primaryNumeric) {
    const map = new Map<string, number>();
    sanitizedRows.forEach((r) => {
      const rawDate = r[timeCol];
      let dateKey = 'Outros';
      if (rawDate instanceof Date) {
        dateKey = rawDate.toISOString().slice(0, 10);
      } else if (rawDate) {
        dateKey = String(rawDate).slice(0, 10);
      }
      const val = parseNumericValue(r[primaryNumeric]) || 0;
      map.set(dateKey, (map.get(dateKey) || 0) + val);
    });

    timeSeriesData = Array.from(map.entries())
      .map(([date, valor]) => ({ date, valor: Math.round(valor * 100) / 100 }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 30);
  } else {
    timeSeriesData = sanitizedRows.slice(0, 25).map((r, idx) => ({
      date: `Linha ${idx + 1}`,
      valor: primaryNumeric ? (parseNumericValue(r[primaryNumeric]) || 0) : idx * 10,
    }));
  }

  // Gerar Agrupamento Categorizado
  let categoryDistribution: any[] = [];
  if (primaryCategory) {
    const catMap = new Map<string, number>();
    sanitizedRows.forEach((r) => {
      const cat = String(r[primaryCategory] || 'Sem Categoria');
      const val = primaryNumeric ? (parseNumericValue(r[primaryNumeric]) || 1) : 1;
      catMap.set(cat, (catMap.get(cat) || 0) + val);
    });

    const colors = ['#7CFF4F', '#00F0FF', '#A855F7', '#EC4899', '#F59E0B', '#3B82F6', '#10B981', '#6366F1'];
    categoryDistribution = Array.from(catMap.entries())
      .map(([name, value], idx) => ({
        name,
        value: Math.round(value * 100) / 100,
        color: colors[idx % colors.length],
      }))
      .slice(0, 8);
  }

  return {
    name: dataName,
    sheetName,
    availableSheets,
    rowCount,
    columnCount: columnProfiles.length,
    columns: columnProfiles,
    rawRows: sanitizedRows,
    timeColumn: timeCol,
    primaryNumericColumn: primaryNumeric,
    secondaryNumericColumn: secondaryNumeric,
    primaryCategoryColumn: primaryCategory,
    generatedKpis,
    timeSeriesData,
    categoryDistribution,
  };
}
