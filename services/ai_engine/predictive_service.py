# OBSIDIAN NEXUS — AI & Predictive Machine Learning Service
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from typing import List, Optional

app = FastAPI(
    title="Obsidian Nexus AI Core Engine",
    description="Microserviço de inteligência preditiva, previsão de faturamento e detecção de risco de churn.",
    version="4.0.0"
)

class TimeSeriesPoint(BaseModel):
    month: str
    revenue: float

class ChurnFeatureVector(BaseModel):
    customer_id: str
    api_usage_drop_pct: float
    support_tickets_30d: int
    contract_months_remaining: int
    monthly_spend: float

class ForecastResponse(BaseModel):
    status: str
    q4_projected_revenue: float
    confidence_interval: List[float]
    growth_rate_mom: float
    ai_recommendation: str

@app.get("/health")
async def health_check():
    return {"status": "ONLINE", "model_version": "v4.0.0", "fps_target": 60}

@app.post("/api/v1/forecast", response_model=ForecastResponse)
async def forecast_revenue(data: List[TimeSeriesPoint]):
    if not data:
        raise HTTPException(status_code=400, detail="Sem dados para regressão.")
    
    df = pd.DataFrame([d.dict() for d in data])
    last_val = df['revenue'].iloc[-1]
    
    # Modelo sintético de regressão com tendência de 12% MoM
    projected = last_val * (1.12 ** 3)
    
    return ForecastResponse(
        status="success",
        q4_projected_revenue=round(projected, 2),
        confidence_interval=[round(projected * 0.94, 2), round(projected * 1.06, 2)],
        growth_rate_mom=12.0,
        ai_recommendation="Recomendado manter expansão no segmento Enterprise B2B e otimizar latência do conector SAP."
    )

@app.post("/api/v1/churn-risk")
async def calculate_churn_risk(vector: ChurnFeatureVector):
    # Score ponderado híbrido de propensão a churn
    score = (vector.api_usage_drop_pct / 100.0) * 0.5 + (min(vector.support_tickets_30d, 10) / 10.0) * 0.3 + (1.0 / max(vector.contract_months_remaining, 1)) * 0.2
    score = min(max(score, 0.0), 1.0)
    
    risk_level = "CRITICAL" if score > 0.7 else ("MODERATE" if score > 0.4 else "LOW")
    
    return {
        "customer_id": vector.customer_id,
        "churn_probability_pct": round(score * 100, 2),
        "risk_level": risk_level,
        "recommended_playbook": "Ativar Playbook Executivo de Retenção" if risk_level == "CRITICAL" else "Monitorar Engajamento"
    }
