function parseBaseKeyFromEvent(e: KeyboardEvent): string {
  const code = e.code;
  if (code.startsWith("Key") && code.length === 4) {
    return code.slice(3).toLowerCase();
  }
  if (code.startsWith("Digit") && code.length === 6) {
    return code.slice(5);
  }
  if (code.startsWith("Numpad")) {
    const numPart = code.slice(6);
    if (/^\d$/.test(numPart)) {
      return `numpad${numPart}`;
    }
    if (code === "NumpadAdd") return "add";
    if (code === "NumpadSubtract") return "subtract";
    if (code === "NumpadMultiply") return "multiply";
    if (code === "NumpadDivide") return "divide";
    if (code === "NumpadDecimal") return "decimal";
    if (code === "NumpadEnter") return "enter";
  }
  if (/^F\d+$/i.test(code)) {
    return code.toLowerCase();
  }
  if (code === "BracketLeft") return "[";
  if (code === "BracketRight") return "]";
  if (code === "Backslash") return "\\";
  if (code === "Semicolon") return ";";
  if (code === "Quote") return "'";
  if (code === "Comma") return ",";
  if (code === "Period") return ".";
  if (code === "Slash") return "/";
  if (code === "Minus") return "-";
  if (code === "Equal") return "=";
  if (code === "Backquote") return "`";
  if (code === "Space") return "space";
  if (code === "Tab") return "tab";
  if (code === "Enter") return "enter";
  if (code === "Backspace") return "backspace";
  if (code === "Delete") return "delete";
  if (code === "Insert") return "insert";
  if (code === "Home") return "home";
  if (code === "End") return "end";
  if (code === "PageUp") return "pageup";
  if (code === "PageDown") return "pagedown";
  if (code === "ArrowUp") return "up";
  if (code === "ArrowDown") return "down";
  if (code === "ArrowLeft") return "left";
  if (code === "ArrowRight") return "right";

  return e.key.toLowerCase();
}

export function buildKeyCombination(e: KeyboardEvent): string | null {
  if (
    e.key === "Control" ||
    e.key === "Alt" ||
    e.key === "Shift" ||
    e.key === "Meta"
  ) {
    return null;
  }

  const baseKey = parseBaseKeyFromEvent(e);
  if (!baseKey) {
    return null;
  }

  const parts: string[] = [];
  if (e.ctrlKey) parts.push("ctrl");
  if (e.altKey) parts.push("alt");
  if (e.shiftKey) parts.push("shift");
  parts.push(baseKey);

  return parts.join(" ");
}
