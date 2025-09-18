//+------------------------------------------------------------------+
//|                                                  TradeCopier.mq4 |
//|                                         Trade Copier Expert Advisor |
//|                                                                  |
//+------------------------------------------------------------------+
#property copyright "Trade Copier System"
#property version   "1.00"
#property strict

// External parameters
extern string API_ENDPOINT = "http://host.docker.internal:3000/api";
extern string ACCOUNT_ID = "";
extern string API_KEY = "";
extern int MONITOR_INTERVAL = 1000; // milliseconds
extern bool ENABLE_LOGGING = true;

// Global variables
datetime lastTradeCheck = 0;
int totalTrades = 0;
string logFile = "";

//+------------------------------------------------------------------+
//| Expert initialization function                                   |
//+------------------------------------------------------------------+
int OnInit()
{
    Print("TradeCopier EA starting...");
    
    // Initialize log file
    if(ENABLE_LOGGING)
    {
        logFile = "TradeCopier_" + IntegerToString(AccountNumber()) + "_" + 
                  TimeToString(TimeCurrent(), TIME_DATE) + ".log";
        LogMessage("EA initialized for account: " + IntegerToString(AccountNumber()));
    }
    
    // Validate parameters
    if(StringLen(ACCOUNT_ID) == 0)
    {
        Print("ERROR: ACCOUNT_ID parameter is required");
        return INIT_PARAMETERS_INCORRECT;
    }
    
    if(StringLen(API_KEY) == 0)
    {
        Print("ERROR: API_KEY parameter is required");
        return INIT_PARAMETERS_INCORRECT;
    }
    
    // Send initial account status
    SendAccountStatus();
    
    Print("TradeCopier EA initialized successfully");
    return INIT_SUCCEEDED;
}

//+------------------------------------------------------------------+
//| Expert deinitialization function                                 |
//+------------------------------------------------------------------+
void OnDeinit(const int reason)
{
    LogMessage("EA stopping. Reason: " + IntegerToString(reason));
    Print("TradeCopier EA stopped");
}

//+------------------------------------------------------------------+
//| Expert tick function                                              |
//+------------------------------------------------------------------+
void OnTick()
{
    // Check for new trades every second
    if(TimeCurrent() - lastTradeCheck >= MONITOR_INTERVAL / 1000)
    {
        CheckForTradeChanges();
        lastTradeCheck = TimeCurrent();
    }
}

//+------------------------------------------------------------------+
//| Check for trade changes                                          |
//+------------------------------------------------------------------+
void CheckForTradeChanges()
{
    int currentTrades = OrdersTotal() + OrdersHistoryTotal();
    
    // If trade count changed, scan all trades
    if(currentTrades != totalTrades)
    {
        ScanAllTrades();
        totalTrades = currentTrades;
    }
    
    // Send periodic account status update
    static datetime lastStatusUpdate = 0;
    if(TimeCurrent() - lastStatusUpdate >= 30) // Every 30 seconds
    {
        SendAccountStatus();
        lastStatusUpdate = TimeCurrent();
    }
}

//+------------------------------------------------------------------+
//| Scan all trades and send updates                                 |
//+------------------------------------------------------------------+
void ScanAllTrades()
{
    // Scan open orders
    for(int i = 0; i < OrdersTotal(); i++)
    {
        if(OrderSelect(i, SELECT_BY_POS, MODE_TRADES))
        {
            SendTradeUpdate(OrderTicket(), "open");
        }
    }
    
    // Scan closed orders (history)
    for(int i = 0; i < OrdersHistoryTotal(); i++)
    {
        if(OrderSelect(i, SELECT_BY_POS, MODE_HISTORY))
        {
            SendTradeUpdate(OrderTicket(), "closed");
        }
    }
}

