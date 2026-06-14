"use client";

import { LanguageSwitcherBase } from "./base/language-switcher-base";

interface LanguageChangerProps {
  isInverted?: boolean;
  isDark?: boolean;
}

export function LanguageChanger({ isInverted = false, isDark = false }: LanguageChangerProps) {
  return <LanguageSwitcherBase variant="default" isInverted={isInverted} isDark={isDark} />;
}
