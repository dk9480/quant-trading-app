# 💰 Quant Developer Evaluation Assignment: Real-Time Pair Trading Analytics

## 1. Project Objective

The goal of this project is to implement a complete, end-to-end analytical stack capable of ingesting real-time tick data from th   e Binance WebSocket, persisting it, running core quantitative analytics (specifically for Pairs Trading), and visualizing the results through an interactive web dashboard.

This application is built with **extensibility** and **modularity** as primary design principles, serving as a prototype for a larger, real-time analytics system.

---

## 2. System Architecture & Components

The application follows a modular, decoupled architecture, split into three main services orchestrated by the master script `app.py`.

| Component | Technology | Role |
| :--- | :--- | :--- |
| **Data Streamer** (`binance_stream.py`) | Python, `websockets` | Connects to the Binance WebSocket, ingests raw tick data, and performs high-frequency writes to the SQLite database. |
| **Analytics API** (`api.py`) | Python, **FastAPI**, `pandas`, `statsmodels` | Provides high-performance endpoints for fetching data, resampling, and calculating pairs trading metrics (OLS, Spread, Z-score, ADF Test). |
| **Frontend Dashboard** (`quant-frontend/`) | **React** | An interactive web application for user input, displaying price charts, the spread time series, Z-score, and the final analytical table. |

---

## 3. Architecture Diagram 

The architecture is visualized below, showing the three services, the central storage, and the control flow managed by the Orchestrator.



<img width="1405" height="926" alt="Architecture_Diagram drawio" src="https://github.com/user-attachments/assets/dd990a37-9e6c-4e08-83f1-ab3617dfc166" />



**(Note to Reviewer: The full-resolution image (`Architecture_Diagram.png`) and the editable source file (`Architecture_Diagram.drawio`) are included in the root directory, as required.)**

---

## 4. Setup and Installation

This project requires Python 3.9+ and Node.js/npm.

### 4.1. Prerequisites

1. **Clone the Repository:** (Assumed complete)

2. **Navigate to the Root Directory:**

   ```bash
   cd D:\Project\quant-trading-app

### 4.2. Python Backend Dependencies
1. **Activate Virtual Environment:**
   # For Windows:
         .\venv\Scripts\activate
   # For macOS/Linux:
         source venv/bin/activate

2. **Install Python Packages: The following command uses the dependency list in requirements.txt to install all required libraries.**
   ```bash
   pip install -r requirements.txt

### 4.3. Node/React Frontend Dependencies
1. **Navigate to Frontend Directory:**
   ```bash
   cd quant-frontend

2. **Install Node Modules:**
   ```bash
   npm install

3. **Return to Root Directory:**
   ```bash
   cd ..

---

## 5. Execution (Single Command)
The application is bundled for **single-command local execution** using the master orchestrator script app.py.
1. **Ensure Python Virtual Environment is Active.**
2. **Execute the Application:**
   ```bash
   python app.py

   ### 4. Checkout Confirmation

Clearly demonstrating that the Streamer, FastAPI, and React services have all started successfully and data is being received.
[**Image 1: Terminal Output** - *<img width="1484" height="362" alt="Screenshot 2025-11-04 025925" src="https://github.com/user-attachments/assets/4e8c3c67-8479-4b1b-b102-e2834a6b57d8" />
*]

