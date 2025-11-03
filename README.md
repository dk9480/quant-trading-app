# 💰 Quant Developer Evaluation Assignment: Real-Time Pair Trading Analytics

## 1. Project Objective

The goal of this project is to implement a complete, end-to-end analytical stack capable of ingesting real-time tick data from the Binance WebSocket, persisting it, running core quantitative analytics (specifically for Pairs Trading), and visualizing the results through an interactive web dashboard.

This application is built with **extensibility** and **modularity** as primary design principles, serving as a prototype for a larger, real-time analytics system.

## 2. System Architecture & Components

The application follows a modular, decoupled architecture, split into three main services orchestrated by the master script `app.py`.

| Component | Technology | Role | 
 | ----- | ----- | ----- | 
| **Data Streamer** (`binance_stream.py`) | Python, `websockets` | Connects to the Binance WebSocket, ingests raw tick data, and performs high-frequency writes to the SQLite database. | 
| **Analytics API** (`api.py`) | Python, **FastAPI**, `pandas`, `statsmodels` | Provides high-performance endpoints for fetching data, resampling, and calculating pairs trading metrics (OLS, Spread, Z-score, ADF Test). | 
| **Frontend Dashboard** (`quant-frontend/`) | **React** | An interactive web application for user input, displaying price charts, the spread time series, Z-score, and the final analytical table. | 

---

## 3. Architecture Diagram (Mandatory Deliverable)

The architecture is visualized below, showing the three services, the central storage, and the control flow managed by the Orchestrator.



[Image of Architecture Diagram]


**(Note to Reviewer: The full-resolution image (`Architecture_Diagram.png`) and the editable source file (`Architecture_Diagram.drawio`) are included in the root directory, as required.)**

---

## 4. Setup and Installation

This project requires Python 3.9+ and Node.js/npm.

### 4.1. Prerequisites

1. **Clone the Repository:** (Assumed complete)

2. **Navigate to the Root Directory:**

   ```bash
   cd D:\Project\quant-trading-app


   4.2. Python Backend Dependencies
1. Activate Virtual Environment:
    # For Windows:
    .\venv\Scripts\activate
    # For macOS/Linux:
    source venv/bin/activate

2. Install Python Packages: The following command uses the dependency list in requirements.txt to install all required libraries.
    pip install -r requirements.txt

    4.3. Node/React Frontend Dependencies
    1. Navigate to Frontend Directory:
        cd quant-frontend

   2. Install Node Modules:
       npm install

   3. Return to Root Directory:
       cd ..

   5. Execution (Single Command)
      The application is bundled for single-command local execution using the master orchestrator script app.py.

      1. Ensure Python Virtual Environment is Active.

      2. Execute the Application:
          python app.py

      $$SCREENSHOT 1: Terminal Output$$

      3. Access the Dashboard: Open your web browser to the React frontend (usually http://localhost:3000).
      4. Shutdown: Press Ctrl+C in the terminal running app.py for a clean, simultaneous shutdown of all three services.


      6. Methodology & Technical Decisions
6.1. Design Philosophy
The architecture reflects modularity and extensibility.

Loose Coupling: Components are clearly defined (Ingestion, Storage, Analytics, Visualization) and interact through clean interfaces (WebSockets, SQL, HTTP APIs).

Extensibility: The design makes it straightforward to add new analytics or plug in a different data feed without breaking existing logic, avoiding major rework.


6.2. Quantitative Analytics ImplementationThe core logic resides in the FastAPI endpoints:MetricCalculationImplementation DetailHedge Ratio ($\beta$)OLS regression on log prices: $\log(\text{S2}) = \alpha + \beta \cdot \log(\text{S1}) + \epsilon$Calculated using statsmodels.api over a user-defined rolling window on resampled data.SpreadDeviation from equilibrium: $\text{Spread} = \log(\text{S2}) - (\beta \cdot \log(\text{S1}) + \alpha)$Computed at the API layer after OLS is run.Z-ScoreNormalizes the spread: $\text{Z-Score} = \frac{\text{Spread} - \text{Rolling Mean}(\text{Spread})}{\text{Rolling Std Dev}(\text{Spread})}$Used for mean-reversion signal generation. Can be updated live.Data I/OImport/ExportFunctionality included to upload OHLC data and provide download options for processed data and analytics outputs.



Dashboard Screenshots$$SCREENSHOT 2: Dashboard Visualization$$Please insert a screenshot here showing the final React dashboard visualization. This should include the price chart, the Z-score plot, and ideally the final analytical table to showcase the working end-to-end flow.

8. ChatGPT/LLM Usage Transparency
In line with the assignment requirements, AI tools were used to enhance development speed and ensure robust system interaction.

Project Structure and Infrastructure: Used for generating boilerplate code for FastAPI and React, and creating the cross-platform graceful shutdown logic in app.py.

Debugging: Assisted in troubleshooting platform-specific process handling errors.

This usage was limited to assisting with boilerplate and infrastructure code; the core quantitative logic, architectural design, and ultimate project decisions were implemented and verified manually.




6.2. Quantitative Analytics Implementation

The core logic resides in the FastAPI endpoints:

Metric

Calculation

Implementation Detail

Hedge Ratio ($\beta$)

OLS regression on log prices: $\log(\text{S2}) = \alpha + \beta \cdot \log(\text{S1}) + \epsilon$

Calculated using statsmodels.api over a user-defined rolling window on resampled data.

Spread

Deviation from equilibrium: $\text{Spread} = \log(\text{S2}) - (\beta \cdot \log(\text{S1}) + \alpha)$

Computed at the API layer after OLS is run.

Z-Score

Normalizes the spread: $\text{Z-Score} = \frac{\text{Spread} - \text{Rolling Mean}(\text{Spread})}{\text{Rolling Std Dev}(\text{Spread})}$

Used for mean-reversion signal generation. Can be updated live.

Data I/O

Import/Export

Functionality included to upload OHLC data and provide download options for processed data and analytics outputs.
