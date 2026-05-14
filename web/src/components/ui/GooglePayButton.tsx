'use client';

import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import Spinner from '@/components/ui/Spinner';

// Google Pay is a card wallet, not a Play Store billing system. It works
// alongside Bank of Georgia iPay: the wallet tokenises the card on-device,
// we send the token to our backend, the backend forwards it to iPay for the
// charge. Google Pay launched in Georgia (country) in 2024, so iPay merchants
// who have enabled the Google Pay channel can accept it.
//
// Feature-flagged with NEXT_PUBLIC_GOOGLE_PAY_ENABLED so the button only
// renders when the backend endpoint is live. Falls back silently if the
// google.payments.api.js script does not load.

declare global {
  interface Window {
    google?: {
      payments?: {
        api?: {
          PaymentsClient: new (opts: PaymentsClientOptions) => PaymentsClient;
        };
      };
    };
  }
}

interface PaymentsClientOptions {
  environment: 'TEST' | 'PRODUCTION';
}

interface PaymentsClient {
  isReadyToPay(req: unknown): Promise<{ result: boolean }>;
  loadPaymentData(req: unknown): Promise<PaymentData>;
  createButton(opts: {
    onClick: () => void;
    buttonColor?: 'default' | 'black' | 'white';
    buttonType?: 'buy' | 'pay' | 'plain';
    buttonSizeMode?: 'static' | 'fill';
  }): HTMLElement;
}

interface PaymentData {
  paymentMethodData: {
    tokenizationData: { token: string };
    info?: { cardNetwork?: string; cardDetails?: string };
  };
}

interface Props {
  guideId: string;
  priceCents: number;
  currency: string;
  token: string;
  onSuccess: (tripId: string) => void;
  onFallback: () => void;
}

const SCRIPT_SRC = 'https://pay.google.com/gp/p/js/pay.js';

const BASE_REQUEST = {
  apiVersion: 2,
  apiVersionMinor: 0,
};

const ALLOWED_CARD_AUTH_METHODS = ['PAN_ONLY', 'CRYPTOGRAM_3DS'];
const ALLOWED_CARD_NETWORKS = ['MASTERCARD', 'VISA'];

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Failed to load Google Pay script'));
    document.head.appendChild(s);
  });
}

export default function GooglePayButton({
  guideId,
  priceCents,
  currency,
  token,
  onSuccess,
  onFallback,
}: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [ready, setReady] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const flag = process.env.NEXT_PUBLIC_GOOGLE_PAY_ENABLED === 'true';
    if (!flag) return;

    const merchantId = process.env.NEXT_PUBLIC_GOOGLE_PAY_MERCHANT_ID || '';
    const gatewayMerchantId = process.env.NEXT_PUBLIC_GOOGLE_PAY_GATEWAY_MERCHANT_ID || '';
    const env =
      (process.env.NEXT_PUBLIC_GOOGLE_PAY_ENV as 'TEST' | 'PRODUCTION') || 'TEST';

    if (!merchantId || !gatewayMerchantId) return;

    (async () => {
      try {
        await loadScript(SCRIPT_SRC);
        if (cancelled || !window.google?.payments?.api) return;

        const client = new window.google.payments.api.PaymentsClient({ environment: env });

        const allowedPaymentMethod = {
          type: 'CARD',
          parameters: {
            allowedAuthMethods: ALLOWED_CARD_AUTH_METHODS,
            allowedCardNetworks: ALLOWED_CARD_NETWORKS,
          },
          tokenizationSpecification: {
            type: 'PAYMENT_GATEWAY',
            parameters: {
              gateway: 'bogipay',
              gatewayMerchantId,
            },
          },
        };

        const readyReq = {
          ...BASE_REQUEST,
          allowedPaymentMethods: [allowedPaymentMethod],
        };

        const r = await client.isReadyToPay(readyReq);
        if (!r.result || cancelled) return;

        const button = client.createButton({
          onClick: async () => {
            setProcessing(true);
            try {
              const paymentDataReq = {
                ...BASE_REQUEST,
                allowedPaymentMethods: [allowedPaymentMethod],
                transactionInfo: {
                  totalPriceStatus: 'FINAL',
                  totalPrice: (priceCents / 100).toFixed(2),
                  currencyCode: currency,
                  countryCode: 'GE',
                },
                merchantInfo: {
                  merchantId,
                  merchantName: 'Brooks',
                },
              };

              const data = await client.loadPaymentData(paymentDataReq);
              const res = await api.post<{ tripId?: string; error?: string }>(
                '/api/purchases/google-pay',
                {
                  guideId,
                  paymentToken: data.paymentMethodData.tokenizationData.token,
                  acceptedTerms: true,
                },
                token
              );
              if (res.tripId) {
                onSuccess(res.tripId);
              } else {
                throw new Error(res.error || 'Payment failed');
              }
            } catch {
              setErrored(true);
              onFallback();
            } finally {
              setProcessing(false);
            }
          },
          buttonType: 'pay',
          buttonSizeMode: 'fill',
        });

        if (ref.current && !cancelled) {
          ref.current.innerHTML = '';
          ref.current.appendChild(button);
          setReady(true);
        }
      } catch {
        // Silent fallback — existing iPay path stays available.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [guideId, priceCents, currency, token, onSuccess, onFallback]);

  const hidden = errored || !ready;
  return (
    <div
      className={
        hidden
          ? 'hidden'
          : 'flex items-center gap-2'
      }
      aria-hidden={hidden}
    >
      <div ref={ref} className="min-h-11 w-full" />
      {processing && !hidden && <Spinner />}
    </div>
  );
}
