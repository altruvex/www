(function () {
  const here = location.pathname.split("/").pop();
  const bar = document.createElement("div");
  bar.className = "switch";
  [["a.html", "A · Specimen"], ["b.html", "B · Screens"], ["c.html", "C · Anatomy"], ["d.html", "D · The Lab"]].forEach(([href, label]) => {
    const a = document.createElement("a");
    a.href = href; a.textContent = label;
    if (href === here) a.className = "on";
    bar.appendChild(a);
  });
  const t = document.createElement("button");
  const root = document.documentElement;
  const isDark = () => root.dataset.theme ? root.dataset.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
  const paint = () => (t.textContent = isDark() ? "☀ Light" : "☾ Dark");
  t.onclick = () => { root.dataset.theme = isDark() ? "light" : "dark"; paint(); };
  paint();
  bar.appendChild(t);
  document.body.appendChild(bar);
})();
