"use client"

import React, { useState } from 'react';
import { Search, Shield, AlertTriangle, TrendingUp, Eye, Download, Filter, Network, Activity, DollarSign, Users, Zap, Lock } from 'lucide-react';

const CryptoTracker = () => {
  const [searchAddress, setSearchAddress] = useState('');
  const [analysisResults, setAnalysisResults] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [error, setError] = useState(null);

  // Configure your API endpoint here
  const API_BASE_URL = 'http://localhost:3001/transactions'; // Replace with your actual API

  // Suspicious activity detection algorithms
  const analyzeTransactions = (data) => {
    const transactions = data.transactions || [];
    const suspiciousPatterns = [];
    let riskScore = 0;

    // 1. Round number transactions detection
    const roundNumberTxs = transactions.filter(tx => 
      tx.valueETH % 1 === 0 && tx.valueETH > 0
    );
    if (roundNumberTxs.length > 5) {
      suspiciousPatterns.push({
        type: "Round Number Transactions",
        count: roundNumberTxs.length,
        severity: roundNumberTxs.length > 10 ? "High" : "Medium"
      });
      riskScore += roundNumberTxs.length > 10 ? 2 : 1;
    }

    // 2. High volume transactions (potential money laundering)
    const highVolumeTxs = transactions.filter(tx => tx.valueETH > 1000);
    if (highVolumeTxs.length > 0) {
      suspiciousPatterns.push({
        type: "High Volume Transactions",
        count: highVolumeTxs.length,
        severity: highVolumeTxs.length > 5 ? "Critical" : "High"
      });
      riskScore += highVolumeTxs.length > 5 ? 3 : 2;
    }

    // 3. Rapid transaction chains (potential automated trading/mixing)
    const rapidChains = transactions.reduce((acc, tx, index) => {
      if (index === 0) return acc;
      const prevTx = transactions[index - 1];
      const timeDiff = new Date(tx.timestamp) - new Date(prevTx.timestamp);
      if (Math.abs(timeDiff) < 300000) acc++; // Less than 5 minutes
      return acc;
    }, 0);

    if (rapidChains > 5) {
      suspiciousPatterns.push({
        type: "Rapid Transaction Chains",
        count: rapidChains,
        severity: rapidChains > 10 ? "Critical" : "High"
      });
      riskScore += rapidChains > 10 ? 3 : 2;
    }

    // 4. Frequent small transactions (potential structuring to avoid detection)
    const smallTxs = transactions.filter(tx => tx.valueETH > 0 && tx.valueETH < 10);
    if (smallTxs.length > 20) {
      suspiciousPatterns.push({
        type: "Potential Structuring Pattern",
        count: smallTxs.length,
        severity: "Medium"
      });
      riskScore += 1;
    }

    // 5. Multiple same-block transactions (potential coordination)
    const blockGroups = transactions.reduce((acc, tx) => {
      acc[tx.blockNumber] = (acc[tx.blockNumber] || 0) + 1;
      return acc;
    }, {});
    
    const sameBlockCount = Object.values(blockGroups).filter(count => count > 1).length;
    if (sameBlockCount > 3) {
      suspiciousPatterns.push({
        type: "Same-Block Transaction Batching",
        count: sameBlockCount,
        severity: "Medium"
      });
      riskScore += 1;
    }

    // 6. Peeling chain pattern detection
    let peelingCount = 0;
    for (let i = 1; i < transactions.length; i++) {
      const current = transactions[i];
      const previous = transactions[i - 1];
      if (current.valueETH < previous.valueETH && 
          current.valueETH / previous.valueETH < 0.1) {
        peelingCount++;
      }
    }

    if (peelingCount > 5) {
      suspiciousPatterns.push({
        type: "Peeling Chain Pattern",
        count: peelingCount,
        severity: "High"
      });
      riskScore += 2;
    }

    // Calculate final risk score (0-10 scale)
    riskScore = Math.min(riskScore, 10);
    
    let classification = "LOW RISK";
    if (riskScore >= 7) classification = "HIGH RISK";
    else if (riskScore >= 4) classification = "MEDIUM RISK";

    return {
      riskScore: parseFloat(riskScore.toFixed(1)),
      classification,
      suspiciousPatterns
    };
  };

  // Calculate statistics from real data
  const calculateStats = (data) => {
    const transactions = data.transactions || [];
    
    const totalVolume = transactions
      .reduce((sum, tx) => sum + (parseFloat(tx.valueETH) || 0), 0)
      .toFixed(2);

    const uniqueAddresses = new Set();
    transactions.forEach(tx => {
      if (tx.from) uniqueAddresses.add(tx.from.toLowerCase());
      if (tx.to) uniqueAddresses.add(tx.to.toLowerCase());
    });

    const sortedTxs = [...transactions].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    const firstTx = sortedTxs[0];
    const lastTx = sortedTxs[sortedTxs.length - 1];

    return {
      totalTransactions: data.totalTransactions || transactions.length,
      totalVolume: `${totalVolume} ETH`,
      connectedAddresses: uniqueAddresses.size,
      firstSeen: firstTx ? new Date(firstTx.timestamp).toISOString().split('T')[0] : 'Unknown',
      lastActivity: lastTx ? new Date(lastTx.timestamp).toISOString().split('T')[0] : 'Unknown',
      blockHeight: lastTx ? lastTx.blockNumber : 'Unknown'
    };
  };

  // Format transactions for display
  const formatTransactions = (transactions) => {
    return transactions.slice(0, 10).map(tx => {
      const value = parseFloat(tx.valueETH) || 0;
      let risk = 'low';
      if (value > 1000) risk = 'high';
      else if (value > 100) risk = 'medium';
      else if (value === 0) risk = 'low'; // Smart contract interactions

      return {
        hash: tx.hash,
        amount: `${value} ETH`,
        timestamp: new Date(tx.timestamp).toLocaleString(),
        risk: risk,
        block: tx.blockNumber,
        from: tx.from,
        to: tx.to
      };
    });
  };

  const fetchAddressData = async (address) => {
    try {
      const response = await fetch(`${API_BASE_URL}/${address}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      console.log(response)

      if (!response.ok) {
        console.log(`API Error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data;

    } catch (apiError) {
      console.error('Primary API failed:', apiError);
      
      // Method 2: Fallback to Etherscan API (if available)
      try {
        const etherscanKey = 'YOUR_ETHERSCAN_API_KEY'; // Replace with your key
        const etherscanUrl = `https://api.etherscan.io/api?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&page=1&offset=100&sort=desc&apikey=${etherscanKey}`;
        
        const fallbackResponse = await fetch(etherscanUrl);
        const fallbackData = await fallbackResponse.json();
        
        if (fallbackData.status === '1') {
          // Transform Etherscan format to your expected format
          return {
            address: address,
            totalTransactions: fallbackData.result.length,
            transactions: fallbackData.result.map(tx => ({
              hash: tx.hash,
              blockNumber: tx.blockNumber,
              from: tx.from,
              to: tx.to,
              valueETH: parseFloat(tx.value) / Math.pow(10, 18), // Convert wei to ETH
              timestamp: new Date(parseInt(tx.timeStamp) * 1000).toISOString()
            }))
          };
        }
        console.log('Etherscan API returned error');
       } catch (fallbackError) {
         console.error('Fallback API also failed:', fallbackError);
         console.log('All API endpoints failed. Please check your configuration.');
         return null;
       }
    }
  };

  const handleSearch = async () => {
    if (!searchAddress.trim()) {
      setError('Please enter a valid Ethereum address');
      return;
    }
    
    // Basic address validation
    if (!/^0x[a-fA-F0-9]{40}$/.test(searchAddress.trim())) {
      setError('Please enter a valid Ethereum address (0x followed by 40 hex characters)');
      return;
    }
    
    setIsAnalyzing(true);
    setError(null);
    setAnalysisResults(null);
    
    try {
      console.log('Fetching data for address:', searchAddress);
      const apiData = await fetchAddressData(searchAddress.trim());
      
      console.log('API Response:', apiData);
      
      // Validate API response
      if (!apiData) {
        console.log('No data received from API');
      }
      
      if (typeof apiData !== 'object') {
        console.log('Invalid data format received from API');
      }
      
      // Ensure we have some data to work with
      const hasTransactions = apiData.transactions && Array.isArray(apiData.transactions) && apiData.transactions.length > 0;
      
      if (!hasTransactions) {
        console.warn('No transactions found for this address');
        setAnalysisResults({
          address: apiData.address || searchAddress,
          totalTransactions: 0,
          totalVolume: '0 ETH',
          connectedAddresses: 0,
          firstSeen: 'No activity',
          lastActivity: 'No activity',
          blockHeight: 'Unknown',
          riskScore: 0,
          classification: 'NO DATA',
          suspiciousPatterns: [],
          recentTransactions: [],
          confirmations: 0,
          rawData: apiData
        });
        return;
      }
      
      // Analyze the fetched data
      const suspiciousAnalysis = analyzeTransactions(apiData);
      const stats = calculateStats(apiData);
      const formattedTransactions = formatTransactions(apiData.transactions || []);
      
      // Combine all analysis results
      const results = {
        address: apiData.address || searchAddress,
        ...stats,
        ...suspiciousAnalysis,
        recentTransactions: formattedTransactions,
        confirmations: 6, // This would come from latest block data
        rawData: apiData // Store raw data for debugging
      };
      
      console.log('Analysis Results:', results);
      setAnalysisResults(results);
      
    } catch (err) {
      console.error('Analysis failed:', err);
      setError(err.message || 'Failed to analyze address. Please check your API configuration and try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getRiskColor = (risk) => {
    switch(risk) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getSeverityColor = (severity) => {
    switch(severity.toLowerCase()) {
      case 'critical': return 'text-red-700 bg-red-100 border-red-300';
      case 'high': return 'text-orange-700 bg-orange-100 border-orange-300';
      case 'medium': return 'text-yellow-700 bg-yellow-100 border-yellow-300';
      default: return 'text-gray-700 bg-gray-100 border-gray-300';
    }
  };

  // Blockchain visualization component
  const BlockchainVisual = () => (
    <div className="flex items-center space-x-2 overflow-x-auto py-4">
      {[1, 2, 3, 4, 5].map((block, index) => (
        <div key={block} className="flex items-center">
          <div className={`w-16 h-16 border-2 ${index === 4 ? 'border-red-500 bg-red-50' : 'border-gray-400 bg-white'} flex flex-col items-center justify-center text-xs font-mono flex-shrink-0`}>
            <Lock className="h-3 w-3 mb-1" />
            <span>#{parseInt(analysisResults?.blockHeight || '812450') + index}</span>
            <span className="text-xs">{3 - index}tx</span>
          </div>
          {index < 4 && (
            <div className="w-8 h-0.5 bg-gray-400 flex-shrink-0"></div>
          )}
        </div>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-black border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white rounded flex items-center justify-center">
                <Shield className="h-6 w-6 text-black" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">CryptoTracker Pro</h1>
                <p className="text-xs text-gray-300">Narcotics Control Bureau</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button className="text-white hover:text-gray-300 transition-colors">
                <Download className="h-5 w-5" />
              </button>
              <button className="text-white hover:text-gray-300 transition-colors">
                <Filter className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Blockchain Header Visual */}
        <div className="mb-8">
          <div className="bg-gray-50 border-2 border-gray-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-black flex items-center">
                <Zap className="h-5 w-5 mr-2" />
                Live Blockchain Analysis
              </h2>
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span>Block Height: {analysisResults?.blockHeight || 'Unknown'}</span>
              </div>
            </div>
            <BlockchainVisual />
          </div>
        </div>

        {/* Search Section */}
        <div className="mb-8">
          <div className="bg-black border-2 border-gray-800 rounded-lg p-6">
            <h2 className="text-2xl font-bold text-white mb-6">Blockchain Address Analysis</h2>
            <div className="flex gap-4">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Enter Ethereum address (0x...)"
                  value={searchAddress}
                  onChange={(e) => setSearchAddress(e.target.value)}
                  className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-lg text-black placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-black focus:border-black"
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>
              <button
                onClick={handleSearch}
                disabled={isAnalyzing}
                className="px-8 py-3 bg-white text-black border-2 border-white rounded-lg hover:bg-gray-100 transition-all duration-200 flex items-center gap-2 disabled:opacity-50 font-semibold"
              >
                {isAnalyzing ? (
                  <div className="animate-spin h-5 w-5 border-2 border-black border-t-transparent rounded-full"></div>
                ) : (
                  <Search className="h-5 w-5" />
                )}
                {isAnalyzing ? 'Analyzing...' : 'Analyze'}
              </button>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-8 bg-red-50 border-2 border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
              <p className="text-red-800 font-semibold">Error: {error}</p>
            </div>
          </div>
        )}

        {/* Results Section */}
        {analysisResults && (
          <div className="space-y-6">
            {/* Risk Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white border-2 border-gray-800 rounded-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm font-semibold">Risk Score</p>
                    <p className="text-3xl font-bold text-red-600">{analysisResults.riskScore}/10</p>
                  </div>
                  <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                    <AlertTriangle className="h-6 w-6 text-red-600" />
                  </div>
                </div>
                <div className={`mt-3 px-3 py-1 rounded-full text-xs font-bold border-2 ${analysisResults.classification === 'HIGH RISK' ? 'bg-red-100 text-red-700 border-red-300' : analysisResults.classification === 'MEDIUM RISK' ? 'bg-yellow-100 text-yellow-700 border-yellow-300' : 'bg-green-100 text-green-700 border-green-300'}`}>
                  {analysisResults.classification}
                </div>
              </div>

              <div className="bg-white border-2 border-gray-300 rounded-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm font-semibold">Total Volume</p>
                    <p className="text-2xl font-bold text-black">{analysisResults.totalVolume}</p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <DollarSign className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white border-2 border-gray-300 rounded-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm font-semibold">Transactions</p>
                    <p className="text-2xl font-bold text-black">{analysisResults.totalTransactions}</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Activity className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white border-2 border-gray-300 rounded-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm font-semibold">Connected</p>
                    <p className="text-2xl font-bold text-black">{analysisResults.connectedAddresses}</p>
                  </div>
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Users className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
              </div>
            </div>

            {/* Tab Navigation */}
            <div className="bg-white border-2 border-gray-300 rounded-lg overflow-hidden">
              <div className="flex border-b-2 border-gray-200">
                {['overview', 'patterns', 'transactions', 'network'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-6 py-4 text-sm font-bold capitalize transition-colors border-b-2 ${
                      activeTab === tab
                        ? 'bg-black text-white border-black'
                        : 'text-gray-600 hover:text-black hover:bg-gray-50 border-transparent'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              <div className="p-6">
                {/* Overview Tab */}
                {activeTab === 'overview' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-bold text-black mb-4">Address Information</h3>
                      <div className="bg-gray-50 border-2 border-gray-200 rounded-lg p-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-gray-600 font-semibold">Address:</span>
                            <p className="text-black font-mono text-xs break-all mt-1 bg-white p-2 border border-gray-200 rounded">{analysisResults.address}</p>
                          </div>
                          <div>
                            <span className="text-gray-600 font-semibold">Block Height:</span>
                            <p className="text-black font-mono">{analysisResults.blockHeight}</p>
                          </div>
                          <div>
                            <span className="text-gray-600 font-semibold">First Seen:</span>
                            <p className="text-black">{analysisResults.firstSeen}</p>
                          </div>
                          <div>
                            <span className="text-gray-600 font-semibold">Last Activity:</span>
                            <p className="text-black">{analysisResults.lastActivity}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Patterns Tab */}
                {activeTab === 'patterns' && (
                  <div>
                    <h3 className="text-lg font-bold text-black mb-4">Suspicious Patterns Detected</h3>
                    {analysisResults.suspiciousPatterns && analysisResults.suspiciousPatterns.length > 0 ? (
                      <div className="space-y-3">
                        {analysisResults.suspiciousPatterns.map((pattern, index) => (
                          <div key={index} className={`p-4 rounded-lg border-2 ${getSeverityColor(pattern.severity)}`}>
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="font-bold">{pattern.type}</h4>
                                <p className="text-sm opacity-80">Detected {pattern.count} instances</p>
                              </div>
                              <span className={`px-3 py-1 rounded-full text-xs font-bold border-2 ${getSeverityColor(pattern.severity)}`}>
                                {pattern.severity}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
                        <p className="text-green-800">No suspicious patterns detected in the analyzed transactions.</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Transactions Tab */}
                {activeTab === 'transactions' && (
                  <div>
                    <h3 className="text-lg font-bold text-black mb-4">Recent Transactions</h3>
                    {analysisResults.recentTransactions && analysisResults.recentTransactions.length > 0 ? (
                      <div className="space-y-3">
                        {analysisResults.recentTransactions.map((tx, index) => (
                          <div key={index} className="bg-gray-50 border-2 border-gray-200 rounded-lg p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <p className="text-black font-mono text-sm bg-white p-2 border border-gray-200 rounded break-all">{tx.hash}</p>
                                <div className="mt-2 flex items-center space-x-4 text-sm text-gray-600">
                                  <span>{tx.timestamp}</span>
                                  <span>Block: #{tx.block}</span>
                                </div>
                                <div className="mt-1 text-xs text-gray-500">
                                  <div>From: {tx.from}</div>
                                  <div>To: {tx.to}</div>
                                </div>
                              </div>
                              <div className="text-right ml-4">
                                <p className="text-black font-bold text-lg">{tx.amount}</p>
                                <span className={`px-3 py-1 rounded-full text-xs font-bold border-2 ${getRiskColor(tx.risk)}`}>
                                  {tx.risk.toUpperCase()}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="bg-gray-50 border-2 border-gray-200 rounded-lg p-4">
                        <p className="text-gray-600">No transaction data available.</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Network Tab */}
                {activeTab === 'network' && (
                  <div>
                    <h3 className="text-lg font-bold text-black mb-4">Network Visualization</h3>
                    <div className="bg-gray-50 border-2 border-gray-200 rounded-lg p-8 text-center">
                      <div className="w-16 h-16 bg-black rounded-lg mx-auto mb-4 flex items-center justify-center">
                        <Network className="h-8 w-8 text-white" />
                      </div>
                      <p className="text-gray-700 font-semibold">Interactive Blockchain Network Graph</p>
                      <p className="text-gray-500 text-sm mt-2">Showing transaction flows and connected addresses</p>
                      
                      {/* Simple network representation */}
                      <div className="mt-6 flex justify-center items-center space-x-4">
                        <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold">A</div>
                        <div className="w-12 h-0.5 bg-gray-400"></div>
                        <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center text-white text-xs font-bold">B</div>
                        <div className="w-12 h-0.5 bg-gray-400"></div>
                        <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white text-xs font-bold">C</div>
                      </div>
                      <p className="text-xs text-gray-500 mt-4">Connected Addresses: {analysisResults.connectedAddresses}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Quick Start Guide */}
        {!analysisResults && !isAnalyzing && !error && (
          <div className="bg-gray-50 border-2 border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-bold text-black mb-4">Quick Start</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm text-gray-700">
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center flex-shrink-0">
                  <Search className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="font-bold text-black">1. Enter Address</p>
                  <p>Input any Ethereum address to begin blockchain analysis</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center flex-shrink-0">
                  <TrendingUp className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="font-bold text-black">2. Review Risk Score</p>
                  <p>Check automated risk assessment and pattern detection</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center flex-shrink-0">
                  <Eye className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="font-bold text-black">3. Investigate</p>
                  <p>Explore transactions, patterns, and network connections</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* API Configuration Help */}
        {!analysisResults && !isAnalyzing && !error && (
          <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6 mt-6">
            <h3 className="text-lg font-bold text-blue-800 mb-4">API Configuration Required</h3>
            <div className="text-sm text-blue-700 space-y-2">
              <p><strong>To use this tool with real data, configure your API endpoint:</strong></p>
              <ol className="list-decimal list-inside space-y-1 ml-4">
                <li>Replace <code className="bg-blue-100 px-2 py-1 rounded">API_BASE_URL</code> in the code with your actual API endpoint</li>
                <li>Add any required authentication headers (API keys, tokens)</li>
                <li>Ensure your API returns data in the expected format with fields: address, totalTransactions, transactions[]</li>
                <li>Each transaction should have: hash, blockNumber, from, to, valueETH, timestamp</li>
              </ol>
              <p className="mt-3"><strong>Example API endpoints to consider:</strong></p>
              <ul className="list-disc list-inside ml-4">
                <li>Etherscan API: https://api.etherscan.io/api</li>
                <li>Alchemy API: https://eth-mainnet.alchemyapi.io/v2/</li>
                <li>Infura API: https://mainnet.infura.io/v3/</li>
                <li>Your custom blockchain analysis API</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CryptoTracker;