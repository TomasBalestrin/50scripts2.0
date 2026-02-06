"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

interface TooltipProviderProps {
  children: React.ReactNode
  delayDuration?: number
}

const TooltipContext = React.createContext<{ delayDuration: number }>({
  delayDuration: 200,
})

const TooltipProvider: React.FC<TooltipProviderProps> = ({
  children,
  delayDuration = 200,
}) => {
  return (
    <TooltipContext.Provider value={{ delayDuration }}>
      {children}
    </TooltipContext.Provider>
  )
}
TooltipProvider.displayName = "TooltipProvider"

interface TooltipItemContextValue {
  open: boolean
  setOpen: (open: boolean) => void
}

const TooltipItemContext = React.createContext<TooltipItemContextValue>({
  open: false,
  setOpen: () => {},
})

interface TooltipProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
}

const Tooltip: React.FC<TooltipProps> = ({
  open: controlledOpen,
  onOpenChange,
  children,
}) => {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false)
  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : uncontrolledOpen

  const setOpen = React.useCallback(
    (value: boolean) => {
      if (!isControlled) {
        setUncontrolledOpen(value)
      }
      onOpenChange?.(value)
    },
    [isControlled, onOpenChange]
  )

  return (
    <TooltipItemContext.Provider value={{ open, setOpen }}>
      <div className="relative inline-flex">{children}</div>
    </TooltipItemContext.Provider>
  )
}
Tooltip.displayName = "Tooltip"

const TooltipTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean }
>(({ children, asChild, ...props }, ref) => {
  const { setOpen } = React.useContext(TooltipItemContext)
  const { delayDuration } = React.useContext(TooltipContext)
  const timeoutRef = React.useRef<ReturnType<typeof setTimeout>>()

  const handleMouseEnter = () => {
    timeoutRef.current = setTimeout(() => {
      setOpen(true)
    }, delayDuration)
  }

  const handleMouseLeave = () => {
    clearTimeout(timeoutRef.current)
    setOpen(false)
  }

  React.useEffect(() => {
    return () => clearTimeout(timeoutRef.current)
  }, [])

  return (
    <button
      ref={ref}
      type="button"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      {...props}
    >
      {children}
    </button>
  )
})
TooltipTrigger.displayName = "TooltipTrigger"

const TooltipContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { sideOffset?: number }
>(({ className, sideOffset = 4, ...props }, ref) => {
  const { open } = React.useContext(TooltipItemContext)

  if (!open) return null

  return (
    <div
      ref={ref}
      role="tooltip"
      className={cn(
        "absolute bottom-full left-1/2 z-50 -translate-x-1/2 overflow-hidden rounded-md border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95",
        className
      )}
      style={{ marginBottom: sideOffset }}
      {...props}
    />
  )
})
TooltipContent.displayName = "TooltipContent"

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }
