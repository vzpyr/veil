import React from "react";
import ReactDOM from "react-dom/client";
import { MantineProvider } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import { MotionConfig } from "motion/react";
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import "@mantine/carousel/styles.css";
import "./tokens.css";
import { theme } from "./theme";
import App from "./App";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <MantineProvider theme={theme} defaultColorScheme="dark">
      <MotionConfig reducedMotion="user">
        <Notifications position="bottom-right" />
        <App />
      </MotionConfig>
    </MantineProvider>
  </React.StrictMode>,
);
