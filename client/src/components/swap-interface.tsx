// client/src/components/swap/swap-interface.tsx
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ArrowUpDown, Settings, History, ChevronDown } from "lucide-react";
import { TokenSelectModal } from "./token-select-modal";
import { useWallet } from "@/hooks/use-wallet"; // Убедитесь в правильном пути
import { useRoutes } from "@/hooks/use-routes"; // Убедитесь в правильном пути
import { TokenInfo } from "@/types/near"; // Убедитесь в правильном пути
import { intearAPI } from "@/services/intear-api"; // Убедитесь в правильном пути
// import { nearWalletService } from "../services/near-wallet"; // УБРАТЬ
// import { nearIntents } from "../services/near-intents"; // УБРАТЬ - предположительно, будет использоваться через useWallet или напрямую
import { useToast } from "@/hooks/use-toast";

const DEFAULT_TOKENS: TokenInfo[] = [
  {
    id: "wrap.near",
    symbol: "NEAR",
    name: "NEAR Protocol",
    decimals: 24,
    isNative: true,
    balance: "0",
    usdValue: "0.00",
  },
  {
    id: "usdt.tether-token.near",
    symbol: "USDT",
    name: "Tether USD",
    decimals: 6,
    contractId: "usdt.tether-token.near",
    isNative: false,
    balance: "0",
    usdValue: "0.00",
  },
  {
    id: "17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1",
    symbol: "USDC",
    name: "USD Coin",
    decimals: 6,
    contractId: "17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1",
    isNative: false,
    balance: "0",
    usdValue: "0.00",
  },
];

