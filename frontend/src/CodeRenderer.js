import React, { useState } from "react";
import { copyText } from "./utils/copyText";

const API_BASE_URL =
    process.env.REACT_APP_API_SERVER || "http://localhost:8888"; // FIXME: 根據設定調整

/**
 * Custom renderer for Markdown code blocks and inline code, used with react-markdown.
 *
 * Determines whether to render as inline code (`) or fenced code block (```),
 * and styles the output based on detected language type.
 *
 * @param {Object} props - Props provided by react-markdown.
 * @param {boolean} props.inline - True if this is inline code (single backticks).
 * @param {string} [props.className] - Class name, usually like "language-js" for fenced code blocks.
 * @param {React.ReactNode[]} props.children - The code content parsed from markdown.
 * @param {any} props.rest - Additional props passed through react-markdown.
 *
 * @returns {JSX.Element} Rendered inline or block code element.
 */

function CodeRenderer({ inline, className, children, ...props }) {
    // ADD 複製狀態
    const [isCopied, setIsCopied] = useState(false);
    // ADD ST 工具狀態
    const [variables, setVariables] = useState([]);
    const [logicCode, setLogicCode] = useState("");
    const [showVariables, setShowVariables] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [copiedLogic, setCopiedLogic] = useState(false);
    const [copiedCSV, setCopiedCSV] = useState(false);

    const raw = String(children ?? "");
    const lang =
        /language-([\w#+.-]+)/.exec(className || "")?.[1]?.toLowerCase() || "";

    // ADD 檢查是否為 ST 程式碼
    const isSTCode =
        raw.toLowerCase().includes("var") &&
        raw.toLowerCase().includes("end_var");

    // ADD 複製函數
    const handleCopy = async () => {
        try {
            await copyText(raw);
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        } catch (err) {
            console.error("Copy failed:", err);
        }

        // navigator.clipboard
        //     .writeText(raw)
        //     .then(() => {
        //         setIsCopied(true);
        //         setTimeout(() => setIsCopied(false), 2000);
        //     })
        //     .catch((err) => console.error("複製失敗:", err));
    };

    // ADD ST 工具函數
    const parseSTCode = async () => {
        setIsProcessing(true);
        try {
            const response = await fetch(`${API_BASE_URL}/api/parse_st_code`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ code: raw, extract_type: "both" })
            });
            if (!response.ok) throw new Error("API 失敗");
            const data = await response.json();
            if (data.success) {
                setVariables(data.variables || []);
                setLogicCode(data.logic_code || "");
            }
        } catch (error) {
            console.error("API 錯誤:", error);
        } finally {
            setIsProcessing(false);
        }
    };

    const copyLogic = async () => {
        if (!logicCode) return;

        try {
            await copyText(logicCode);
            setCopiedLogic(true);
            setTimeout(() => setCopiedLogic(false), 2000);
        } catch (err) {
            console.error("Copy failed:", err);
        }

        // if (logicCode) {
        //     navigator.clipboard.writeText(logicCode).then(() => {
        //         setCopiedLogic(true);
        //         setTimeout(() => setCopiedLogic(false), 2000);
        //     });
        // }
    };

    const convertToCSV = () => {
        if (variables.length === 0) return "";
        const headers = [
            "Class",
            "Identifier",
            "Address",
            "Type",
            "Initial Value",
            "Comment"
        ];
        const rows = variables.map((v) => [
            v.class_name,
            v.identifier,
            v.address,
            v.var_type,
            v.initial_value,
            v.comment
        ]);
        return [
            headers.join(","),
            ...rows.map((row) => row.map((cell) => `"${cell}"`).join(","))
        ].join("\n");
    };

    const copyCSV = async () => {
        const csv = convertToCSV();
        if (!csv) return;

        try {
            await copyText(csv);
            setCopiedCSV(true);
            setTimeout(() => setCopiedCSV(false), 2000);
        } catch (err) {
            console.error("Copy failed:", err);
        }

        // if (csv) {
        //     navigator.clipboard.writeText(csv).then(() => {
        //         setCopiedCSV(true);
        //         setTimeout(() => setCopiedCSV(false), 2000);
        //     });
        // }
    };

    const downloadCSV = () => {
        const csv = convertToCSV();
        if (!csv) return;
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `variables_${Date.now()}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // 🔹 Heuristic: treat tiny, single-line, lang-less "blocks" as inline chips
    const looksInlineish =
        !inline && !lang && !raw.includes("\n") && raw.trim().length <= 80;

    if (inline || looksInlineish) {
        return (
            <code
                style={{
                    background: "#eef1f4",
                    padding: "2px 6px",
                    borderRadius: 4,
                    fontFamily: "Consolas, Monaco, monospace"
                }}
                {...props}
            >
                {raw}
            </code>
        );
    }

    const wrapperStyle = inline
        ? {
              backgroundColor: "#f5f7fa",
              color: "#2c3e50",
              border: "1px solid #e5e9f0"
          }
        : {
              backgroundColor: "#1e1e1e",
              color: "#f8f8f2",
              border: "1px solid #141414"
          };

    return (
        <>
            {/* ADD 變數表格（點擊 👁️ 後顯示）*/}
            {showVariables && variables.length > 0 && (
                <div
                    style={{
                        marginTop: "8px",
                        padding: "8px",
                        backgroundColor: "#2a2a2a",
                        borderRadius: "4px",
                        overflowX: "auto"
                    }}
                >
                    <table
                        style={{
                            width: "100%",
                            fontSize: "11px",
                            borderCollapse: "collapse",
                            backgroundColor: "#1e1e1e",
                            color: "#f8f8f2"
                        }}
                    >
                        <thead>
                            <tr style={{ backgroundColor: "#333" }}>
                                <th
                                    style={{
                                        padding: "6px",
                                        textAlign: "left"
                                    }}
                                >
                                    識別符
                                </th>
                                <th
                                    style={{
                                        padding: "6px",
                                        textAlign: "left"
                                    }}
                                >
                                    類型
                                </th>
                                <th
                                    style={{
                                        padding: "6px",
                                        textAlign: "left"
                                    }}
                                >
                                    位址
                                </th>
                                <th
                                    style={{
                                        padding: "6px",
                                        textAlign: "left"
                                    }}
                                >
                                    初始值
                                </th>
                                <th
                                    style={{
                                        padding: "6px",
                                        textAlign: "left"
                                    }}
                                >
                                    註解
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {variables.map((v, i) => (
                                <tr
                                    key={i}
                                    style={{ borderBottom: "1px solid #444" }}
                                >
                                    <td style={{ padding: "6px" }}>
                                        {v.identifier}
                                    </td>
                                    <td style={{ padding: "6px" }}>
                                        {v.var_type}
                                    </td>
                                    <td style={{ padding: "6px" }}>
                                        {v.address || "-"}
                                    </td>
                                    <td style={{ padding: "6px" }}>
                                        {v.initial_value || "-"}
                                    </td>
                                    <td style={{ padding: "6px" }}>
                                        {v.comment || "-"}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <figure
                style={{
                    ...wrapperStyle,
                    padding: 14,
                    borderRadius: 8,
                    margin: "10px 0",
                    overflowX: "auto",
                    fontSize: "0.95em",
                    fontFamily: "Consolas, Monaco, monospace",
                    position: "relative" // ADD 讓按鈕能定位在右上角
                }}
            >
                {/* 按鈕 */}
                <figcaption
                    style={{
                        display: "flex",
                        flexWrop: "wrap",
                        justifyContent: "space-between",
                        alignItems: "center",
                        fontSize: "0.72em",
                        opacity: 0.8,
                        marginBottom: 8,
                        userSelect: "none",
                        letterSpacing: 0.3,
                        gap: "8px 6px"
                    }}
                >
                    {/* Hide the label if there’s no language */}
                    {lang && (
                        <span
                            style={{
                                fontSize: "0.72em",
                                opacity: 0.8,
                                marginBottom: 8,
                                userSelect: "none",
                                letterSpacing: 0.3,
                                flex: "0 0 auto"
                            }}
                        >
                            {lang.toUpperCase()}
                        </span>
                    )}
                    {/* 按鈕區 */}
                    <span
                        style={{
                            display: "flex",
                            flexWrap: "wrap",
                            gap: "6px",
                            alignItems: "center",
                            marginLeft: "auto",
                            maxWidth: "100%"
                        }}
                    >
                        {/* 原本的複製按鈕（所有程式碼都有） */}
                        {!inline && (
                            <button
                                onClick={handleCopy}
                                style={{
                                    // all: "unset",
                                    boxShadow: "none",
                                    outline: "none",
                                    padding: "2px 6px",
                                    backgroundColor: isCopied
                                        ? "#27ae60"
                                        : "transparent",
                                    color: isCopied ? "white" : "#f8f8f2",
                                    border: "none",
                                    // border: "1px solid #f8f8f2",
                                    borderRadius: 4,
                                    cursor: "pointer",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontSize: "14px"
                                }}
                            >
                                <span
                                    className="material-icons"
                                    style={{
                                        fontSize: "1.0em"
                                    }}
                                >
                                    {isCopied ? "check" : "content_copy"}
                                </span>
                            </button>
                        )}

                        {/* ADD ST 工具按鈕（只在 ST 程式碼顯示）  */}
                        {isSTCode && (
                            <>
                                <button
                                    onClick={parseSTCode}
                                    disabled={isProcessing}
                                    style={{
                                        padding: "2px 6px",
                                        backgroundColor: isProcessing
                                            ? "#555"
                                            : "#007bff",
                                        color: "white",
                                        border: "none",
                                        borderRadius: 4,
                                        cursor: isProcessing
                                            ? "not-allowed"
                                            : "pointer",
                                        opacity: isProcessing ? 0.6 : 1,
                                        alignItems: "center",
                                        justifyContent: "center",
                                        fontSize: "14px"
                                    }}
                                >
                                    <span
                                        className="material-icons"
                                        style={{
                                            fontSize: "1.0em"
                                        }}
                                    >
                                        {isProcessing ? "sync" : "data_object"}
                                    </span>
                                </button>

                                <button
                                    onClick={copyLogic}
                                    disabled={!logicCode}
                                    style={{
                                        padding: "2px 6px",
                                        fontSize: "0.9em",
                                        backgroundColor: copiedLogic
                                            ? "#27ae60"
                                            : logicCode
                                            ? "#6c757d"
                                            : "#555",
                                        color: "white",
                                        border: "none",
                                        borderRadius: 4,
                                        cursor: logicCode
                                            ? "pointer"
                                            : "not-allowed",
                                        opacity: logicCode ? 1 : 0.5
                                    }}
                                >
                                    {copiedLogic ? "✓" : "Main"}
                                </button>

                                <button
                                    onClick={() =>
                                        setShowVariables(!showVariables)
                                    }
                                    disabled={variables.length === 0}
                                    style={{
                                        padding: "2px 6px",
                                        fontSize: "0.9em",
                                        backgroundColor:
                                            variables.length > 0
                                                ? "#17a2b8"
                                                : "#555",
                                        color: "white",
                                        border: "none",
                                        borderRadius: 4,
                                        cursor:
                                            variables.length > 0
                                                ? "pointer"
                                                : "not-allowed",
                                        opacity: variables.length > 0 ? 1 : 0.5
                                    }}
                                >
                                    {showVariables ? "👁️" : "查看變數"}(
                                    {variables.length})
                                </button>

                                <button
                                    onClick={copyCSV}
                                    disabled={variables.length === 0}
                                    style={{
                                        padding: "2px 6px",
                                        fontSize: "0.9em",
                                        backgroundColor: copiedCSV
                                            ? "#27ae60"
                                            : variables.length > 0
                                            ? "#ffc107"
                                            : "#555",
                                        color:
                                            copiedCSV || variables.length === 0
                                                ? "white"
                                                : "#000",
                                        border: "none",
                                        borderRadius: 4,
                                        cursor:
                                            variables.length > 0
                                                ? "pointer"
                                                : "not-allowed",
                                        opacity: variables.length > 0 ? 1 : 0.5
                                    }}
                                >
                                    {copiedCSV ? "✓" : "copy 變數"}
                                </button>

                                <button
                                    onClick={downloadCSV}
                                    disabled={variables.length === 0}
                                    style={{
                                        padding: "2px 6px",
                                        fontSize: "0.9em",
                                        backgroundColor:
                                            variables.length > 0
                                                ? "#28a745"
                                                : "#555",
                                        color: "white",
                                        border: "none",
                                        borderRadius: 4,
                                        cursor:
                                            variables.length > 0
                                                ? "pointer"
                                                : "not-allowed",
                                        opacity: variables.length > 0 ? 1 : 0.5
                                    }}
                                >
                                    匯出變數csv
                                </button>
                            </>
                        )}
                    </span>
                </figcaption>
                <pre
                    style={{
                        margin: 0,
                        whiteSpace: "pre",
                        overflowX: "auto",
                        // wordBreak: 'break-word',
                        background: "transparent",
                        lineHeight: 1.5,
                        tabSize: 4,
                        MozTabSize: 4
                    }}
                >
                    <code className={className} {...props}>
                        {raw}
                    </code>
                </pre>
            </figure>
        </>
    );
}

export default CodeRenderer;
