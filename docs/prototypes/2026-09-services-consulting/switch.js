(function () {
  const here = location.pathname.split("/").pop() || "overview.html";
  const root = document.documentElement;
  // ?theme=dark / ?theme=light forces a theme, so a headless capture can shoot
  // both without clicking. ?brief=off does the same for the slot below.
  const q = new URLSearchParams(location.search);
  if (q.get("theme")) root.dataset.theme = q.get("theme");
  const bar = document.createElement("div");
  bar.className = "switch";

  [["overview.html", "Devices"], ["b.html", "Page · D + B"]].forEach(([href, label]) => {
    const a = document.createElement("a");
    a.href = href; a.textContent = label;
    if (href === here) a.className = "on";
    bar.appendChild(a);
  });

  // The pinned brief is a slot, not a decision yet — toggle it to feel the page
  // both ways. The choice is remembered so a reload does not reset the comparison.
  const slot = document.getElementById("briefslot");
  if (slot) {
    const KEY = "altruvex-consulting-brief";
    const b = document.createElement("button");
    const forced = q.get("brief");
    const on = () => (forced ? forced !== "off" : localStorage.getItem(KEY) !== "off");
    const paint = () => {
      slot.hidden = !on();
      b.textContent = on() ? "Brief: on" : "Brief: off";
      b.setAttribute("aria-pressed", String(on()));
    };
    b.onclick = () => { localStorage.setItem(KEY, on() ? "off" : "on"); paint(); };
    try { paint(); } catch { slot.hidden = false; }
    bar.appendChild(b);
  }

  const t = document.createElement("button");
  const isDark = () => root.dataset.theme ? root.dataset.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
  const paintTheme = () => (t.textContent = isDark() ? "☀ Light" : "☾ Dark");
  t.onclick = () => { root.dataset.theme = isDark() ? "light" : "dark"; paintTheme(); };
  paintTheme();
  bar.appendChild(t);

  document.body.appendChild(bar);
})();
