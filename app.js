// HWR Futures Pro v4.0 - Simplified with Win/Loss Tracking
// Single TP, EST Time, Win/Loss History

(function() {
    'use strict';

    // ==========================================
    // CONFIGURATION
    // ==========================================
    const CONFIG = {
        symbols: {
            indices: [
                { symbol: 'ES=F', name: 'ES', description: 'E-mini S&P 500', icon: '📈' },
                { symbol: 'NQ=F', name: 'NQ', description: 'E-mini NASDAQ', icon: '💹' },
                { symbol: 'RTY=F', name: 'RTY', description: 'E-mini Russell', icon: '📊' }
            ],
            metals: [
                { symbol: 'GC=F', name: 'GC', description: 'Gold', icon: '🥇' },
                { symbol: 'SI=F', name: 'SI', description: 'Silver', icon: '🥈' },
                { symbol: 'PL=F', name: 'PL', description: 'Platinum', icon: '⚪' },
                { symbol: 'HG=F', name: 'HG', description: 'Copper', icon: '🟤' },
                { symbol: 'NKD=F', name: 'NKD', description: 'Nikkei Mini', icon: '🇯🇵' }
            ],
            energy: [
                { symbol: 'CL=F', name: 'CL', description: 'Crude Oil', icon: '🛢️' },
                { symbol: 'NG=F', name: 'NG', description: 'Natural Gas', icon: '🔥' }
            ],
            currencies: [
                { symbol: '6E=F', name: '6E', description: 'Euro FX', icon: '💶' },
                { symbol: '6J=F', name: '6J', description: 'Yen', icon: '💴' },
                { symbol: '6B=F', name: '6B', description: 'Pound', icon: '💷' },
                { symbol: '6A=F', name: '6A', description: 'AUD', icon: '🦘' },
                { symbol: '6C=F', name: '6C', description: 'CAD', icon: '🍁' },
                { symbol: '6S=F', name: '6S', description: 'CHF', icon: '🇨🇭' }
            ],
            treasuries: [
                { symbol: 'ZB=F', name: 'ZB', description: '30Y T-Bond', icon: '🏛️' },
                { symbol: 'UB=F', name: 'UB', description: 'Ultra Bond', icon: '🏦' }
            ],
            grains: [
                { symbol: 'ZW=F', name: 'ZW', description: 'Wheat', icon: '🌾' },
                { symbol: 'ZS=F', name: 'ZS', description: 'Soybeans', icon: '🫘' },
                { symbol: 'ZC=F', name: 'ZC', description: 'Corn', icon: '🌽' }
            ],
            livestock: [
                { symbol: 'LE=F', name: 'LE', description: 'Live Cattle', icon: '🐄' }
            ]
        },
        refreshInterval: 180000,
        confluenceThreshold: 4,
        tpMultiplier: 1.0,  // Single TP at 1x ATR
        slMultiplier: 1.5   // SL at 1.5x ATR
    };

    // ==========================================
    // STATE
    // ==========================================
    const state = {
        signals: {},
        trades: JSON.parse(localStorage.getItem('trades') || '[]'),
        stats: JSON.parse(localStorage.getItem('stats') || '{"wins":0,"losses":0}'),
        activeCategory: 'indices',
        isLoading: false
    };

    // ==========================================
    // UTILITY FUNCTIONS
    // ==========================================

    // Format to EST time
    function formatEST(date) {
        const options = {
            timeZone: 'America/New_York',
            month: 'numeric',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        };
        return new Date(date).toLocaleString('en-US', options) + ' EST';
    }

    // Get decimal places for symbol
    function getDecimals(symbol) {
        if (['6E=F', '6A=F', '6C=F', '6S=F', '6B=F'].includes(symbol)) return 5;
        if (['6J=F'].includes(symbol)) return 6;
        if (['NG=F'].includes(symbol)) return 3;
        if (['NKD=F', 'ES=F', 'NQ=F', 'RTY=F'].includes(symbol)) return 2;
        return 2;
    }

    // Save state to localStorage
    function saveState() {
        localStorage.setItem('trades', JSON.stringify(state.trades));
        localStorage.setItem('stats', JSON.stringify(state.stats));
    }

    // ==========================================
    // TECHNICAL ANALYSIS
    // ==========================================

    function calculateEMA(data, period) {
        const k = 2 / (period + 1);
        let ema = [data[0]];
        for (let i = 1; i < data.length; i++) {
            ema.push(data[i] * k + ema[i-1] * (1 - k));
        }
        return ema;
    }

    function calculateRSI(data, period = 14) {
        let gains = [], losses = [];
        for (let i = 1; i < data.length; i++) {
            const diff = data[i] - data[i-1];
            gains.push(diff > 0 ? diff : 0);
            losses.push(diff < 0 ? -diff : 0);
        }
        if (gains.length < period) return 50;
        let avgGain = gains.slice(0, period).reduce((a,b) => a+b) / period;
        let avgLoss = losses.slice(0, period).reduce((a,b) => a+b) / period;
        for (let i = period; i < gains.length; i++) {
            avgGain = (avgGain * (period-1) + gains[i]) / period;
            avgLoss = (avgLoss * (period-1) + losses[i]) / period;
        }
        if (avgLoss === 0) return 100;
        const rs = avgGain / avgLoss;
        return 100 - (100 / (1 + rs));
    }

    function calculateMACD(data) {
        const ema12 = calculateEMA(data, 12);
        const ema26 = calculateEMA(data, 26);
        const macdLine = ema12.map((v, i) => v - ema26[i]);
        const signalLine = calculateEMA(macdLine, 9);
        return { macd: macdLine, signal: signalLine };
    }

    function calculateATR(highs, lows, closes, period = 14) {
        let tr = [];
        for (let i = 1; i < closes.length; i++) {
            const hl = highs[i] - lows[i];
            const hc = Math.abs(highs[i] - closes[i-1]);
            const lc = Math.abs(lows[i] - closes[i-1]);
            tr.push(Math.max(hl, hc, lc));
        }
        if (tr.length < period) return tr[tr.length-1] || 0;
        return tr.slice(-period).reduce((a,b) => a+b) / period;
    }

    function calculateADX(highs, lows, closes, period = 14) {
        if (highs.length < period + 1) return 25;
        let plusDM = [], minusDM = [], tr = [];
        for (let i = 1; i < highs.length; i++) {
            const upMove = highs[i] - highs[i-1];
            const downMove = lows[i-1] - lows[i];
            plusDM.push(upMove > downMove && upMove > 0 ? upMove : 0);
            minusDM.push(downMove > upMove && downMove > 0 ? downMove : 0);
            tr.push(Math.max(highs[i] - lows[i], Math.abs(highs[i] - closes[i-1]), Math.abs(lows[i] - closes[i-1])));
        }
        const smoothTR = tr.slice(-period).reduce((a,b) => a+b);
        const smoothPlusDM = plusDM.slice(-period).reduce((a,b) => a+b);
        const smoothMinusDM = minusDM.slice(-period).reduce((a,b) => a+b);
        const plusDI = (smoothPlusDM / smoothTR) * 100;
        const minusDI = (smoothMinusDM / smoothTR) * 100;
        const dx = Math.abs(plusDI - minusDI) / (plusDI + minusDI) * 100;
        return dx || 25;
    }

    // ==========================================
    // SIGNAL GENERATION
    // ==========================================

    function generateSignal(data, symbolInfo) {
        const closes = data.map(d => d.close);
        const highs = data.map(d => d.high);
        const lows = data.map(d => d.low);
        const volumes = data.map(d => d.volume);
        const price = closes[closes.length - 1];

        // EMAs
        const ema9 = calculateEMA(closes, 9);
        const ema21 = calculateEMA(closes, 21);
        const ema50 = calculateEMA(closes, 50);
        const ema200 = calculateEMA(closes, 200);

        const ema9Val = ema9[ema9.length - 1];
        const ema21Val = ema21[ema21.length - 1];
        const ema50Val = ema50[ema50.length - 1];
        const ema200Val = ema200[ema200.length - 1];

        // Indicators
        const rsi = calculateRSI(closes);
        const macdData = calculateMACD(closes);
        const macd = macdData.macd[macdData.macd.length - 1];
        const signal = macdData.signal[macdData.signal.length - 1];
        const atr = calculateATR(highs, lows, closes);
        const adx = calculateADX(highs, lows, closes);

        // Volume
        const avgVol = volumes.slice(-20).reduce((a,b) => a+b) / 20;
        const volSpike = volumes[volumes.length - 1] > avgVol * 1.5;

        // Confluence Scoring
        let longScore = 0, shortScore = 0;

        // 1. EMA Stack
        if (ema9Val > ema21Val && ema21Val > ema50Val) longScore++;
        if (ema9Val < ema21Val && ema21Val < ema50Val) shortScore++;

        // 2. Trend (200 EMA)
        if (price > ema200Val) longScore++;
        if (price < ema200Val) shortScore++;

        // 3. SuperTrend proxy (price vs ema50)
        if (price > ema50Val) longScore++;
        if (price < ema50Val) shortScore++;

        // 4. RSI
        if (rsi > 50 && rsi < 70) longScore++;
        if (rsi < 50 && rsi > 30) shortScore++;

        // 5. MACD
        if (macd > signal) longScore++;
        if (macd < signal) shortScore++;

        // 6. Volume
        if (volSpike) { longScore++; shortScore++; }

        // Determine signal
        const isTrending = adx > 20;
        let direction = 'NEUTRAL';
        let confidence = Math.max(longScore, shortScore);

        if (isTrending) {
            if (longScore >= CONFIG.confluenceThreshold && shortScore < CONFIG.confluenceThreshold) {
                direction = 'LONG';
            } else if (shortScore >= CONFIG.confluenceThreshold && longScore < CONFIG.confluenceThreshold) {
                direction = 'SHORT';
            }
        }

        // Calculate TP/SL
        const tp = direction === 'LONG' ? price + atr * CONFIG.tpMultiplier :
                   direction === 'SHORT' ? price - atr * CONFIG.tpMultiplier : null;
        const sl = direction === 'LONG' ? price - atr * CONFIG.slMultiplier :
                   direction === 'SHORT' ? price + atr * CONFIG.slMultiplier : null;

        return {
            symbol: symbolInfo.symbol,
            name: symbolInfo.name,
            description: symbolInfo.description,
            icon: symbolInfo.icon,
            price,
            direction,
            confidence,
            tp,
            sl,
            rsi: Math.round(rsi),
            adx: Math.round(adx),
            atr,
            time: new Date(),
            timeEST: formatEST(new Date())
        };
    }

    // ==========================================
    // DATA FETCHING
    // ==========================================

    async function fetchData(symbol) {
        // Use CORS proxy for browser requests
        const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1h&range=5d`;
        const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(yahooUrl)}`;
        try {
            const response = await fetch(proxyUrl);
            const json = await response.json();
            const result = json.chart.result[0];
            const quotes = result.indicators.quote[0];
            const timestamps = result.timestamp;

            const data = [];
            for (let i = 0; i < timestamps.length; i++) {
                if (quotes.close[i] !== null) {
                    data.push({
                        time: timestamps[i] * 1000,
                        open: quotes.open[i],
                        high: quotes.high[i],
                        low: quotes.low[i],
                        close: quotes.close[i],
                        volume: quotes.volume[i] || 0
                    });
                }
            }
            return data;
        } catch (error) {
            console.error(`Error fetching ${symbol}:`, error);
            return null;
        }
    }

    // ==========================================
    // TRADE TRACKING
    // ==========================================

    function checkTrades(currentPrices) {
        const activeTrades = state.trades.filter(t => t.status === 'active');

        activeTrades.forEach(trade => {
            const currentPrice = currentPrices[trade.symbol];
            if (!currentPrice) return;

            let hit = null;
            if (trade.direction === 'LONG') {
                if (currentPrice >= trade.tp) hit = 'WIN';
                else if (currentPrice <= trade.sl) hit = 'LOSS';
            } else {
                if (currentPrice <= trade.tp) hit = 'WIN';
                else if (currentPrice >= trade.sl) hit = 'LOSS';
            }

            if (hit) {
                trade.status = hit.toLowerCase();
                trade.exitPrice = currentPrice;
                trade.exitTime = new Date().toISOString();
                trade.exitTimeEST = formatEST(new Date());

                if (hit === 'WIN') state.stats.wins++;
                else state.stats.losses++;

                saveState();
                showNotification(trade, hit);
            }
        });
    }

    function recordTrade(signal) {
        if (signal.direction === 'NEUTRAL') return;

        // Check if already have active trade for this symbol
        const existing = state.trades.find(t => t.symbol === signal.symbol && t.status === 'active');
        if (existing) return;

        const trade = {
            id: Date.now(),
            symbol: signal.symbol,
            name: signal.name,
            direction: signal.direction,
            entry: signal.price,
            tp: signal.tp,
            sl: signal.sl,
            confidence: signal.confidence,
            entryTime: new Date().toISOString(),
            entryTimeEST: signal.timeEST,
            status: 'active'
        };

        state.trades.unshift(trade);
        if (state.trades.length > 100) state.trades = state.trades.slice(0, 100);
        saveState();
    }

    function showNotification(trade, result) {
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(`${result === 'WIN' ? '✅' : '❌'} ${trade.name} ${result}`, {
                body: `${trade.direction} @ ${trade.entry.toFixed(2)} → ${trade.exitPrice.toFixed(2)}`,
                icon: result === 'WIN' ? '✅' : '❌'
            });
        }
    }

    // ==========================================
    // UI RENDERING
    // ==========================================

    function renderSignals() {
        const container = document.getElementById('signals-container');
        const symbols = CONFIG.symbols[state.activeCategory] || [];

        let html = '';
        symbols.forEach(sym => {
            const signal = state.signals[sym.symbol];
            if (!signal) {
                html += `<div class="signal-card loading"><div class="signal-header">${sym.icon} ${sym.name}</div><div>Loading...</div></div>`;
                return;
            }

            const decimals = getDecimals(sym.symbol);
            const dirClass = signal.direction.toLowerCase();
            const dirIcon = signal.direction === 'LONG' ? '🟢' : signal.direction === 'SHORT' ? '🔴' : '⚪';

            // Find active trade for this symbol
            const activeTrade = state.trades.find(t => t.symbol === sym.symbol && t.status === 'active');
            // Find last completed trade
            const lastTrade = state.trades.find(t => t.symbol === sym.symbol && t.status !== 'active');

            html += `
                <div class="signal-card ${dirClass}">
                    <div class="signal-header">
                        <span class="symbol-icon">${sym.icon}</span>
                        <span class="symbol-name">${sym.name}</span>
                        <span class="signal-direction ${dirClass}">${dirIcon} ${signal.direction}</span>
                    </div>
                    <div class="signal-price">$${signal.price.toFixed(decimals)}</div>
                    <div class="signal-time">${signal.timeEST}</div>
                    <div class="signal-score">Score: ${signal.confidence}/6</div>
                    ${signal.direction !== 'NEUTRAL' ? `
                        <div class="signal-levels">
                            <div class="level tp">TP: $${signal.tp.toFixed(decimals)}</div>
                            <div class="level sl">SL: $${signal.sl.toFixed(decimals)}</div>
                        </div>
                    ` : ''}
                    ${activeTrade ? `<div class="trade-status active">📍 Active Trade</div>` : ''}
                    ${lastTrade ? `<div class="trade-status ${lastTrade.status}">Last: ${lastTrade.status === 'win' ? '✅ WIN' : '❌ LOSS'} (${lastTrade.exitTimeEST})</div>` : ''}
                </div>
            `;
        });

        container.innerHTML = html;
    }

    function renderStats() {
        const statsEl = document.getElementById('stats');
        const total = state.stats.wins + state.stats.losses;
        const winRate = total > 0 ? ((state.stats.wins / total) * 100).toFixed(1) : '0.0';

        statsEl.innerHTML = `
            <span class="stat win">✅ ${state.stats.wins}</span>
            <span class="stat loss">❌ ${state.stats.losses}</span>
            <span class="stat rate">${winRate}%</span>
        `;
    }

    function renderHistory() {
        const container = document.getElementById('history-container');
        const completedTrades = state.trades.filter(t => t.status !== 'active').slice(0, 20);

        if (completedTrades.length === 0) {
            container.innerHTML = '<div class="no-history">No completed trades yet</div>';
            return;
        }

        let html = '';
        completedTrades.forEach(trade => {
            const isWin = trade.status === 'win';
            html += `
                <div class="history-item ${trade.status}">
                    <div class="history-header">
                        <span>${isWin ? '✅' : '❌'} ${trade.name}</span>
                        <span class="history-dir">${trade.direction}</span>
                    </div>
                    <div class="history-details">
                        <span>Entry: $${trade.entry.toFixed(2)}</span>
                        <span>Exit: $${trade.exitPrice.toFixed(2)}</span>
                    </div>
                    <div class="history-time">${trade.entryTimeEST}</div>
                </div>
            `;
        });

        container.innerHTML = html;
    }

    // ==========================================
    // MAIN FUNCTIONS
    // ==========================================

    async function refreshSignals() {
        if (state.isLoading) return;
        state.isLoading = true;

        document.getElementById('refresh-btn').classList.add('loading');

        const currentPrices = {};

        for (const category of Object.keys(CONFIG.symbols)) {
            for (const sym of CONFIG.symbols[category]) {
                const data = await fetchData(sym.symbol);
                if (data && data.length > 50) {
                    const signal = generateSignal(data, sym);

                    // Check if signal changed and record new trade
                    const prevSignal = state.signals[sym.symbol];
                    if (!prevSignal || prevSignal.direction !== signal.direction) {
                        if (signal.direction !== 'NEUTRAL') {
                            recordTrade(signal);
                        }
                    }

                    state.signals[sym.symbol] = signal;
                    currentPrices[sym.symbol] = signal.price;
                }
            }
        }

        // Check active trades
        checkTrades(currentPrices);

        state.isLoading = false;
        document.getElementById('refresh-btn').classList.remove('loading');
        document.getElementById('last-update').textContent = formatEST(new Date());

        renderSignals();
        renderStats();
        renderHistory();
    }

    function switchCategory(category) {
        state.activeCategory = category;
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelector(`[data-category="${category}"]`).classList.add('active');
        renderSignals();
    }

    function clearHistory() {
        if (confirm('Clear all trade history and stats?')) {
            state.trades = [];
            state.stats = { wins: 0, losses: 0 };
            saveState();
            renderStats();
            renderHistory();
        }
    }

    // ==========================================
    // INITIALIZATION
    // ==========================================

    function init() {
        // Request notification permission
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }

        // Tab clicks
        document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', () => switchCategory(tab.dataset.category));
        });

        // Refresh button
        document.getElementById('refresh-btn').addEventListener('click', refreshSignals);

        // Clear history button
        document.getElementById('clear-btn').addEventListener('click', clearHistory);

        // Initial load
        renderStats();
        refreshSignals();

        // Auto refresh
        setInterval(refreshSignals, CONFIG.refreshInterval);
    }

    // Start
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
