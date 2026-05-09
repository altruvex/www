"use client"

import { useLoading } from "@/components/providers/loading-provider"
import { useIsomorphicLayoutEffect } from "@/lib/dom-utils"
import { gsap } from "@/lib/gsap"
import { RefObject, useRef } from "react"
import { MOTION, getConstrainedDevice } from "../config"
import { autoSplit } from "../utils/splite"

export interface TextConfig {
    delay?: number
    duration?: number
    stagger?: number
    distance?: number
    ease?: string
    trigger?: string
    once?: boolean
    splitBy?: "char" | "word" | "line"
    blur?: boolean
    scrubExit?: boolean
}

const DEFAULTS: Required<TextConfig> = {
    delay: 0,
    duration: MOTION.duration.text,
    stagger: MOTION.stagger.base,
    distance: MOTION.distance.md,
    ease: MOTION.ease.text,
    trigger: MOTION.trigger.default,
    once: true,
    splitBy: "word",
    blur: true,
    scrubExit: false,
}

const MAX_TOTAL_STAGGER_DURATION = 0.6

export function useText<T extends HTMLElement = HTMLHeadingElement>(
    config: TextConfig = {},
): RefObject<T | null> {
    const ref = useRef<T | null>(null)
    const { isInitialLoadComplete } = useLoading()

    const {
        delay = DEFAULTS.delay,
        duration = DEFAULTS.duration,
        stagger = DEFAULTS.stagger,
        distance = DEFAULTS.distance,
        ease = DEFAULTS.ease,
        trigger = DEFAULTS.trigger,
        once = DEFAULTS.once,
        splitBy = DEFAULTS.splitBy,
        blur = DEFAULTS.blur,
        scrubExit = DEFAULTS.scrubExit,
    } = config

    useIsomorphicLayoutEffect(() => {
        const el = ref.current
        if (!el || !isInitialLoadComplete) return
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
                        gsap.set(el, { opacity: 1, y: 0, x: 0, filter: "none" })
                        return
                    }
                    const constrained = getConstrainedDevice()

                    let targets: Element[]
                    let isRTL = false
                    let canBlur = blur && !constrained

                    const alreadySplit = el.hasAttribute("data-m-split")

                    if (!alreadySplit) {
                        el.setAttribute("data-m-split", splitBy)
                        const result = autoSplit(el, splitBy)
                        targets = result.targets
                        isRTL = result.isRTL
                        canBlur = blur && result.canBlur && !constrained
                    } else {
                        const splitType = el.getAttribute("data-m-split")
                        const selector =
                            splitType === "char" ? ".m-char"
                                : splitType === "word" ? ".m-word"
                                    : ".m-line"
                        targets = Array.from(el.querySelectorAll(selector))
                        isRTL = targets.some(
                            (t) => (t as HTMLElement).dataset.script === "arabic"
                        )
                        canBlur = blur && !isRTL && !constrained
                    }
                    if (!targets.length) targets = [el]
                    const effectiveStagger =
                        targets.length > 1
                            ? Math.min(stagger, MAX_TOTAL_STAGGER_DURATION / targets.length)
                            : stagger
                    const from: gsap.TweenVars = {
                        opacity: 0,
                        y: distance,
                        willChange: "transform, opacity",
                    }

                    if (!constrained) {
                        from.scale = 0.96
                    }
                    if (canBlur) {
                        from.filter = "blur(4px)"
                    }
                    gsap.set(targets, from)

                    const animProps: gsap.TweenVars = {
                        opacity: 1,
                        y: 0,
                        duration,
                        stagger: { each: effectiveStagger, from: isRTL ? "end" : "start" },
                        delay,
                        ease: ease || "power4.out",
                        force3D: true,
                        overwrite: "auto",
                        scrollTrigger: {
                            trigger: el,
                            start: trigger,
                            once,
                            fastScrollEnd: true,
                            toggleActions: once
                                ? "play none none none"
                                : "play none none reverse",
                        },
                        onComplete() {
                            gsap.set(targets, {
                                clearProps: "willChange,filter",
                            })
                        },
                    }

                    if (!constrained) {
                        animProps.scale = 1
                    }

                    if (canBlur) {
                        animProps.filter = "blur(0px)"
                    }

                    gsap.to(targets, animProps)
                    if (scrubExit && !constrained) {
                        const section = el.closest("section") ?? el
                        gsap.to(targets, {
                            yPercent: isRTL ? 0 : -20,
                            opacity: 0,
                            ease: "power1.in",
                            overwrite: "auto",
                            force3D: true,
                            scrollTrigger: {
                                trigger: section,
                                start: "center top",
                                end: "bottom top",
                                scrub: 1.5,
                            },
                        })
                    }
                },
            )
        }, el)

        return () => ctx.revert()
    }, [isInitialLoadComplete, delay, duration, stagger, distance, ease, trigger, once, splitBy, blur, scrubExit])

    return ref
}