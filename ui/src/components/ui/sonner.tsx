"use client"

import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
  X,
} from "lucide-react"
import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  useTheme();

  return (
    <Sonner
      theme="dark"
      className="toaster group"
      toastOptions={{
        className: "tracking-tight font-[inherit] rounded-2xl bg-background border border-border/60 shadow-lg",
        classNames: {
          toast: "bg-background border border-border/60 rounded-2xl shadow-lg",
          title: "text-foreground font-semibold",
          description: "text-foreground/90 dark:text-muted-foreground",
          actionButton: "bg-[#00EC97] text-black hover:bg-[#00d97f] rounded-lg font-semibold",
          cancelButton: "bg-background/60 backdrop-blur-sm border border-border/60 text-foreground hover:bg-[#00EC97] hover:border-[#00EC97] hover:text-black rounded-lg font-semibold",
          success: "bg-background border border-[#00EC97]/60",
          error: "bg-background border border-destructive/60",
          warning: "bg-background border border-yellow-500/60",
          info: "bg-background border border-blue-500/60",
        },
      }}
      icons={{
        success: <CircleCheckIcon className="size-4 text-[#00EC97]" />,
        info: <InfoIcon className="size-4 text-blue-500" />,
        warning: <TriangleAlertIcon className="size-4 text-yellow-500" />,
        error: <OctagonXIcon className="size-4 text-destructive" />,
        loading: <Loader2Icon className="size-4 animate-spin text-[#00EC97]" />,
      }}
      {...props}
    />
  )
}

export { Toaster }
