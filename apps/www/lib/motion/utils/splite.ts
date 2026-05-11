export function isRTLText(text: string): boolean {
  const rtlRange =
    /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF\u0590-\u05FF]/g;
  const stripped = text.replace(/\s/g, "");
  if (!stripped.length) return false;
  const rtlCount = (stripped.match(rtlRange) ?? []).length;
  return rtlCount / stripped.length > 0.3;
}

export function splitIntoChars(element: HTMLElement): Element[] {
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  const textNodes: Text[] = [];
  let node: Node | null;

  while ((node = walker.nextNode())) {
    if ((node as Text).textContent?.trim()) {
      textNodes.push(node as Text);
    }
  }

  for (const textNode of textNodes) {
    const raw = textNode.textContent ?? "";
    if (!raw.trim()) continue;

    const fragment = document.createDocumentFragment();

    for (const ch of raw) {
      if (/\s/.test(ch)) {
        fragment.appendChild(
          document.createTextNode(ch === " " ? "\u00A0" : ch),
        );
      } else {
        const span = document.createElement("span");
        span.className = "m-char";
        span.dataset.script = "latin";
        span.style.cssText = "display:inline-block";
        span.textContent = ch;
        fragment.appendChild(span);
      }
    }

    textNode.parentNode?.replaceChild(fragment, textNode);
  }

  return Array.from(element.querySelectorAll(".m-char"));
}

export function splitIntoWords(
  element: HTMLElement,
  script: "arabic" | "latin" = "latin",
): Element[] {
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
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
        span.style.cssText =
          script === "arabic"
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

export function splitIntoLines(element: HTMLElement): Element[] {
  const childNodes = Array.from(element.childNodes);
  element.innerHTML = "";

  const createLine = (): HTMLSpanElement => {
    const span = document.createElement("span");
    span.className = "m-line";
    span.style.cssText = "display:block";
    return span;
  };

  let currentLine = createLine();

  for (const child of childNodes) {
    if ((child as Element).tagName === "BR") {
      element.appendChild(currentLine);
      currentLine = createLine();
    } else {
      currentLine.appendChild(child.cloneNode(true));
    }
  }

  element.appendChild(currentLine);
  return Array.from(element.querySelectorAll(".m-line"));
}

export function autoSplit(
  element: HTMLElement,
  preference: "char" | "word" | "line" = "char",
): { targets: Element[]; isRTL: boolean; canBlur: boolean } {
  const text = element.textContent ?? "";
  const rtl = isRTLText(text);

  let targets: Element[];

  if (rtl) {
    targets = splitIntoWords(element, "arabic");
    return { targets, isRTL: true, canBlur: false };
  }

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

  return { targets, isRTL: false, canBlur: true };
}
