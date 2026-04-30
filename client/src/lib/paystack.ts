export interface PaystackConfig {
  publicKey: string;
  email: string;
  amount: number;
  reference?: string;
  metadata?: Record<string, unknown>;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  channels?: string[];
  onSuccess: (reference: string) => void;
  onClose?: () => void;
}

export interface PaystackResponse {
  reference: string;
  trans: string;
  status: string;
  transaction: string;
  message: string;
}

// Helper: Load Paystack script
function loadPaystackScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    // Check if already loaded
    const existing = document.querySelector('script[src="https://js.paystack.co/v1/inline.js"]');
    if (existing) {
      const checkPop = () => {
        if ((window as any).PaystackPop) {
          resolve();
        } else {
          setTimeout(checkPop, 50);
        }
      };
      checkPop();
      return;
    }

    // Load script
    const script = document.createElement('script');
    script.src = 'https://js.paystack.co/v1/inline.js';
    script.async = true;
    script.onload = () => {
      // Wait for PaystackPop to be available
      let attempts = 0;
      const checkPop = () => {
        if ((window as any).PaystackPop) {
          resolve();
        } else if (attempts < 50) {
          attempts++;
          setTimeout(checkPop, 50);
        } else {
          reject(new Error('PaystackPop did not load'));
        }
      };
      checkPop();
    };
    script.onerror = () => {
      reject(new Error('Failed to load Paystack script'));
    };
    document.body.appendChild(script);
  });
}

// Helper: Open modal after script is loaded
function openModal(publicKey: string, config: PaystackConfig): Promise<PaystackResponse> {
  return new Promise((resolve, reject) => {
    const PaystackPop = (window as any).PaystackPop;
    
    if (!PaystackPop) {
      reject(new Error('PaystackPop is not available'));
      return;
    }

    const amountInSubunits = Math.round(Number(config.amount) * 100);
    if (!Number.isFinite(amountInSubunits) || amountInSubunits <= 0) {
      reject(new Error('Amount must be a valid positive number'));
      return;
    }

    try {
      console.log('[Paystack] Setting up modal with:', {
        key: publicKey.substring(0, 10) + '...',
        email: config.email,
        amount: amountInSubunits,
      });

      const handler = PaystackPop.setup({
        key: publicKey,
        email: config.email,
        amount: amountInSubunits,
        ref: config.reference,
        metadata: config.metadata,
        firstName: config.firstName || '',
        lastName: config.lastName || '',
        channels: config.channels,
        onClose: () => {
          config.onClose?.();
          reject(new Error('Payment cancelled by user'));
        },
        onSuccess: (response: PaystackResponse) => {
          config.onSuccess(response.reference);
          resolve(response);
        },
      });

      handler.openIframe();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Paystack setup failed';
      console.error('[Paystack] Setup error:', message);
      reject(new Error(message));
    }
  });
}

// Initialize Paystack script
export function initializePaystack() {
  const publicKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY;
  
  if (!publicKey) {
    console.warn('Paystack public key is not configured');
    return false;
  }

  return publicKey;
}

// Open Paystack payment modal
export function openPaystackModal(config: PaystackConfig) {
  // Use the passed public key, or fall back to environment
  const passedKey = config.publicKey?.trim();
  const envKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY?.trim();
  const publicKey = passedKey || envKey;
  
  console.log('[Paystack] Using public key:', {
    passed: passedKey ? `${passedKey.substring(0, 10)}...` : 'not provided',
    env: envKey ? `${envKey.substring(0, 10)}...` : 'not configured',
    final: publicKey ? `${publicKey.substring(0, 10)}...` : 'NONE (ERROR)',
  });
  
  if (!publicKey) {
    const error = 'Paystack public key is not configured. Set VITE_PAYSTACK_PUBLIC_KEY in .env.local';
    console.error('[Paystack]', error);
    throw new Error(error);
  }

  if (!publicKey.startsWith('pk_')) {
    const error = `Invalid Paystack public key format. Expected pk_test_* or pk_live_*, got: ${publicKey.substring(0, 10)}...`;
    console.error('[Paystack]', error);
    throw new Error(error);
  }

  // Validate email
  if (!config.email || !config.email.includes('@')) {
    throw new Error('Invalid email address provided');
  }

  // Load script and open modal
  return loadPaystackScript().then(() => openModal(publicKey, config));
}

