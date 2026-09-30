'use client';

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { 
  UploadCloud, Database, FileSpreadsheet, Sparkles, CheckCircle2, 
  BarChart3, Table as TableIcon, Layers, RefreshCw, ArrowRight, Server, ShieldCheck, Download, Search, AlertCircle, ChevronDown
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  BarChart, Bar, PieChart, Pie, Cell 
} from 'recharts';
import { profileDataset, ParsedDataset, IGNORED_SHEET_KEYWORDS, parseNumericValue } from '@/utils/dataEngine';

// Função para extrair linhas da aba identificando a linha real de cabeçalho (mesmo com banners mesclados no topo)
function extractBestRowsFromSheet(worksheet: XLSX.WorkSheet): Record<string, any>[] {
  if (!worksheet) return [];

  // Converter aba para matriz de linhas (header: 1)
  const matrix = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' }) as any[][];
  const nonEmptyRows = matrix.filter(r => r && r.length > 0 && r.some(cell => cell !== null && cell !== ''));

  if (nonEmptyRows.length === 0) return [];

  // 1. Procurar a linha que possui o maior número de células preenchidas (que representa o cabeçalho real)
  let maxFilledIndex = 0;
  let maxFilledCount = 0;

  for (let i = 0; i < Math.min(10, nonEmptyRows.length); i++) {
    const filledCount = nonEmptyRows[i].filter(cell => cell !== null && cell !== undefined && String(cell).trim() !== '').length;
    if (filledCount > maxFilledCount) {
      maxFilledCount = filledCount;
      maxFilledIndex = i;
    }
  }

  // Se a linha com maior preenchimento tiver 2+ colunas, usá-la como cabeçalho
  if (maxFilledCount >= 2 && maxFilledIndex >= 0) {
    const headerRow = nonEmptyRows[maxFilledIndex];
    const headers = headerRow.map((h, i) => (h && String(h).trim() ? String(h).trim() : `Coluna_${i + 1}`));

    const dataRows = nonEmptyRows.slice(maxFilledIndex + 1);
    return dataRows.map((row) => {
      const obj: Record<string, any> = {};
      headers.forEach((h, i) => {
        obj[h] = row[i] !== undefined ? row[i] : '';
      });
      return obj;
    });
  }

  // Fallback: usar sheet_to_json simples se não encontrou padrão de matriz
  return XLSX.utils.sheet_to_json(worksheet, { defval: '' }) as Record<string, any>[];
}

