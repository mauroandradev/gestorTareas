import React, { useEffect } from 'react';

export default function Toast({ toast, onClose }) {
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        onClose();
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toast, onClose]);

  if (!toast) return null;

  const isError = toast.type === 'error';

  return (
    <div className="fixed bottom-6 right-6 bg-surface-container-highest text-on-surface px-space-lg py-space-md rounded-xl shadow-2xl flex items-center gap-space-md z-50 border border-surface-variant/40 animate-bounce-short">
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
          isError ? 'bg-error-container text-on-error-container' : 'bg-secondary/20 text-secondary'
        }`}
      >
        <span className="material-symbols-outlined text-[20px]">
          {isError ? 'priority_high' : 'check'}
        </span>
      </div>
      <div className="flex flex-col">
        <span className="text-sm font-semibold text-on-surface">{toast.title || 'Operación Exitosa'}</span>
        <span className="text-xs text-on-surface-variant">{toast.message}</span>
      </div>
      <button onClick={onClose} className="text-outline hover:text-on-surface ml-2 text-sm">
        ✕
      </button>
    </div>
  );
}