//+------------------------------------------------------------------+
//| Send trade update to API                                         |
//+------------------------------------------------------------------+
void SendTradeUpdate(int ticket, string status)
{
    if(!OrderSelect(ticket, SELECT_BY_TICKET))
    {
        LogMessage("ERROR: Could not select order " + IntegerToString(ticket));
        return;
    }
    
    // Prepare trade data
    string tradeData = "{";
    tradeData += "\"account_id\":\"" + ACCOUNT_ID + "\",";
    tradeData += "\"ticket\":" + IntegerToString(OrderTicket()) + ",";
    tradeData += "\"symbol\":\"" + OrderSymbol() + "\",";
    tradeData += "\"trade_type\":\"" + GetTradeTypeString(OrderType()) + "\",";
    tradeData += "\"lot_size\":" + DoubleToString(OrderLots(), 2) + ",";
    tradeData += "\"open_price\":" + DoubleToString(OrderOpenPrice(), 5) + ",";
    tradeData += "\"close_price\":" + DoubleToString(OrderClosePrice(), 5) + ",";
    tradeData += "\"stop_loss\":" + DoubleToString(OrderStopLoss(), 5) + ",";
    tradeData += "\"take_profit\":" + DoubleToString(OrderTakeProfit(), 5) + ",";
    tradeData += "\"commission\":" + DoubleToString(OrderCommission(), 2) + ",";
    tradeData += "\"swap\":" + DoubleToString(OrderSwap(), 2) + ",";
    tradeData += "\"profit\":" + DoubleToString(OrderProfit(), 2) + ",";
    tradeData += "\"magic_number\":" + IntegerToString(OrderMagicNumber()) + ",";
    tradeData += "\"comment\":\"" + OrderComment() + "\",";
    tradeData += "\"open_time\":\"" + TimeToString(OrderOpenTime(), TIME_DATE|TIME_SECONDS) + "\",";
    
    if(status == "closed")
    {
        tradeData += "\"close_time\":\"" + TimeToString(OrderCloseTime(), TIME_DATE|TIME_SECONDS) + "\",";
    }
    else
    {
        tradeData += "\"close_time\":null,";
    }
    
    tradeData += "\"status\":\"" + status + "\"";
    tradeData += "}";
    
    // Send to API
    string url = API_ENDPOINT + "/trades";
    string headers = "Content-Type: application/json\r\nAuthorization: Bearer " + API_KEY + "\r\n";
    
    // Use WebRequest to send data (requires URL to be added to allowed URLs in MT4)
    char postData[];
    StringToCharArray(tradeData, postData, 0, StringLen(tradeData));
    
    char result[];
    string resultHeaders;
    
    int res = WebRequest("POST", url, headers, 5000, postData, result, resultHeaders);
    
    if(res == -1)
    {
        LogMessage("ERROR: WebRequest failed for ticket " + IntegerToString(ticket) + 
                  ". Error: " + IntegerToString(GetLastError()));
    }
    else
    {
        LogMessage("Trade update sent for ticket " + IntegerToString(ticket) + 
                  " (" + status + ") - Response: " + IntegerToString(res));
    }
}

//+------------------------------------------------------------------+
//| Send account status update                                       |
//+------------------------------------------------------------------+
void SendAccountStatus()
{
    string accountData = "{";
    accountData += "\"account_id\":\"" + ACCOUNT_ID + "\",";
    accountData += "\"balance\":" + DoubleToString(AccountBalance(), 2) + ",";
    accountData += "\"equity\":" + DoubleToString(AccountEquity(), 2) + ",";
    accountData += "\"margin\":" + DoubleToString(AccountMargin(), 2) + ",";
    accountData += "\"free_margin\":" + DoubleToString(AccountFreeMargin(), 2) + ",";
    accountData += "\"server\":\"" + AccountServer() + "\",";
    accountData += "\"company\":\"" + AccountCompany() + "\",";
    accountData += "\"currency\":\"" + AccountCurrency() + "\",";
    accountData += "\"leverage\":" + IntegerToString(AccountLeverage()) + ",";
    accountData += "\"timestamp\":\"" + TimeToString(TimeCurrent(), TIME_DATE|TIME_SECONDS) + "\"";
    accountData += "}";
    
    string url = API_ENDPOINT + "/accounts/status";
    string headers = "Content-Type: application/json\r\nAuthorization: Bearer " + API_KEY + "\r\n";
    
    char postData[];
    StringToCharArray(accountData, postData, 0, StringLen(accountData));
    
    char result[];
    string resultHeaders;
    
    int res = WebRequest("POST", url, headers, 5000, postData, result, resultHeaders);
    
    if(res == -1)
    {
        LogMessage("ERROR: Account status update failed. Error: " + IntegerToString(GetLastError()));
    }
}

//+------------------------------------------------------------------+
//| Get trade type string                                            |
//+------------------------------------------------------------------+
string GetTradeTypeString(int orderType)
{
    switch(orderType)
    {
        case OP_BUY: return "BUY";
        case OP_SELL: return "SELL";
        case OP_BUYLIMIT: return "BUY_LIMIT";
        case OP_SELLLIMIT: return "SELL_LIMIT";
        case OP_BUYSTOP: return "BUY_STOP";
        case OP_SELLSTOP: return "SELL_STOP";
        default: return "UNKNOWN";
    }
}

//+------------------------------------------------------------------+
//| Log message to file                                              |
//+------------------------------------------------------------------+
void LogMessage(string message)
{
    if(!ENABLE_LOGGING) return;
    
    string timestamp = TimeToString(TimeCurrent(), TIME_DATE|TIME_SECONDS);
    string logEntry = timestamp + " - " + message;
    
    Print(logEntry);
    
    // Write to log file
    int handle = FileOpen(logFile, FILE_WRITE|FILE_TXT|FILE_SHARE_READ, ';');
    if(handle != INVALID_HANDLE)
    {
        FileSeek(handle, 0, SEEK_END);
        FileWrite(handle, logEntry);
        FileClose(handle);
    }
}

//+------------------------------------------------------------------+
//| Handle incoming copy signals                                     |
//+------------------------------------------------------------------+
bool ExecuteCopyTrade(string tradeData)
{
    // Parse incoming trade data and execute
    // This would be called by the Python monitor script
    
    LogMessage("Executing copy trade: " + tradeData);
    
    // Parse JSON data (simplified - would use proper JSON parser)
    // Extract: symbol, trade_type, lot_size, price, sl, tp, etc.
    
    // Execute trade using OrderSend()
    // Return success/failure
    
    return true;
}

//+------------------------------------------------------------------+

