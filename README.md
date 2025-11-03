# 💰 Quant Developer Evaluation Assignment: Real-Time Pair Trading Analytics

## 1. Project Objective

The goal of this project is to implement a complete, end-to-end analytical stack capable of ingesting real-time tick data from the Binance WebSocket, persisting it, running core quantitative analytics (specifically for Pairs Trading), and visualizing the results through an interactive web dashboard.

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

### 4.2. Python Backend Dependencies
1. Activate Virtual Environment:
   # For Windows:
   .\venv\Scripts\activate
  # For macOS/Linux:
  source venv/bin/activate

2. Install Python Packages: The following command uses the dependency list in requirements.txt to install all required libraries.
   pip install -r requirements.txt


### 4.3. Node/React Frontend Dependencies
1. Navigate to Frontend Directory:
   cd quant-frontend
2. Install Node Modules:
   npm install
3. Return to Root Directory:
   cd ..


## 5. Execution (Single Command)
The application is bundled for single-command local execution using the master orchestrator script app.py.

 1. Ensure Python Virtual Environment is Active.

 2. Execute the Application:
    ```bash
    python app.py
    
    <img width="1484" height="362" alt="image" src="https://github.com/user-attachments/assets/fc67a7ea-63a4-4608-b4b7-02f68530e6de" />

    <img width="1919" height="905" alt="image" src="https://github.com/user-attachments/assets/4ea8b4f8-3a98-4dbb-84b1-5f4e1b8e83ca" />

## 6. Methodology & Technical Decisions
### 6.1. Design Philosophy
The architecture reflects modularity and extensibility.
  Loose Coupling: Components are clearly defined (Ingestion, Storage, Analytics, Visualization) and interact through clean interfaces (WebSockets, SQL, HTTP APIs).
  
  Extensibility: The design makes it straightforward to add new analytics or plug in a different data feed without breaking existing logic, avoiding major rework.


### 6.2. Quantitative Analytics Implementation
The core logic resides in the FastAPI endpoints:
<img width="960" height="484" alt="image" src="https://github.com/user-attachments/assets/527d144f-3894-44a1-8a98-09d6388ccd68" />


## 7. [SCREENSHOT 2: Dashboard Visualization] Please insert a screenshot here showing the final React dashboard visualization. This should include the key metrics (Spread, Z-Score, Hedge Ratio), the Z-score plot, and the analytical table to showcase the working end-to-end flow.
  <img width="1919" height="905" alt="image" src="https://github.com/user-attachments/assets/95bc3a78-c049-4da9-8e16-80312179e2d8" />
  <img width="1910" height="534" alt="image" src="https://github.com/user-attachments/assets/6aeaaa72-87ef-4a44-bcec-2c5d9effeea2" />
  <img width="1919" height="468" alt="image" src="https://github.com/user-attachments/assets/ce2941b8-3368-4967-b307-6e37dab2696c" />



  ## 7. Dashboard Screenshots

The screenshots below illustrate the key features and real-time outputs of the application, fulfilling the visualization requirement.

### 7.1. Key Metrics & Analytical Table

This image shows the core metrics panel (Spread, Z-Score, Hedge Ratio) and the real-time updating analytical table.

![Image 2A: Key Metrics and Analytical Table](<img width="1919" height="905" alt="Screenshot 2025-11-04 030322" src="https://github.com/user-attachments/assets/cb623ea6-d4f1-4078-ac3d-0b9c4a17e7e8" />
)

### 7.2. Spread Visualization

This chart displays the Spread (residual) time series and its Rolling Mean, the basis for the mean-reversion signal.

![Image 2B: Spread and Rolling Mean Plot](Screenshot 2025-11-04 030616.png)

### 7.3. Z-Score Visualization

This chart displays the normalized Z-Score against the critical mean-reversion signal thresholds (+2 and -2).

![Image 2C: Z-Score Plot with Thresholds](Screenshot 2025-11-04 030719.png)


## 8. ChatGPT/LLM Usage Transparency
In line with the assignment requirements, AI tools were used to enhance development speed and ensure robust system interaction.

<img width="868" height="377" alt="image" src="https://github.com/user-attachments/assets/dcce1075-413a-4f00-ad0f-9f9221f93fa3" />









