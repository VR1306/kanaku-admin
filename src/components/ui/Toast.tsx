'use client';

import { createContext, useCallback, useContext, useState } from 'react';

interface ToastCtx {
  toast: (msg: string) => void;
}
const Ctx = createContext<ToastCtx>({ toast: () => {} });
export const useToast = () => useContext(Ctx);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [msgs, setMsgs] = useState<Array<{ id: number; msg: string }>>([]);
  const toast = useCallback((msg: string) => {
    const id = Date.now() + Math.random();
    setMsgs((m) => [...m, { id, msg }]);
    setTimeout(() => setMsgs((m) => m.filter((x) => x.id !== id)), 4000);
  }, []);
  return (
    <Ctx.Provider value={{ toast }}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 flex-col gap-2"
      >
        {msgs.map((m) => (
          <div
            key={m.id}
            className="rounded-xl bg-navy px-4 py-2.5 text-sm font-semibold text-white shadow-lg"
          >
            {m.msg}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
