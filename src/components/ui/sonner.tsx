"use client"

import { useEffect, useState } from "react";
import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react"
import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"

import { resolveAppTheme } from "@/lib/themes"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme } = useTheme()
  // Defer to "light" until next-themes has resolved on the client.
  // Sonner's theme prop is a closed union ("light" | "dark" | "system"),
  // so we must not forward the app theme id directly — we map each
  // approved id to its light/dark classification and fall back to
  // "light" for unknown values (e.g. an old stored id).
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const resolved = resolveAppTheme(theme)
  const sonnerTheme: ToasterProps["theme"] = mounted
    ? resolved === "paper"
      ? "light"
      : "dark"
    : "light"

  return (
    <Sonner
      theme={sonnerTheme}
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
