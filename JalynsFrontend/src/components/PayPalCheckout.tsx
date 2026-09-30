import { useEffect, useRef } from "react";

type PayPalButtons = {
  close: () => Promise<void> | void;
  render: (el: HTMLElement) => Promise<void>;
};

type PayPalNamespace = {
  FUNDING: { PAYPAL: string };
  Buttons: (opts: {
    fundingSource?: string;
    style?: { layout?: string; shape?: string; label?: string; height?: number };
    createOrder: () => Promise<string>;
    onApprove: (data: { orderID: string }) => Promise<void>;
    onCancel?: () => void;
    onError?: (err: unknown) => void;
  }) => PayPalButtons;
};

declare global {
  interface Window {
    paypal?: PayPalNamespace;
  }
}

const scriptLoads = new Map<string, Promise<void>>();

function loadPayPal(clientId: string, currency: string) {
  const key = `${clientId}:${currency}`;
  const cached = scriptLoads.get(key);
  if (cached) return cached;

  const pending = new Promise<void>((resolve, reject) => {
    const existing = document.getElementById("paypal-sdk");
    existing?.remove();
    const script = document.createElement("script");
    script.id = "paypal-sdk";
    script.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&currency=${encodeURIComponent(currency)}&intent=capture&disable-funding=card,credit,venmo,paylater`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      scriptLoads.delete(key);
      reject(new Error("Could not load PayPal."));
    };
    document.body.appendChild(script);
  });
  scriptLoads.set(key, pending);
  return pending;
}

type PayPalCheckoutProps = {
  clientId: string;
  currency: string;
  createOrder: () => Promise<string>;
  onApprove: (orderId: string) => Promise<void>;
  onError: (message: string) => void;
  fluid?: boolean;
};

export function PayPalCheckout({
  clientId,
  currency,
  createOrder,
  onApprove,
  onError,
  fluid = false,
}: PayPalCheckoutProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const createRef = useRef(createOrder);
  const approveRef = useRef(onApprove);
  const errorRef = useRef(onError);
  createRef.current = createOrder;
  approveRef.current = onApprove;
  errorRef.current = onError;

  useEffect(() => {
    const host = hostRef.current;
    if (!host || !clientId) return;
    let cancelled = false;
    let buttons: PayPalButtons | null = null;

    void loadPayPal(clientId, currency)
      .then(async () => {
        if (cancelled || !host || !window.paypal) return;
        host.replaceChildren();
        buttons = window.paypal.Buttons({
          fundingSource: window.paypal.FUNDING.PAYPAL,
          style: { layout: "vertical", color: "blue", shape: "pill", label: "paypal", height: 44 },
          createOrder: () => createRef.current(),
          onApprove: async (data) => {
            await approveRef.current(data.orderID);
          },
          onCancel: () => {
            errorRef.current("PayPal payment was cancelled.");
          },
          onError: () => {
            errorRef.current("PayPal could not complete the payment.");
          },
        });
        await buttons.render(host);
      })
      .catch((err) => {
        if (!cancelled) {
          errorRef.current(err instanceof Error ? err.message : "Could not load PayPal.");
        }
      });

    return () => {
      cancelled = true;
      void buttons?.close();
    };
  }, [clientId, currency]);

  return <div ref={hostRef} className={fluid ? "min-h-11 w-full" : "min-h-11 w-full sm:w-[280px]"} />;
}
