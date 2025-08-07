// transaction-history.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowUpDown, ExternalLink } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { SwapTransaction } from "../types/near";
import { useWallet } from "../hooks/use-wallet";

export function TransactionHistory() {
  const { wallet } = useWallet();

  const { data: transactions, isLoading } = useQuery({
    queryKey: ['transactions', wallet.accountId],
    queryFn: async (): Promise<SwapTransaction[]> => {
      if (!wallet.accountId) return [];
      
      // Fetch from our API
      const response = await fetch(`/api/transactions?accountId=${wallet.accountId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch transactions');
      }
      return response.json();
    },
    enabled: !!wallet.accountId,
  });

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} mins ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)} hours ago`;
    return `${Math.floor(diffMins / 1440)} days ago`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-600 text-white">Completed</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-600 text-white">Pending</Badge>;
      case 'failed':
        return <Badge className="bg-red-600 text-white">Failed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const openTransaction = (hash: string) => {
    window.open(`https://nearblocks.io/txns/${hash}`, '_blank');
  };

  if (!wallet.isConnected) {
    return (
      <Card data-testid="card-transaction-history">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Recent Transactions</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <ArrowUpDown className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Connect Wallet</h3>
            <p className="text-gray-500">Connect your wallet to view transaction history</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card data-testid="card-transaction-history">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Recent Transactions</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="flex items-center space-x-4">
                  <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                  <div className="h-6 bg-gray-200 rounded w-20"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="card-transaction-history">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Recent Transactions</span>
          {transactions && transactions.length > 0 && (
            <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700">
              View All
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!transactions || transactions.length === 0 ? (
          <div className="text-center py-8">
            <ArrowUpDown className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No transactions yet</h3>
            <p className="text-gray-500">Your swap history will appear here</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-full">
              <div className="space-y-4">
                {transactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    data-testid={`transaction-${tx.id}`}
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <ArrowUpDown className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-gray-900" data-testid={`text-hash-${tx.id}`}>
                            {tx.hash.slice(0, 8)}...{tx.hash.slice(-6)}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openTransaction(tx.hash)}
                            className="p-1 h-auto"
                            data-testid={`button-view-${tx.id}`}
                          >
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        </div>
                        <div className="text-sm text-gray-500">Swap</div>
                      </div>
                    </div>

                    <div className="text-center">
                      <Badge className="bg-blue-100 text-blue-800 text-xs mb-1" data-testid={`badge-dex-${tx.id}`}>
                        {tx.dexId}
                      </Badge>
                      <div className="text-sm">
                        <div data-testid={`text-from-amount-${tx.id}`}>
                          {parseFloat(tx.fromAmount).toFixed(4)} {tx.fromToken}
                        </div>
                        <div className="text-gray-500" data-testid={`text-to-amount-${tx.id}`}>
                          → {parseFloat(tx.toAmount).toFixed(4)} {tx.toToken}
                        </div>
                      </div>
                    </div>

                    <div className="text-center">
                      <div className="mb-1" data-testid={`status-${tx.id}`}>
                        {getStatusBadge(tx.status)}
                      </div>
                      <div className="text-sm text-gray-500" data-testid={`text-time-${tx.id}`}>
                        {formatTime(tx.timestamp)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
