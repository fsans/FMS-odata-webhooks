import * as React from "react"
import { cn } from "@/lib/utils"
import { Check } from "lucide-react"

const Checkbox = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => {
  return (
    <div className="relative inline-flex items-center">
      <input
        type="checkbox"
        className="peer sr-only"
        ref={ref}
        {...props}
      />
      <div
        className={cn(
          "h-4 w-4 shrink-0 rounded-sm border border-slate-300 bg-white",
          "peer-focus-visible:outline-none peer-focus-visible:ring-1 peer-focus-visible:ring-slate-950",
          "peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
          "peer-checked:bg-slate-900 peer-checked:border-slate-900",
          "flex items-center justify-center",
          className
        )}
      >
        <Check className="h-3 w-3 text-white opacity-0 peer-checked:opacity-100" />
      </div>
    </div>
  )
})
Checkbox.displayName = "Checkbox"

export { Checkbox }
