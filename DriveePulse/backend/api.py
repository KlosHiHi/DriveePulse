from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Dict, Optional
import pickle
import numpy as np
import pandas as pd
from datetime import datetime
from pathlib import Path
import uvicorn
import warnings

warnings.filterwarnings('ignore', message='X does not have valid feature names')

BASE_DIR = Path(__file__).parent.parent
MODEL_DIR = BASE_DIR / "src"

print("Loading ML model...")

try:
    with open(MODEL_DIR / 'model.pkl', 'rb') as f:
        model = pickle.load(f)
    
    with open(MODEL_DIR / 'scaler.pkl', 'rb') as f:
        scaler = pickle.load(f)
    
    with open(MODEL_DIR / 'label_encoders.pkl', 'rb') as f:
        le_dict = pickle.load(f)
    
    with open(MODEL_DIR / 'feature_cols.pkl', 'rb') as f:
        feature_cols = pickle.load(f)
    
    print("Model loaded successfully!")
except Exception as e:
    print(f"Error loading model: {e}")
    raise

app = FastAPI(
    title="Drivee Smart Assistant API",
    description="AI-powered price optimization for taxi orders",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

class BidRequest(BaseModel):
    order_id: str = Field(..., description="ID заказа")
    pickup_lat: float = Field(..., description="Широта точки посадки")
    pickup_lng: float = Field(..., description="Долгота точки посадки") 
    destination_lat: float = Field(..., description="Широта точки назначения")
    destination_lng: float = Field(..., description="Долгота точки назначения")
    initial_price: float = Field(..., description="Начальная цена пассажира")
    driver_lat: float = Field(..., description="Текущая широта водителя")
    driver_lng: float = Field(..., description="Текущая долгота водителя")
    driver_rating: Optional[float] = Field(4.5, description="Рейтинг водителя")
    user_rating: Optional[float] = Field(4.5, description="Рейтинг пассажира")
    carname: Optional[str] = Field("Лада", description="Марка автомобиля")
    carmodel: Optional[str] = Field("Гранта", description="Модель автомобиля")
    platform: Optional[str] = Field("android", description="Платформа водителя")
    
    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "order_id": "order_123",
                    "pickup_lat": 55.7558,
                    "pickup_lng": 37.6176,
                    "destination_lat": 55.7387,
                    "destination_lng": 37.6032,
                    "initial_price": 300.0,
                    "driver_lat": 55.7500,
                    "driver_lng": 37.6200,
                    "driver_rating": 4.8,
                    "user_rating": 4.5,
                    "carname": "Лада", 
                    "carmodel": "Гранта",
                    "platform": "android"
                }
            ]
        }
    }

class OrderRequest(BaseModel):
    price_start_local: float = Field(..., description="Начальная цена заказа (руб)", gt=0)
    distance_in_meters: float = Field(..., description="Расстояние в метрах", ge=0)
    duration_in_seconds: float = Field(..., description="Время поездки в секундах", ge=0)
    driver_rating: float = Field(..., description="Рейтинг водителя", ge=0, le=5)
    pickup_in_seconds: float = Field(..., description="Время подачи в секундах", ge=0)
    platform: str = Field(..., description="Платформа: android или ios")
    carname: str = Field(..., description="Марка автомобиля")
    carmodel: str = Field(..., description="Модель автомобиля")
    order_hour: Optional[int] = Field(None, description="Час заказа (0-23)", ge=0, le=23)
    order_day_of_week: Optional[int] = Field(None, description="День недели (0-6)", ge=0, le=6)
    order_month: Optional[int] = Field(None, description="Месяц (1-12)", ge=1, le=12)
    driver_tenure_days: int = Field(365, description="Стаж водителя в днях", ge=0)
    time_to_tender: float = Field(25.0, description="Время до подачи тендера (сек)", ge=0)

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "price_start_local": 350,
                    "distance_in_meters": 5000,
                    "duration_in_seconds": 600,
                    "driver_rating": 4.85,
                    "pickup_in_seconds": 200,
                    "platform": "android",
                    "carname": "Лада",
                    "carmodel": "Гранта"
                }
            ]
        }
    }

