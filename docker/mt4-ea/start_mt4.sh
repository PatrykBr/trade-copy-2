#!/bin/bash

# MT4 Startup Script
set -e

echo "Starting MT4 Terminal..."

# Set display for X11
export DISPLAY=:99

# Wait for Xvfb to start
sleep 5

# Wine configuration
export WINEARCH=win32
export WINEPREFIX=/root/.wine

# Create MT4 data directory if it doesn't exist
mkdir -p /app/mt4/MQL4/Experts
mkdir -p /app/mt4/MQL4/Include
mkdir -p /app/mt4/MQL4/Libraries
mkdir -p /app/logs
mkdir -p /app/data

# Copy EA files if they don't exist
if [ ! -f "/app/mt4/MQL4/Experts/TradeCopier.ex4" ]; then
    echo "Compiling TradeCopier EA..."
    # In a real setup, you would compile the .mq4 file to .ex4
    # For now, assume the .ex4 file is provided
    cp /app/mt4/TradeCopier.ex4 /app/mt4/MQL4/Experts/ 2>/dev/null || echo "TradeCopier.ex4 not found"
fi

# Download MT4 terminal if not present
if [ ! -f "/app/mt4/terminal.exe" ]; then
    echo "MT4 terminal not found. In production, this would download from the broker."
    echo "Creating placeholder..."
    touch /app/mt4/terminal.exe
fi

# Create MT4 configuration file
cat > /app/mt4/config/terminal.ini << EOF
[Common]
Login=${MT4_LOGIN}
Password=${MT4_PASSWORD}
Server=${MT4_SERVER}

[Expert]
AllowLiveTrading=true
AllowDllImports=true
AllowImports=true
AllowWebRequest=true

[WebRequest]
AllowedURL=http://host.docker.internal:3000
AllowedURL=https://api.tradecopy.system
EOF

# Create EA configuration
cat > /app/mt4/MQL4/Experts/TradeCopier.set << EOF
API_ENDPOINT=http://host.docker.internal:3000/api
ACCOUNT_ID=${ACCOUNT_ID}
API_KEY=${API_KEY}
MONITOR_INTERVAL=1000
ENABLE_LOGGING=true
EOF

echo "Configuration files created"

# In a real implementation, this would start the actual MT4 terminal
# For now, we'll simulate it with a simple loop
echo "Simulating MT4 terminal startup..."

# Create a simple trade simulator for testing
python3 -c "
import json
import time
import random
import os

account_id = os.getenv('ACCOUNT_ID', 'unknown')
trades_file = f'/app/data/trades_{account_id}.json'

# Simulate some trades
trades = []
for i in range(3):
    trade = {
        'ticket': 1000000 + i,
        'symbol': random.choice(['EURUSD', 'GBPUSD', 'USDJPY']),
        'trade_type': random.choice(['BUY', 'SELL']),
        'lot_size': round(random.uniform(0.01, 1.0), 2),
        'open_price': round(random.uniform(1.0, 2.0), 5),
        'stop_loss': 0,
        'take_profit': 0,
        'commission': round(random.uniform(-10, -1), 2),
        'swap': 0,
        'profit': round(random.uniform(-50, 100), 2),
        'magic_number': 0,
        'comment': 'Simulated trade',
        'open_time': time.strftime('%Y-%m-%d %H:%M:%S'),
        'close_time': None
    }
    trades.append(trade)

with open(trades_file, 'w') as f:
    json.dump(trades, f, indent=2)

print(f'Created {len(trades)} simulated trades in {trades_file}')
"

# Keep the script running (in real MT4, this would be the terminal process)
echo "MT4 terminal simulation started. Keeping process alive..."

# Monitor for configuration changes and restart if needed
while true; do
    sleep 60
    echo "MT4 heartbeat: $(date)"
    
    # Check if we need to restart (configuration changes, etc.)
    if [ -f "/app/restart_mt4" ]; then
        echo "Restart requested, stopping MT4..."
        rm -f "/app/restart_mt4"
        exit 0
    fi
done

