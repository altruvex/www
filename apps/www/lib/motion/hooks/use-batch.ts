"use client"

import { useLoading } from "@/components/providers/loading-provider"
import { useIsomorphicLayoutEffect } from "@/lib/dom-utils"
import { gsap } from "@/lib/gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { RefObject, useRef } from "react"
import { MOTION, getConstrainedDevice } from "../config"
import { RevealDirection } from "./use-reveal"

export interface BatchConfig {
    direction?: RevealDirection
    delay?: number
    duration?: number
    distance?: number
    stagger?: number
    ease?: string
    trigger?: string
    once?: boolean
    selector?: string
    alternate?: boolean
}

const DEFAULTS = {
    direction: "up" as RevealDirection,
    delay: 0,
    duration: MOTION.duration.base,
    distance: MOTION.distance.md,
    stagger: MOTION.stagger.base,
    ease: MOTION.ease.smooth,
    trigger: MOTION.trigger.default,
    once: true,
    selector: "",
    alternate: false,
} as const

export function useBatch<T extends HTMLElement = HTMLDivElement>(
    config: BatchConfig = {},
): RefObject<T | null> {
    const ref = useRef<T | null>(null)
    const { isInitialLoadComplete } = useLoading()

    const {
        direction = DEFAULTS.direction,
        delay = DEFAULTS.delay,
        duration = DEFAULTS.duration,
        distance = DEFAULTS.distance,
        stagger = DEFAULTS.stagger,
        ease = DEFAULTS.ease,
        trigger = DEFAULTS.trigger,
        once = DEFAULTS.once,
        selector = DEFAULTS.selector,
        alternate = DEFAULTS.alternate,
    } = config

    useIsomorphicLayoutEffect(() => {
        const container = ref.current
        if (!container || !isInitialLoadComplete) return

        const items = selector
            ? Array.from(container.querySelectorAll<HTMLElement>(selector))
            : Array.from(container.children) as HTMLElement[]

        if (!items.length) return
        const ctx = gsap.context(() => {
            const mm = gsap.matchMedia()

            mm.add(
                {
                    motion: "(prefers-reduced-motion: no-preference)",
                    reduced: "(prefers-reduced-motion: reduce)",
                },
                () => {
                    const prefersReduced = window.matchMedia(
                        "(prefers-reduced-motion: reduce)"
                    ).matches

                    if (prefersReduced) {
                        gsap.set(items, { opacity: 1, x: 0, y: 0, scale: 1 })
                        return
                    }
                    const constrained = getConstrainedDevice()
                    const effectiveDistance = constrained
                        ? Math.round(distance * 0.6)
                        : distance
                    if (alternate && (direction === "left" || direction === "right")) {
                        const evens = items.filter((_, i) => i % 2 === 0)
                        const odds = items.filter((_, i) => i % 2 === 1)
                        const evenFrom = buildFrom(direction, effectiveDistance)
                        const oddDir: RevealDirection = direction === "left" ? "right" : "left"
                        const oddFrom = buildFrom(oddDir, effectiveDistance)

                        gsap.set(evens, { ...evenFrom, willChange: "transform, opacity" })
                        gsap.set(odds, { ...oddFrom, willChange: "transform, opacity" })
                    } else {
                        const from = buildFrom(direction, effectiveDistance)
                        gsap.set(items, { ...from, willChange: "transform, opacity" })
                    }
                    if (!alternate) {
                        ScrollTrigger.batch(items, {
                            start: trigger,
                            once,
                            batchMax: 6,
                            onEnter(batch: Element[]) {
                                gsap.to(batch, {
                                    opacity: 1,
                                    x: 0,
                                    y: 0,
                                    scale: 1,
                                    duration,
                                    delay,
                                    ease,
                                    force3D: true,
                                    stagger: { each: stagger },
                                    onComplete() {
                                        gsap.set(batch, { willChange: "auto", clearProps: "willChange" })
                                    },
                                })
                            },
                            onLeaveBack: once
                                ? undefined
                                : (batch: Element[]) => {
                                    const from = buildFrom(direction, effectiveDistance)
                                    gsap.to(batch, {
                                        ...from,
                                        duration: duration * 0.6,
                                        ease: "power1.in",
                                        force3D: true,
                                        overwrite: "auto",
                                        onStart() {
                                            gsap.set(batch, { willChange: "transform, opacity" })
                                        },
                                        onComplete() {
                                            gsap.set(batch, { willChange: "auto", clearProps: "willChange" })
                                        },
                                    })
                                },
                        })
                    } else {
                        items.forEach((item, i) => {
                            const itemDir: RevealDirection =
                                alternate && i % 2 === 1
                                    ? direction === "left" ? "right"
                                        : direction === "right" ? "left"
                                            : direction
                                    : direction

                            gsap.to(item, {
                                opacity: 1,
                                x: 0,
                                y: 0,
                                scale: 1,
                                duration,
                                delay: delay + i * stagger,
                                ease,
                                force3D: true,
                                overwrite: "auto",
                                scrollTrigger: {
                                    trigger: item,
                                    start: trigger,
                                    once,
                                    fastScrollEnd: true,
                                    toggleActions: once
                                        ? "play none none none"
                                        : "play none none reverse",
                                },
                                onComplete() {
                                    gsap.set(item, { willChange: "auto", clearProps: "willChange" })
                                },
                            })

                            void itemDir
                        })
                    }
                },
            )
        }, container)

        return () => ctx.revert()
    }, [isInitialLoadComplete, direction, delay, duration, distance, stagger, ease, trigger, once, selector, alternate])

    return ref
}

function buildFrom(direction: RevealDirection, distance: number): gsap.TweenVars {
    const base: gsap.TweenVars = { opacity: 0 }
    if (direction === "up") return { ...base, y: distance }
    if (direction === "down") return { ...base, y: -distance }
    if (direction === "left") return { ...base, x: distance }
    if (direction === "right") return { ...base, x: -distance }
    if (direction === "scale") return { ...base, scale: 0.95 }
    return base
}