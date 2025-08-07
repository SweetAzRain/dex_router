// near-wallets.ts
import { NearConnector, NearWallet } from '@hot-labs/near-connect'; // Импортируем NearWallet из библиотеки
// Импортируем нужные типы для параметров и результатов
import type { SignAndSendTransactionParams, SignAndSendTransactionsParams, SignMessageParams } from '@hot-labs/near-connect/build/types/wallet';
import type { FinalExecutionOutcome } from "@near-wallet-selector/core";

// Тип для состояния кошелька в вашем сервисе
interface NearWalletState {
  isConnected: boolean;
  accountId: string | null;
  balance: string;
  publicKey: string | null;
}

class NearWalletService {
  private connector: NearConnector | null = null;
  // Используем правильный тип из библиотеки
  private connectedWallet: NearWallet | null = null; 
  private currentAccountId: string | null = null;

  async initialize() {
    try {
      this.connector = new NearConnector({ 
        network: 'mainnet',
        logger: console // Добавлено для дебага
      });
      console.log('NEAR connector initialized successfully');
      
      // Setup event listeners for wallet connection
      this.connector.on('wallet:signIn', async (event: any) => {
        console.log('Wallet signed in:', event);
        try {
          // Получаем экземпляр подключенного кошелька
          this.connectedWallet = await this.connector!.wallet(); 
          this.currentAccountId = event.accounts?.[0]?.accountId || null;
        } catch (error) {
          console.error('Failed to get wallet after sign in:', error);
          // Очищаем состояние в случае ошибки
          this.connectedWallet = null;
          this.currentAccountId = null;
        }
      });
      
      this.connector.on('wallet:signOut', async () => {
        console.log('Wallet signed out');
        this.connectedWallet = null;
        this.currentAccountId = null;
      });

      return true;
    } catch (error) {
      console.error('Failed to initialize NEAR wallet:', error);
      return false;
    }
  }

  async connect(): Promise<void> {
    if (!this.connector) {
      const initialized = await this.initialize();
      if (!initialized) {
        throw new Error('Failed to initialize wallet connector');
      }
    }
    
    try {
      // Open wallet connector - используем правильный метод
      console.log('Opening wallet connector...');
      // connect() без аргументов откроет UI выбора кошелька
      await this.connector!.connect(); 
    } catch (error) {
      console.error('Failed to show wallet connector:', error);
      throw new Error('Failed to open wallet connection dialog');
    }
  }

  async disconnect(): Promise<void> {
    // Используем правильный метод disconnect у NearConnector
    // Передаем экземпляр кошелька, который нужно отключить
    if (this.connectedWallet && this.connector) {
      try {
        await this.connector.disconnect(this.connectedWallet);
        // Состояние connectedWallet и currentAccountId будет обновлено обработчиком события wallet:signOut
      } catch (error) {
        console.error('Error during disconnect:', error);
        // Принудительно очищаем локальное состояние, если disconnect не сработал
        this.connectedWallet = null;
        this.currentAccountId = null;
      }
    } else {
        console.warn('No wallet to disconnect or connector not initialized');
    }
  }

  getWalletState(): NearWalletState { // Используем свой тип для состояния
    return {
      isConnected: !!this.connectedWallet && !!this.currentAccountId,
      accountId: this.currentAccountId,
      balance: '0', // Will be updated separately
      publicKey: null, // Will be updated separately
    };
  }

  async getBalance(accountId: string): Promise<string> {
    if (!accountId) {
        console.warn('getBalance called with empty accountId');
        return '0';
    }
    try {
      // Make direct RPC call to get balance
      const response = await fetch('https://rpc.mainnet.near.org', { // Исправлен URL (были лишние пробелы)
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 'dontcare',
          method: 'query',
          params: {
            request_type: 'view_account',
            finality: 'final',
            account_id: accountId,
          },
        }),
      });
      const data = await response.json();
      if (data.result?.amount) {
        return data.result.amount;
      }
      return '0';
    } catch (error) {
      console.error('Failed to get balance:', error);
      return '0';
    }
  }

  // Используем правильные типы для параметров
  async signTransaction(params: SignAndSendTransactionParams): Promise<FinalExecutionOutcome> { 
    if (!this.connectedWallet) {
      throw new Error('Wallet not connected');
    }
    // Вызываем метод на экземпляре кошелька
    return await this.connectedWallet.signAndSendTransaction(params); 
  }

  // Используем правильные типы для параметров
  async signTransactions(params: SignAndSendTransactionsParams): Promise<FinalExecutionOutcome[]> { 
    if (!this.connectedWallet) {
      throw new Error('Wallet not connected');
    }
    // Вызываем метод на экземпляре кошелька
    return await this.connectedWallet.signAndSendTransactions(params); 
  }

  // Используем правильные типы для параметров
  async signMessage(params: SignMessageParams): Promise<any> { 
    if (!this.connectedWallet) {
      throw new Error('Wallet not connected');
    }
    // Вызываем метод на экземпляре кошелька
    return await this.connectedWallet.signMessage(params); 
  }

  async getPublicKey(): Promise<string | null> {
    if (!this.connectedWallet) {
      return null;
    }
    try {
      // Вызываем метод на экземпляре кошелька
      const accounts = await this.connectedWallet.getAccounts(); 
      return accounts[0]?.publicKey || null;
    } catch (error) {
      console.error('Failed to get public key:', error);
      return null;
    }
  }
}

export const nearWalletService = new NearWalletService();