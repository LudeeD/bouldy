import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { PostHogProvider } from "posthog-js/react";
import { markReactMountStart, markReactMountEnd, markThemeInitEnd } from "./utils/performance";

//import { scan } from "react-scan";
//scan({ enabled: import.meta.env.DEV });

// Mark that theme init completed (done in index.html)
markThemeInitEnd();

// Mark when React mounting starts
markReactMountStart();

const options = {
  api_host: import.meta.env.VITE_PUBLIC_POSTHOG_HOST,
  person_profiles: "identified_only",
  capture_pageview: false, // Disable automatic pageview capture for Tauri apps
  capture_pageleave: false,
  autocapture: true,
} as const;

const root = ReactDOM.createRoot(document.getElementById("root") as HTMLElement);

// Render and mark completion
root.render(
  <React.StrictMode>
    <PostHogProvider
      apiKey={import.meta.env.VITE_PUBLIC_POSTHOG_KEY}
      options={options}
    >
      <App />
    </PostHogProvider>
  </React.StrictMode>,
);

// Mark React mount complete after render
// Use requestAnimationFrame to ensure painting happens
requestAnimationFrame(() => {
  markReactMountEnd();
});
