import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import Plot from 'react-plotly.js';

const API_BASE_URL = 'http://127.0.0.1:8000';

// --- Helper Components (Metric and Plotting Layout) ---
const Metric = ({ label, value, subtext }) => (
    <div style={{ flex: 1, minWidth: '150px' }}>
        <h3 style={{ margin: '0 0 5px 0', color: '#61dafb' }}>{label}</h3>
        <p style={{ fontSize: '1.5em', fontWeight: 'bold', margin: 0 }}>{value || 'N/A'}</p>
        {subtext && <p style={{ margin: 0, color: '#aaa', fontSize: '0.8em' }}>{subtext}</p>}
    </div>
);

const getChartLayout = (title, yaxisTitle) => ({
    title: { text: title, font: { color: '#ffffff' } },
    xaxis: { title: 'Timestamp', showgrid: false, color: '#999999' },
    yaxis: { title: yaxisTitle, showgrid: true, gridcolor: '#444444', color: '#999999' },
    paper_bgcolor: '#1e1e1e',
    plot_bgcolor: '#1e1e1e',
    autosize: true,
    height: 350,
    margin: { t: 50, b: 50, l: 50, r: 50 },
    hovermode: 'x unified',
    dragmode: 'zoom',
});

// --- Main Dashboard Component ---
const App = () => {
    // --- State Management ---
    const [symbols, setSymbols] = useState([]);
    const [s1, setS1] = useState('BTCUSDT');
    const [s2, setS2] = useState('ETHUSDT');
    const [timeframe, setTimeframe] = useState('1T');

    const [rollingWindowValue, setRollingWindowValue] = useState(20);
    const [regressionType, setRegressionType] = useState('OLS_I');
    const [adfStatus, setAdfStatus] = useState('N/A (Click Run)');
    const [runADFNow, setRunADFNow] = useState(false);

    const [zAlert, setZAlert] = useState(2.0);
    const [refreshRate, setRefreshRate] = useState(5);

    const [data, setData] = useState(null);
    const [metrics, setMetrics] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // --- Data Fetching Logic (Polling) ---
    const fetchData = useCallback(async () => {
        if (!s1 || !s2 || s1 === s2) return;

        setLoading(true);
        setError(null);

        const shouldRunADF = runADFNow;

        if (runADFNow) {
            setRunADFNow(false); // Reset the trigger flag immediately
        }

        try {
            const response = await axios.get(`${API_BASE_URL}/analyze`, {
                params: {
                    s1,
                    s2,
                    timeframe,
                    window: rollingWindowValue,
                    regression_type: regressionType,
                    run_adf: shouldRunADF
                }
            });
            setData(response.data.chart_data);
            setMetrics(response.data.metrics);

            if (shouldRunADF && response.data.metrics.adf_p_value !== 'N/A') {
                setAdfStatus(response.data.metrics.adf_p_value);
            }

        } catch (err) {
            console.error("API Fetch Error:", err);
            setError(err.response ? err.response.data.detail : "Could not connect to API or Database. Check if Python servers are running.");
            setData(null);
            setMetrics({});
        } finally {
            setLoading(false);
        }
    }, [s1, s2, timeframe, rollingWindowValue, regressionType, runADFNow]);

    // 1. Initial symbol fetch
    useEffect(() => {
        axios.get(`${API_BASE_URL}/symbols`).then(response => {
            const syms = response.data.symbols;
            setSymbols(syms);
            if (syms.length >= 2) {
                setS1(syms[0]);
                setS2(syms[1]);
            } else if (syms.length > 0) {
                setS1(syms[0]);
                setS2('');
            }
        }).catch(() => setError("Failed to fetch symbols. Is 'binance_stream.py' and 'api.py' running?"));
    }, []);

    // 2. Auto-refresh loop
    useEffect(() => {
        fetchData();
        const intervalId = setInterval(fetchData, refreshRate * 1000);
        return () => clearInterval(intervalId);
    }, [fetchData, refreshRate]);


    // --- Trading Signal Logic ---
    const renderSignal = () => {
        const zLatest = metrics.z_latest;

        if (zLatest === null || zLatest === undefined || typeof zLatest !== 'number' || isNaN(zLatest)) {
            return <div style={{ color: '#aaa' }}>ℹ Waiting for sufficient data to compute z-score...</div>;
        }

        const zNum = zLatest;

        if (Math.abs(zNum) > zAlert) {
            if (zNum > 0) {
                return <div style={{ color: '#ff4d4d', fontWeight: 'bold', fontSize: '1.2em' }}>⚠ SELL Signal — Z-Score: {zNum.toFixed(2)} (Overbought)</div>;
            } else {
                return <div style={{ color: '#4dff4d', fontWeight: 'bold', fontSize: '1.2em' }}>✅ BUY Signal — Z-Score: {zNum.toFixed(2)} (Oversold)</div>;
            }
        } else {
            return <div style={{ color: '#4d94ff', fontWeight: 'bold', fontSize: '1.2em' }}>ℹ Neutral Zone: Z-Score: {zNum.toFixed(2)}</div>;
        }
    };

    // --- Data Export Handler ---
    const handleExportData = () => {
        const queryParams = new URLSearchParams({
            s1,
            s2,
            timeframe,
            window: rollingWindowValue,
            regression_type: regressionType
        }).toString();
        window.location.href = `${API_BASE_URL}/export_csv?${queryParams}`;
    };

    // --- OHLC Upload Handler ---
    const handleUploadOHLC = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        setLoading(true);

        const formData = new FormData();
        formData.append("file", file);

        try {
            const response = await axios.post(`${API_BASE_URL}/upload_ohlc`, formData);

            event.target.value = null;
            console.log(`Upload Successful: ${response.data.message}`);

            fetchData();

        } catch (error) {
            const errorMessage = error.response?.data?.detail || "An unexpected error occurred during upload.";
            console.error(`Upload Failed: ${errorMessage}`);
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    // --- NEW: Time-Series Data Table Component ---
    const renderDataTable = () => {
        if (!data || data.length === 0) return null;

        // Select the last 20 rows and reverse them to show latest first
        const rowsToShow = 20;
        const lastDataPoints = [...data].slice(-rowsToShow).reverse();

        // Define columns to display and how to format them
        const columns = [
            { key: 'timestamp', label: 'Time', format: (v) => new Date(v).toLocaleTimeString() },
            { key: s1, label: s1 + ' Price', format: (v) => v ? v.toFixed(2) : 'N/A' },
            { key: `${s1}_volume`, label: s1 + ' Vol.', format: (v) => v ? v.toFixed(0) : 'N/A' },
            { key: s2, label: s2 + ' Price', format: (v) => v ? v.toFixed(2) : 'N/A' },
            { key: `${s2}_volume`, label: s2 + ' Vol.', format: (v) => v ? v.toFixed(0) : 'N/A' },
            { key: 'spread', label: 'Spread', format: (v) => v ? v.toFixed(4) : 'N/A' },
            { key: 'zscore', label: 'Z-Score', format: (v) => v ? v.toFixed(2) : 'N/A' },
            { key: 'rolling_corr', label: 'Corr.', format: (v) => v ? v.toFixed(4) : 'N/A' },
        ];

        return (
            <div style={{ marginBottom: '30px', backgroundColor: '#1e1e1e', padding: '15px', borderRadius: '5px' }}>
                <h2 style={{ color: '#fff', marginTop: 0 }}>📊 Time-Series Analytics Table (Last {rowsToShow} Points)</h2>
                <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', color: '#fff', fontSize: '0.85em' }}>
                        <thead>
                            <tr style={{ backgroundColor: '#2a2a2a' }}>
                                {columns.map(col => (
                                    <th key={col.key} style={{ padding: '8px', borderBottom: '1px solid #333', textAlign: 'left', position: 'sticky', top: 0, backgroundColor: '#2a2a2a' }}>{col.label}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {lastDataPoints.map((row, index) => (
                                <tr key={index} style={{ borderBottom: '1px solid #222' }}>
                                    {columns.map(col => (
                                        <td key={col.key} style={{ padding: '8px' }}>
                                            {col.format(row[col.key])}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    // --- Render UI ---
    return (
        <div style={{ padding: '20px', backgroundColor: '#121212', color: '#ffffff', minHeight: '100vh', fontFamily: 'Arial, sans-serif' }}>
            <h1 style={{color: '#61dafb'}}>📈 Quant Developer Real-Time Analytics Dashboard</h1>

            {error && <div style={{ color: 'red', padding: '10px', border: '1px solid red', marginBottom: '20px' }}>Error: {error}</div>}

            <div style={{ display: 'flex', gap: '20px', marginBottom: '30px', backgroundColor: '#1e1e1e', padding: '15px', borderRadius: '5px', flexWrap: 'wrap' }}>

                {/* --- Controls --- */}
                <label style={{ color: '#aaa' }}>Symbol 1:
                    <select value={s1} onChange={e => setS1(e.target.value)} style={{ marginLeft: '10px', padding: '5px', backgroundColor: '#333', color: 'white', border: '1px solid #444' }}>
                        {symbols.map(sym => <option key={sym} value={sym}>{sym}</option>)}
                    </select>
                </label>
                <label style={{ color: '#aaa' }}>Symbol 2:
                    <select value={s2} onChange={e => setS2(e.target.value)} style={{ marginLeft: '10px', padding: '5px', backgroundColor: '#333', color: 'white', border: '1px solid #444' }}>
                        {symbols.map(sym => <option key={sym} value={sym}>{sym}</option>)}
                    </select>
                </label>
                <label style={{ color: '#aaa' }}>Timeframe:
                    <select value={timeframe} onChange={e => setTimeframe(e.target.value)} style={{ marginLeft: '10px', padding: '5px', backgroundColor: '#333', color: 'white', border: '1px solid #444' }}>
                            <option value="1S">1S</option>
                            <option value="1T">1T (1 minute)</option>
                            <option value="5T">5T (5 minutes)</option>
                    </select>
                </label>
                <label style={{ color: '#aaa' }}>Rolling Window:
                    <input type="number" value={rollingWindowValue} onChange={e => setRollingWindowValue(Number(e.target.value))} min="3" max="200" style={{ marginLeft: '10px', padding: '5px', backgroundColor: '#333', color: 'white', width: '60px', border: '1px solid #444' }} />
                </label>

                {/* NEW CONTROL: Regression Type */}
                <label style={{ color: '#aaa' }}>Regression Type:
                    <select value={regressionType} onChange={e => setRegressionType(e.target.value)} style={{ marginLeft: '10px', padding: '5px', backgroundColor: '#333', color: 'white', border: '1px solid #444' }}>
                        <option value="OLS_I">OLS (With Intercept)</option>
                        <option value="OLS_NOI">OLS (No Intercept/Ratio)</option>
                    </select>
                </label>
                <label style={{ color: '#aaa' }}>Refresh (sec):
                    <input type="number" value={refreshRate} onChange={e => setRefreshRate(Number(e.target.value))} min="2" max="30" style={{ marginLeft: '10px', padding: '5px', backgroundColor: '#333', color: 'white', width: '60px', border: '1px solid #444' }} />
                </label>

                {/* OHLC Upload and Export Buttons */}
                <label style={{ color: '#fff', cursor: 'pointer', padding: '5px 10px', backgroundColor: '#007bff', borderRadius: '4px' }}>
                    Upload OHLC CSV
                    <input type="file" onChange={handleUploadOHLC} style={{ display: 'none' }} accept=".csv" disabled={loading} />
                </label>
                <button onClick={handleExportData} disabled={!data || data.length === 0}
                    style={{ padding: '5px 10px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                    Download Analytics CSV
                </button>
            </div>

            {/* --- Metrics --- */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '30px', backgroundColor: '#1e1e1e', padding: '15px', borderRadius: '5px', flexWrap: 'wrap' }}>
                <Metric label="Latest Spread" value={metrics.latest_spread} />
                <Metric
                    label="Latest Z-Score"
                    value={
                        typeof metrics.z_latest === 'number' && !isNaN(metrics.z_latest)
                            ? metrics.z_latest.toFixed(2)
                            : 'N/A'
                    }
                />
                <Metric
                    label={`Hedge Ratio (${regressionType.replace('_I', '+I').replace('_NOI', '')})`}
                    value={metrics.hedge_ratio}
                    subtext={`Based on ${metrics.hedge_points || 0} samples`}
                />

                {/* ADF Status display and Trigger button */}
                <div style={{ flex: 1, minWidth: '150px' }}>
                    <h3 style={{ margin: '0 0 5px 0', color: '#61dafb' }}>ADF p-value</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <p style={{ fontSize: '1.5em', fontWeight: 'bold', margin: 0 }}>{adfStatus}</p>
                        <button onClick={() => setRunADFNow(true)} disabled={loading || metrics.data_points < 10}
                            style={{ padding: '5px 10px', backgroundColor: '#8a2be2', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', opacity: (loading || metrics.data_points < 10) ? 0.5 : 1 }}>
                            Run Test
                        </button>
                    </div>
                    <p style={{ margin: 0, color: '#aaa', fontSize: '0.8em' }}>{`On ${metrics.data_points || 0} samples (min 10 required)`}</p>
                </div>

                {/* Signal Threshold Widget */}
                <div style={{ flex: 1, minWidth: '200px' }}>
                    <h3 style={{ margin: '0 0 5px 0', color: '#ffc107' }}>Signal Threshold</h3>
                    <input type="range" min="0.5" max="5.0" step="0.1" value={zAlert} onChange={e => setZAlert(Number(e.target.value))} style={{ width: '100%', accentColor: '#ffc107' }} />
                    <p style={{ margin: 0, color: '#aaa' }}>Z-score alert threshold: *{zAlert.toFixed(1)}*</p>
                </div>
            </div>

            {/* --- Signals --- */}
            <div style={{ marginBottom: '30px', padding: '15px', borderRadius: '5px', border: '1px solid #333' }}>
                <h2 style={{ marginTop: 0 }}>🧭 Mean-Reversion Trading Signal</h2>
                {renderSignal()}
            </div>

            {/* --- NEW: Data Table --- */}
            {renderDataTable()}

            {/* --- Charts --- */}
            {loading ? (
                    <div style={{ color: '#4d94ff', textAlign: 'center', padding: '50px' }}>Loading data...</div>
            ) : data && data.length > 0 ? (
                <>
                    <h2 style={{ color: '#fff' }}>💹 Price Comparison</h2>
                    <Plot
                        data={[
                            { x: data.map(d => d.timestamp), y: data.map(d => d[s1]), name: s1, type: 'scatter', mode: 'lines', line: { color: '#4d94ff' } },
                            { x: data.map(d => d.timestamp), y: data.map(d => d[s2]), name: s2, type: 'scatter', mode: 'lines', line: { color: '#ffc107' } }
                        ]}
                        layout={getChartLayout("Price Chart", "Price")}
                        useResizeHandler={true}
                        style={{ width: '100%', marginBottom: '20px' }}
                    />

                    {/* --- NEW: Volume Chart --- */}
                    <h2 style={{ color: '#fff' }}>📦 Resampled Volume (Qty)</h2>
                    <Plot
                        data={[
                            { x: data.map(d => d.timestamp), y: data.map(d => d[`${s1}_volume`]), name: `${s1} Volume`, type: 'bar', marker: { color: '#00bcd4' } },
                            { x: data.map(d => d.timestamp), y: data.map(d => d[`${s2}_volume`]), name: `${s2} Volume`, type: 'bar', marker: { color: '#ffeb3b', opacity: 0.6 } }
                        ]}
                        layout={getChartLayout("Resampled Volume", "Volume (Qty)")}
                        useResizeHandler={true}
                        style={{ width: '100%', marginBottom: '20px' }}
                    />

                    <h2 style={{ color: '#fff' }}>📊 Spread and Z-Score</h2>
                    <Plot
                        data={[
                            { x: data.map(d => d.timestamp), y: data.map(d => d.spread), name: "Spread", type: 'scatter', mode: 'lines', line: { color: '#4dff4d' } },
                            { x: data.map(d => d.timestamp), y: data.map(d => d.mean), name: "Rolling Mean", type: 'scatter', mode: 'lines', line: { color: '#ff4d4d', dash: 'dash' } }
                        ]}
                        layout={getChartLayout("Spread", "Price Difference")}
                        useResizeHandler={true}
                        style={{ width: '100%', marginBottom: '20px' }}
                    />

                    <Plot
                        data={[
                            { x: data.map(d => d.timestamp), y: data.map(d => d.zscore), name: "Z-Score", type: 'scatter', mode: 'lines', line: { color: '#61dafb' } },
                            // Add Threshold Lines
                            { x: data.map(d => d.timestamp), y: data.map(() => zAlert), name: `+${zAlert} Alert`, type: 'scatter', mode: 'lines', line: { color: 'red', dash: 'dot', width: 1.5 } },
                            { x: data.map(d => d.timestamp), y: data.map(() => -zAlert), name: `-${zAlert} Alert`, type: 'scatter', mode: 'lines', line: { color: 'green', dash: 'dot', width: 1.5 } },
                        ]}
                        layout={getChartLayout("Z-Score", "Std. Deviations")}
                        useResizeHandler={true}
                        style={{ width: '100%', marginBottom: '20px' }}
                    />

                    <h2 style={{ color: '#fff' }}>📈 Rolling Correlation</h2>
                    <Plot
                        data={[
                            { x: data.map(d => d.timestamp), y: data.map(d => d.rolling_corr), name: "Correlation", type: 'scatter', mode: 'lines', line: { color: '#f06292' } }
                        ]}
                        layout={getChartLayout("Rolling Correlation", "Correlation (rho)")}
                        useResizeHandler={true}
                        style={{ width: '100%', marginBottom: '20px' }}
                    />

                </>
            ) : (
                !error && <div style={{ color: '#ffa500', textAlign: 'center', padding: '50px' }}>Waiting for enough data points to plot charts...</div>
            )}
        </div>
    );
};

export default App;