class PriceRecommendation(BaseModel):
    optimal_price: float = Field(..., description="Оптимальная цена (макс. доход)")
    optimal_acceptance_prob: float = Field(..., description="Вероятность принятия оптимальной цены")
    expected_revenue: float = Field(..., description="Ожидаемый доход")
    safe_price: float = Field(..., description="Безопасная цена (>60% вероятность)")
    safe_acceptance_prob: float = Field(..., description="Вероятность принятия безопасной цены")
    risky_price: float = Field(..., description="Рискованная цена (макс. вероятность)")
    risky_acceptance_prob: float = Field(..., description="Вероятность принятия рискованной цены")
    price_curve: List[Dict[str, float]] = Field(..., description="Кривая цена-вероятность")
    order_info: Optional[Dict] = Field(None, description="Дополнительная информация о заказе")

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    from math import radians, cos, sin, asin, sqrt
    
    lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
    
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
    c = 2 * asin(sqrt(a))
    
    r = 6371000
    return c * r

def prepare_features_from_bid(bid: BidRequest) -> dict:
    
    distance_in_meters = haversine_distance(
        bid.pickup_lat, bid.pickup_lng, 
        bid.destination_lat, bid.destination_lng
    )
    
    pickup_distance = haversine_distance(
        bid.driver_lat, bid.driver_lng,
        bid.pickup_lat, bid.pickup_lng  
    )
    
    duration_in_seconds = (distance_in_meters / 1000) * 3600 / 30
    pickup_in_seconds = (pickup_distance / 1000) * 3600 / 25 
    
    order = OrderRequest(
        price_start_local=bid.initial_price,
        distance_in_meters=distance_in_meters,
        duration_in_seconds=duration_in_seconds,
        driver_rating=bid.driver_rating,
        pickup_in_seconds=pickup_in_seconds,
        platform=bid.platform.lower(),
        carname=bid.carname,
        carmodel=bid.carmodel
    )
    
    return prepare_features(order)

def prepare_features(order: OrderRequest) -> dict:
    
    now = datetime.now()
    order_hour = order.order_hour if order.order_hour is not None else now.hour
    order_day_of_week = order.order_day_of_week if order.order_day_of_week is not None else now.weekday()
    order_month = order.order_month if order.order_month is not None else now.month
    
    try:
        platform_encoded = le_dict['platform'].transform([order.platform.lower()])[0]
    except:
        platform_encoded = 0
    
    try:
        carname_encoded = le_dict['carname'].transform([order.carname])[0]
    except:
        carname_encoded = 0
    
    try:
        carmodel_encoded = le_dict['carmodel'].transform([order.carmodel])[0]
    except:
        carmodel_encoded = 0
    
    is_zero_distance = 1 if order.distance_in_meters == 0 else 0
    is_fast_pickup = 1 if order.pickup_in_seconds < 300 else 0
    
    return {
        'price_start_local': order.price_start_local,
        'distance_in_meters': order.distance_in_meters,
        'duration_in_seconds': order.duration_in_seconds,
        'driver_rating': order.driver_rating,
        'pickup_in_seconds': order.pickup_in_seconds,
        'order_hour': order_hour,
        'order_day_of_week': order_day_of_week,
        'order_month': order_month,
        'time_to_tender': order.time_to_tender,
        'driver_tenure_days': order.driver_tenure_days,
        'platform_encoded': platform_encoded,
        'carname_encoded': carname_encoded,
        'carmodel_encoded': carmodel_encoded,
        'is_zero_distance': is_zero_distance,
        'is_fast_pickup': is_fast_pickup,
    }

