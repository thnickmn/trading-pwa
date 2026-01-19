// HWR Futures Pro v2.0 - PWA Application
// Trading Signals with Technical Analysis

(function() {
    'use strict';

    // ==========================================
    // CONFIGURATION
    // ==========================================
    const CONFIG = {
        // Symbols configuration
        symbols: {
            indices: [
                { symbol: 'ES=F', name: 'ES', description: 'E-mini S&P 500', icon: '📈' },
                { symbol: 'NQ=F', name: 'NQ', description: 'E-mini NASDAQ', icon: '💹' },
                { symbol: 'RTY=F', name: 'RTY', description: 'E-mini Russell 2000', icon: '📊' }
            ],
            metals: [
                { symbol: 'GC=F', name: 'GC', description: 'Gold Futures', icon: '🥇' },
                { symbol: 'SI=F', name: 'SI', description: 'Silver Futures', icon: '🥈' },
                { symbol: 'PL=F', name: 'PL', description: 'Platinum Futures', icon: '⚪' },
                { symbol: 'HG=F', name: 'HG', description: 'Copper Futures', icon: '🟤' },
                { symbol: 'QI=F', name: 'NI', description: 'Nickel (Mini)', icon: '🔘' }
            ],
            energy: [
                { symbol: 'CL=F', name: 'CL', description: 'Crude Oil WTI', icon: '🛢️' },
                { symbol: 'NG=F', name: 'NG', description: 'Natural Gas', icon: '🔥' }
            ],
            currencies: [
                { symbol: '6E=F', name: '6E', description: 'Euro FX', icon: '💶' },
                { symbol: '6J=F', name: '6J', description: 'Japanese Yen', icon: '💴' },
                { symbol: '6B=F', name: '6B', description: 'British Pound', icon: '💷' },
                { symbol: '6A=F', name: '6A', description: 'Australian Dollar', icon: '🦘' },
                { symbol: '6C=F', name: '6C', description: 'Canadian Dollar', icon: '🍁' },
                { symbol: '6S=F', name: '6S', description: 'Swiss Franc', icon: '🇨🇭' },
                { symbol: '6N=F', name: '6N', description: 'New Zealand Dollar', icon: '🥝' }
            ],
            treasuries: [
                { symbol: 'ZB=F', name: 'ZB', description: '30-Year T-Bond', icon: '🏛️' },
                { symbol: 'UB=F', name: 'UB', description: 'Ultra T-Bond', icon: '🏦' }
            ],
            grains: [
                { symbol: 'ZW=F', name: 'ZW', description: 'Wheat', icon: '🌾' },
                { symbol: 'ZS=F', name: 'ZS', description: 'Soybeans', icon: '🫘' },
                { symbol: 'ZC=F', name: 'ZC', description: 'Corn', icon: '🌽' },
                { symbol: 'ZL=F', name: 'ZL', description: 'Soybean Oil', icon: '🫒' },
                { symbol: 'ZM=F', name: 'ZM', description: 'Soybean Meal', icon: '🥜' }
            ],
            livestock: [
                { symbol: 'LE=F', name: 'LE', description: 'Live Cattle', icon: '🐄' }
            ]
        },
        // Default settings
        defaults: {
            refreshInterval: 180000, // 3 minutes
            confluenceThreshold: 4,
            riskPercent: 1,
            soundAlerts: true,
            vibrationAlerts: true,
            // Notification settings
            notificationsEnabled: false,
            notifyDirectionChange: true,
            notifyHighConfluence: true,
            notifyPriceAlerts: true,
            notificationSound: true,
            highConfluenceThreshold: 5
        },
        // Technical Analysis Parameters
        ta: {
            ema: [9, 21, 50, 200],
            rsi: { period: 14, overbought: 70, oversold: 30 },
            macd: { fast: 12, slow: 26, signal: 9 },
            supertrend: { period: 10, multiplier: 3 },
            adx: { period: 14, threshold: 25 },
            atr: { period: 14 }
        },
        // Risk/Reward settings
        riskReward: {
            tp1Multiplier: 1.5,
            tp2Multiplier: 2.5,
            tp3Multiplier: 4.0,
            slMultiplier: 1.0
        }
    };

    // ==========================================
    // STATE MANAGEMENT
    // ==========================================
    const state = {
        signals: {},
        history: [],
        settings: { ...CONFIG.defaults },
        lastUpdate: null,
        refreshTimer: null,
        countdownTimer: null,
        nextRefresh: null,
        isLoading: false,
        isOnline: navigator.onLine,
        // Notification state
        previousSignals: {},
        notificationPermission: 'default',
        priceAlerts: {}
    };

    // ==========================================
    // DOM ELEMENTS
    // ==========================================
    const DOM = {
        loadingOverlay: document.getElementById('loadingOverlay'),
        indicesSignals: document.getElementById('indicesSignals'),
        futuresSignals: document.getElementById('futuresSignals'),
        metalsSignals: document.getElementById('metalsSignals'),
        energySignals: document.getElementById('energySignals'),
        currenciesSignals: document.getElementById('currenciesSignals'),
        treasuriesSignals: document.getElementById('treasuriesSignals'),
        grainsSignals: document.getElementById('grainsSignals'),
        livestockSignals: document.getElementById('livestockSignals'),
        historyList: document.getElementById('historyList'),
        lastUpdate: document.getElementById('lastUpdate'),
        nextRefresh: document.getElementById('nextRefresh'),
        connectionStatus: document.getElementById('connectionStatus'),
        settingsModal: document.getElementById('settingsModal'),
        signalModal: document.getElementById('signalModal'),
        signalModalTitle: document.getElementById('signalModalTitle'),
        signalModalBody: document.getElementById('signalModalBody'),
        installPrompt: document.getElementById('installPrompt')
    };

    // ==========================================
    // UTILITY FUNCTIONS
    // ==========================================
    const utils = {
        formatPrice(price, decimals = 2) {
            if (price === null || price === undefined) return '--';
            return price.toLocaleString('en-US', {
                minimumFractionDigits: decimals,
                maximumFractionDigits: decimals
            });
        },

        formatPercent(value) {
            if (value === null || value === undefined) return '--';
            const sign = value >= 0 ? '+' : '';
            return `${sign}${value.toFixed(2)}%`;
        },

        formatTime(date) {
            return date.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false
            });
        },

        formatDateTime(date) {
            return date.toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            });
        },

        getDecimals(symbol) {
            // Different decimal places for different instruments
            if (symbol.includes('ES') || symbol.includes('NQ')) return 2;
            if (symbol.includes('GC')) return 2;
            if (symbol.includes('SI')) return 3;
            if (symbol.includes('PL')) return 2;
            if (symbol.includes('HG')) return 4;
            return 2;
        },

        debounce(func, wait) {
            let timeout;
            return function executedFunction(...args) {
                const later = () => {
                    clearTimeout(timeout);
                    func(...args);
                };
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
            };
        }
    };

    // ==========================================
    // TECHNICAL ANALYSIS ENGINE
    // ==========================================
    const TechnicalAnalysis = {
        // Calculate EMA
        calculateEMA(data, period) {
            if (data.length < period) return [];
            const k = 2 / (period + 1);
            const ema = [data.slice(0, period).reduce((a, b) => a + b, 0) / period];

            for (let i = period; i < data.length; i++) {
                ema.push(data[i] * k + ema[ema.length - 1] * (1 - k));
            }
            return ema;
        },

        // Calculate RSI
        calculateRSI(closes, period = 14) {
            if (closes.length < period + 1) return null;

            let gains = 0, losses = 0;

            for (let i = 1; i <= period; i++) {
                const change = closes[i] - closes[i - 1];
                if (change > 0) gains += change;
                else losses -= change;
            }

            let avgGain = gains / period;
            let avgLoss = losses / period;

            for (let i = period + 1; i < closes.length; i++) {
                const change = closes[i] - closes[i - 1];
                if (change > 0) {
                    avgGain = (avgGain * (period - 1) + change) / period;
                    avgLoss = (avgLoss * (period - 1)) / period;
                } else {
                    avgGain = (avgGain * (period - 1)) / period;
                    avgLoss = (avgLoss * (period - 1) - change) / period;
                }
            }

            if (avgLoss === 0) return 100;
            const rs = avgGain / avgLoss;
            return 100 - (100 / (1 + rs));
        },

        // Calculate MACD
        calculateMACD(closes, fast = 12, slow = 26, signal = 9) {
            const emaFast = this.calculateEMA(closes, fast);
            const emaSlow = this.calculateEMA(closes, slow);

            if (emaFast.length === 0 || emaSlow.length === 0) {
                return { macd: 0, signal: 0, histogram: 0 };
            }

            const offset = slow - fast;
            const macdLine = [];

            for (let i = 0; i < emaSlow.length; i++) {
                macdLine.push(emaFast[i + offset] - emaSlow[i]);
            }

            const signalLine = this.calculateEMA(macdLine, signal);
            const lastMACD = macdLine[macdLine.length - 1] || 0;
            const lastSignal = signalLine[signalLine.length - 1] || 0;

            return {
                macd: lastMACD,
                signal: lastSignal,
                histogram: lastMACD - lastSignal
            };
        },

        // Calculate ATR
        calculateATR(highs, lows, closes, period = 14) {
            if (highs.length < period + 1) return null;

            const trueRanges = [];
            for (let i = 1; i < highs.length; i++) {
                const tr = Math.max(
                    highs[i] - lows[i],
                    Math.abs(highs[i] - closes[i - 1]),
                    Math.abs(lows[i] - closes[i - 1])
                );
                trueRanges.push(tr);
            }

            let atr = trueRanges.slice(0, period).reduce((a, b) => a + b, 0) / period;

            for (let i = period; i < trueRanges.length; i++) {
                atr = (atr * (period - 1) + trueRanges[i]) / period;
            }

            return atr;
        },

        // Calculate SuperTrend
        calculateSuperTrend(highs, lows, closes, period = 10, multiplier = 3) {
            const atr = this.calculateATR(highs, lows, closes, period);
            if (!atr) return { trend: 'neutral', value: 0 };

            const lastClose = closes[closes.length - 1];
            const lastHigh = highs[highs.length - 1];
            const lastLow = lows[lows.length - 1];
            const hl2 = (lastHigh + lastLow) / 2;

            const upperBand = hl2 + (multiplier * atr);
            const lowerBand = hl2 - (multiplier * atr);

            // Simplified SuperTrend logic
            if (lastClose > upperBand) {
                return { trend: 'bullish', value: lowerBand };
            } else if (lastClose < lowerBand) {
                return { trend: 'bearish', value: upperBand };
            }

            // Use price position relative to bands
            const midPoint = (upperBand + lowerBand) / 2;
            return {
                trend: lastClose > midPoint ? 'bullish' : 'bearish',
                value: lastClose > midPoint ? lowerBand : upperBand
            };
        },

        // Calculate ADX
        calculateADX(highs, lows, closes, period = 14) {
            if (highs.length < period * 2) return { adx: 25, trending: true };

            const trueRanges = [];
            const plusDM = [];
            const minusDM = [];

            for (let i = 1; i < highs.length; i++) {
                const tr = Math.max(
                    highs[i] - lows[i],
                    Math.abs(highs[i] - closes[i - 1]),
                    Math.abs(lows[i] - closes[i - 1])
                );
                trueRanges.push(tr);

                const upMove = highs[i] - highs[i - 1];
                const downMove = lows[i - 1] - lows[i];

                plusDM.push(upMove > downMove && upMove > 0 ? upMove : 0);
                minusDM.push(downMove > upMove && downMove > 0 ? downMove : 0);
            }

            // Smoothed values
            let smoothedTR = trueRanges.slice(0, period).reduce((a, b) => a + b, 0);
            let smoothedPlusDM = plusDM.slice(0, period).reduce((a, b) => a + b, 0);
            let smoothedMinusDM = minusDM.slice(0, period).reduce((a, b) => a + b, 0);

            for (let i = period; i < trueRanges.length; i++) {
                smoothedTR = smoothedTR - (smoothedTR / period) + trueRanges[i];
                smoothedPlusDM = smoothedPlusDM - (smoothedPlusDM / period) + plusDM[i];
                smoothedMinusDM = smoothedMinusDM - (smoothedMinusDM / period) + minusDM[i];
            }

            const plusDI = (smoothedPlusDM / smoothedTR) * 100;
            const minusDI = (smoothedMinusDM / smoothedTR) * 100;
            const dx = Math.abs(plusDI - minusDI) / (plusDI + minusDI) * 100;

            return {
                adx: dx || 25,
                plusDI,
                minusDI,
                trending: dx > CONFIG.ta.adx.threshold
            };
        },

        // Analyze EMA Stack
        analyzeEMAStack(closes) {
            const emas = {};
            CONFIG.ta.ema.forEach(period => {
                const ema = this.calculateEMA(closes, period);
                emas[period] = ema[ema.length - 1] || closes[closes.length - 1];
            });

            const price = closes[closes.length - 1];
            const bullishStack = emas[9] > emas[21] && emas[21] > emas[50] && emas[50] > emas[200];
            const bearishStack = emas[9] < emas[21] && emas[21] < emas[50] && emas[50] < emas[200];
            const priceAboveAll = price > emas[9] && price > emas[21] && price > emas[50] && price > emas[200];
            const priceBelowAll = price < emas[9] && price < emas[21] && price < emas[50] && price < emas[200];

            let signal = 'neutral';
            if (bullishStack && priceAboveAll) signal = 'bullish';
            else if (bearishStack && priceBelowAll) signal = 'bearish';
            else if (price > emas[21]) signal = 'bullish';
            else if (price < emas[21]) signal = 'bearish';

            return { signal, emas, bullishStack, bearishStack };
        },

        // Volume Analysis (simplified - using price volatility as proxy)
        analyzeVolume(closes, highs, lows) {
            if (closes.length < 20) return { signal: 'neutral', strength: 50 };

            // Use recent volatility as volume proxy
            const recentRanges = [];
            const olderRanges = [];

            for (let i = closes.length - 5; i < closes.length; i++) {
                recentRanges.push(highs[i] - lows[i]);
            }
            for (let i = closes.length - 20; i < closes.length - 5; i++) {
                olderRanges.push(highs[i] - lows[i]);
            }

            const recentAvg = recentRanges.reduce((a, b) => a + b, 0) / recentRanges.length;
            const olderAvg = olderRanges.reduce((a, b) => a + b, 0) / olderRanges.length;

            const ratio = recentAvg / olderAvg;
            const strength = Math.min(100, Math.max(0, ratio * 50));

            return {
                signal: ratio > 1.2 ? 'high' : ratio < 0.8 ? 'low' : 'normal',
                strength,
                expanding: ratio > 1
            };
        }
    };

    // ==========================================
    // SIGNAL GENERATOR
    // ==========================================
    const SignalGenerator = {
        generateSignal(symbolData, config) {
            const { closes, highs, lows, currentPrice, change, changePercent } = symbolData;

            if (!closes || closes.length < 50) {
                return this.createNeutralSignal(symbolData, 'Insufficient data');
            }

            // Calculate all indicators
            const emaAnalysis = TechnicalAnalysis.analyzeEMAStack(closes);
            const rsi = TechnicalAnalysis.calculateRSI(closes);
            const macd = TechnicalAnalysis.calculateMACD(closes);
            const supertrend = TechnicalAnalysis.calculateSuperTrend(highs, lows, closes);
            const adx = TechnicalAnalysis.calculateADX(highs, lows, closes);
            const volume = TechnicalAnalysis.analyzeVolume(closes, highs, lows);
            const atr = TechnicalAnalysis.calculateATR(highs, lows, closes);

            // Build confluence score
            const factors = {
                emaStack: { value: emaAnalysis.signal, weight: 1 },
                supertrend: { value: supertrend.trend === 'bullish' ? 'bullish' : 'bearish', weight: 1 },
                rsi: { value: rsi < 30 ? 'bullish' : rsi > 70 ? 'bearish' : 'neutral', weight: 1 },
                macd: { value: macd.histogram > 0 ? 'bullish' : 'bearish', weight: 1 },
                adx: { value: adx.trending ? (adx.plusDI > adx.minusDI ? 'bullish' : 'bearish') : 'neutral', weight: 1 },
                volume: { value: volume.expanding ? 'confirming' : 'neutral', weight: 1 }
            };

            // Count bullish/bearish factors
            let bullishCount = 0;
            let bearishCount = 0;

            Object.values(factors).forEach(factor => {
                if (factor.value === 'bullish' || factor.value === 'confirming') bullishCount++;
                else if (factor.value === 'bearish') bearishCount++;
            });

            // Determine signal
            const totalFactors = 6;
            const confluenceScore = Math.max(bullishCount, bearishCount);
            const threshold = state.settings.confluenceThreshold;

            let direction = 'NEUTRAL';
            let confidence = 'low';

            if (bullishCount >= threshold && bullishCount > bearishCount && adx.trending) {
                direction = 'LONG';
                confidence = bullishCount >= 5 ? 'high' : 'moderate';
            } else if (bearishCount >= threshold && bearishCount > bullishCount && adx.trending) {
                direction = 'SHORT';
                confidence = bearishCount >= 5 ? 'high' : 'moderate';
            }

            // Calculate levels
            const levels = this.calculateLevels(currentPrice, atr, direction);

            return {
                direction,
                confidence,
                confluenceScore,
                totalFactors,
                bullishCount,
                bearishCount,
                factors,
                indicators: {
                    ema: emaAnalysis,
                    rsi: rsi ? rsi.toFixed(1) : '--',
                    macd: macd,
                    supertrend: supertrend,
                    adx: adx,
                    volume: volume,
                    atr: atr
                },
                levels,
                price: currentPrice,
                change,
                changePercent,
                timestamp: new Date()
            };
        },

        calculateLevels(price, atr, direction) {
            if (!atr || direction === 'NEUTRAL') {
                return {
                    entry: price,
                    sl: null,
                    tp1: null,
                    tp2: null,
                    tp3: null
                };
            }

            const { tp1Multiplier, tp2Multiplier, tp3Multiplier, slMultiplier } = CONFIG.riskReward;

            if (direction === 'LONG') {
                return {
                    entry: price,
                    sl: price - (atr * slMultiplier),
                    tp1: price + (atr * tp1Multiplier),
                    tp2: price + (atr * tp2Multiplier),
                    tp3: price + (atr * tp3Multiplier)
                };
            } else {
                return {
                    entry: price,
                    sl: price + (atr * slMultiplier),
                    tp1: price - (atr * tp1Multiplier),
                    tp2: price - (atr * tp2Multiplier),
                    tp3: price - (atr * tp3Multiplier)
                };
            }
        },

        createNeutralSignal(symbolData, reason) {
            return {
                direction: 'NEUTRAL',
                confidence: 'low',
                confluenceScore: 0,
                totalFactors: 6,
                bullishCount: 0,
                bearishCount: 0,
                factors: {},
                indicators: {},
                levels: {
                    entry: symbolData.currentPrice,
                    sl: null,
                    tp1: null,
                    tp2: null,
                    tp3: null
                },
                price: symbolData.currentPrice,
                change: symbolData.change || 0,
                changePercent: symbolData.changePercent || 0,
                timestamp: new Date(),
                reason
            };
        }
    };

    // ==========================================
    // DATA FETCHER (Yahoo Finance)
    // ==========================================
    const DataFetcher = {
        async fetchQuote(symbol) {
            try {
                // Using Yahoo Finance v8 API via CORS proxy
                const proxyUrl = 'https://corsproxy.io/?';
                const apiUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=15m&range=5d`;

                const response = await fetch(proxyUrl + encodeURIComponent(apiUrl));

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }

                const data = await response.json();
                return this.parseYahooData(data, symbol);
            } catch (error) {
                console.error(`Error fetching ${symbol}:`, error);
                throw new Error(`Failed to fetch data for ${symbol}`);
            }
        },

        parseYahooData(data, symbol) {
            try {
                const result = data.chart.result[0];
                const quote = result.indicators.quote[0];
                const meta = result.meta;

                const closes = quote.close.filter(v => v !== null);
                const highs = quote.high.filter(v => v !== null);
                const lows = quote.low.filter(v => v !== null);

                const currentPrice = meta.regularMarketPrice || closes[closes.length - 1];
                const previousClose = meta.previousClose || closes[closes.length - 2];
                const change = currentPrice - previousClose;
                const changePercent = (change / previousClose) * 100;

                return {
                    symbol,
                    currentPrice,
                    previousClose,
                    change,
                    changePercent,
                    closes,
                    highs,
                    lows,
                    timestamp: new Date()
                };
            } catch (error) {
                console.error('Parse error:', error);
                throw new Error(`Failed to fetch data for ${symbol}`);
            }
        },

        async fetchAllSymbols() {
            const allSymbols = [
                ...CONFIG.symbols.indices,
                ...CONFIG.symbols.metals,
                ...CONFIG.symbols.energy,
                ...CONFIG.symbols.currencies,
                ...CONFIG.symbols.treasuries,
                ...CONFIG.symbols.grains,
                ...CONFIG.symbols.livestock
            ];

            const results = {};

            await Promise.all(
                allSymbols.map(async (item) => {
                    const data = await this.fetchQuote(item.symbol);
                    const signal = SignalGenerator.generateSignal(data, CONFIG);
                    results[item.symbol] = {
                        ...item,
                        data,
                        signal
                    };
                })
            );

            return results;
        }
    };

    // ==========================================
    // UI RENDERER
    // ==========================================
    
// Computes wins, losses, and win percentage for a symbol
function getSymbolStats(symbol) {
    const trades = state.history.filter(t => t.symbol === symbol);
    let wins = 0, losses = 0;
    trades.forEach(t => {
        if (t.result === 'win') wins++;
        else if (t.result === 'loss') losses++;
    });
    const total = wins + losses;
    const winPct = total ? ((wins / total) * 100).toFixed(1) : '–';
    return { wins, losses, winPct };
}

const UI = {

        // Computes wins, losses, and win percentage for a symbol
