/* SPDX-License-Identifier: GPL-3.0-or-later
   Sets data-theme before first paint so an explicit Light/Dark choice
   doesn't flash the wrong theme for a moment — app.js re-applies (and
   owns) this later, this is purely a pre-paint head start. "System"
   (the default) needs no help here: the CSS media query already
   handles it with no attribute at all.

   Kept as its own external file (rather than inline in <head>, where it
   used to live) so the page's Content-Security-Policy can use a plain
   script-src 'self' with no 'unsafe-inline' allowance. */
(function () {
  try {
    var raw = localStorage.getItem("gspeak.settings");
    var theme = raw && JSON.parse(raw).theme;
    if (theme === "light" || theme === "dark") {
      document.documentElement.setAttribute("data-theme", theme);
    }
  } catch (e) {}
})();
