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
function getSymbolStats(symbol) {
    const trades = (state.history || []).filter(t => t.symbol === symbol);
    const wins = trades.filter(t => t.result === 'win').length;
    const losses = trades.filter(t => t.result === 'loss').length;
    const total = wins + losses;
    const winPct = total ? Math.round((wins / total) * 100) : 0;
    return { wins, losses, winPct };
}


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
    const UI = {
        renderSignalCard(item) {
            const { symbol, name, description, icon, signal, data } = item;
            const decimals = utils.getDecimals(symbol);
            const directionClass = signal.direction.toLowerCase();

            const confluencePercent = (signal.confluenceScore / signal.totalFactors) * 100;
            let confluenceClass = 'weak';
            if (confluencePercent >= 70) confluenceClass = 'strong';
            else if (confluencePercent >= 50) confluenceClass = 'moderate';

            return `
                <div class="signal-card ${directionClass}" data-symbol="${symbol}">
                    <div class="card-header">
                        <div class="symbol-info">
                            <span class="symbol-icon">${icon}</span>
                            <div>
                                <div class="symbol-name">${name}</div>
                                <div class="symbol-desc">${description}</div>
                            </div>
                        </div>
                        <span class="signal-badge ${directionClass}">${signal.direction}</span>
                    </div>
                    <div class="card-body">
                        <div class="price-row">
                            <span class="current-price">${utils.formatPrice(signal.price, decimals)}</span>
                            <div class="price-change">
                                <span class="change-value ${signal.change >= 0 ? 'positive' : 'negative'}">
                                    ${signal.change >= 0 ? '+' : ''}${utils.formatPrice(signal.change, decimals)}
                                </span>
                                <span class="change-percent">${utils.formatPercent(signal.changePercent)}</span>
                            </div>
                        </div>

                        <div class="confluence-section">
                            <div class="confluence-header">
                                <span class="confluence-label">Confluence</span>
                                <span class="confluence-score">${signal.confluenceScore}/${signal.totalFactors}</span>
                            </div>
                            <div class="confluence-bar">
                                <div class="confluence-fill ${confluenceClass}" style="width: ${confluencePercent}%"></div>
                            </div>
                        </div>

                        <div class="indicators-grid">
                            ${this.renderIndicator('EMA', signal.indicators.ema?.signal)}
                            ${this.renderIndicator('RSI', signal.indicators.rsi, this.getRSISignal(signal.indicators.rsi))}
                            ${this.renderIndicator('MACD', signal.indicators.macd?.histogram > 0 ? '▲' : '▼', signal.indicators.macd?.histogram > 0 ? 'bullish' : 'bearish')}
                            ${this.renderIndicator('SuperT', signal.indicators.supertrend?.trend)}
                            ${this.renderIndicator('ADX', signal.indicators.adx?.adx?.toFixed(0), signal.indicators.adx?.trending ? 'bullish' : 'neutral')}
                            ${this.renderIndicator('Vol', signal.indicators.volume?.signal)}
                        </div>

                        ${signal.direction !== 'NEUTRAL' ? this.renderLevels(signal.levels, decimals) : ''}
                    </div>
                </div>
            `;
        },

        renderIndicator(name, value, signal = null) {
            const displayValue = value || '--';
            const signalClass = signal || (typeof value === 'string' ? value : 'neutral');

            return `
                <div class="indicator-item">
                    <span class="indicator-name">${name}</span>
                    <span class="indicator-value ${signalClass}">${displayValue}</span>
                </div>
            `;
        },

        getRSISignal(rsi) {
            if (!rsi || rsi === '--') return 'neutral';
            const value = parseFloat(rsi);
            if (value < 30) return 'bullish';
            if (value > 70) return 'bearish';
            return 'neutral';
        },

        renderLevels(levels, decimals) {
            if (!levels.sl) return '';

            return `
                <div class="levels-section">
                    <div class="level-group entry">
                        <div class="level-label">Entry Price</div>
                        <div class="level-value entry">${utils.formatPrice(levels.entry, decimals)}</div>
                    </div>
                    <div class="level-group">
                        <div class="level-label">Take Profit</div>
                        <div class="tp-levels">
                            <div class="tp-item">
                                <span class="tp-label">TP1:</span>
                                <span class="level-value tp">${utils.formatPrice(levels.tp1, decimals)}</span>
                            </div>
                            <div class="tp-item">
                                <span class="tp-label">TP2:</span>
                                <span class="level-value tp">${utils.formatPrice(levels.tp2, decimals)}</span>
                            </div>
                            <div class="tp-item">
                                <span class="tp-label">TP3:</span>
                                <span class="level-value tp">${utils.formatPrice(levels.tp3, decimals)}</span>
                            </div>
                        </div>
                    </div>
                    <div class="level-group">
                        <div class="level-label">Stop Loss</div>
                        <div class="level-value sl">${utils.formatPrice(levels.sl, decimals)}</div>
                    </div>
                </div>
            `;
        },

        renderSignals() {
            // Render futures
            // Render indices
            const indicesHtml = CONFIG.symbols.indices
                .map(item => this.renderSignalCard(state.signals[item.symbol]))
                .join('');
            if (DOM.indicesSignals) DOM.indicesSignals.innerHTML = indicesHtml;
            if (DOM.futuresSignals) DOM.futuresSignals.innerHTML = indicesHtml; // fallback

            // Render metals
            const metalsHtml = CONFIG.symbols.metals
                .map(item => this.renderSignalCard(state.signals[item.symbol]))
                .join('');
            if (DOM.metalsSignals) DOM.metalsSignals.innerHTML = metalsHtml;

            // Render energy
            const energyHtml = CONFIG.symbols.energy
                .map(item => this.renderSignalCard(state.signals[item.symbol]))
                .join('');
            if (DOM.energySignals) DOM.energySignals.innerHTML = energyHtml;

            // Render currencies
            const currenciesHtml = CONFIG.symbols.currencies
                .map(item => this.renderSignalCard(state.signals[item.symbol]))
                .join('');
            if (DOM.currenciesSignals) DOM.currenciesSignals.innerHTML = currenciesHtml;

            // Render treasuries
            const treasuriesHtml = CONFIG.symbols.treasuries
                .map(item => this.renderSignalCard(state.signals[item.symbol]))
                .join('');
            if (DOM.treasuriesSignals) DOM.treasuriesSignals.innerHTML = treasuriesHtml;

            // Render grains
            const grainsHtml = CONFIG.symbols.grains
                .map(item => this.renderSignalCard(state.signals[item.symbol]))
                .join('');
            if (DOM.grainsSignals) DOM.grainsSignals.innerHTML = grainsHtml;

            // Render livestock
            const livestockHtml = CONFIG.symbols.livestock
                .map(item => this.renderSignalCard(state.signals[item.symbol]))
                .join('');
            if (DOM.livestockSignals) DOM.livestockSignals.innerHTML = livestockHtml;

            // Add click handlers
            document.querySelectorAll('.signal-card').forEach(card => {
                card.addEventListener('click', () => {
                    const symbol = card.dataset.symbol;
                    this.showSignalDetail(symbol);
                });
            });
        },

        showSignalDetail(symbol) {
            const item = state.signals[symbol];
            if (!item) return;

            const { signal, name, description } = item;
            const decimals = utils.getDecimals(symbol);

            DOM.signalModalTitle.textContent = `${name} - ${description}`;

            DOM.signalModalBody.innerHTML = `
                <div class="detail-section">
                    <h3>Signal Overview</h3>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <span class="detail-label">Direction</span>
                            <span class="detail-value" style="color: var(--${signal.direction === 'LONG' ? 'success' : signal.direction === 'SHORT' ? 'danger' : 'neutral-color'})">
                                ${signal.direction}
                            </span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Confidence</span>
                            <span class="detail-value">${signal.confidence.toUpperCase()}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Confluence</span>
                            <span class="detail-value">${signal.confluenceScore}/${signal.totalFactors}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Current Price</span>
                            <span class="detail-value">${utils.formatPrice(signal.price, decimals)}</span>
                        </div>
                    </div>
                </div>

                <div class="detail-section">
                    <h3>Technical Indicators</h3>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <span class="detail-label">EMA Stack</span>
                            <span class="detail-value">${signal.indicators.ema?.signal || '--'}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">RSI (14)</span>
                            <span class="detail-value">${signal.indicators.rsi}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">MACD Histogram</span>
                            <span class="detail-value">${signal.indicators.macd?.histogram?.toFixed(2) || '--'}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">SuperTrend</span>
                            <span class="detail-value">${signal.indicators.supertrend?.trend || '--'}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">ADX</span>
                            <span class="detail-value">${signal.indicators.adx?.adx?.toFixed(1) || '--'}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">ATR</span>
                            <span class="detail-value">${signal.indicators.atr?.toFixed(decimals) || '--'}</span>
                        </div>
                    </div>
                </div>

                ${signal.direction !== 'NEUTRAL' ? `
                <div class="detail-section">
                    <h3>Trade Levels</h3>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <span class="detail-label">Entry</span>
                            <span class="detail-value" style="color: var(--accent-primary)">${utils.formatPrice(signal.levels.entry, decimals)}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Stop Loss</span>
                            <span class="detail-value" style="color: var(--danger)">${utils.formatPrice(signal.levels.sl, decimals)}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">TP1 (1.5R)</span>
                            <span class="detail-value" style="color: var(--success)">${utils.formatPrice(signal.levels.tp1, decimals)}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">TP2 (2.5R)</span>
                            <span class="detail-value" style="color: var(--success)">${utils.formatPrice(signal.levels.tp2, decimals)}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">TP3 (4R)</span>
                            <span class="detail-value" style="color: var(--success)">${utils.formatPrice(signal.levels.tp3, decimals)}</span>
                        </div>
                    </div>
                </div>
                ` : ''}

                <div class="detail-section">
                    <h3>Factor Analysis</h3>
                    <div style="display: flex; gap: 1rem; justify-content: center;">
                        <div style="text-align: center;">
                            <div style="font-size: 2rem; color: var(--success);">${signal.bullishCount}</div>
                            <div style="font-size: 0.75rem; color: var(--text-muted);">Bullish</div>
                        </div>
                        <div style="text-align: center;">
                            <div style="font-size: 2rem; color: var(--danger);">${signal.bearishCount}</div>
                            <div style="font-size: 0.75rem; color: var(--text-muted);">Bearish</div>
                        </div>
                        <div style="text-align: center;">
                            <div style="font-size: 2rem; color: var(--text-secondary);">${signal.totalFactors - signal.bullishCount - signal.bearishCount}</div>
                            <div style="font-size: 0.75rem; color: var(--text-muted);">Neutral</div>
                        </div>
                    </div>
                </div>
            `;

            DOM.signalModal.classList.add('active');
        },

        renderHistory() {
            if (state.history.length === 0) {
                DOM.historyList.innerHTML = `
                    <div class="history-empty">
                        <p>No signal history yet</p>
                        <p style="font-size: 0.8rem;">Signals will appear here when direction changes</p>
                    </div>
                `;
                return;
            }

            const historyHtml = state.history
                .slice(0, 50)
                .map(item => {
                    const decimals = utils.getDecimals(item.symbol);
                    return `
                        <div class="history-item ${item.direction.toLowerCase()}">
                            <span class="history-time">${utils.formatDateTime(new Date(item.timestamp))}</span>
                            <span class="history-symbol">${item.name}</span>
                            <span class="history-signal ${item.direction.toLowerCase()}">${item.direction}</span>
                            <span class="history-price">${utils.formatPrice(item.price, decimals)}</span>
                        </div>
                    `;
                })
                .join('');

            DOM.historyList.innerHTML = historyHtml;
        },

        updateStatus() {
            DOM.lastUpdate.textContent = state.lastUpdate 
                ? utils.formatTime(state.lastUpdate) 
                : '--:--:--';

            DOM.connectionStatus.textContent = state.isOnline ? 'Online' : 'Offline';
            DOM.connectionStatus.className = `status-value ${state.isOnline ? 'online' : 'offline'}`;
        },

        showLoading() {
            DOM.loadingOverlay.classList.remove('hidden');
        },

        hideLoading() {
            DOM.loadingOverlay.classList.add('hidden');
        },

        startCountdown() {
            if (state.countdownTimer) {
                clearInterval(state.countdownTimer);
            }

            state.nextRefresh = Date.now() + state.settings.refreshInterval;

            state.countdownTimer = setInterval(() => {
                const remaining = Math.max(0, state.nextRefresh - Date.now());
                const minutes = Math.floor(remaining / 60000);
                const seconds = Math.floor((remaining % 60000) / 1000);
                DOM.nextRefresh.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;

                if (remaining <= 0) {
                    clearInterval(state.countdownTimer);
                }
            }, 1000);
        }
    };

    // ==========================================
    // HISTORY MANAGER
    // ==========================================

    // ==========================================
    // NOTIFICATION MANAGER
    // ==========================================
    const NotificationManager = {
        async init() {
            if ('Notification' in window) {
                state.notificationPermission = Notification.permission;
            } else {
                state.notificationPermission = 'unsupported';
            }
            this.updatePermissionUI();
            this.loadPreviousSignals();
            if ('serviceWorker' in navigator) {
                navigator.serviceWorker.addEventListener('message', (event) => {
                    if (event.data && event.data.type === 'NOTIFICATION_CLICK') {
                        this.handleNotificationClick(event.data.payload);
                    }
                });
            }
        },

        async requestPermission() {
            if (!('Notification' in window)) return 'unsupported';
            try {
                const permission = await Notification.requestPermission();
                state.notificationPermission = permission;
                state.settings.notificationsEnabled = (permission === 'granted');
                SettingsManager.save();
                this.updatePermissionUI();
                if (permission === 'granted') this.showTestNotification();
                return permission;
            } catch (error) {
                console.error('Error requesting notification permission:', error);
                return 'denied';
            }
        },

        showTestNotification() {
            this.show({
                title: 'HWR Futures Pro',
                body: 'Notifications enabled! You will receive trading alerts.',
                icon: '/icons/icon-192.png',
                tag: 'test-notification',
                type: 'info'
            });
        },

        updatePermissionUI() {
            const bellBtn = document.getElementById('notificationBtn');
            const permissionStatus = document.getElementById('notificationPermissionStatus');
            const enableBtn = document.getElementById('enableNotificationsBtn');
            const notificationToggles = document.querySelectorAll('.notification-toggle');

            if (bellBtn) {
                bellBtn.classList.remove('granted', 'denied', 'default');
                bellBtn.classList.add(state.notificationPermission);
                const icon = bellBtn.querySelector('.icon');
                if (icon) {
                    icon.textContent = (state.notificationPermission === 'granted' && state.settings.notificationsEnabled) ? '🔔' : '🔕';
                }
            }

            if (permissionStatus) {
                const statusMap = {
                    'granted': { text: 'Enabled', class: 'status-granted' },
                    'denied': { text: 'Blocked', class: 'status-denied' },
                    'default': { text: 'Not Set', class: 'status-default' },
                    'unsupported': { text: 'Not Supported', class: 'status-denied' }
                };
                const status = statusMap[state.notificationPermission] || statusMap['default'];
                permissionStatus.textContent = status.text;
                permissionStatus.className = 'permission-status ' + status.class;
            }

            if (enableBtn) {
                if (state.notificationPermission === 'granted') {
                    enableBtn.textContent = 'Notifications Enabled';
                    enableBtn.disabled = true;
                    enableBtn.classList.add('enabled');
                } else if (state.notificationPermission === 'denied') {
                    enableBtn.textContent = 'Blocked (Check Browser Settings)';
                    enableBtn.disabled = true;
                    enableBtn.classList.add('blocked');
                } else {
                    enableBtn.textContent = 'Enable Notifications';
                    enableBtn.disabled = false;
                    enableBtn.classList.remove('enabled', 'blocked');
                }
            }
            notificationToggles.forEach(toggle => {
                toggle.disabled = state.notificationPermission !== 'granted';
            });
        },

        async show(options) {
            if (!state.settings.notificationsEnabled || state.notificationPermission !== 'granted') return;
            const { title, body, icon, tag, type, data } = options;
            if (state.settings.notificationSound) this.playNotificationSound(type);
            try {
                if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
                    const registration = await navigator.serviceWorker.ready;
                    await registration.showNotification(title, {
                        body,
                        icon: icon || '/icons/icon-192.png',
                        badge: '/icons/icon-192.png',
                        tag: tag || 'hwr-notification',
                        data: data || {},
                        vibrate: state.settings.vibrationAlerts ? [200, 100, 200] : undefined,
                        requireInteraction: type === 'direction-change' || type === 'high-confluence'
                    });
                } else {
                    new Notification(title, { body, icon: icon || '/icons/icon-192.png', tag: tag || 'hwr-notification' });
                }
            } catch (error) {
                console.error('Error showing notification:', error);
            }
        },

        playNotificationSound(type) {
            try {
                const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();
                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);
                switch (type) {
                    case 'direction-change':
                        oscillator.frequency.value = 880;
                        gainNode.gain.value = 0.4;
                        oscillator.start();
                        oscillator.stop(audioContext.currentTime + 0.15);
                        setTimeout(() => {
                            try {
                                const osc2 = audioContext.createOscillator();
                                const gain2 = audioContext.createGain();
                                osc2.connect(gain2);
                                gain2.connect(audioContext.destination);
                                osc2.frequency.value = 1100;
                                gain2.gain.value = 0.4;
                                osc2.start();
                                osc2.stop(audioContext.currentTime + 0.15);
                            } catch(e) {}
                        }, 200);
                        break;
                    case 'high-confluence':
                        oscillator.frequency.value = 660;
                        oscillator.type = 'triangle';
                        gainNode.gain.value = 0.35;
                        oscillator.start();
                        oscillator.stop(audioContext.currentTime + 0.3);
                        break;
                    case 'price-alert':
                        oscillator.frequency.value = 440;
                        oscillator.type = 'square';
                        gainNode.gain.value = 0.2;
                        oscillator.start();
                        oscillator.stop(audioContext.currentTime + 0.1);
                        break;
                    default:
                        oscillator.frequency.value = 800;
                        gainNode.gain.value = 0.3;
                        oscillator.start();
                        oscillator.stop(audioContext.currentTime + 0.2);
                }
            } catch (e) { console.log('Audio not available'); }
        },

        savePreviousSignals() {
            const signalSnapshot = {};
            Object.keys(state.signals).forEach(symbol => {
                const sig = state.signals[symbol];
                if (sig && sig.signal) {
                    signalSnapshot[symbol] = {
                        direction: sig.signal.direction,
                        confluenceScore: sig.signal.confluenceScore,
                        price: sig.signal.price,
                        levels: sig.signal.levels ? { ...sig.signal.levels } : null,
                        timestamp: Date.now()
                    };
                }
            });
            state.previousSignals = signalSnapshot;
            try { localStorage.setItem('hwr_previous_signals', JSON.stringify(signalSnapshot)); } catch (e) {}
        },

        loadPreviousSignals() {
            try {
                const saved = localStorage.getItem('hwr_previous_signals');
                if (saved) state.previousSignals = JSON.parse(saved);
            } catch (e) {}
        },

        checkSignalChanges(newSignals) {
            if (!state.settings.notificationsEnabled || state.notificationPermission !== 'granted') {
                this.savePreviousSignals();
                return;
            }
            Object.keys(newSignals).forEach(symbol => {
                const newSig = newSignals[symbol];
                const prevSig = state.previousSignals[symbol];
                if (!newSig || !newSig.signal) return;
                const current = newSig.signal;
                const symbolInfo = this.getSymbolInfo(symbol);
                const displayName = symbolInfo ? `${symbolInfo.icon} ${symbolInfo.name}` : symbol;

                if (state.settings.notifyDirectionChange && prevSig) {
                    if (prevSig.direction !== current.direction && current.direction !== 'NEUTRAL' && prevSig.direction !== 'NEUTRAL') {
                        this.show({
                            title: `🔄 Direction Change: ${displayName}`,
                            body: `${prevSig.direction} → ${current.direction} @ ${utils.formatPrice(current.price, 2)}
Confluence: ${current.confluenceScore}/${current.totalFactors || 6}`,
                            tag: `direction-${symbol}`,
                            type: 'direction-change',
                            data: { symbol, type: 'direction-change' }
                        });
                    }
                }

                if (state.settings.notifyHighConfluence) {
                    const threshold = state.settings.highConfluenceThreshold || 5;
                    const wasHighConfluence = prevSig && prevSig.confluenceScore >= threshold;
                    const isHighConfluence = current.confluenceScore >= threshold;
                    if (isHighConfluence && !wasHighConfluence && current.direction !== 'NEUTRAL') {
                        this.show({
                            title: `⭐ High Confluence: ${displayName}`,
                            body: `${current.direction} signal with ${current.confluenceScore}/${current.totalFactors || 6} factors
Price: ${utils.formatPrice(current.price, 2)}`,
                            tag: `confluence-${symbol}`,
                            type: 'high-confluence',
                            data: { symbol, type: 'high-confluence' }
                        });
                    }
                }

                if (state.settings.notifyPriceAlerts && current.levels) {
                    this.checkPriceAlerts(symbol, displayName, current);
                }
            });
            this.savePreviousSignals();
        },

        checkPriceAlerts(symbol, displayName, current) {
            if (!current.levels || current.direction === 'NEUTRAL') return;
            const price = current.price;
            const levels = current.levels;
            if (!state.priceAlerts[symbol]) state.priceAlerts[symbol] = { tp1: false, tp2: false, tp3: false, sl: false };
            const alerts = state.priceAlerts[symbol];
            const proximityThreshold = 0.005;

            if (levels.tp1 && !alerts.tp1 && Math.abs(price - levels.tp1) / levels.tp1 <= proximityThreshold) {
                alerts.tp1 = true;
                this.show({ title: `🎯 Approaching TP1: ${displayName}`, body: `Price ${utils.formatPrice(price, 2)} near TP1 ${utils.formatPrice(levels.tp1, 2)}`, tag: `price-tp1-${symbol}`, type: 'price-alert', data: { symbol, level: 'tp1' } });
            }
            if (levels.tp2 && !alerts.tp2 && Math.abs(price - levels.tp2) / levels.tp2 <= proximityThreshold) {
                alerts.tp2 = true;
                this.show({ title: `🎯 Approaching TP2: ${displayName}`, body: `Price ${utils.formatPrice(price, 2)} near TP2 ${utils.formatPrice(levels.tp2, 2)}`, tag: `price-tp2-${symbol}`, type: 'price-alert', data: { symbol, level: 'tp2' } });
            }
            if (levels.sl && !alerts.sl && Math.abs(price - levels.sl) / levels.sl <= proximityThreshold) {
                alerts.sl = true;
                this.show({ title: `⚠️ Approaching Stop Loss: ${displayName}`, body: `Price ${utils.formatPrice(price, 2)} near SL ${utils.formatPrice(levels.sl, 2)}`, tag: `price-sl-${symbol}`, type: 'price-alert', data: { symbol, level: 'sl' } });
            }
            ['tp1', 'tp2', 'sl'].forEach(level => {
                if (levels[level] && alerts[level] && Math.abs(price - levels[level]) / levels[level] > proximityThreshold * 3) alerts[level] = false;
            });
        },

        getSymbolInfo(symbol) {
            const allSymbols = [...CONFIG.symbols.indices, ...CONFIG.symbols.metals, ...CONFIG.symbols.energy, ...CONFIG.symbols.currencies, ...CONFIG.symbols.treasuries, ...CONFIG.symbols.grains, ...CONFIG.symbols.livestock];
            return allSymbols.find(s => s.symbol === symbol);
        },

        handleNotificationClick(data) {
            if (data && data.symbol) {
                const card = document.querySelector(`.signal-card[data-symbol="${data.symbol}"]`);
                if (card) card.click();
            }
        }
    };

    const HistoryManager = {
        previousSignals: {},

        checkForChanges(newSignals) {
            Object.entries(newSignals).forEach(([symbol, item]) => {
                const prevDirection = this.previousSignals[symbol];
                const newDirection = item.signal.direction;

                if (prevDirection && prevDirection !== newDirection && newDirection !== 'NEUTRAL') {
                    this.addToHistory(item);
                    this.notifyUser(item);
                }

                this.previousSignals[symbol] = newDirection;
            });
        },

        addToHistory(item) {
            state.history.unshift({
                symbol: item.symbol,
                name: item.name,
                direction: item.signal.direction,
                price: item.signal.price,
                confluenceScore: item.signal.confluenceScore,
                timestamp: new Date().toISOString()
            });

            // Keep only last 100 entries
            if (state.history.length > 100) {
                state.history = state.history.slice(0, 100);
            }

            this.saveHistory();
            UI.renderHistory();
        },

        notifyUser(item) {
            // Sound alert
            if (state.settings.soundAlerts) {
                this.playSound();
            }

            // Vibration alert
            if (state.settings.vibrationAlerts && navigator.vibrate) {
                navigator.vibrate([200, 100, 200]);
            }
        },

        playSound() {
            try {
                const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();

                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);

                oscillator.frequency.value = 800;
                oscillator.type = 'sine';
                gainNode.gain.value = 0.3;

                oscillator.start();
                oscillator.stop(audioContext.currentTime + 0.2);
            } catch (e) {
                console.log('Audio not available');
            }
        },

        saveHistory() {
            try {
                localStorage.setItem('hwr_history', JSON.stringify(state.history));
            } catch (e) {
                console.error('Failed to save history:', e);
            }
        },

        loadHistory() {
            try {
                const saved = localStorage.getItem('hwr_history');
                if (saved) {
                    state.history = JSON.parse(saved);
                }
            } catch (e) {
                console.error('Failed to load history:', e);
            }
        },

        clearHistory() {
            state.history = [];
            localStorage.removeItem('hwr_history');
            UI.renderHistory();
        }
    };

    // ==========================================
    // SETTINGS MANAGER
    // ==========================================
    const SettingsManager = {
        load() {
            try {
                const saved = localStorage.getItem('hwr_settings');
                if (saved) {
                    state.settings = { ...CONFIG.defaults, ...JSON.parse(saved) };
                }
            } catch (e) {
                console.error('Failed to load settings:', e);
            }
            this.applyToUI();
        },

        save() {
            try {
                localStorage.setItem('hwr_settings', JSON.stringify(state.settings));
            } catch (e) {
                console.error('Failed to save settings:', e);
            }
        },

        applyToUI() {
            document.getElementById('refreshInterval').value = state.settings.refreshInterval;
            document.getElementById('confluenceThreshold').value = state.settings.confluenceThreshold;

            // Apply notification settings to UI
            const notifyDirection = document.getElementById('notifyDirectionChange');
            const notifyConfluence = document.getElementById('notifyHighConfluence');
            const notifyPrice = document.getElementById('notifyPriceAlerts');
            const notifySound = document.getElementById('notificationSound');
            const confluenceThresholdNotify = document.getElementById('highConfluenceThreshold');

            if (notifyDirection) notifyDirection.checked = state.settings.notifyDirectionChange;
            if (notifyConfluence) notifyConfluence.checked = state.settings.notifyHighConfluence;
            if (notifyPrice) notifyPrice.checked = state.settings.notifyPriceAlerts;
            if (notifySound) notifySound.checked = state.settings.notificationSound;
            if (confluenceThresholdNotify) confluenceThresholdNotify.value = state.settings.highConfluenceThreshold;
            document.getElementById('riskPercent').value = state.settings.riskPercent;
            document.getElementById('soundAlerts').checked = state.settings.soundAlerts;
            document.getElementById('vibrationAlerts').checked = state.settings.vibrationAlerts;
        },

        readFromUI() {
            state.settings.refreshInterval = parseInt(document.getElementById('refreshInterval').value);
            state.settings.confluenceThreshold = parseInt(document.getElementById('confluenceThreshold').value);
            state.settings.riskPercent = parseFloat(document.getElementById('riskPercent').value);
            state.settings.soundAlerts = document.getElementById('soundAlerts').checked;
            state.settings.vibrationAlerts = document.getElementById('vibrationAlerts').checked;

            // Read notification settings
            const notifyDirection = document.getElementById('notifyDirectionChange');
            const notifyConfluence = document.getElementById('notifyHighConfluence');
            const notifyPrice = document.getElementById('notifyPriceAlerts');
            const notifySound = document.getElementById('notificationSound');
            const confluenceThresholdNotify = document.getElementById('highConfluenceThreshold');

            if (notifyDirection) state.settings.notifyDirectionChange = notifyDirection.checked;
            if (notifyConfluence) state.settings.notifyHighConfluence = notifyConfluence.checked;
            if (notifyPrice) state.settings.notifyPriceAlerts = notifyPrice.checked;
            if (notifySound) state.settings.notificationSound = notifySound.checked;
            if (confluenceThresholdNotify) state.settings.highConfluenceThreshold = parseInt(confluenceThresholdNotify.value);

            // Update notification UI
            NotificationManager.updatePermissionUI();
        }
    };

    // ==========================================
    // PWA MANAGER
    // ==========================================
    const PWAManager = {
        deferredPrompt: null,

        init() {
            // Handle install prompt
            window.addEventListener('beforeinstallprompt', (e) => {
                e.preventDefault();
                this.deferredPrompt = e;
                DOM.installPrompt.classList.remove('hidden');
            });

            // Install button handler
            document.getElementById('installBtn').addEventListener('click', async () => {
                if (!this.deferredPrompt) return;

                this.deferredPrompt.prompt();
                const { outcome } = await this.deferredPrompt.userChoice;
                console.log('Install outcome:', outcome);
                this.deferredPrompt = null;
                DOM.installPrompt.classList.add('hidden');
            });

            // Dismiss install prompt
            document.getElementById('dismissInstall').addEventListener('click', () => {
                DOM.installPrompt.classList.add('hidden');
            });

            // Handle app installed
            window.addEventListener('appinstalled', () => {
                console.log('App installed');
                DOM.installPrompt.classList.add('hidden');
            });
        }
    };

    // ==========================================
    // MAIN APP CONTROLLER
    // ==========================================
    const App = {
        async init() {
            console.log('HWR Futures Pro v2.0 initializing...');

            // Initialize PWA
            PWAManager.init();

            // Load saved data
            SettingsManager.load();
            HistoryManager.loadHistory();
            NotificationManager.init();

            // Setup event listeners
            this.setupEventListeners();

            // Initial data fetch
            await this.refreshData();

            // Start auto-refresh
            this.startAutoRefresh();

            // Online/offline handling
            window.addEventListener('online', () => {
                state.isOnline = true;
                UI.updateStatus();
                this.refreshData();
            });

            window.addEventListener('offline', () => {
                state.isOnline = false;
                UI.updateStatus();
            });

            console.log('App initialized successfully');
        },

        setupEventListeners() {
            // Tab navigation
            document.querySelectorAll('.tab-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

                    btn.classList.add('active');
                    document.getElementById(`${btn.dataset.tab}-tab`).classList.add('active');
                });
            });

            // Refresh button
            document.getElementById('refreshBtn').addEventListener('click', () => {
                this.refreshData();
            });

            // Settings modal
            document.getElementById('settingsBtn').addEventListener('click', () => {
                DOM.settingsModal.classList.add('active');
            });

            document.getElementById('closeSettings').addEventListener('click', () => {
                DOM.settingsModal.classList.remove('active');
            });

            document.getElementById('saveSettings').addEventListener('click', () => {
                SettingsManager.readFromUI();
                SettingsManager.save();
                this.restartAutoRefresh();
                DOM.settingsModal.classList.remove('active');
            });

            // Signal modal
            document.getElementById('closeSignal').addEventListener('click', () => {
                DOM.signalModal.classList.remove('active');
            });

            // Close modals on backdrop click
            [DOM.settingsModal, DOM.signalModal].forEach(modal => {
                modal.addEventListener('click', (e) => {
                    if (e.target === modal) {
                        modal.classList.remove('active');
                    }
                });
            });

            // Clear history
            document.getElementById('clearHistoryBtn').addEventListener('click', () => {
                if (confirm('Clear all signal history?')) {
                    HistoryManager.clearHistory();
                }
            });

            // Notification button
            const notificationBtn = document.getElementById('notificationBtn');
            if (notificationBtn) {
                notificationBtn.addEventListener('click', () => {
                    if (state.notificationPermission === 'granted') {
                        // Toggle notifications on/off
                        state.settings.notificationsEnabled = !state.settings.notificationsEnabled;
                        SettingsManager.save();
                        NotificationManager.updatePermissionUI();
                    } else if (state.notificationPermission === 'default') {
                        // Request permission
                        NotificationManager.requestPermission();
                    } else {
                        // Show message about blocked notifications
                        alert('Notifications are blocked. Please enable them in your browser settings.');
                    }
                });
            }

            // Enable notifications button in settings
            const enableNotificationsBtn = document.getElementById('enableNotificationsBtn');
            if (enableNotificationsBtn) {
                enableNotificationsBtn.addEventListener('click', () => {
                    NotificationManager.requestPermission();
                });
            }
        },

        async refreshData() {
            if (state.isLoading) return;

            state.isLoading = true;
            UI.showLoading();

            try {
                const signals = await DataFetcher.fetchAllSymbols();
                state.signals = signals;
                state.lastUpdate = new Date();

                // Check for signal changes
                HistoryManager.checkForChanges(signals);

                // Check for notification-worthy changes
                NotificationManager.checkSignalChanges(signals);

                // Update UI
                UI.renderSignals();
                UI.renderHistory();
                UI.updateStatus();
                UI.startCountdown();

            } catch (error) {
                console.error('Failed to refresh data:', error);
            } finally {
                state.isLoading = false;
                UI.hideLoading();
            }
        },

        startAutoRefresh() {
            if (state.refreshTimer) {
                clearInterval(state.refreshTimer);
            }

            state.refreshTimer = setInterval(() => {
                if (state.isOnline) {
                    this.refreshData();
                }
            }, state.settings.refreshInterval);

            UI.startCountdown();
        },

        restartAutoRefresh() {
            this.startAutoRefresh();
        }
    };

    // ==========================================
    // INITIALIZE APP
    // ==========================================
    document.addEventListener('DOMContentLoaded', () => {
        App.init();
    });

})();
