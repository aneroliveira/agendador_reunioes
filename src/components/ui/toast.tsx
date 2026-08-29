"use client"

import { Toast as ToastPrimitive } from "@base-ui/react/toast"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"

export const useToastManager = ToastPrimitive.useToastManager

function ToastProvider({ ...props }: ToastPrimitive.Provider.Props) {
  return <ToastPrimitive.Provider {...props} />
}

/** Renders whatever toasts are currently active — mount once near the root, alongside ToastProvider. */
function Toaster() {
  const { toasts } = ToastPrimitive.useToastManager()
  return (
    <ToastPrimitive.Portal>
      <ToastPrimitive.Viewport
        data-slot="toast-viewport"
        className="fixed bottom-4 left-1/2 z-50 flex w-full max-w-xs -translate-x-1/2 flex-col gap-2 sm:right-4 sm:left-auto sm:translate-x-0"
      >
        {toasts.map((toast) => (
          <ToastPrimitive.Root
            key={toast.id}
            toast={toast}
            className={cn(
              "relative rounded-lg bg-popover p-3 pr-8 text-sm text-popover-foreground ring-1 ring-foreground/10 duration-150",
              "data-starting-style:translate-y-1/2 data-starting-style:opacity-0",
              "data-ending-style:opacity-0",
            )}
          >
            <ToastPrimitive.Title data-slot="toast-title" className="font-medium" />
            <ToastPrimitive.Description data-slot="toast-description" className="text-muted-foreground" />
            <ToastPrimitive.Close
              data-slot="toast-close"
              aria-label="Fechar"
              className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
            >
              <X className="size-3.5" />
            </ToastPrimitive.Close>
          </ToastPrimitive.Root>
        ))}
      </ToastPrimitive.Viewport>
    </ToastPrimitive.Portal>
  )
}

export { ToastProvider, Toaster }
