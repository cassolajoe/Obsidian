/**
 * OBSIDIAN NEXUS — Auto Data Engine & Schema Profiler
 * Analisa dinamicamente planilhas (CSV, XLSX, XLS) e Bancos de Dados
 * criando métricas, agrupamentos e gráficos automáticos.
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

// Detectar se o valor é uma data válida
function isDateString(val: any): boolean {
  if (!val) return false;
  if (val instanceof Date) return true;
  if (typeof val !== 'string' && typeof val !== 'number') return false;
  const parsed = Date.parse(String(val));
  return !isNaN(parsed) && (String(val).includes('-') || String(val).includes('/') || String(val).length === 4);
}

// Limpar e converter strings numéricas (ex: "R$ 1.500,00" -> 1500.00)
function parseNumericValue(val: any): number | null {
  if (typeof val === 'number') return isNaN(val) ? null : val;
  if (typeof val === 'string') {
    const cleaned = val.replace(/[R$\s.,]/g, (match, offset, str) => {
      // trona pontos/vírgulas em formato decimal limpo
      if (match === ',' || match === '.') return offset === str.lastIndexOf(match) ? '.' : '';
      return '';
    }).trim();
    const num = parseFloat(cleaned);
    return isNaN(num) ? null : num;
  }
  return null;
}

// Motor Principal de Perfilamento de Dados
export function profileDataset(dataName: string, rawRows: Record<string, any>[]): ParsedDataset {
  if (!rawRows || rawRows.length === 0) {
    throw new Error('O arquivo enviado está vazio.');
  }

  const columnNames = Object.keys(rawRows[0]);
  const rowCount = rawRows.length;
  const columnProfiles: ColumnProfile[] = [];

  columnNames.forEach((col) => {
    const values = rawRows.map((r) => r[col]).filter((v) => v !== null && v !== undefined && v !== '');
    const uniqueCount = new Set(values).size;
    const sampleValues = values.slice(0, 5);

    // Tentar inferir tipo
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
      if (isDateString(v)) {
        dateCount++;
      }
    });

    let type: ColumnProfile['type'] = 'text';

    if (numericCount / values.length > 0.7) {
      type = 'numeric';
    } else if (dateCount / values.length > 0.6) {
      type = 'datetime';
    } else if (uniqueCount <= Math.max(15, rowCount * 0.3)) {
      type = 'categorical';
    }

    columnProfiles.push({
      name: col,
      type,
      sampleValues,
      uniqueCount,
      sum: type === 'numeric' ? sum : undefined,
      avg: type === 'numeric' && values.length > 0 ? sum / values.length : undefined,
      min: type === 'numeric' && min !== Infinity ? min : undefined,
      max: type === 'numeric' && max !== -Infinity ? max : undefined,
    });
  });

  // Identificar melhores colunas para o Dashboard
  const timeCol = columnProfiles.find((c) => c.type === 'datetime')?.name;
  const numericCols = columnProfiles.filter((c) => c.type === 'numeric');
  const categoryCols = columnProfiles.filter((c) => c.type === 'categorical');

  const primaryNumeric = numericCols[0]?.name;
  const secondaryNumeric = numericCols[1]?.name;
  const primaryCategory = categoryCols[0]?.name;

  // Gerar KPIs automáticos
  const generatedKpis: GeneratedKpi[] = [];

  generatedKpis.push({
    label: 'Total de Registros',
    value: rowCount.toLocaleString('pt-BR'),
    subtext: `${columnProfiles.length} Colunas Detectadas`,
    type: 'count',
    iconType: 'users',
  });

  numericCols.slice(0, 4).forEach((numCol) => {
    const formattedSum = numCol.sum !== undefined 
      ? numCol.sum > 1000000 
        ? `R$ ${(numCol.sum / 1000000).toFixed(2)}M` 
        : `R$ ${numCol.sum.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}`
      : '0';

    const formattedAvg = numCol.avg !== undefined ? numCol.avg.toFixed(2) : '0';

    generatedKpis.push({
      label: `Total (${numCol.name})`,
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
    rawRows.forEach((r) => {
      const dateKey = String(r[timeCol] || 'Outros').slice(0, 10);
      const val = parseNumericValue(r[primaryNumeric]) || 0;
      map.set(dateKey, (map.get(dateKey) || 0) + val);
    });

    timeSeriesData = Array.from(map.entries())
      .map(([date, val]) => ({ date, valor: Math.round(val * 100) / 100 }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 30); // Limitar a 30 pontos para renderização fluida
  } else {
    // Fallback: se não houver coluna de data, usar índice das primeiras 15 linhas
    timeSeriesData = rawRows.slice(0, 15).map((r, idx) => ({
      date: `Item ${idx + 1}`,
      valor: primaryNumeric ? parseNumericValue(r[primaryNumeric]) || 0 : idx * 10,
    }));
  }

  // Gerar Agrupamento Categorizado para Gráficos de Rosca e Barras
  let categoryDistribution: any[] = [];
  if (primaryCategory) {
    const catMap = new Map<string, number>();
    rawRows.forEach((r) => {
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
      .slice(0, 6); // Top 6 categorias
  }

  return {
    name: dataName,
    rowCount,
    columnCount: columnProfiles.length,
    columns: columnProfiles,
    rawRows,
    timeColumn: timeCol,
    primaryNumericColumn: primaryNumeric,
    secondaryNumericColumn: secondaryNumeric,
    primaryCategoryColumn: primaryCategory,
    generatedKpis,
    timeSeriesData,
    categoryDistribution,
  };
}
