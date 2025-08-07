// swap.tsx
import { SwapInterface } from "../components/swap-interface";
import { RouteComparison } from "../components/route-comparison";
import { TransactionHistory } from "../components/transaction-history";
import { WalletConnection } from "../components/wallet-connection";
import { useRoutes } from "../hooks/use-routes";
import { useWallet } from "../hooks/use-wallet";
import { useState } from "react";

export default function SwapPage() {
  const { wallet } = useWallet();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-blue-800 rounded-lg flex items-center justify-center">
                  <span className="text-white text-sm font-bold">DEX</span>
                </div>
                <h1 className="text-xl font-bold text-gray-900">NEAR DEX Aggregator</h1>
              </div>
              <div className="hidden md:flex items-center space-x-6 ml-8">
                <a href="#" className="text-gray-700 hover:text-blue-600 font-medium">Swap</a>
                <a href="#" className="text-gray-500 hover:text-blue-600 font-medium">Analytics</a>
                <a href="#" className="text-gray-500 hover:text-blue-600 font-medium">About</a>
              </div>
            </div>
            
            <WalletConnection />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Swap Interface */}
          <div className="lg:col-span-2">
            <SwapInterface />
          </div>
          
          {/* Route Comparison */}
          <div className="space-y-6">
            <RouteComparison 
              routes={undefined}
              isLoading={false}
              fromTokenSymbol="NEAR"
              toTokenSymbol="USDT"
              toTokenDecimals={6}
            />
          </div>
        </div>

        {/* Transaction History */}
        <div className="mt-8">
          <TransactionHistory />
        </div>
      </div>
    </div>
  );
}
