import asyncio
import websockets
import json
import sqlite3
from datetime import datetime
import time  # Added for reconnection delay


# DATABASE SETUP
def init_db():
    """Initializes the SQLite database and creates the 'ticks' table if it doesn't exist."""
    conn = sqlite3.connect("tick_data.db")
    c = conn.cursor()
    c.execute("""CREATE TABLE IF NOT EXISTS ticks (
                      symbol TEXT,
                      timestamp DATETIME,
                      price REAL,
                      qty REAL
                  )""")
    conn.commit()
    conn.close()


# INSERT FUNCTION
def insert_tick(symbol, timestamp, price, qty):
    """Inserts a single tick into the database."""
    conn = sqlite3.connect("tick_data.db")
    c = conn.cursor()
    c.execute("INSERT INTO ticks VALUES (?, ?, ?, ?)", (symbol, timestamp, price, qty))
    conn.commit()
    conn.close()


# BINANCE STREAM HANDLER
async def binance_websocket_handler():
    """
    Connects to the Binance combined trade stream and processes incoming data.
    """
    # Combined stream for BTCUSDT and ETHUSDT trades
    uri = "wss://stream.binance.com:9443/stream?streams=btcusdt@trade/ethusdt@trade"
    
    # Use context manager for safe connection
    async with websockets.connect(uri) as websocket:
        print("✅ Connected to Binance combined stream. Streaming data...")
        
        while True:
            # Receive message from the stream with a timeout
            try:
                msg = await asyncio.wait_for(websocket.recv(), timeout=30) 
            except asyncio.TimeoutError:
                # If no message after 30s, assume a problem and force a reconnect
                print("Stream timed out receiving data. Reconnecting...")
                break 

            data = json.loads(msg)
            
            # Extract data from the payload ('data' field)
            payload = data.get("data", {})
            
            # Check for actual trade data payload structure
            if 's' in payload and 'p' in payload and 'T' in payload:
                symbol = payload.get("s")
                price = float(payload.get("p", 0))
                qty = float(payload.get("q", 0))
                
                # Convert the millisecond timestamp (T) to a datetime object
                ts_ms = payload.get("T", 0)
                ts = datetime.utcfromtimestamp(ts_ms / 1000.0)
                
                # Insert the data into the SQLite database
                insert_tick(symbol, ts, price, qty)
                
                print(f"[{symbol}] {price} @ {ts}")

# MAIN EXECUTION (FIXED WITH AUTO-RECONNECT)
if __name__ == "__main__":
    init_db()
    RECONNECT_DELAY = 5  # Wait 5 seconds before trying again
    
    # Use a persistent loop to handle disconnections and the 1011 error
    while True:
        try:
            print(f"\nAttempting to connect to Binance WebSocket...")
            asyncio.run(binance_websocket_handler())
        
        except websockets.exceptions.ConnectionClosedOK:
            print("\n\n🔌 Connection closed normally. Restarting...")
        
        except Exception as e:
            # This catches the 1011 timeout, network errors, etc.
            print(f"\n\n🚨 Stream Error (will try again): {e}")
            print(f"🔄 Reconnecting in {RECONNECT_DELAY} seconds...")
            time.sleep(RECONNECT_DELAY)
        
        except KeyboardInterrupt:
            print("\n\n🛑 Stream stopped manually.")
            break