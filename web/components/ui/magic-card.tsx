"use client"

import React, { useCallback, useEffect, useRef, useState } from "react"
import {
  animate,
  motion,
  useMotionTemplate,
  useMotionValue,
} from "motion/react"

import { cn } from "@/lib/utils"

interface MagicCardProps {
  children?: React.ReactNode
  className?: string
  gradientSize?: number
  gradientColor?: string
  gradientOpacity?: number
  gradientFrom?: string
  gradientTo?: string
}

export function MagicCard({
  children,
  className,
  gradientSize = 200,
  gradientColor = "#262626",
  gradientOpacity = 0.8,
  gradientFrom = "#9E7AFF",
  gradientTo = "#FE8BBB",
}: MagicCardProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [mounted, setMounted] = useState(false)

  const mouseX = useMotionValue(-gradientSize)
  const mouseY = useMotionValue(-gradientSize)

  const borderBackground = useMotionTemplate`
    linear-gradient(var(--color-background) 0 0) padding-box,
    radial-gradient(${gradientSize}px circle at ${mouseX}px ${mouseY}px,
      ${gradientFrom}, 
      ${gradientTo},
      var(--color-border) 100%
    ) border-box
  `

  const hoverBackground = useMotionTemplate`
    radial-gradient(${gradientSize}px circle at ${mouseX}px ${mouseY}px, ${gradientColor}, transparent 100%)
  `

  useEffect(() => {
    setMounted(true)
  }, [])

  const reset = useCallback(() => {
    if (!ref.current) return
    const rect = ref.current.getBoundingClientRect()
    const x = mouseX.get()
    const y = mouseY.get()

    const distances = {
      left: x,
      right: rect.width - x,
      top: y,
      bottom: rect.height - y,
    }

    const closestEdge = Object.entries(distances).reduce(
      (closest, [edge, distance]) =>
        distance < closest.distance ? { edge, distance } : closest,
      { edge: "left", distance: distances.left }
    ).edge

    switch (closestEdge) {
      case "left":
        return animate(mouseX, -gradientSize)
      case "right":
        return animate(mouseX, rect.width + gradientSize)
      case "top":
        return animate(mouseY, -gradientSize)
      case "bottom":
        return animate(mouseY, rect.height + gradientSize)
      default:
        animate(mouseX, -gradientSize)
        animate(mouseY, -gradientSize)
    }
  }, [gradientSize, mouseX, mouseY])

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect()
      mouseX.set(e.clientX - rect.left)
      mouseY.set(e.clientY - rect.top)
    },
    [mouseX, mouseY]
  )

  useEffect(() => {
    reset()
  }, [reset])

  useEffect(() => {
    const handleGlobalPointerOut = (e: PointerEvent) => {
      if (!e.relatedTarget) {
        reset()
      }
    }

    const handleVisibility = () => {
      if (document.visibilityState !== "visible") {
        reset()
      }
    }

    window.addEventListener("pointerout", handleGlobalPointerOut)
    window.addEventListener("blur", reset)
    document.addEventListener("visibilitychange", handleVisibility)

    return () => {
      window.removeEventListener("pointerout", handleGlobalPointerOut)
      window.removeEventListener("blur", reset)
      document.removeEventListener("visibilitychange", handleVisibility)
    }
  }, [reset])

  return (
    <div
      ref={ref}
      className={cn(
        "group relative overflow-hidden rounded-[inherit] border border-transparent",
        className
      )}
      onPointerMove={handlePointerMove}
      onPointerLeave={reset}
      onPointerEnter={reset}
    >
      {mounted && (
        <>
          <motion.div
            className="pointer-events-none absolute inset-0 rounded-[inherit] border border-transparent"
            style={{ background: borderBackground }}
            aria-hidden
          />
          <motion.div
            className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
            style={{
              background: hoverBackground,
              opacity: gradientOpacity,
            }}
            aria-hidden
          />
        </>
      )}
      <div className="relative">{children}</div>
    </div>
  )
}