export function SwapInterface() {
  // Используем useWallet из вашего хука
  const { wallet, signTransaction, signMessage } = useWallet(); 
  const { toast } = useToast();
  const [fromToken, setFromToken] = useState<TokenInfo>(DEFAULT_TOKENS[0]);
  const [toToken, setToToken] = useState<TokenInfo>(DEFAULT_TOKENS[1]);
  const [amountIn, setAmountIn] = useState("");
  const [amountOut, setAmountOut] = useState("");
  const [slippageType, setSlippageType] = useState<"Auto" | "Fixed">("Auto");
  const [customSlippage, setCustomSlippage] = useState("1.0");
  const [selectedSlippage, setSelectedSlippage] = useState("1.0");
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [selectingToken, setSelectingToken] = useState<"from" | "to">("from");
  const [isSwapping, setIsSwapping] = useState(false);

  const routeRequest = amountIn && fromToken && toToken ? {
    tokenIn: fromToken.id,
    tokenOut: toToken.id,
    amountIn: intearAPI.parseAmount(amountIn, fromToken.decimals),
    maxWaitMs: 5000,
    slippageConfig: {
      type: slippageType,
      ...(slippageType === "Fixed" 
        ? { slippage: parseFloat(selectedSlippage) / 100 }
        : { maxSlippage: 0.05, minSlippage: 0.001 }
      )
    },
    traderAccountId: wallet.accountId || undefined,
    signingPublicKey: undefined, // Will be set when needed
  } : null;

  // Debug log for route request
  useEffect(() => {
    if (routeRequest) {
      console.log('Route request created:', routeRequest);
    }
  }, [routeRequest]);

  const { data: routes, isLoading: routesLoading, error: routesError } = useRoutes(routeRequest, !!amountIn);

  // Debug logging for routes
  useEffect(() => {
    console.log('Routes loading:', routesLoading);
    console.log('Routes data:', routes);
    console.log('Routes error:', routesError);
  }, [routes, routesLoading, routesError]);

  // Update output amount when routes change
  useEffect(() => {
    if (routes && routes.length > 0) {
      const bestRoute = intearAPI.getBestRoute(routes);
      if (bestRoute) {
        const formatted = intearAPI.formatAmount(bestRoute.estimated_amount.amount_out, toToken.decimals);
        setAmountOut(formatted);
        console.log('Setting amountOut:', formatted);
      }
    } else {
      setAmountOut("");
    }
  }, [routes, toToken.decimals]);

  const handleSwapTokens = () => {
    const tempToken = fromToken;
    setFromToken(toToken);
    setToToken(tempToken);
    setAmountIn(amountOut);
    setAmountOut("");
  };

  const handleSelectToken = (token: TokenInfo) => {
    if (selectingToken === "from") {
      if (token.id === toToken.id) {
        // Swap tokens if selecting the same token
        setToToken(fromToken);
      }
      setFromToken(token);
    } else {
      if (token.id === fromToken.id) {
        // Swap tokens if selecting the same token
        setFromToken(toToken);
      }
      setToToken(token);
    }
  };

  const executeSwap = async () => {
    // Проверка подключения через useWallet
    if (!wallet.isConnected || !wallet.accountId) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet to continue",
        variant: "destructive",
      });
      return;
    }
    if (!routes || routes.length === 0) {
      toast({
        title: "No routes available",
        description: "Please try adjusting your swap parameters",
        variant: "destructive",
      });
      return;
    }
    setIsSwapping(true);
    try {
      const bestRoute = intearAPI.getBestRoute(routes);
      if (!bestRoute) {
        throw new Error("No valid route found");
      }

      // Выполняем свап, используя функции из useWallet
      for (const instruction of bestRoute.execution_instructions) {
        if (instruction.NearTransaction) {
          // Выполняем NEAR транзакцию используя signTransaction из useWallet
          // Формат params должен соответствовать SignAndSendTransactionParams из @hot-labs/near-connect
          const txParams = {
            receiverId: instruction.NearTransaction.receiver_id,
            actions: instruction.NearTransaction.actions.map(action => {
              if (action.FunctionCall) {
                return {
                  type: 'FunctionCall' as const, // Убедитесь, что это правильный тип
                  params: {
                    methodName: action.FunctionCall.method_name,
                    args: JSON.parse(atob(action.FunctionCall.args)), // Декодируем base64
                    gas: action.FunctionCall.gas,
                    deposit: action.FunctionCall.deposit,
                  }
                };
              }
              // Обработайте другие типы действий, если необходимо (Transfer, etc.)
              // Например, для Transfer:
              // if (action.Transfer) {
              //   return {
              //     type: 'Transfer' as const,
              //     params: {
              //       deposit: action.Transfer.deposit,
              //     }
              //   };
              // }
              throw new Error(`Unsupported action type: ${Object.keys(action)[0]}`);
            })
          };

          console.log('Sending transaction with params:', txParams);
          const result = await signTransaction(txParams); // <-- Используем signTransaction из useWallet
          console.log('Transaction result:', result);

        } else if (instruction.IntentsQuote) {
          // Выполняем NEAR Intents quote используя signMessage из useWallet
          // signMessage из useWallet пока не реализован, вам нужно будет добавить его в use-wallets.ts
          // или вызвать напрямую из useNearWallet, если он там реализован.
          
          // Временное решение: покажем ошибку, если signMessage не реализован
          if (!signMessage) {
             throw new Error('Sign message functionality is not yet implemented in useWallet hook.');
          }
          
          // Вам нужно будет уточнить формат параметров для signMessage
          // в зависимости от того, как он реализован в near-connect.
          // Возможно, потребуется что-то вроде:
          /*
          const signedMessage = await signMessage(
            instruction.IntentsQuote.message_to_sign,
            'intents.near'
          );
          // Затем отправить signedMessage в nearIntents.publishIntent
          // const intentResult = await nearIntents.publishIntent({
          //   quote_hashes: [instruction.IntentsQuote.quote_hash],
          //   signed_data: signedMessage
          // });
          // console.log('Intent result:', intentResult);
          */
          throw new Error('NEAR Intents signing is not yet fully implemented in this example. Please check the signMessage implementation.');
        }
      }

      toast({
        title: "Swap executed successfully",
        description: `Swapped ${amountIn} ${fromToken.symbol} for ${amountOut} ${toToken.symbol}`,
      });
      // Reset form
      setAmountIn("");
      setAmountOut("");
    } catch (error: any) {
      console.error('Swap failed:', error);
      toast({
        title: "Swap failed",
        description: error.message || error.toString() || "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsSwapping(false);
    }
  };

  const getSwapButtonText = () => {
    if (!wallet.isConnected) return "Connect Wallet";
    if (!amountIn) return "Enter an amount";
    if (routesLoading) return "Finding best route...";
    if (!routes || routes.length === 0) return "No route available";
    if (isSwapping) return "Swapping...";
    return "Swap Tokens";
  };

  const isSwapDisabled = !wallet.isConnected || !amountIn || routesLoading || !routes?.length || isSwapping;

  return (
    <Card className="w-full max-w-2xl" data-testid="card-swap-interface">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Swap Tokens</h2>
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="sm" data-testid="button-settings">
              <Settings className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" data-testid="button-history">
              <History className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="space-y-1">
          {/* From Token */}
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <div className="flex justify-between items-center mb-2">
              <Label className="text-sm font-medium text-gray-700">From</Label>
              <span className="text-sm text-gray-500" data-testid="text-from-balance">
                Balance: {parseFloat(fromToken.balance).toFixed(6)}
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                onClick={() => {
                  setSelectingToken("from");
                  setShowTokenModal(true);
                }}
                className="flex items-center space-x-2 px-3 py-2"
                data-testid="button-select-from-token"
              >
                <div className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center">
                  {fromToken.iconUrl ? (
                    <img src={fromToken.iconUrl} alt={fromToken.symbol} className="w-6 h-6 rounded-full" />
                  ) : (
                    <span className="text-xs font-bold">{fromToken.symbol.slice(0, 2)}</span>
                  )}
                </div>
                <span className="font-medium" data-testid="text-from-token-symbol">{fromToken.symbol}</span>
                <ChevronDown className="h-4 w-4" />
              </Button>
              <Input
                type="text"
                value={amountIn}
                onChange={(e) => setAmountIn(e.target.value)}
                placeholder="0.0"
                className="flex-1 text-2xl font-semibold border-none bg-transparent p-0 h-auto"
                data-testid="input-amount-in"
              />
            </div>
            <div className="flex justify-between items-center mt-2">
              <span className="text-sm text-gray-500">≈ $0.00</span>
              <div className="flex space-x-2">
                <Button variant="ghost" size="sm" className="text-xs h-6 px-2">25%</Button>
                <Button variant="ghost" size="sm" className="text-xs h-6 px-2">50%</Button>
                <Button variant="ghost" size="sm" className="text-xs h-6 px-2">75%</Button>
                <Button variant="ghost" size="sm" className="text-xs h-6 px-2">MAX</Button>
              </div>
            </div>
          </div>
          {/* Swap Direction Button */}
          <div className="flex justify-center -my-2 relative z-10">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSwapTokens}
              className="rounded-xl p-2 border-4 border-white bg-gray-100 hover:bg-gray-200"
              data-testid="button-swap-direction"
            >
              <ArrowUpDown className="h-4 w-4" />
            </Button>
          </div>
          {/* To Token */}
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <div className="flex justify-between items-center mb-2">
              <Label className="text-sm font-medium text-gray-700">To</Label>
              <span className="text-sm text-gray-500" data-testid="text-to-balance">
                Balance: {parseFloat(toToken.balance).toFixed(6)}
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                onClick={() => {
                  setSelectingToken("to");
                  setShowTokenModal(true);
                }}
                className="flex items-center space-x-2 px-3 py-2"
                data-testid="button-select-to-token"
              >
                <div className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center">
                  {toToken.iconUrl ? (
                    <img src={toToken.iconUrl} alt={toToken.symbol} className="w-6 h-6 rounded-full" />
                  ) : (
                    <span className="text-xs font-bold">{toToken.symbol.slice(0, 2)}</span>
                  )}
                </div>
                <span className="font-medium" data-testid="text-to-token-symbol">{toToken.symbol}</span>
                <ChevronDown className="h-4 w-4" />
              </Button>
              <Input
                type="text"
                value={amountOut}
                readOnly
                placeholder="0.0"
                className="flex-1 text-2xl font-semibold border-none bg-transparent p-0 h-auto"
                data-testid="input-amount-out"
              />
            </div>
            <div className="flex justify-between items-center mt-2">
              <span className="text-sm text-gray-500">≈ $0.00</span>
            </div>
          </div>
        </div>
        {/* Slippage Settings */}
        <div className="mt-6 bg-blue-50 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-gray-900">Slippage Settings</h3>
            <RadioGroup
              value={slippageType}
              onValueChange={(value: "Auto" | "Fixed") => setSlippageType(value)}
              className="flex items-center space-x-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="Auto" id="auto" data-testid="radio-slippage-auto" />
                <Label htmlFor="auto" className="text-sm">Auto</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="Fixed" id="fixed" data-testid="radio-slippage-fixed" />
                <Label htmlFor="fixed" className="text-sm">Fixed</Label>
              </div>
            </RadioGroup>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {["0.1", "0.5", "1.0"].map(percentage => (
              <Button
                key={percentage}
                variant={selectedSlippage === percentage ? "default" : "outline"}
                onClick={() => setSelectedSlippage(percentage)}
                className="py-2 text-sm"
                data-testid={`button-slippage-${percentage}`}
              >
                {percentage}%
              </Button>
            ))}
            <Input
              type="text"
              placeholder="Custom"
              value={customSlippage}
              onChange={(e) => {
                setCustomSlippage(e.target.value);
                setSelectedSlippage(e.target.value);
              }}
              className="text-center"
              data-testid="input-custom-slippage"
            />
          </div>
        </div>
        {/* Swap Button */}
        <Button
          onClick={executeSwap}
          disabled={isSwapDisabled}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 mt-6 text-lg font-semibold"
          data-testid="button-execute-swap"
        >
          {getSwapButtonText()}
        </Button>
        <TokenSelectModal
          open={showTokenModal}
          onOpenChange={setShowTokenModal}
          onSelectToken={handleSelectToken}
          tokens={DEFAULT_TOKENS}
        />
      </CardContent>
    </Card>
  );
}
