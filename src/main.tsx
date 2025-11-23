import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { PostHogProvider } from "posthog-js/react";
import { scan } from "react-scan";

//scan({ enabled: import.meta.env.DEV });

const options = {
  api_host: import.meta.env.VITE_PUBLIC_POSTHOG_HOST,
  person_profiles: "identified_only",
  capture_pageview: false, // Disable automatic pageview capture for Tauri apps
  capture_pageleave: false,
  autocapture: true,
} as const;

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <PostHogProvider
      apiKey={import.meta.env.VITE_PUBLIC_POSTHOG_KEY}
      options={options}
    >
      <App />
    </PostHogProvider>
  </React.StrictMode>,
);
