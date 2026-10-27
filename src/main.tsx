import React from "react";
import { createRoot } from "react-dom/client";
import { Theme } from "@astryxdesign/core/theme";
import "@astryxdesign/core/reset.css";
import "@astryxdesign/core/astryx.css";
import "@astryxdesign/theme-neutral/theme.css";
import "@astryxdesign/theme-neutral/fonts.css";
import { themes, defaultThemeSlug } from "./astryx-themes";
import App from "./App";
import "./styles/app.css";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Theme theme={themes[defaultThemeSlug]} mode="light">
      <App />
    </Theme>
  </React.StrictMode>
);
