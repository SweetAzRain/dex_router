import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Wallet, LogOut } from "lucide-react";
import { useWallet } from "../hooks/use-wallet";
import { intearAPI } from "../services/intear-api";

export function WalletConnection() {
  const { wallet, isLoading, connect, disconnect } = useWallet();

  const formatBalance = (balance: string) => {
    return intearAPI.formatAmount(balance, 24);
  };

  const formatAccountId = (accountId: string) => {
    if (accountId.length <= 20) return accountId;
    return `${accountId.slice(0, 8)}...${accountId.slice(-8)}`;
  };

  if (isLoading) {
    return (
      <Button disabled className="flex items-center space-x-2">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
        <span>Connecting...</span>
      </Button>
    );
  }

  if (wallet.isConnected && wallet.accountId) {
    return (
      <div className="flex items-center space-x-4">
        <div className="hidden md:flex items-center space-x-2 text-sm text-gray-600">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <span>Mainnet</span>
        </div>
        
        <div className="hidden md:flex flex-col items-end">
          <span className="text-sm font-medium text-gray-900" data-testid="wallet-account">
            {formatAccountId(wallet.accountId)}
          </span>
          <span className="text-xs text-gray-500" data-testid="wallet-balance">
            {formatBalance(wallet.balance)} NEAR
          </span>
        </div>
        
        <Button
          onClick={disconnect}
          variant="outline"
          size="sm"
          className="flex items-center space-x-2"
          data-testid="button-disconnect"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden md:inline">Disconnect</span>
        </Button>
      </div>
    );
  }

  return (
    <Button
      onClick={connect}
      className="bg-blue-600 hover:bg-blue-700 text-white flex items-center space-x-2"
      data-testid="button-connect"
    >
      <Wallet className="h-4 w-4" />
      <span>Connect Wallet</span>
    </Button>
  );
}
