import pandas as pd
import numpy as np
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.model_selection import train_test_split
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.metrics import roc_auc_score, precision_score, recall_score, f1_score, confusion_matrix
import pickle
import warnings
warnings.filterwarnings('ignore')

print("=" * 80)
print("ЗАГРУЗКА И ПРЕДОБРАБОТКА ДАННЫХ")
print("=" * 80)

df = pd.read_csv('referense/train.csv')
print(f"Исходный размер: {df.shape}")

df['order_timestamp'] = pd.to_datetime(df['order_timestamp'])
df['tender_timestamp'] = pd.to_datetime(df['tender_timestamp'])
df['driver_reg_date'] = pd.to_datetime(df['driver_reg_date'])

df['target'] = (df['is_done'] == 'done').astype(int)

df = df.dropna(subset=['is_done'])

print(f"Распределение целевой переменной:")
print(df['target'].value_counts())
print(f"Процент 'done': {df['target'].mean() * 100:.1f}%\n")

print("=" * 80)
print("FEATURE ENGINEERING")
print("=" * 80)

df['order_hour'] = df['order_timestamp'].dt.hour
df['order_day_of_week'] = df['order_timestamp'].dt.dayofweek
df['order_month'] = df['order_timestamp'].dt.month
df['order_day_of_month'] = df['order_timestamp'].dt.day

df['time_to_tender'] = (df['tender_timestamp'] - df['order_timestamp']).dt.total_seconds()

df['driver_tenure_days'] = (df['order_timestamp'] - df['driver_reg_date']).dt.days

df['price_diff'] = df['price_bid_local'] - df['price_start_local']
df['price_ratio'] = df['price_bid_local'] / (df['price_start_local'] + 1)

df['distance_km'] = df['distance_in_meters'] / 1000

df['is_zero_distance'] = (df['distance_in_meters'] == 0).astype(int)

df['is_fast_pickup'] = (df['pickup_in_seconds'] < 300).astype(int)

le_dict = {}
categorical_cols = ['platform', 'carname', 'carmodel']

for col in categorical_cols:
    le = LabelEncoder()
    df[f'{col}_encoded'] = le.fit_transform(df[col].astype(str))
    le_dict[col] = le

feature_cols = [
    'price_bid_local', 'price_ratio', 'distance_in_meters', 
    'duration_in_seconds', 'driver_rating', 'pickup_in_seconds',
    'order_hour', 'order_day_of_week', 'order_month',
    'time_to_tender', 'driver_tenure_days', 'price_diff',
    'platform_encoded', 'carname_encoded', 'carmodel_encoded',
    'is_zero_distance', 'is_fast_pickup'
]

X = df[feature_cols].copy()
X = X.fillna(X.median())

y = df['target'].copy()

print(f"Признаки для обучения: {len(feature_cols)}")
print(f"Размер выборки: {X.shape}")
print(f"\nПризнаки: {feature_cols}\n")

print("=" * 80)
print("РАЗДЕЛЕНИЕ ДАННЫХ И НОРМАЛИЗАЦИЯ")
print("=" * 80)

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)

scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled = scaler.transform(X_test)

print(f"Train set: {X_train.shape}")
print(f"Test set: {X_test.shape}")
print(f"Train distribution: {y_train.value_counts().to_dict()}")
print(f"Test distribution: {y_test.value_counts().to_dict()}\n")

print("=" * 80)
print("ОБУЧЕНИЕ МОДЕЛИ (Gradient Boosting)")
print("=" * 80)

model = GradientBoostingClassifier(
    n_estimators=100,
    learning_rate=0.1,
    max_depth=6,
    random_state=42,
    verbose=1
)

model.fit(X_train_scaled, y_train)

print("\nМодель обучена!\n")

print("=" * 80)
print("ОЦЕНКА КАЧЕСТВА МОДЕЛИ")
print("=" * 80)

y_pred_train = model.predict(X_train_scaled)
y_pred_proba_train = model.predict_proba(X_train_scaled)[:, 1]

y_pred_test = model.predict(X_test_scaled)
y_pred_proba_test = model.predict_proba(X_test_scaled)[:, 1]

def print_metrics(y_true, y_pred, y_proba, set_name):
    roc_auc = roc_auc_score(y_true, y_proba)
    precision = precision_score(y_true, y_pred)
    recall = recall_score(y_true, y_pred)
    f1 = f1_score(y_true, y_pred)
    
    tn, fp, fn, tp = confusion_matrix(y_true, y_pred).ravel()
    specificity = tn / (tn + fp)
    
    print(f"\n{set_name} Set Metrics:")
    print(f"  ROC-AUC:      {roc_auc:.4f}")
    print(f"  Precision:    {precision:.4f}")
    print(f"  Recall:       {recall:.4f}")
    print(f"  F1-Score:     {f1:.4f}")
    print(f"  Specificity:  {specificity:.4f}")
    
    return roc_auc, precision, recall, f1

train_metrics = print_metrics(y_train, y_pred_train, y_pred_proba_train, "Train")
test_metrics = print_metrics(y_test, y_pred_test, y_pred_proba_test, "Test")

print("\n" + "=" * 80)
print("ВАЖНОСТЬ ПРИЗНАКОВ")
print("=" * 80)

feature_importance = pd.DataFrame({
    'feature': feature_cols,
    'importance': model.feature_importances_
}).sort_values('importance', ascending=False)

print("\nТоп 10 важных признаков:")
print(feature_importance.head(10).to_string(index=False))

print("\n" + "=" * 80)
print("СОХРАНЕНИЕ МОДЕЛИ")
print("=" * 80)

with open('src/model.pkl', 'wb') as f:
    pickle.dump(model, f)

with open('src/scaler.pkl', 'wb') as f:
    pickle.dump(scaler, f)

with open('src/label_encoders.pkl', 'wb') as f:
    pickle.dump(le_dict, f)

with open('src/feature_cols.pkl', 'wb') as f:
    pickle.dump(feature_cols, f)

print("✓ Модель сохранена: src/model.pkl")
print("✓ Скейлер сохранён: src/scaler.pkl")
print("✓ Label encoders сохранены: src/label_encoders.pkl")
print("✓ Список признаков сохранён: src/feature_cols.pkl")

print("\n" + "=" * 80)
print("ГОТОВО! Модель готова к использованию.")
print("=" * 80)