def optimize_price(features: dict, start_price: float) -> dict:
    price_multipliers = np.linspace(0.9, 1.5, 50)
    prices = start_price * price_multipliers
    
    revenues = []
    probabilities = []
    
    for bid_price in prices:
        features_copy = features.copy()
        features_copy['price_bid_local'] = bid_price
        features_copy['price_ratio'] = bid_price / (start_price + 1)
        features_copy['price_diff'] = bid_price - start_price
        
        X_list = [features_copy.get(col, 0) for col in feature_cols]
        X_array = np.array([X_list])
        X_scaled = scaler.transform(X_array)
        
        prob = model.predict_proba(X_scaled)[0, 1]
        revenue = bid_price * prob
        
        probabilities.append(float(prob))
        revenues.append(float(revenue))
    
    optimal_idx = np.argmax(revenues)
    optimal_price = float(prices[optimal_idx])
    optimal_prob = probabilities[optimal_idx]
    optimal_revenue = revenues[optimal_idx]
    
    distance_km = features['distance_in_meters'] / 1000
    duration_min = features['duration_in_seconds'] / 60
    print(f"\n[ML] MODEL PREDICTION:")
    print(f"   Distance: {distance_km:.1f} km, Duration: {duration_min:.1f} min")
    print(f"   Price range: {int(start_price)}р - {int(prices[-1])}р")
    print(f"   OPTIMAL: {int(optimal_price)}р (prob={optimal_prob:.1%}, revenue={int(optimal_revenue)}р)")
    print(f"   Model tested {len(prices)} price points")
    
    prob_threshold = max(probabilities) * 0.98
    min_price_indices = [i for i, p in enumerate(probabilities) if p >= prob_threshold]
    risky_idx = min(min_price_indices)  
    risky_price = float(prices[risky_idx])
    risky_prob = probabilities[risky_idx]
    
    prob_min_threshold = 0.4
    max_price_indices = [i for i, p in enumerate(probabilities) if p >= prob_min_threshold]
    safe_idx = max(max_price_indices) 
    safe_price = float(prices[safe_idx])
    safe_prob = probabilities[safe_idx]
    
    price_curve = [
        {
            "price": float(p),
            "probability": float(prob),
            "revenue": float(rev)
        }
        for p, prob, rev in zip(prices, probabilities, revenues)
    ]
    
    return {
        'optimal_price': optimal_price,
        'optimal_acceptance_prob': optimal_prob,
        'expected_revenue': optimal_revenue,
        'safe_price': safe_price,
        'safe_acceptance_prob': safe_prob,
        'risky_price': risky_price,
        'risky_acceptance_prob': risky_prob,
        'price_curve': price_curve
    }

@app.get("/", tags=["root"])
def read_root():
    return {
        "service": "Drivee Smart Assistant API",
        "version": "2.0.0",
        "status": "running",
        "model_loaded": True,
        "endpoints": {
            "docs": "/docs",
            "health": "/health",
            "predict": "/predict",
            "model_info": "/model/info"
        }
    }

@app.get("/health", tags=["health"])
def health_check():
    return {
        "status": "healthy",
        "model": "loaded",
        "timestamp": datetime.now().isoformat()
    }

@app.post("/predict", response_model=PriceRecommendation, tags=["prediction"])
def predict_optimal_price(order: OrderRequest):
    try:
        features = prepare_features(order)
        
        result = optimize_price(features, order.price_start_local)
        
        return PriceRecommendation(**result)
    
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail={
                "error": "Prediction failed",
                "message": str(e),
                "type": type(e).__name__
            }
        )

@app.post("/bid/recommend", response_model=PriceRecommendation, tags=["bid"])
def recommend_bid_price(bid: BidRequest):
    try:
        features = prepare_features_from_bid(bid)
        
        result = optimize_price(features, bid.initial_price)
        
        result["order_info"] = {
            "order_id": bid.order_id,
            "initial_price": bid.initial_price,
            "distance_km": round(features['distance_in_meters'] / 1000, 1),
            "pickup_distance_km": round(haversine_distance(
                bid.driver_lat, bid.driver_lng, bid.pickup_lat, bid.pickup_lng
            ) / 1000, 1)
        }
        
        return PriceRecommendation(**result)
    
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail={
                "error": "Bid recommendation failed",
                "message": str(e),
                "type": type(e).__name__,
                "order_id": bid.order_id
            }
        )

@app.get("/model/info", tags=["model"])
def get_model_info():
    return {
        "model_type": "GradientBoostingClassifier",
        "features": feature_cols,
        "n_features": len(feature_cols),
        "target": "is_done (binary)",
        "encoding": {
            "platform": list(le_dict['platform'].classes_),
            "carname": list(le_dict['carname'].classes_)[:10],
            "carmodel": list(le_dict['carmodel'].classes_)[:10]
        },
        "trained_on": "50,000 real taxi orders"
    }

if __name__ == "__main__":
    print("\n" + "="* 80)
    print(" DRIVEE SMART ASSISTANT API v2.0")
    print("=" * 80)
    print(f"\n Server: http://localhost:8000")
    print(f" Docs:   http://localhost:8000/docs")
    print(f" ReDoc:  http://localhost:8000/redoc")
    print("\n" + "=" * 80 + "\n")
    
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8001,
        log_level="info"
    )
