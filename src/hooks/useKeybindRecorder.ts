import { useCallback, useEffect, useRef, useState } from "react";
import { buildKeyCombination } from "../components/keybindKeys";
import type { ModKeybind } from "../types";

interface KeybindModifiers {
  ctrl: boolean;
  alt: boolean;
  shift: boolean;
}

const NO_MODIFIERS: KeybindModifiers = {
  ctrl: false,
  alt: false,
  shift: false,
};

export default function useKeybindRecorder(
  keybinds: ModKeybind[],
  onCommit: (keybind: ModKeybind, index: number, combo: string) => void,
) {
  const [recordingIndex, setRecordingIndex] = useState<number | null>(null);
  const [currentModifiers, setCurrentModifiers] =
    useState<KeybindModifiers>(NO_MODIFIERS);
  const onCommitRef = useRef(onCommit);
  onCommitRef.current = onCommit;

  const startRecording = useCallback((index: number) => {
    setRecordingIndex(index);
    setCurrentModifiers(NO_MODIFIERS);
  }, []);

  const cancelRecording = useCallback(() => {
    setRecordingIndex(null);
    setCurrentModifiers(NO_MODIFIERS);
  }, []);

  useEffect(() => {
    if (recordingIndex === null) return;

    const targetKeybind = keybinds[recordingIndex];
    if (!targetKeybind) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (e.key === "Escape") {
        setRecordingIndex(null);
        setCurrentModifiers(NO_MODIFIERS);
        return;
      }

      if (
        e.key === "Control" ||
        e.key === "Alt" ||
        e.key === "Shift" ||
        e.key === "Meta"
      ) {
        setCurrentModifiers({
          ctrl: e.ctrlKey,
          alt: e.altKey,
          shift: e.shiftKey,
        });
        return;
      }

      const combo = buildKeyCombination(e);
      if (combo) {
        onCommitRef.current(targetKeybind, recordingIndex, combo);
        setRecordingIndex(null);
        setCurrentModifiers(NO_MODIFIERS);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      setCurrentModifiers({
        ctrl: e.ctrlKey,
        alt: e.altKey,
        shift: e.shiftKey,
      });
    };

    window.addEventListener("keydown", handleKeyDown, true);
    window.addEventListener("keyup", handleKeyUp, true);

    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
      window.removeEventListener("keyup", handleKeyUp, true);
    };
  }, [recordingIndex, keybinds]);

  return { recordingIndex, currentModifiers, startRecording, cancelRecording };
}
