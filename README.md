# 🚀 OBSIDIAN NEXUS — Enterprise BI & Intelligence Platform
> *"Where Data Becomes Power."*

O **Obsidian Nexus** é uma plataforma SaaS corporativa de Business Intelligence e Analytics de última geração, combinando **Glassmorphism Premium** (inspirado no Apple VisionOS, Stripe, Linear e Arc Browser) com Inteligência Artificial preditiva e dashboards totalmente interativos.

---

## 🎨 Identidade Visual
- **Preto Fosco Premium**: `#0A0A0A`
- **Grafite Escuro**: `#121212` / `#1A1A1A`
- **Verde Neon Inteligente**: `#7CFF4F`
- **Branco Cristal**: `#FFFFFF`
- **Vidro Translúcido**: `backdrop-filter: blur(24px)`

---

## 🛠️ Tecnologias
- **Frontend**: Next.js 14 / React 18, TypeScript, Tailwind CSS, Framer Motion, Recharts, Lucide Icons
- **Backend / Microservices**: Node.js / NestJS, Python (FastAPI, Scikit-Learn, Prophet)
- **Banco de Dados**: PostgreSQL Cluster (TimescaleDB), Redis Cache, Elasticsearch
- **Cloud & Infra**: Docker, Kubernetes, AWS EKS

---

## 🚀 Como Executar

### 1. Instalar dependências do Frontend
```bash
npm install
```

### 2. Iniciar o Dashboard em modo de desenvolvimento
```bash
npm run dev
```
Acesse em: `http://localhost:3000`

### 3. Iniciar o Microserviço de IA (Python)
```bash
cd services/ai_engine
pip install -r requirements.txt
uvicorn predictive_service:app --reload --port 8000
```