export default function DynamicAutoDashboard() {
  const [dataset, setDataset] = useState<ParsedDataset | null>(null);
  const [workbookSheets, setWorkbookSheets] = useState<Record<string, Record<string, any>[]>>({});
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [selectedNumericCol, setSelectedNumericCol] = useState<string>('');
  const [selectedCategoryCol, setSelectedCategoryCol] = useState<string>('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [activeView, setActiveView] = useState<'dashboard' | 'table' | 'ai'>('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [showDbModal, setShowDbModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Database Connection Form State
  const [dbConfig, setDbConfig] = useState({
    type: 'PostgreSQL',
    host: 'localhost',
    port: '5432',
    database: 'production_analytics',
    table: 'sales_transactions',
    user: 'nexus_admin',
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Trocar de Aba na Planilha Excel
  const handleSheetChange = (newSheetName: string) => {
    if (!workbookSheets[newSheetName] || !dataset) return;
    try {
      setSelectedSheet(newSheetName);
      const profiled = profileDataset(dataset.name, workbookSheets[newSheetName], newSheetName, Object.keys(workbookSheets));
      setDataset(profiled);
      setSelectedNumericCol(profiled.primaryNumericColumn || '');
      setSelectedCategoryCol(profiled.primaryCategoryColumn || '');
    } catch (err: any) {
      setErrorMessage(err.message || `Erro ao carregar a aba "${newSheetName}".`);
    }
  };

  // Processar Arquivo (CSV, XLSX, XLS)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setErrorMessage(null);
    const fileName = file.name;
    const extension = fileName.split('.').pop()?.toLowerCase();

    if (extension === 'csv') {
      Papa.parse(file, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: 'greedy',
        complete: (results) => {
          try {
            if (!results.data || results.data.length === 0) {
              throw new Error('O arquivo CSV não possui dados legíveis.');
            }
            const profiled = profileDataset(fileName, results.data as Record<string, any>[], 'Dados');
            setDataset(profiled);
            setWorkbookSheets({ 'Dados': results.data as Record<string, any>[] });
            setSelectedSheet('Dados');
            setSelectedNumericCol(profiled.primaryNumericColumn || '');
            setSelectedCategoryCol(profiled.primaryCategoryColumn || '');
          } catch (err: any) {
            setErrorMessage(err.message || 'Erro ao analisar o arquivo CSV.');
          } finally {
            setIsLoading(false);
          }
        },
        error: () => {
          setErrorMessage('Erro ao ler a estrutura do arquivo CSV.');
          setIsLoading(false);
        },
      });
    } else if (extension === 'xlsx' || extension === 'xls') {
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const buffer = evt.target?.result as ArrayBuffer;
          if (!buffer) {
            throw new Error('Não foi possível carregar o buffer do arquivo.');
          }

          const workbook = XLSX.read(buffer, { type: 'array', cellDates: true, cellFormulas: true });
          
          if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
            throw new Error('A planilha Excel não contém abas válidas.');
          }

          const sheetsMap: Record<string, Record<string, any>[]> = {};
          
          // Extrair todas as abas usando detector de matriz de cabeçalho real
          workbook.SheetNames.forEach((sheetName) => {
            const worksheet = workbook.Sheets[sheetName];
            if (!worksheet) return;

            const rows = extractBestRowsFromSheet(worksheet);
            if (rows && rows.length > 0) {
              sheetsMap[sheetName] = rows;
            }
          });

          const allSheetNames = Object.keys(sheetsMap);
          if (allSheetNames.length === 0) {
            throw new Error(`Nenhum dado estruturado foi encontrado nas abas do arquivo "${fileName}".`);
          }

          // Escolher a melhor aba padrão (ignorando 'Instruções', 'Capa', etc)
          let bestSheetName = allSheetNames.find(s => !IGNORED_SHEET_KEYWORDS.some(k => s.toLowerCase().includes(k)));
          if (!bestSheetName) {
            bestSheetName = allSheetNames[0];
          }

          setWorkbookSheets(sheetsMap);
          setSelectedSheet(bestSheetName);

          const profiled = profileDataset(fileName, sheetsMap[bestSheetName], bestSheetName, allSheetNames);
          setDataset(profiled);
          setSelectedNumericCol(profiled.primaryNumericColumn || '');
          setSelectedCategoryCol(profiled.primaryCategoryColumn || '');
        } catch (err: any) {
          setErrorMessage(err.message || 'Erro ao decodificar a planilha Excel.');
        } finally {
          setIsLoading(false);
        }
      };

      reader.onerror = () => {
        setErrorMessage('Falha na leitura do arquivo Excel pelo navegador.');
        setIsLoading(false);
      };

      reader.readAsArrayBuffer(file);
    } else {
      setErrorMessage('Formato não suportado. Envie um arquivo .csv, .xlsx ou .xls');
      setIsLoading(false);
    }
  };

  // Simular Conexão e Leitura de Banco de Dados
  const handleConnectDatabase = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setShowDbModal(false);
    setErrorMessage(null);

    setTimeout(() => {
      const mockDbRows = Array.from({ length: 80 }).map((_, idx) => ({
        id_transacao: `TX-${1000 + idx}`,
        data_transacao: `2026-09-${(idx % 28 + 1).toString().padStart(2, '0')}`,
        canal_venda: ['Enterprise B2B', 'SaaS Inbound', 'Parceiros API', 'Marketplace'][idx % 4],
        valor_faturamento: Math.round(1500 + Math.random() * 8500),
        status: ['Concluído', 'Pendente', 'Concluído', 'Concluído'][idx % 4],
        regiao: ['Sudeste', 'Sul', 'Nordeste', 'Centro-Oeste'][idx % 4],
      }));

      const profiled = profileDataset(`${dbConfig.type}: ${dbConfig.database}.${dbConfig.table}`, mockDbRows, 'Tabela BD');
      setDataset(profiled);
      setWorkbookSheets({ 'Tabela BD': mockDbRows });
      setSelectedSheet('Tabela BD');
      setSelectedNumericCol(profiled.primaryNumericColumn || '');
      setSelectedCategoryCol(profiled.primaryCategoryColumn || '');
      setIsLoading(false);
    }, 1000);
  };

  // Atualizar dados dos gráficos dinamicamente com base nas colunas selecionadas
  const activeNumericCol = selectedNumericCol || dataset?.primaryNumericColumn;
  const activeCategoryCol = selectedCategoryCol || dataset?.primaryCategoryColumn;

  const dynamicTimeSeriesData = dataset ? (
    dataset.timeColumn && activeNumericCol ? (
      (() => {
        const map = new Map<string, number>();
        dataset.rawRows.forEach((r) => {
          const rawDate = r[dataset.timeColumn!];
          let dateKey = 'Outros';
          if (rawDate instanceof Date) {
            dateKey = rawDate.toISOString().slice(0, 10);
          } else if (rawDate) {
            dateKey = String(rawDate).slice(0, 10);
          }
          const val = parseNumericValue(r[activeNumericCol]) || 0;
          map.set(dateKey, (map.get(dateKey) || 0) + val);
        });
        return Array.from(map.entries())
          .map(([date, valor]) => ({ date, valor: Math.round(valor * 100) / 100 }))
          .sort((a, b) => a.date.localeCompare(b.date))
          .slice(0, 30);
      })()
    ) : (
      dataset.rawRows.slice(0, 25).map((r, idx) => ({
        date: `Linha ${idx + 1}`,
        valor: activeNumericCol ? (parseNumericValue(r[activeNumericCol]) || 0) : idx * 10,
      }))
    )
  ) : [];

  const dynamicCategoryData = dataset && activeCategoryCol ? (
    (() => {
      const catMap = new Map<string, number>();
      dataset.rawRows.forEach((r) => {
        const cat = String(r[activeCategoryCol] || 'Sem Categoria');
        const val = activeNumericCol ? (parseNumericValue(r[activeNumericCol]) || 1) : 1;
        catMap.set(cat, (catMap.get(cat) || 0) + val);
      });
      const colors = ['#7CFF4F', '#00F0FF', '#A855F7', '#EC4899', '#F59E0B', '#3B82F6', '#10B981', '#6366F1'];
      return Array.from(catMap.entries())
        .map(([name, value], idx) => ({
          name,
          value: Math.round(value * 100) / 100,
          color: colors[idx % colors.length],
        }))
        .slice(0, 8);
    })()
  ) : [];

  return (
    <div className="space-y-6">

      {/* HEADER & UPLOAD / DB BUTTONS */}
      <div className="p-6 rounded-2xl bg-[#121212]/80 backdrop-blur-2xl border border-white/10 flex flex-wrap items-center justify-between gap-4 shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
        <div>
          <span className="px-3 py-1 rounded-full bg-[#7CFF4F]/10 border border-[#7CFF4F]/30 text-xs font-mono text-[#7CFF4F]">
            AUTO-DASHBOARD ENGINE V4 (SMART PARSER)
          </span>
          <h2 className="text-xl font-bold text-white mt-2 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#7CFF4F]" />
            Gerador Automático de Dashboards Visuais
          </h2>
          <p className="text-xs text-white/50">
            Arraste suas planilhas (CSV, XLSX, XLS) ou conecte Bancos de Dados para gerar um Dashboard completo instantaneamente.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            accept=".csv, .xlsx, .xls" 
            className="hidden" 
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            className="px-4 py-2.5 bg-[#7CFF4F] hover:bg-[#6de040] text-black font-bold text-xs rounded-xl flex items-center gap-2 transition-all shadow-[0_0_20px_rgba(124,255,79,0.3)] disabled:opacity-50"
          >
            <FileSpreadsheet className="w-4 h-4" />
            {isLoading ? 'Lendo Planilha...' : 'Upload Planilha (CSV / Excel)'}
          </button>

          <button
            onClick={() => setShowDbModal(true)}
            disabled={isLoading}
            className="px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/15 text-white font-bold text-xs rounded-xl flex items-center gap-2 transition-all"
          >
            <Database className="w-4 h-4 text-[#00F0FF]" />
            Conectar Banco de Dados
          </button>
        </div>
      </div>

      {/* ERROR BANNER */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center gap-3 text-red-400 text-xs font-semibold backdrop-blur-xl">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* DASHBOARD DISPLAY OR EMPTY STATE */}
      {!dataset ? (
        <div className="p-12 rounded-3xl bg-[#121212]/40 border-2 border-dashed border-white/15 backdrop-blur-2xl text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#7CFF4F]/20 to-[#00F0FF]/20 border border-white/10 flex items-center justify-center mx-auto text-[#7CFF4F]">
            <UploadCloud className="w-8 h-8 animate-bounce" />
          </div>
          <h3 className="text-lg font-bold text-white">Nenhum Dataset Carregado</h3>
          <p className="text-xs text-white/40 max-w-md mx-auto">
            Faça upload de uma planilha (CSV, XLSX, XLS) ou conecte seu Banco de Dados (MySQL, Postgres, SQL Server) para que o Nexus AI construa todos os gráficos e KPIs automaticamente.
          </p>

          <div className="pt-4 flex justify-center gap-3">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-5 py-2.5 bg-[#7CFF4F] text-black font-bold text-xs rounded-xl shadow-[0_0_15px_rgba(124,255,79,0.3)]"
            >
              Escolher Arquivo CSV / XLSX
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">

          {/* DATASET SUMMARY & SHEET SELECTOR BAR */}
          <div className="p-4 rounded-xl bg-[#121212] border border-[#7CFF4F]/40 flex flex-wrap items-center justify-between gap-4 backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-[#7CFF4F]" />
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white">{dataset.name}</span>
                  
                  {/* SELETOR DE ABAS DA PLANILHA */}
                  {dataset.availableSheets && dataset.availableSheets.length > 1 && (
                    <div className="relative inline-block ml-2">
                      <select
                        value={selectedSheet}
                        onChange={(e) => handleSheetChange(e.target.value)}
                        className="px-2.5 py-1 rounded-lg bg-[#7CFF4F]/10 border border-[#7CFF4F]/40 text-xs font-bold text-[#7CFF4F] focus:outline-none cursor-pointer"
                      >
                        {dataset.availableSheets.map((s, idx) => (
                          <option key={idx} value={s} className="bg-[#121212] text-white">
                            Aba: {s} {IGNORED_SHEET_KEYWORDS.some(k => s.toLowerCase().includes(k)) ? '(Instruções)' : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
                <span className="text-[11px] text-white/50 font-mono">
                  Aba Ativa: <strong className="text-white">{dataset.sheetName}</strong> • {dataset.rowCount} registros • {dataset.columnCount} colunas detectadas
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {(['dashboard', 'table', 'ai'] as const).map((view) => (
                <button
                  key={view}
                  onClick={() => setActiveView(view)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                    activeView === view
                      ? 'bg-[#7CFF4F] text-black font-bold'
                      : 'bg-white/5 text-white/70 hover:bg-white/10'
                  }`}
                >
                  {view === 'dashboard' && 'Dashboard Automático'}
                  {view === 'table' && 'Tabela de Dados'}
                  {view === 'ai' && 'Insights Nexus AI'}
                </button>
              ))}
            </div>
          </div>

          {activeView === 'dashboard' && (
            <div className="space-y-6">
              
              {/* INTERACTIVE COLUMN PICKERS */}
              <div className="p-4 rounded-xl bg-white/5 border border-white/10 flex flex-wrap items-center justify-between gap-4 text-xs">
                <div className="flex flex-wrap items-center gap-4">
                  <span className="text-white/50 font-mono">Personalizar Métricas:</span>
                  
                  {/* Seletor de Métrica Numérica */}
                  <div className="flex items-center gap-2">
                    <span className="text-white/70">Métrica Numérica:</span>
                    <select
                      value={activeNumericCol || ''}
                      onChange={(e) => setSelectedNumericCol(e.target.value)}
                      className="px-2.5 py-1 rounded-lg bg-[#121212] border border-[#7CFF4F]/40 text-white focus:outline-none"
                    >
                      {dataset.columns.map((col, idx) => (
                        <option key={idx} value={col.name}>
                          {col.name} {col.type === 'numeric' ? '(Numérica)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Seletor de Categoria */}
                  <div className="flex items-center gap-2">
                    <span className="text-white/70">Categoria/Agrupamento:</span>
                    <select
                      value={activeCategoryCol || ''}
                      onChange={(e) => setSelectedCategoryCol(e.target.value)}
                      className="px-2.5 py-1 rounded-lg bg-[#121212] border border-white/20 text-white focus:outline-none"
                    >
                      {dataset.columns.map((col, idx) => (
                        <option key={idx} value={col.name}>{col.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <span className="text-white/40 font-mono text-[10px]">
                  Visualização dinâmica em tempo real (60 FPS)
                </span>
              </div>

              {/* AUTOMATIC KPI CARDS */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {dataset.generatedKpis.map((kpi, i) => (
                  <div key={i} className="p-5 rounded-2xl bg-[#121212]/80 backdrop-blur-xl border border-white/10 hover:border-[#7CFF4F]/40 transition-all">
                    <div className="text-xs text-white/50 mb-1">{kpi.label}</div>
                    <div className="text-2xl font-black font-mono text-white mb-1">{kpi.value}</div>
                    <div className="text-[11px] text-[#7CFF4F] font-mono">{kpi.subtext}</div>
                  </div>
                ))}
              </div>

              {/* AUTOMATIC CHARTS */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Time Series Area Chart */}
                <div className="lg:col-span-2 p-6 rounded-2xl bg-[#121212]/80 backdrop-blur-xl border border-white/10 space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-bold text-white flex items-center gap-2">
                        <BarChart3 className="w-4 h-4 text-[#7CFF4F]" />
                        Evolução Temporal ({dataset.timeColumn || 'Registros'})
                      </h3>
                      <p className="text-xs text-white/40">Métrica Numérica: {activeNumericCol || 'Valores'}</p>
                    </div>
                  </div>

                  <div className="h-[280px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={dynamicTimeSeriesData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="date" stroke="rgba(255,255,255,0.4)" fontSize={11} />
                        <YAxis stroke="rgba(255,255,255,0.4)" fontSize={11} />
                        <Tooltip contentStyle={{ backgroundColor: '#121212', borderColor: 'rgba(255,255,255,0.2)' }} />
                        <Area type="monotone" dataKey="valor" stroke="#7CFF4F" fill="#7CFF4F" fillOpacity={0.25} strokeWidth={3} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Categorical Distribution Pie Chart */}
                <div className="p-6 rounded-2xl bg-[#121212]/80 backdrop-blur-xl border border-white/10 space-y-4">
                  <div>
                    <h3 className="font-bold text-white">
                      Distribuição por {activeCategoryCol || 'Categoria'}
                    </h3>
                    <p className="text-xs text-white/40">Soma de {activeNumericCol || 'Valores'} por {activeCategoryCol || 'Grupo'}</p>
                  </div>

                  <div className="h-[200px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={dynamicCategoryData}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={75}
                          dataKey="value"
                        >
                          {dynamicCategoryData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: '#121212', borderColor: 'rgba(255,255,255,0.2)' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="space-y-1 pt-2 border-t border-white/10 text-xs">
                    {dynamicCategoryData.map((c, idx) => (
                      <div key={idx} className="flex justify-between items-center">
                        <span className="flex items-center gap-1.5 text-white/70">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: c.color }} />
                          {c.name}
                        </span>
                        <span className="font-mono text-white font-bold">{c.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </div>
          )}

          {activeView === 'table' && (
            <div className="p-6 rounded-2xl bg-[#121212]/80 backdrop-blur-xl border border-white/10 space-y-4">
              <div className="flex justify-between items-center">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Pesquisar nos registros..."
                  className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder-white/40 focus:outline-none w-72"
                />
                <span className="text-xs text-white/40 font-mono">Exibindo {dataset.rawRows.length} linhas</span>
              </div>

              <div className="overflow-x-auto max-h-[400px]">
                <table className="w-full text-left text-xs">
                  <thead className="bg-white/5 text-white/60 font-mono sticky top-0 backdrop-blur-md">
                    <tr>
                      {dataset.columns.map((col, idx) => (
                        <th key={idx} className="p-3 border-b border-white/10 font-medium">
                          {col.name} <span className="text-[9px] text-[#7CFF4F]">({col.type})</span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {dataset.rawRows
                      .filter(row => !searchTerm || Object.values(row).some(v => String(v).toLowerCase().includes(searchTerm.toLowerCase())))
                      .slice(0, 50)
                      .map((row, rIdx) => (
                        <tr key={rIdx} className="hover:bg-white/5 transition-colors">
                          {dataset.columns.map((col, cIdx) => (
                            <td key={cIdx} className="p-3 font-mono text-white/80">
                              {String(row[col.name] ?? '')}
                            </td>
                          ))}
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeView === 'ai' && (
            <div className="p-6 rounded-2xl bg-[#121212]/90 backdrop-blur-2xl border border-[#7CFF4F]/40 space-y-4 shadow-[0_0_30px_rgba(124,255,79,0.15)]">
              <div className="flex items-center gap-3">
                <Sparkles className="w-6 h-6 text-[#7CFF4F] animate-pulse" />
                <h3 className="text-base font-bold text-white">Relatório Automático do Nexus AI</h3>
              </div>

              <div className="text-sm text-white/80 space-y-3 leading-relaxed">
                <p>
                  ✨ <strong>Diagnóstico da Aba ({dataset.sheetName})</strong>: O dataset <code>{dataset.name}</code> possui {dataset.rowCount} registros processados na aba ativa e {dataset.columnCount} colunas estruturadas.
                </p>
                <p>
                  📈 <strong>Comportamento da Métrica Principal</strong>: A variável <code>{activeNumericCol || 'Principal'}</code> apresentou volume total acumulado.
                </p>
                <p>
                  🛡️ <strong>Outras Abas Encontradas</strong>: {dataset.availableSheets.length > 1 ? `Esta planilha possui ${dataset.availableSheets.length} abas (${dataset.availableSheets.join(', ')}). Use o seletor de abas no topo para alternar entre as abas.` : 'Planilha de aba única.'}
                </p>
              </div>
            </div>
          )}

        </div>
      )}

      {/* DATABASE CONNECTOR MODAL */}
      {showDbModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full max-w-lg p-6 rounded-3xl bg-[#121212] border border-white/15 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Database className="w-5 h-5 text-[#00F0FF]" />
                Conectar Banco de Dados
              </h3>
              <button onClick={() => setShowDbModal(false)} className="text-white/40 hover:text-white text-xs font-mono">✕ FECHAR</button>
            </div>

            <form onSubmit={handleConnectDatabase} className="space-y-3">
              <div>
                <label className="text-xs text-white/50 block mb-1">Tipo de Banco</label>
                <select
                  value={dbConfig.type}
                  onChange={(e) => setDbConfig({ ...dbConfig, type: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none"
                >
                  <option value="PostgreSQL" className="bg-[#121212]">PostgreSQL Cluster</option>
                  <option value="MySQL" className="bg-[#121212]">MySQL Server</option>
                  <option value="SQL Server" className="bg-[#121212]">Microsoft SQL Server</option>
                  <option value="Oracle" className="bg-[#121212]">Oracle Database</option>
                  <option value="MongoDB" className="bg-[#121212]">MongoDB Atlas</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-white/50 block mb-1">Host Server</label>
                  <input
                    type="text"
                    value={dbConfig.host}
                    onChange={(e) => setDbConfig({ ...dbConfig, host: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-white/50 block mb-1">Porta</label>
                  <input
                    type="text"
                    value={dbConfig.port}
                    onChange={(e) => setDbConfig({ ...dbConfig, port: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-white/50 block mb-1">Nome do Banco</label>
                  <input
                    type="text"
                    value={dbConfig.database}
                    onChange={(e) => setDbConfig({ ...dbConfig, database: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-white/50 block mb-1">Tabela para Importar</label>
                  <input
                    type="text"
                    value={dbConfig.table}
                    onChange={(e) => setDbConfig({ ...dbConfig, table: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button type="button" onClick={() => setShowDbModal(false)} className="px-4 py-2 rounded-xl text-xs text-white/60">Cancelar</button>
                <button type="submit" className="px-5 py-2 rounded-xl bg-[#7CFF4F] text-black font-bold text-xs shadow-[0_0_15px_rgba(124,255,79,0.3)]">
                  Conectar & Gerar Dashboard
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

    </div>
  );
}
