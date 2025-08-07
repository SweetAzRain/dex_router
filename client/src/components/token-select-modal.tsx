// token-select-modal.tsx
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Coins } from "lucide-react";
import { TokenInfo } from "../types/near";

interface TokenSelectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectToken: (token: TokenInfo) => void;
  tokens: TokenInfo[];
}

export function TokenSelectModal({ open, onOpenChange, onSelectToken, tokens }: TokenSelectModalProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredTokens = tokens.filter(token =>
    token.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
    token.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (token.contractId && token.contractId.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleSelectToken = (token: TokenInfo) => {
    onSelectToken(token);
    onOpenChange(false);
    setSearchQuery("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-96 flex flex-col" data-testid="modal-token-select">
        <DialogHeader>
          <DialogTitle>Select Token</DialogTitle>
        </DialogHeader>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            type="text"
            placeholder="Search tokens..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            data-testid="input-token-search"
          />
        </div>
        
        <div className="flex-1 overflow-y-auto">
          <div className="space-y-1">
            {filteredTokens.map((token) => (
              <Button
                key={token.id}
                onClick={() => handleSelectToken(token)}
                variant="ghost"
                className="w-full flex items-center space-x-3 p-4 h-auto justify-start hover:bg-gray-50"
                data-testid={`button-select-token-${token.symbol.toLowerCase()}`}
              >
                <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                  {token.iconUrl ? (
                    <img src={token.iconUrl} alt={token.symbol} className="w-8 h-8 rounded-full" />
                  ) : (
                    <Coins className="text-gray-600 h-4 w-4" />
                  )}
                </div>
                <div className="flex-1 text-left">
                  <div className="font-medium text-gray-900" data-testid={`text-token-symbol-${token.symbol.toLowerCase()}`}>
                    {token.symbol}
                  </div>
                  <div className="text-sm text-gray-500" data-testid={`text-token-name-${token.symbol.toLowerCase()}`}>
                    {token.name}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-medium text-gray-900" data-testid={`text-token-balance-${token.symbol.toLowerCase()}`}>
                    {parseFloat(token.balance).toFixed(6)}
                  </div>
                  <div className="text-sm text-gray-500" data-testid={`text-token-usd-${token.symbol.toLowerCase()}`}>
                    ${token.usdValue}
                  </div>
                </div>
              </Button>
            ))}
            
            {filteredTokens.length === 0 && (
              <div className="text-center py-8 text-gray-500" data-testid="text-no-tokens">
                No tokens found
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
