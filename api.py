from fastapi import FastAPI, HTTPException, UploadFile, File, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
import pandas as pd
import numpy as np
import sqlite3
import statsmodels.api as sm
from statsmodels.tsa.stattools import adfuller
from typing import Dict, Any, List
from io import StringIO
from datetime import datetime

# --- FastAPI App Setup ---
app = FastAPI(title="Quant Analytics API")

# Crucial: Allow cross-origin requests from your React frontend (running on port 3000)
origins = ["http://localhost:3000"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Data Loading Function ---
def load_from_db() -> pd.DataFrame:
    """Loads the latest 5000 records from the SQLite database."""
    conn = sqlite3.connect("tick_data.db")
    # Ensure 'qty' (volume) is fetched
    query = "SELECT symbol, timestamp AS ts, price, qty FROM ticks ORDER BY timestamp DESC LIMIT 5000"
    try:
        df = pd.read_sql_query(query, conn)
    except Exception:
        conn.close()
        return pd.DataFrame()
    conn.close()

    if df.empty:
        return pd.DataFrame()

    df["ts"] = pd.to_datetime(df["ts"], errors="coerce")
    df = df.dropna(subset=["ts", "price", "symbol"])
    return df.sort_values("ts")

# --- Core Analytics Function  ---
def run_analytics(df: pd.DataFrame, s1: str, s2: str, timeframe: str, window: int, regression_type: str, run_adf: bool) -> Dict[str, Any]:
    """Encapsulates the data resampling and analytical computations."""
    if df.empty:
        raise HTTPException(status_code=404, detail="No data available in the database.")
    
    # 1. Resample (UPDATED TO INCLUDE VOLUME)
    df = df.set_index("ts")
    try:
        # Resample using aggregation: last price, sum of quantity (volume)
        resampled_data = df.groupby("symbol").resample(timeframe.split()[0]).agg(
            price=('price', 'last'), 
            volume=('qty', 'sum')    
        ).unstack(0)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error during data resampling: {e}")

    # Re-structure and flatten columns
    try:
        resampled = pd.DataFrame({
            s1: resampled_data['price'][s1],
            f"{s1}_volume": resampled_data['volume'][s1],
            s2: resampled_data['price'][s2],
            f"{s2}_volume": resampled_data['volume'][s2],
        })
    except KeyError:
        # Handle case where a symbol is not in the data
        raise HTTPException(status_code=400, detail="Selected symbols not in resampled data.")
    
    # Forward fill prices and volumes, then drop any rows that are entirely NaN
    resampled = resampled.fillna(method="ffill").dropna(how="all")
    
    # Drop rows where price data for both s1 and s2 is missing
    resampled = resampled.dropna(subset=[s1, s2])
    
    # If not enough data, return partial metrics
    if len(resampled) < 2:
        return {
            "chart_data": [],
            "metrics": {"latest_spread": "N/A", "hedge_ratio": "N/A", "adf_p_value": "N/A", "z_latest": None, "data_points": len(resampled)},
            "resampled_df": pd.DataFrame()
        }

    # 2. Compute spread & rolling stats (UNCHANGED)
    resampled["spread"] = resampled[s1] - resampled[s2]
    resampled["mean"] = resampled["spread"].rolling(window, min_periods=1).mean()
    resampled["std"] = resampled["spread"].rolling(window, min_periods=1).std().replace(0, np.nan)
    resampled["zscore"] = (resampled["spread"] - resampled["mean"]) / resampled["std"]
    resampled["rolling_corr"] = resampled[s1].rolling(window, min_periods=2).corr(resampled[s2])

    # 3. Hedge Ratio via OLS (UNCHANGED)
    hedge_ratio = np.nan
    hedge_points = 0
    try:
        y = resampled[s1].dropna()
        X_base = resampled[s2].dropna()
        
        joined = pd.concat([y, X_base], axis=1).dropna()
        hedge_points = len(joined)
        
        if hedge_points >= 5:
            if regression_type == "OLS_I": # OLS with Intercept (Standard Cointegration)
                X = sm.add_constant(joined[s2])
                model = sm.OLS(joined[s1], X).fit()
                hedge_ratio = model.params.iloc[1] if len(model.params) > 1 else np.nan 
            elif regression_type == "OLS_NOI": # OLS No Intercept (Ratio)
                X = joined[s2]
                model = sm.OLS(joined[s1], X).fit()
                hedge_ratio = model.params.iloc[0]

    except Exception:
        hedge_ratio = np.nan

    # 4. ADF Test (UNCHANGED)
    adf_p = None
    if run_adf:
        try:
            spread_clean = resampled["spread"].dropna()
            if len(spread_clean) >= 10:
                adf_p = adfuller(spread_clean)[1]
        except Exception:
            adf_p = None

    # 5. Prepare Final Output
    latest_spread = resampled["spread"].iloc[-1] if not resampled["spread"].empty else np.nan
    z_latest = resampled["zscore"].dropna().iloc[-1] if not resampled["zscore"].dropna().empty else np.nan

    # Convert DataFrame for chart plotting
    chart_data = resampled.reset_index().rename(columns={resampled.index.name: 'timestamp'}).to_dict(orient="records")

    return {
        "chart_data": chart_data,
        "metrics": {
            "latest_spread": f"{latest_spread:.4f}" if not np.isnan(latest_spread) else "N/A",
            "hedge_ratio": f"{hedge_ratio:.4f}" if not np.isnan(hedge_ratio) else "N/A",
            "hedge_points": hedge_points,
            "adf_p_value": f"{adf_p:.4f}" if adf_p is not None else "N/A",
            "z_latest": float(z_latest) if not np.isnan(z_latest) else None, 
            "data_points": len(resampled)
        },
        "resampled_df": resampled
    }


# --- API Endpoints ---

@app.get("/symbols", response_model=Dict[str, List[str]])
def get_symbols():
    """Returns the list of unique symbols available in the data."""
    df = load_from_db()
    if df.empty:
        return {"symbols": []}
        
    return {"symbols": df["symbol"].unique().tolist()}


@app.get("/analyze", response_model=Dict[str, Any])
def get_analytics(
    s1: str, 
    s2: str, 
    timeframe: str = "1T", 
    window: int = 20, 
    regression_type: str = Query("OLS_I"), 
    run_adf: bool = Query(False) 
):
    """Performs all the quant analysis and returns the processed data and key metrics."""
    df = load_from_db()
    result = run_analytics(df, s1, s2, timeframe, window, regression_type, run_adf)
    
    result.pop("resampled_df", None)
    return result


@app.post("/upload_ohlc")
async def upload_ohlc(file: UploadFile = File(...)):
    """Ingests uploaded OHLC CSV data and stores it in the database."""
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are accepted.")
    
    try:
        content = await file.read()
        csv_data = StringIO(content.decode("utf-8"))
        df = pd.read_csv(csv_data)
        
        # Simple column mapping to standardize OHLC data to our tick table structure
        column_map = {'Close': 'price', 'Volume': 'qty', 'Time': 'timestamp'}
        df = df.rename(columns=column_map)
        
        required_cols = ['timestamp', 'symbol', 'price', 'qty'] 
        if not all(col in df.columns for col in required_cols):
            raise HTTPException(status_code=400, detail=f"CSV must contain data convertible to: {required_cols}")

        df['timestamp'] = pd.to_datetime(df['timestamp'], errors='coerce')
        df = df.dropna(subset=['timestamp', 'price', 'symbol', 'qty'])
        
        conn = sqlite3.connect("tick_data.db")
        df[['symbol', 'timestamp', 'price', 'qty']].to_sql('ticks', conn, if_exists='append', index=False)
        conn.close()

        return {"message": f"Successfully ingested {len(df)} records for symbols: {df['symbol'].unique().tolist()}"}
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process CSV file: {e}")


@app.get("/export_csv")
def export_csv(s1: str = Query(...), s2: str = Query(...), timeframe: str = Query("1T"), window: int = Query(20), regression_type: str = Query("OLS_I")):
    """Exports the processed, resampled, and analyzed data to a CSV file."""
    try:
        df = load_from_db()
        # Force run_adf=True for export to ensure p-value is included
        result = run_analytics(df, s1, s2, timeframe, window, regression_type, run_adf=True) 
        
        resampled_df: pd.DataFrame = result.get("resampled_df")
        
        if resampled_df is None or resampled_df.empty:
            raise HTTPException(status_code=404, detail="No processed data available for export.")

        # Append ADF p-value to the dataframe for export
        p_value = result['metrics']['adf_p_value']
        resampled_df['ADF p-value'] = p_value

        csv_data = resampled_df.to_csv(index=True)
        
        filename = f"analytics_export_{s1}{s2}{timeframe}.csv"
        
        return StreamingResponse(
            iter([csv_data]),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred during CSV export: {e}")
