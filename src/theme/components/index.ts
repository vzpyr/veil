import type { MantineThemeComponents } from "@mantine/core";
import { controls } from "./controls";
import { display } from "./display";
import { overlays } from "./overlays";

export const components: MantineThemeComponents = {
  ...controls,
  ...display,
  ...overlays,
};
