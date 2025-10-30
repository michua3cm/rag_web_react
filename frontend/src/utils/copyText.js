// copyText.js
export async function copyText(text) {
    // 1) Modern API (HTTPS/localhost)
    if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
    }
    // 2) WebView/Electron bridge (optional, if you add it later)
    if (window?.api?.copy) {
        await window.api.copy(text);
        return true;
    }
    // 3) HTTP fallback
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.top = "-9999px";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    let ok = false;
    try {
        ok = document.execCommand("copy");
    } finally {
        document.body.removeChild(textarea);
    }

    if (!ok) throw new Error("execCommand(copy) failed");
    return true;
}
