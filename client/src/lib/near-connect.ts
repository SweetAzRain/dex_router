import { NearConnector } from '@hot-labs/near-connect';

// ВАЖНО: Используйте NearConnector, а не WalletSelector
export const WalletSelector = NearConnector;
export { NearConnector } from '@hot-labs/near-connect';