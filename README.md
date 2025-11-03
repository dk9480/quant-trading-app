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

### 4.1. Python Backend Dependencies
1. **Activate Virtual Environment:**
   # For Windows:
         .\venv\Scripts\activate
   # For macOS/Linux:
         source venv/bin/activate

2. **Install Python Packages: The following command uses the dependency list in requirements.txt to install all required libraries.**
   ```bash
   pip install -r requirements.txt


