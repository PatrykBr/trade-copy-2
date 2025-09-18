# MT4 Expert Advisor Container
FROM ubuntu:20.04

# Avoid interactive prompts during package installation
ENV DEBIAN_FRONTEND=noninteractive

# Install dependencies
RUN apt-get update && apt-get install -y \
    wine \
    winetricks \
    xvfb \
    curl \
    wget \
    unzip \
    python3 \
    python3-pip \
    supervisor \
    && rm -rf /var/lib/apt/lists/*

# Set up Wine environment
ENV WINEARCH=win32
ENV WINEPREFIX=/root/.wine
RUN winecfg

# Install Python dependencies for trade monitoring
RUN pip3 install websockets asyncio requests python-dotenv

# Create application directories
RUN mkdir -p /app/mt4 /app/logs /app/scripts /app/config

# Copy MT4 terminal (would be downloaded from broker)
# COPY mt4terminal.exe /app/mt4/

# Copy Expert Advisor
COPY TradeCopier.mq4 /app/mt4/MQL4/Experts/
COPY TradeCopier.ex4 /app/mt4/MQL4/Experts/

# Copy Python monitoring script
COPY trade_monitor.py /app/scripts/
COPY account_manager.py /app/scripts/

# Copy supervisor configuration
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Copy startup scripts
COPY start_mt4.sh /app/scripts/
COPY monitor_trades.sh /app/scripts/
RUN chmod +x /app/scripts/*.sh

# Expose ports for monitoring
EXPOSE 8080 8081

# Set working directory
WORKDIR /app

# Start supervisor to manage processes
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]

