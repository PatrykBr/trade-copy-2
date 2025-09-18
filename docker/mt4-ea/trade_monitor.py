#!/usr/bin/env python3
"""
Trade Monitor Service
Monitors MT4/MT5 accounts and handles trade copying operations
"""

import asyncio
import websockets
import json
import requests
import time
import os
import logging
from datetime import datetime
from typing import Dict, List, Optional

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('/app/logs/trade_monitor.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class TradeMonitor:
    def __init__(self):
        self.api_endpoint = os.getenv('API_ENDPOINT', 'http://host.docker.internal:3000/api')
        self.websocket_endpoint = os.getenv('WEBSOCKET_ENDPOINT', 'ws://host.docker.internal:3001')
        self.account_id = os.getenv('ACCOUNT_ID')
        self.api_key = os.getenv('API_KEY')
        self.platform = os.getenv('PLATFORM', 'MT4')
        self.role = os.getenv('ROLE', 'slave')  # master or slave
        
        self.websocket = None
        self.is_connected = False
        self.last_heartbeat = time.time()
        self.trade_cache = {}  # Cache of known trades
        
        if not self.account_id or not self.api_key:
            raise ValueError("ACCOUNT_ID and API_KEY environment variables are required")
    
    async def start(self):
        """Start the trade monitoring service"""
        logger.info(f"Starting Trade Monitor for account {self.account_id} ({self.role})")
        
        # Start WebSocket connection
        await self.connect_websocket()
        
        # Start monitoring tasks
        tasks = [
            self.websocket_handler(),
            self.heartbeat_task(),
            self.trade_sync_task(),
        ]
        
        if self.role == 'master':
            tasks.append(self.master_trade_monitor())
        else:
            tasks.append(self.slave_trade_executor())
        
        await asyncio.gather(*tasks)
    
    async def connect_websocket(self):
        """Connect to WebSocket server"""
        try:
            headers = {
                'Authorization': f'Bearer {self.api_key}'
            }
            
            self.websocket = await websockets.connect(
                self.websocket_endpoint,
                extra_headers=headers
            )
            
            self.is_connected = True
            logger.info("WebSocket connected successfully")
            
            # Subscribe to account updates
            await self.websocket.send(json.dumps({
                'type': 'subscribe',
                'channel': f'account:{self.account_id}'
            }))
            
        except Exception as e:
            logger.error(f"Failed to connect WebSocket: {e}")
            self.is_connected = False
    
    async def websocket_handler(self):
        """Handle incoming WebSocket messages"""
        while True:
            try:
                if not self.websocket:
                    await asyncio.sleep(5)
                    continue
                
                message = await self.websocket.recv()
                data = json.loads(message)
                
                await self.handle_websocket_message(data)
                
            except websockets.exceptions.ConnectionClosed:
                logger.warning("WebSocket connection closed, reconnecting...")
                self.is_connected = False
                await asyncio.sleep(5)
                await self.connect_websocket()
                
            except Exception as e:
                logger.error(f"WebSocket handler error: {e}")
                await asyncio.sleep(1)
    
    async def handle_websocket_message(self, data: dict):
        """Handle incoming WebSocket message"""
        message_type = data.get('type')
        
        if message_type == 'trade_signal' and self.role == 'slave':
            # Execute copy trade
            await self.execute_copy_trade(data.get('trade'))
            
        elif message_type == 'account_status':
            # Update account status
            logger.info(f"Account status update: {data}")
            
        elif message_type == 'system_alert':
            # Handle system alerts
            logger.warning(f"System alert: {data.get('message')}")
        
        elif message_type == 'ping':
            # Respond to ping
            await self.websocket.send(json.dumps({'type': 'pong'}))
    
    async def heartbeat_task(self):
        """Send periodic heartbeat to maintain connection"""
        while True:
            try:
                if self.is_connected and self.websocket:
                    await self.websocket.send(json.dumps({
                        'type': 'heartbeat',
                        'account_id': self.account_id,
                        'timestamp': time.time()
                    }))
                    
                    self.last_heartbeat = time.time()
                
                await asyncio.sleep(30)  # Heartbeat every 30 seconds
                
            except Exception as e:
                logger.error(f"Heartbeat error: {e}")
                await asyncio.sleep(30)
    
    async def trade_sync_task(self):
        """Sync trades with API server"""
        while True:
            try:
                # Get current trades from MT4/MT5
                current_trades = await self.get_current_trades()
                
                # Compare with cache and send updates
                for trade in current_trades:
                    trade_id = trade['ticket']
                    
                    if trade_id not in self.trade_cache:
                        # New trade
                        await self.send_trade_update(trade, 'new')
                        self.trade_cache[trade_id] = trade
                        
                    elif self.trade_cache[trade_id] != trade:
                        # Modified trade
                        await self.send_trade_update(trade, 'modified')
                        self.trade_cache[trade_id] = trade
                
                # Check for closed trades
                closed_trades = set(self.trade_cache.keys()) - set(t['ticket'] for t in current_trades)
                for trade_id in closed_trades:
                    await self.send_trade_update(self.trade_cache[trade_id], 'closed')
                    del self.trade_cache[trade_id]
                
                await asyncio.sleep(1)  # Check every second
                
            except Exception as e:
                logger.error(f"Trade sync error: {e}")
                await asyncio.sleep(5)
    
    async def get_current_trades(self) -> List[dict]:
        """Get current trades from MT4/MT5 terminal"""
        # This would interface with MT4/MT5 terminal
        # For now, simulate with file reading or DLL calls
        
        trades = []
        
        try:
            # Read from MT4 experts file or use DLL
            # This is a simplified simulation
            trades_file = f'/app/data/trades_{self.account_id}.json'
            
            if os.path.exists(trades_file):
                with open(trades_file, 'r') as f:
                    trades = json.load(f)
        
        except Exception as e:
            logger.error(f"Error reading trades: {e}")
        
        return trades
    
    async def send_trade_update(self, trade: dict, action: str):
        """Send trade update to API server"""
        try:
            url = f"{self.api_endpoint}/trades"
            headers = {
                'Content-Type': 'application/json',
                'Authorization': f'Bearer {self.api_key}'
            }
            
            trade_data = {
                'account_id': self.account_id,
                'ticket': trade['ticket'],
                'symbol': trade['symbol'],
                'trade_type': trade['trade_type'],
                'lot_size': trade['lot_size'],
                'open_price': trade.get('open_price'),
                'close_price': trade.get('close_price'),
                'stop_loss': trade.get('stop_loss'),
                'take_profit': trade.get('take_profit'),
                'commission': trade.get('commission', 0),
                'swap': trade.get('swap', 0),
                'profit': trade.get('profit', 0),
                'magic_number': trade.get('magic_number', 0),
                'comment': trade.get('comment', ''),
                'open_time': trade.get('open_time'),
                'close_time': trade.get('close_time'),
                'status': 'open' if action != 'closed' else 'closed',
            }
            
            response = requests.post(url, json=trade_data, headers=headers, timeout=10)
            
            if response.status_code == 200:
                logger.info(f"Trade update sent successfully: {trade['ticket']} ({action})")
            else:
                logger.error(f"Failed to send trade update: {response.status_code} - {response.text}")
                
        except Exception as e:
            logger.error(f"Error sending trade update: {e}")
    
    async def master_trade_monitor(self):
        """Monitor trades for master account"""
        logger.info("Starting master trade monitoring")
        
        while True:
            try:
                # Master accounts just monitor and report trades
                # The copying logic is handled by the API server
                await asyncio.sleep(1)
                
            except Exception as e:
                logger.error(f"Master monitor error: {e}")
                await asyncio.sleep(5)
    
    async def slave_trade_executor(self):
        """Execute copy trades for slave account"""
        logger.info("Starting slave trade executor")
        
        while True:
            try:
                # Listen for copy signals from WebSocket
                # Actual trade execution would be done via MT4/MT5 API
                await asyncio.sleep(1)
                
            except Exception as e:
                logger.error(f"Slave executor error: {e}")
                await asyncio.sleep(5)
    
    async def execute_copy_trade(self, trade_data: dict):
        """Execute a copy trade on slave account"""
        try:
            logger.info(f"Executing copy trade: {trade_data}")
            
            # This would interface with MT4/MT5 to place the actual trade
            # For now, simulate the execution
            
            success = await self.place_mt4_order(trade_data)
            
            if success:
                logger.info(f"Copy trade executed successfully: {trade_data['symbol']}")
                
                # Send execution confirmation
                await self.send_copy_confirmation(trade_data, True)
            else:
                logger.error(f"Failed to execute copy trade: {trade_data['symbol']}")
                await self.send_copy_confirmation(trade_data, False)
                
        except Exception as e:
            logger.error(f"Error executing copy trade: {e}")
            await self.send_copy_confirmation(trade_data, False, str(e))
    
    async def place_mt4_order(self, trade_data: dict) -> bool:
        """Place order in MT4/MT5 terminal"""
        # This would use MT4/MT5 API or DLL calls
        # For simulation, return True 95% of the time
        
        await asyncio.sleep(0.1)  # Simulate execution time
        return True  # Simulate successful execution
    
    async def send_copy_confirmation(self, trade_data: dict, success: bool, error: str = None):
        """Send copy execution confirmation to API"""
        try:
            url = f"{self.api_endpoint}/copy-engine/confirm"
            headers = {
                'Content-Type': 'application/json',
                'Authorization': f'Bearer {self.api_key}'
            }
            
            confirmation = {
                'account_id': self.account_id,
                'master_trade_data': trade_data,
                'success': success,
                'error': error,
                'timestamp': datetime.utcnow().isoformat()
            }
            
            response = requests.post(url, json=confirmation, headers=headers, timeout=10)
            
            if response.status_code != 200:
                logger.error(f"Failed to send copy confirmation: {response.status_code}")
                
        except Exception as e:
            logger.error(f"Error sending copy confirmation: {e}")

async def main():
    """Main entry point"""
    try:
        monitor = TradeMonitor()
        await monitor.start()
        
    except KeyboardInterrupt:
        logger.info("Trade monitor stopped by user")
    except Exception as e:
        logger.error(f"Trade monitor error: {e}")
        raise

if __name__ == "__main__":
    asyncio.run(main())