3. **Access the Dashboard: Open your web browser to the React frontend (usually http://localhost:3000).**
4. **Shutdown: Press Ctrl+C in the terminal running app.py for a clean, simultaneous shutdown of all three services.**

---

## 6. Methodology & Technical Decisions
   6.1. Design Philosophy
   **The architecture reflects modularity and extensibility.**
   
   -- Loose Coupling: Components are clearly defined (Ingestion, Storage, Analytics, Visualization) and interact through clean interfaces (WebSockets, SQL, HTTP APIs).
      
   -- Extensibility: The design makes it straightforward to add new analytics or plug in a different data feed without breaking existing logic, avoiding major rework.

### 6.2. Quantitative Analytics Implementation
**The core logic resides in the FastAPI endpoints:**
| Metric | Calculation | Implementation Detail |
| :--- | :--- | :--- |
| **Hedge Ratio ($\beta$)**  | OLS regression on log prices: $\log(\text{S2}) = \alpha + \beta \cdot \log(\text{S1}) + \epsilon$ | Calculated using statsmodels.api over a user-defined rolling window on resampled data.|
| **Spread**  | **Deviation from equilibrium: $\text{Spread} = \log(\text{S2}) - (\beta \cdot \log(\text{S1}) + \alpha)$**,  | Computed at the API layer after OLS is run. |
| **Z-Score**  | **Normalizes the spread: $\text{Z-Score} = \frac{\text{Spread} - \text{Rolling Mean}(\text{Spread})}{\text{Rolling Std Dev}(\text{Spread})}$** | Used for mean-reversion signal generation. Can be updated live. |
| **Data I/O**  | **Import/Export** | Functionality included to upload OHLC data and provide download options for processed data and analytics outputs. |


## 7. Dashboard Screenshots

### 7.1. Main Dashboard View (Metrics and Table)

This screenshot shows the application's configuration settings, the real-time calculated metrics (Spread, Z-Score, Hedge Ratio), the trading signal status, and the raw time-series analytics table for data verification.

[**Image 2A: Main Dashboard View** - *<img width="1280" height="645" alt="image" src="https://github.com/user-attachments/assets/359d6099-6876-4d48-b962-65850ba6c771" />
*]



This screenshot shows the application's **configuration settings** (Symbols: BTCUSDT/ETHUSDT, **Timeframe: 1S**), the real-time calculated metrics (Spread: 103027.5700, Z-Score: -1.12, Hedge Ratio: -10.8714), the current trading signal status, and the raw time-series analytics table for data verification.

[**Image 2A: Main Dashboard View** - *<<img width="1885" height="971" alt="image" src="https://github.com/user-attachments/assets/b1c13ebc-502f-48ca-b654-3e0ba965b0a3" />*]



### 7.2. Spread Visualization

This chart displays the Spread (residual) time series and its Rolling Mean, the basis for the mean-reversion signal.

[**Image 2B: Spread and Rolling Mean Plot** - *<img width="1900" height="437" alt="image" src="https://github.com/user-attachments/assets/4f3263d0-1fff-4742-a1de-dad96d0c1fbe" />
*]

### 7.3. Z-Score Visualization

This chart displays the normalized Z-Score against the critical mean-reversion signal thresholds (+2 and -2).

[**Image 2C: Z-Score Plot with Thresholds** - *<img width="1883" height="456" alt="image" src="https://github.com/user-attachments/assets/ce20f9db-a2b3-4e44-b9f1-3297f1fad788" />
*]

### 7.4. Resampled Volume

This bar chart shows the resampled volume data used for the analytics pipeline, demonstrating successful aggregation from the raw tick data.

[**Image 2D: Resampled Volume Plot** - <<img width="1863" height="510" alt="image" src="https://github.com/user-attachments/assets/1bf82aeb-1f92-4a36-a484-ddbd3a119135" />*]




## 8. ChatGPT/LLM Usage Transparency

In line with the assignment requirements, AI tools were used to enhance development speed and ensure robust system interaction.

| Component | Task | Prompt Example |
| :--- | :--- | :--- |
| **`app.py` Script** | Orchestrating single-command execution and Windows/Unix process handling. | "How to start three python and one npm process with subprocess.Popen in python and ensure clean shutdown using Ctrl+C on both Windows and Linux?" |
| **Debugging** | Troubleshooting the Windows-specific `os.setsid` error in `app.py`. | "Python subprocess Popen setsid error on Windows what is the equivalent flag for clean process group termination?" |
| **Code Structure** | Generating templates for standard FastAPI boilerplate, API response schemas (Pydantic models), and React component structure. | "Write a FastAPI endpoint that connects to a SQLite database and returns a Pandas DataFrame for two symbols filtered by a timeframe parameter." |

This usage was limited to assisting with boilerplate and infrastructure code; the core quantitative logic, architectural design, and ultimate project decisions were implemented and verified manually.

