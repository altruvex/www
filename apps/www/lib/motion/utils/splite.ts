function isRTLText(text: string): boolean {
  const rtlRange = /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF\u0590-\u05FF]/g;
  const stripped = text.replace(/\s/g, "");
  if (!stripped.length) return false;
  return (stripped.match(rtlRange) ?? []).length / stripped.length > 0.3;
}

const ACCENT_SELECTOR = "[data-accent-grad]";

function alignAccentGradients(root: HTMLElement): void {
  const accents = root.querySelectorAll<HTMLElement>(ACCENT_SELECTOR);
  accents.forEach((accentEl) => {
    if (accentEl.classList.contains("animate-text-gradient")) return;

    const fragments = Array.from(
      accentEl.querySelectorAll<HTMLElement>(".m-word, .m-char"),
    );
    if (!fragments.length) return;

    const accentRect = accentEl.getBoundingClientRect();
    if (!accentRect.width) return;

    const offsets = fragments.map(
      (fragment) => fragment.getBoundingClientRect().left - accentRect.left,
    );

    fragments.forEach((fragment, i) => {
      fragment.style.backgroundSize = `${accentRect.width}px 100%`;
      fragment.style.backgroundPositionX = `calc(${-offsets[i]}px + var(--sweep-x, 0px))`;
    });
  });
}

function createTextWalker(element: HTMLElement): TreeWalker {
  return document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
}

function splitIntoChars(element: HTMLElement): Element[] {
  const walker = createTextWalker(element);
  const textNodes: Text[] = [];
  let node: Node | null;

  while ((node = walker.nextNode())) {
    if ((node as Text).textContent?.trim()) textNodes.push(node as Text);
  }

  for (const textNode of textNodes) {
    const raw = textNode.textContent ?? "";
    const fragment = document.createDocumentFragment();

    let word: HTMLSpanElement | null = null;
    const closeWord = () => {
      if (word) {
        fragment.appendChild(word);
        word = null;
      }
    };

    for (const ch of raw) {
      if (/\s/.test(ch)) {
        closeWord();
        fragment.appendChild(document.createTextNode(ch === " " ? "\u00A0" : ch));
      } else {
        if (!word) {
          word = document.createElement("span");
          word.className = "m-word-box";
          word.style.cssText = "display:inline-block;white-space:nowrap";
        }
        const span = document.createElement("span");
        span.className = "m-char inline-block";
        span.dataset.script = "latin";
        span.textContent = ch;
        word.appendChild(span);
      }
    }
    closeWord();
    textNode.parentNode?.replaceChild(fragment, textNode);
  }

  return Array.from(element.querySelectorAll(".m-char"));
}

function splitIntoWords(element: HTMLElement, script: "arabic" | "latin" = "latin"): Element[] {
  const walker = createTextWalker(element);
  const textNodes: Text[] = [];
  let node: Node | null;

  while ((node = walker.nextNode())) {
    textNodes.push(node as Text);
  }

  for (const textNode of textNodes) {
    const raw = textNode.textContent ?? "";
    if (!raw.trim()) continue;

    const parts = raw.split(/(\s+)/);
    const fragment = document.createDocumentFragment();

    for (const part of parts) {
      if (/^\s+$/.test(part)) {
        fragment.appendChild(document.createTextNode(part));
      } else if (part.length > 0) {
        const span = document.createElement("span");
        span.className = "m-word";
        span.dataset.script = script;
        span.style.cssText = script === "arabic" 
          ? "display:inline;white-space:nowrap" 
          : "display:inline-block;white-space:nowrap";
        span.textContent = part;
        fragment.appendChild(span);
      }
    }
    textNode.parentNode?.replaceChild(fragment, textNode);
  }

  return Array.from(element.querySelectorAll(".m-word"));
}

function splitIntoLines(element: HTMLElement): Element[] {
  const text = element.textContent ?? "";
  const script = isRTLText(text) ? "arabic" : "latin";
  splitIntoWords(element, script);

  const words = Array.from(element.querySelectorAll(".m-word")) as HTMLElement[];
  if (!words.length) return [];

  type LineGroup = { y: number; elements: HTMLElement[] };
  const lines: LineGroup[] = [];
  const tolerance = 5;

  words.forEach((word) => {
    const rect = word.getBoundingClientRect();
    const top = rect.top;
    
    let matchedLine = lines.find((line) => Math.abs(line.y - top) < tolerance);
    if (!matchedLine) {
      matchedLine = { y: top, elements: [] };
      lines.push(matchedLine);
    }
    matchedLine.elements.push(word);
  });

  lines.sort((a, b) => a.y - b.y);

  element.innerHTML = "";
  const lineElements: Element[] = [];

  lines.forEach((line) => {
    const lineSpan = document.createElement("span");
    lineSpan.className = "m-line block relative";
    
    line.elements.forEach((word, index) => {
      lineSpan.appendChild(word.cloneNode(true));
      if (index < line.elements.length - 1) {
        lineSpan.appendChild(document.createTextNode(" "));
      }
    });

    element.appendChild(lineSpan);
    lineElements.push(lineSpan);
  });

  return lineElements;
}

export function autoSplit(
  element: HTMLElement,
  preference: "char" | "word" | "line" = "char",
): { targets: Element[]; isRTL: boolean; canBlur: boolean } {
  const text = element.textContent ?? "";
  const rtl = isRTLText(text);

  if (rtl) {
    const targets = splitIntoWords(element, "arabic");
    alignAccentGradients(element);
    return { targets, isRTL: true, canBlur: false };
  }

  let targets: Element[];
  switch (preference) {
    case "char":
      targets = splitIntoChars(element);
      break;
    case "word":
      targets = splitIntoWords(element, "latin");
      break;
    case "line":
      targets = splitIntoLines(element);
      break;
  }
  alignAccentGradients(element);

  return { targets, isRTL: false, canBlur: true };
}

export { alignAccentGradients };
