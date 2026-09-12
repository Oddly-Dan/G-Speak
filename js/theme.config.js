/* SPDX-License-Identifier: GPL-3.0-or-later
   ============================================================
   G-Speak white-label config — edit this ONE file to re-skin the app
   for your own deployment. No build step, no UI, no other files need
   to change.

   - title / headerTitle: the browser tab title and the visible header
     text. headerTitle defaults to `title` when left null.
   - logo: the little icon left of the header text.
       { type: "emoji", value: "🗣️" }               a plain character
       { type: "svg",   value: "<svg>...</svg>" }    inlined as-is —
         trusted content, since this is your own config file, not
         user input
       { type: "image", value: "path/to/logo.png" }  used as an <img src>
   - palette: overrides individual CSS custom properties (see the
     :root block at the top of css/style.css for the full list of
     keys — bg, panel, ink, accent, green, pin, etc. — minus the
     leading "--"). Leave a palette, or an individual key within it,
     out to keep the built-in default. `dark` only ever applies when
     the page is actually in dark mode (system or the Appearance
     toggle) — it composes with that, it doesn't replace it.

   This file only ever narrows/relabels the DEFAULT theme documented
   here; it is applied once, immediately (title + palette, so there's
   no flash of the defaults) and by app.js (header logo/text, once the
   page has loaded).
   ============================================================ */
(function () {
  "use strict";

  window.GSPEAK_THEME_CONFIG = {
    title: "G-Speak",
    headerTitle: null,
    logo: { type: "emoji", value: "🗣️" },
    palette: {
      light: {
        // accent: "#ff6600",
      },
      dark: {
        // accent: "#ffb366",
      },
    },
  };

  var config = window.GSPEAK_THEME_CONFIG;

  if (config.title) document.title = config.title;

  function toCSSVars(obj) {
    return Object.keys(obj)
      .map(function (key) {
        return "--" + key + ": " + obj[key] + ";";
      })
      .join(" ");
  }

  var css = "";
  if (config.palette && config.palette.light && Object.keys(config.palette.light).length) {
    css += ":root { " + toCSSVars(config.palette.light) + " }\n";
  }
  if (config.palette && config.palette.dark && Object.keys(config.palette.dark).length) {
    var darkVars = toCSSVars(config.palette.dark);
    // Same two-path structure as the built-in dark palette in
    // style.css (system preference, then the explicit override) so a
    // partial palette composes correctly with the Appearance toggle
    // instead of fighting it.
    css += '@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { ' + darkVars + " } }\n";
    css += ':root[data-theme="dark"] { ' + darkVars + " }\n";
  }
  if (css) {
    var style = document.createElement("style");
    style.id = "theme-config-overrides";
    style.textContent = css;
    document.head.appendChild(style);
  }
})();
