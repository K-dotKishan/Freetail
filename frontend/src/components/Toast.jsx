import React, { createContext, useContext, useState, useCallback } from 'react'
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react'
import clsx from 'clsx'

const ToastContext = createContext(null)

let id = 0
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const add = useCallback((msg, type = 'success', duration = 4000) => {
    const key = ++id
    setToasts((t) => [...t, { key, msg, type }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.key !== key)), duration)
  }, [])

  const remove = (key) => setToasts((t) => t.filter((x) => x.key !== key))

  return (
    <ToastContext.Provider value={add}>
      {children}
      <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2 max-w-sm w-full">
        {toasts.map(({ key, msg, type }) => (
          <div
            key={key}
            className={clsx(
              'flex items-start gap-3 p-4 rounded-2xl shadow-modal border animate-slide-in-right',
              'backdrop-blur-md',
              type === 'success' && 'bg-emerald-950/90 border-emerald-500/30 text-emerald-300',
              type === 'error'   && 'bg-rose-950/90 border-rose-500/30 text-rose-300',
              type === 'warning' && 'bg-amber-950/90 border-amber-500/30 text-amber-300',
              type === 'info'    && 'bg-indigo-950/90 border-indigo-500/30 text-indigo-300',
            )}
          >
            <span className="mt-0.5 flex-shrink-0">
              {type === 'success' && <CheckCircle size={16} />}
              {type === 'error'   && <XCircle size={16} />}
              {type === 'warning' && <AlertTriangle size={16} />}
              {type === 'info'    && <Info size={16} />}
            </span>
            <p className="flex-1 text-sm leading-snug">{msg}</p>
            <button onClick={() => remove(key)} className="opacity-50 hover:opacity-100 transition-opacity mt-0.5">
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)
