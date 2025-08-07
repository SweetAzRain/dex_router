// client/src/hooks/use-wallets.ts
import { useNearWallet } from "./use-near-wallet";

export function useWallet() {
  const { 
    isConnected, 
    isConnecting, 
    accountId, 
    network, 
    connectWallet, 
    disconnectWallet, 
    signAndSendTransaction,
    signMessage // <-- Убедиться, что это импортируется из useNearWallet
  } = useNearWallet();

  const wallet = {
    accountId,
    isConnected,
    isConnecting,
    network,
    balance: '0', // Will be fetched separately if needed
    publicKey: null, // Will be fetched separately if needed
  };

  return {
    wallet,
    isLoading: isConnecting,
    error: null, // Error handling is now done through toast in useNearWallet
    connect: connectWallet,
    disconnect: disconnectWallet,
    signTransaction: signAndSendTransaction,
    signTransactions: signAndSendTransaction, // For now, same as single transaction
    // Используем signMessage из useNearWallet
    signMessage: signMessage, // <-- ИСПРАВЛЕНО: используем реальную функцию
    // Альтернативно, можно обернуть в асинхронную функцию, если нужна другая сигнатура
    // signMessage: async (message: string, recipient: string, nonce?: Uint8Array) => {
    //   // Проверка подключения
    //   if (!isConnected) {
    //     throw new Error('Wallet not connected');
    //   }
    //   // Вызов функции из useNearWallet с правильными параметрами
    //   return await signMessage({ message, recipient, nonce });
    // },
  };
}