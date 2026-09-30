'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  TrendingUp, TrendingDown, DollarSign, Users, Target, Activity, 
  Sparkles, ShieldCheck, ArrowUpRight, Filter, Zap, Eye, Database, Send, RefreshCw,
  LayoutDashboard, Layers, Cpu, Server, BarChart3, PieChart as PieIcon, UploadCloud, FileSpreadsheet
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  BarChart, Bar, PieChart, Pie, Cell 
} from 'recharts';

import DynamicAutoDashboard from '@/components/DynamicAutoDashboard';

const revenueTrendData = [
  { month: 'Jan', receita: 3.4, projecao: 3.4 },
  { month: 'Fev', receita: 4.1, projecao: 4.0 },
  { month: 'Mar', receita: 4.8, projecao: 4.6 },
  { month: 'Abr', receita: 5.2, projecao: 5.1 },
  { month: 'Mai', receita: 6.1, projecao: 5.9 },
  { month: 'Jun', receita: 7.3, projecao: 6.8 },
  { month: 'Jul', receita: 8.5, projecao: 7.9 },
  { month: 'Ago', receita: 7.9, projecao: 8.8 }, // Anomalia de queda analisada pela IA
  { month: 'Set', receita: 9.4, projecao: 9.2 },
  { month: 'Out (IA)', receita: null, projecao: 10.6 },
  { month: 'Nov (IA)', receita: null, projecao: 11.8 },
  { month: 'Dez (IA)', receita: null, projecao: 13.2 },
];

const channelData = [
  { channel: 'Enterprise B2B', receita: 18.4, color: '#7CFF4F' },
  { channel: 'SaaS Inbound', receita: 14.2, color: '#00F0FF' },
  { channel: 'Parceiros / APIs', receita: 9.8, color: '#A855F7' },
  { channel: 'Marketplace', receita: 6.5, color: '#EC4899' },
];

const segmentData = [
  { name: 'Fintech & Bancos', value: 40, color: '#7CFF4F' },
  { name: 'Varejo & E-commerce', value: 25, color: '#00F0FF' },
  { name: 'Saúde & Biotec', value: 20, color: '#3B82F6' },
  { name: 'Logística', value: 15, color: '#F59E0B' },
];

const connectorStatuses = [
  { name: 'PostgreSQL Cluster', status: 'Online', latency: '4ms', type: 'Database (CDC)' },
  { name: 'SAP S/4HANA ERP', status: 'Online', latency: '18ms', type: 'ERP Connector' },
  { name: 'Salesforce CRM', status: 'Syncing', latency: '42ms', type: 'CRM API' },
  { name: 'Google Analytics 4', status: 'Online', latency: '12ms', type: 'Analytics Data Stream' },
  { name: 'Meta Ads Manager', status: 'Online', latency: '24ms', type: 'Marketing Stream' },
  { name: 'Snowflake Warehouse', status: 'Online', latency: '8ms', type: 'Data Lakehouse' },
];

