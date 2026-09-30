/**
 * OBSIDIAN NEXUS — Auto Data Engine & Schema Profiler (Versão V3 - Multi-Aba Inteligente)
 * Trata descarte de abas de 'Instruções'/'Capa', remoção de colunas __EMPTY
 * e seleção automática da aba principal de dados financeiros.
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
function isDateValue(val: any): boolean {
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

// Limpar e converter valores numéricos (suporta "R$ 1.500,00", "$ 1,500.00", "1500", etc)
function parseNumericValue(val: any): number | null {
  if (val === null || val === undefined || val === '') return null;
  if (typeof val === 'number') return isNaN(val) ? null : val;
  if (typeof val === 'string') {
    const str = val.trim();
    if (/[a-zA-Z]/i.test(str.replace(/[R$€£]/gi, ''))) return null;
    
    let cleaned = str.replace(/[R$€£\s]/g, '');
    if (cleaned.includes(',') && cleaned.includes('.')) {
      if (cleaned.indexOf('.') < cleaned.indexOf(',')) {
        cleaned = cleaned.replace(/\./g, '').replace(',', '.');
      } else {
        cleaned = cleaned.replace(/,/g, '');
      }
    } else if (cleaned.includes(',')) {
      cleaned = cleaned.replace(',', '.');
    }

    const num = parseFloat(cleaned);
    return isNaN(num) ? null : num;
  }
  return null;
}

// Motor Principal de Perfilamento de Dados
export function profileDataset(
  dataName: string, 
  rawRows: Record<string, any>[], 
  sheetName: string = 'Dados',
  availableSheets: string[] = []
): ParsedDataset {
  // Filtrar linhas vazias e remover colunas __EMPTY indesejadas
  const cleanRows = rawRows.filter((row) => {
    if (!row || typeof row !== 'object') return false;
    return Object.values(row).some((v) => v !== null && v !== undefined && String(v).trim() !== '');
  });

  if (cleanRows.length === 0) {
    throw new Error(`A aba "${sheetName}" não possui linhas com dados legíveis.`);
  }

  // Filtrar cabeçalhos: excluir colunas __EMPTY e colunas onde quase tudo é nulo
  const allKeys = Object.keys(cleanRows[0]);
  const validKeys = allKeys.filter((k) => {
    if (!k || k.startsWith('__EMPTY')) return false;
    // Verificar se a coluna possui pelo menos 1 valor preenchido nas linhas
    const hasValues = cleanRows.some(r => r[k] !== null && r[k] !== undefined && String(r[k]).trim() !== '');
    return hasValues;
  });

  // Se todas as colunas eram __EMPTY (ex: sem linha de cabeçalho explícita), recriar com nomes genéricos
  const finalKeys = validKeys.length > 0 ? validKeys : allKeys.map((_, i) => `Coluna_${i + 1}`);

  const sanitizedRows = cleanRows.map((row) => {
    const newRow: Record<string, any> = {};
    finalKeys.forEach((key) => {
      newRow[key] = row[key];
    });
    return newRow;
  });

  const rowCount = sanitizedRows.length;
  const columnProfiles: ColumnProfile[] = [];

  finalKeys.forEach((col) => {
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

    if (values.length > 0 && numericCount / values.length >= 0.5) {
      type = 'numeric';
    } else if (values.length > 0 && dateCount / values.length >= 0.5) {
      type = 'datetime';
    } else if (uniqueCount <= Math.max(20, rowCount * 0.35)) {
      type = 'categorical';
    }

    columnProfiles.push({
      name: col,
      type,
      sampleValues,
      uniqueCount,
      sum: type === 'numeric' ? sum : undefined,
      avg: type === 'numeric' && numericCount > 0 ? sum / numericCount : undefined,
      min: type === 'numeric' && min !== Infinity ? min : undefined,
      max: type === 'numeric' && max !== -Infinity ? max : undefined,
    });
  });

  // Selecionar colunas estratégicas para o Dashboard
  const timeCol = columnProfiles.find((c) => c.type === 'datetime')?.name || columnProfiles.find(c => c.name.toLowerCase().includes('data') || c.name.toLowerCase().includes('date') || c.name.toLowerCase().includes('mês') || c.name.toLowerCase().includes('ano'))?.name;
  const numericCols = columnProfiles.filter((c) => c.type === 'numeric');
  const categoryCols = columnProfiles.filter((c) => c.type === 'categorical' && !c.name.startsWith('__EMPTY'));

  const primaryNumeric = numericCols[0]?.name;
  const secondaryNumeric = numericCols[1]?.name;
  const primaryCategory = categoryCols[0]?.name || columnProfiles.find(c => c.type === 'text' && c.uniqueCount > 1 && c.uniqueCount <= 30)?.name;

  // Gerar KPIs automáticos
  const generatedKpis: GeneratedKpi[] = [];

  generatedKpis.push({
    label: 'Total de Registros',
    value: rowCount.toLocaleString('pt-BR'),
    subtext: `${columnProfiles.length} Colunas Estruturadas`,
    type: 'count',
    iconType: 'users',
  });

  numericCols.slice(0, 5).forEach((numCol) => {
    const formattedSum = numCol.sum !== undefined 
      ? numCol.sum >= 1000000 
        ? `R$ ${(numCol.sum / 1000000).toFixed(2)}M` 
        : numCol.sum >= 1000 
          ? `R$ ${(numCol.sum / 1000).toFixed(1)}k`
          : `R$ ${numCol.sum.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}`
      : '0';

    const formattedAvg = numCol.avg !== undefined ? numCol.avg.toFixed(2) : '0';

    generatedKpis.push({
      label: `Soma (${numCol.name})`,
      value: formattedSum,
      subtext: `Média: ${formattedAvg}`,
      type: 'sum',
      iconType: 'dollar',
    });
  });

  // Gerar Dados Séries Temporais para o Gráfico de Área se houver data
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
    timeSeriesData = sanitizedRows.slice(0, 20).map((r, idx) => ({
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

    const colors = ['#7CFF4F', '#00F0FF', '#A855F7', '#EC4899', '#F59E0B', '#3B82F6'];
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
