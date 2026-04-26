export interface PaystackConfig {
  publicKey: string;
  email: string;
  amount: number;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
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
  const publicKey = initializePaystack();
  
  if (!publicKey) {
    throw new Error('Paystack is not properly configured');
  }

  // Ensure Paystack script is loaded
  const script = document.querySelector('script[src="https://js.paystack.co/v1/inline.js"]');
  
  if (!script) {
    const newScript = document.createElement('script');
    newScript.src = 'https://js.paystack.co/v1/inline.js';
    document.body.appendChild(newScript);
  }

  // Wait for script to load
  return new Promise<PaystackResponse>((resolve, reject) => {
    const checkInterval = setInterval(() => {
      const PaystackPop = (window as any).PaystackPop;
      
      if (PaystackPop) {
        clearInterval(checkInterval);
        
        const handler = PaystackPop.setup({
          key: publicKey,
          email: config.email,
          amount: config.amount * 100, // Paystack uses cents
          firstName: config.firstName || '',
          lastName: config.lastName || '',
          onClose: () => {
            config.onClose?.();
            reject(new Error('Payment cancelled'));
          },
          onSuccess: (response: PaystackResponse) => {
            config.onSuccess(response.reference);
            resolve(response);
          },
        });
        
        handler.openIframe();
      }
    }, 100);

    // Timeout after 5 seconds
    setTimeout(() => {
      clearInterval(checkInterval);
      reject(new Error('Paystack script failed to load'));
    }, 5000);
  });
}

// Verify payment
export async function verifyPaystackPayment(reference: string, secretKey: string) {
  try {
    const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${secretKey}`,
      },
    });

    if (!response.ok) {
      throw new Error('Payment verification failed');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Payment verification error:', error);
    throw error;
  }
}