export default function ObsidianNexusDashboard() {
  const [executiveMode, setExecutiveMode] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'autodash' | 'connectors'>('overview');
  const [aiQuery, setAiQuery] = useState('');
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [isAiAnalyzing, setIsAiAnalyzing] = useState(false);

  const handleAiSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiQuery.trim()) return;
    
    setIsAiAnalyzing(true);
    setAiResponse(null);

    setTimeout(() => {
      setIsAiAnalyzing(false);
      const query = aiQuery.toLowerCase();
      if (query.includes('churn')) {
        setAiResponse("🔍 Nexus AI: 14 clientes enterprise apresentam risco de churn > 75%. Causa principal: Queda de 40% na utilização de APIs nas últimas 3 semanas. Ação sugerida: Disparar playbook de Sucesso do Cliente com oferta de treinamento exclusivo.");
      } else if (query.includes('agosto') || query.includes('queda')) {
        setAiResponse("📉 Nexus AI (Diagnóstico de Anomalia): A queda na receita em Agosto (-7%) foi decorrente de atraso de renovação contratual de 2 grandes contas (Enterprise Tech & Logística) e oscilação temporária na API do gateway em 14/08.");
      } else if (query.includes('preveja') || query.includes('faturamento') || query.includes('q4')) {
        setAiResponse("✨ Nexus AI (Projeção ML Prophet): A receita estimada para o Q4 2026 é de R$ 35.6M (+24% YoY), impulsionada pela expansão do ticket médio e integração dos novos conectores de dados.");
      } else {
        setAiResponse(`✨ Nexus AI Insights: Com base na análise vetorial dos últimos 90 dias, a conversão média estabilizou em 4.82% com crescimento mensal contínuo. Indicadores de retenção permanecem na zona de alta segurança.`);
      }
    }, 1100);
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white p-4 sm:p-6 relative overflow-x-hidden selection:bg-[#7CFF4F] selection:text-black">
      {/* Background VisionOS Ambient Light */}
      <div className="fixed -top-40 -left-40 w-[450px] h-[450px] bg-[#7CFF4F]/10 rounded-full blur-[150px] pointer-events-none" />
      <div className="fixed top-1/3 -right-40 w-[550px] h-[550px] bg-[#00F0FF]/10 rounded-full blur-[170px] pointer-events-none" />

      {/* TOP NAVIGATION BAR */}
      <header className="sticky top-0 z-50 backdrop-blur-2xl bg-[#0A0A0A]/75 border border-white/10 px-6 py-4 flex flex-wrap items-center justify-between rounded-2xl mb-6 shadow-[0_10px_40px_rgba(0,0,0,0.8)]">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#7CFF4F] to-[#00F0FF] p-[1px] shadow-[0_0_20px_rgba(124,255,79,0.3)]">
              <div className="w-full h-full bg-[#0A0A0A] rounded-[11px] flex items-center justify-center">
                <Zap className="w-5 h-5 text-[#7CFF4F]" />
              </div>
            </div>
            <div>
              <h1 className="text-lg font-black tracking-wider bg-gradient-to-r from-white via-white/90 to-[#7CFF4F] bg-clip-text text-transparent">
                OBSIDIAN NEXUS
              </h1>
              <p className="text-[10px] text-white/40 tracking-widest uppercase font-mono">
                Where Data Becomes Power
              </p>
            </div>
          </div>

          <div className="hidden md:block h-6 w-[1px] bg-white/10 mx-2" />

          {/* Tab Navigation */}
          <nav className="hidden md:flex gap-1 bg-white/5 p-1 rounded-xl border border-white/10">
            {(['overview', 'autodash', 'connectors'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all duration-300 ${
                  activeTab === tab 
                    ? 'bg-[#7CFF4F] text-black font-bold shadow-[0_0_15px_rgba(124,255,79,0.4)]' 
                    : 'text-white/70 hover:text-white hover:bg-white/5'
                }`}
              >
                {tab === 'overview' && 'Dashboard Visão Geral'}
                {tab === 'autodash' && 'Upload & Auto-Dashboard Visuais'}
                {tab === 'connectors' && 'Conectores (15)'}
              </button>
            ))}
          </nav>
        </div>

        {/* Controls: CEO Mode & Live Telemetry */}
        <div className="flex items-center gap-3 mt-3 sm:mt-0">
          <button 
            onClick={() => setExecutiveMode(!executiveMode)}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl border text-xs font-bold transition-all ${
              executiveMode 
                ? 'bg-[#7CFF4F]/20 border-[#7CFF4F] text-[#7CFF4F] shadow-[0_0_18px_rgba(124,255,79,0.25)]'
                : 'bg-white/5 border-white/10 text-white/70 hover:border-white/20'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            {executiveMode ? 'Modo Executivo (Ativo)' : 'Modo Executivo CEO'}
          </button>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs font-mono">
            <span className="w-2 h-2 rounded-full bg-[#7CFF4F] animate-pulse shadow-[0_0_8px_#7CFF4F]" />
            <span className="text-white/80">60 FPS • LIVE</span>
          </div>
        </div>
      </header>

      {/* EXECUTIVE MODE SIMPLIFIED VIEW */}
      {executiveMode ? (
        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6">
          <div className="p-8 rounded-3xl bg-[#121212]/80 backdrop-blur-3xl border border-[#7CFF4F]/30 shadow-[0_0_40px_rgba(124,255,79,0.1)]">
            <div className="flex justify-between items-center mb-6">
              <div>
                <span className="px-3 py-1 rounded-full bg-[#7CFF4F]/10 border border-[#7CFF4F]/30 text-xs text-[#7CFF4F] font-mono">
                  EXECUTIVE SUMMARY FOR CEO
                </span>
                <h2 className="text-2xl font-bold mt-2">Resumo Estratégico de Desempenho</h2>
              </div>
              <div className="text-right font-mono">
                <div className="text-3xl font-black text-[#7CFF4F]">R$ 48.900.000</div>
                <div className="text-xs text-white/40">Receita YTD (+18.4% YoY)</div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
                <div className="text-xs text-white/50 mb-1">Lucro Operacional Líquido</div>
                <div className="text-2xl font-bold font-mono text-white">R$ 16.420.000</div>
                <div className="text-xs text-[#7CFF4F] mt-2">+22.4% vs meta anual</div>
              </div>

              <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
                <div className="text-xs text-white/50 mb-1">Crescimento de Clientes Enterprise</div>
                <div className="text-2xl font-bold font-mono text-[#00F0FF]">142.850</div>
                <div className="text-xs text-[#00F0FF] mt-2">+12.1% expansão de base</div>
              </div>

              <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
                <div className="text-xs text-white/50 mb-1">Índice de Saúde Operacional (IA)</div>
                <div className="text-2xl font-bold font-mono text-[#7CFF4F]">98.4 / 100</div>
                <div className="text-xs text-white/40 mt-2">Risco de churn sob controle (1.4%)</div>
              </div>
            </div>
          </div>
        </motion.div>
      ) : activeTab === 'autodash' ? (
        /* DYNAMIC AUTO DASHBOARD TAB */
        <DynamicAutoDashboard />
      ) : (
        /* STANDARD DASHBOARD WORKSPACE */
        <main className="space-y-6">

          {/* SEARCH & NEXUS AI ASSISTANT */}
          <section className="relative">
            <div className="p-[1px] rounded-2xl bg-gradient-to-r from-white/15 via-[#7CFF4F]/30 to-white/15 backdrop-blur-3xl shadow-[0_10px_40px_rgba(0,0,0,0.6)]">
              <form onSubmit={handleAiSearch} className="flex items-center gap-3 bg-[#121212]/90 rounded-xl px-4 py-3 border border-white/10">
                <Sparkles className="w-5 h-5 text-[#7CFF4F] animate-pulse" />
                <input
                  type="text"
                  value={aiQuery}
                  onChange={(e) => setAiQuery(e.target.value)}
                  placeholder="Pergunte ao Nexus AI: 'Qual o risco de churn?' ou 'Causa da queda em Agosto' ou 'Preveja o faturamento do Q4'..."
                  className="w-full bg-transparent text-sm text-white placeholder-white/40 focus:outline-none"
                />
                <button 
                  type="submit" 
                  disabled={isAiAnalyzing}
                  className="px-4 py-2 bg-[#7CFF4F] hover:bg-[#6ee443] text-black font-bold text-xs rounded-lg flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(124,255,79,0.3)] disabled:opacity-50"
                >
                  {isAiAnalyzing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Analisar
                </button>
              </form>
            </div>

            <AnimatePresence>
              {aiResponse && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mt-3 p-4 rounded-xl bg-[#121212]/95 border border-[#7CFF4F]/40 backdrop-blur-2xl shadow-[0_0_30px_rgba(124,255,79,0.15)] text-sm text-white/90 leading-relaxed font-sans"
                >
                  {aiResponse}
                </motion.div>
              )}
            </AnimatePresence>
          </section>

          {/* KPI CARDS GRID */}
          <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            {[
              { label: 'Receita Total', val: 'R$ 48.9M', change: '+18.4%', isPos: true, icon: DollarSign, tag: 'Peak Volume' },
              { label: 'Clientes Ativos', val: '142.850', change: '+12.1%', isPos: true, icon: Users, tag: 'High Growth' },
              { label: 'Conversões', val: '4.82%', change: '+0.65%', isPos: true, icon: Target, tag: 'Optimized' },
              { label: 'ROI Consolidado', val: '412%', change: '+34.0%', isPos: true, icon: Activity, tag: 'High Yield' },
              { label: 'Ticket Médio', val: 'R$ 342,80', change: '+5.2%', isPos: true, icon: TrendingUp, tag: 'Growing' },
              { label: 'Risco de Churn (IA)', val: '1.4%', change: '-0.3%', isPos: true, icon: ShieldCheck, tag: 'Safe Zone' },
            ].map((kpi, idx) => (
              <motion.div
                key={idx}
                whileHover={{ y: -4, scale: 1.02 }}
                transition={{ type: 'spring', stiffness: 350, damping: 22 }}
                className="p-5 rounded-2xl bg-[#121212]/60 backdrop-blur-xl border border-white/10 hover:border-[#7CFF4F]/50 shadow-[0_10px_30px_rgba(0,0,0,0.5)] transition-all group relative overflow-hidden"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-white/50">{kpi.label}</span>
                  <kpi.icon className="w-4 h-4 text-[#7CFF4F] group-hover:scale-110 transition-transform" />
                </div>

                <div className="text-2xl font-black text-white tracking-tight mb-2 font-mono">
                  {kpi.val}
                </div>

                <div className="flex items-center justify-between text-[11px]">
                  <span className="flex items-center gap-1 font-bold text-[#7CFF4F]">
                    <ArrowUpRight className="w-3 h-3" />
                    {kpi.change}
                  </span>
                  <span className="text-white/30 font-mono text-[10px]">{kpi.tag}</span>
                </div>
              </motion.div>
            ))}
          </section>

          {/* MAIN CHARTS SECTION */}
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Area Chart: Evolution & AI Forecast */}
            <div className="lg:col-span-2 p-6 rounded-2xl bg-[#121212]/60 backdrop-blur-xl border border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.5)] space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    Evolução Financeira & Projeção Preditiva IA
                    <span className="px-2 py-0.5 rounded-full bg-[#7CFF4F]/10 border border-[#7CFF4F]/30 text-[10px] text-[#7CFF4F] font-mono">
                      PROPHET V4
                    </span>
                  </h3>
                  <p className="text-xs text-white/40">Realizado vs Projeção em tempo real com algoritmo de regressão vetorial</p>
                </div>
              </div>

              <div className="h-[340px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revenueTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorReal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#7CFF4F" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#7CFF4F" stopOpacity={0.0}/>
                      </linearGradient>
                      <linearGradient id="colorProj" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#00F0FF" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#00F0FF" stopOpacity={0.0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="month" stroke="rgba(255,255,255,0.4)" fontSize={11} />
                    <YAxis stroke="rgba(255,255,255,0.4)" fontSize={11} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'rgba(18, 18, 18, 0.95)', 
                        borderColor: 'rgba(255,255,255,0.2)',
                        borderRadius: '12px',
                        backdropFilter: 'blur(10px)',
                        color: '#fff' 
                      }}
                    />
                    <Area type="monotone" dataKey="receita" stroke="#7CFF4F" strokeWidth={3} fillOpacity={1} fill="url(#colorReal)" name="Receita Real (R$ M)" />
                    <Area type="monotone" dataKey="projecao" stroke="#00F0FF" strokeWidth={2} strokeDasharray="5 5" fillOpacity={1} fill="url(#colorProj)" name="Projeção IA (R$ M)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Donut Chart: Segment Distribution */}
            <div className="p-6 rounded-2xl bg-[#121212]/60 backdrop-blur-xl border border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.5)] space-y-4 flex flex-col justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <PieIcon className="w-4 h-4 text-[#00F0FF]" />
                  Distribuição por Segmento
                </h3>
                <p className="text-xs text-white/40">Market share relativo de clientes corporativos</p>
              </div>

              <div className="h-[220px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={segmentData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={85}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {segmentData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} stroke="transparent" />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#121212', borderColor: 'rgba(255,255,255,0.2)', borderRadius: '10px' }} 
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/10">
                {segmentData.map((s, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-xs">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                    <span className="text-white/70 truncate">{s.name}</span>
                  </div>
                ))}
              </div>
            </div>

          </section>

          {/* SECONDARY CHARTS & CONNECTOR MATRIX */}
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Bar Chart: Revenue Channels */}
            <div className="lg:col-span-2 p-6 rounded-2xl bg-[#121212]/60 backdrop-blur-xl border border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.5)] space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-[#7CFF4F]" />
                    Faturamento por Canal de Origem
                  </h3>
                  <p className="text-xs text-white/40">Consolidado em milhões de Reais (R$ M)</p>
                </div>
              </div>

              <div className="h-[240px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={channelData} layout="vertical" margin={{ top: 5, right: 20, left: 40, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis type="number" stroke="rgba(255,255,255,0.4)" fontSize={11} />
                    <YAxis dataKey="channel" type="category" stroke="rgba(255,255,255,0.7)" fontSize={11} />
                    <Tooltip contentStyle={{ backgroundColor: '#121212', borderColor: 'rgba(255,255,255,0.2)', borderRadius: '10px' }} />
                    <Bar dataKey="receita" radius={[0, 8, 8, 0]}>
                      {channelData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Connectors Telemetry Matrix */}
            <div className="p-6 rounded-2xl bg-[#121212]/60 backdrop-blur-xl border border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.5)] space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Database className="w-4 h-4 text-[#7CFF4F]" />
                  Matriz de Conectores
                </h3>
                <span className="text-xs text-[#7CFF4F] font-mono">15/15 Active</span>
              </div>

              <div className="space-y-2.5">
                {connectorStatuses.map((conn, i) => (
                  <div key={i} className="p-3 rounded-xl bg-white/5 border border-white/5 hover:border-white/20 flex items-center justify-between transition-all">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-[#7CFF4F] shadow-[0_0_6px_#7CFF4F]" />
                      <div>
                        <div className="text-xs font-semibold text-white">{conn.name}</div>
                        <div className="text-[10px] text-white/40 font-mono">{conn.type}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-mono text-[#7CFF4F]">{conn.latency}</div>
                      <div className="text-[10px] text-white/30">{conn.status}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </section>

        </main>
      )}
    </div>
  );
}
