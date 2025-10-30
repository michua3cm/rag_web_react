import React, { useState, useRef, useEffect, useMemo } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import CodeRenderer from "./CodeRenderer";
// import STCodeExtractor from './STCodeExtractor';

function App() {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");
    const [mode, setMode] = useState("geminiNative");
    const [isStreaming, setIsStreaming] = useState(false);
    const [copiedMessageId, setCopiedMessageId] = useState(null); // ADD：追蹤哪個訊息被複製
    const chatboxRef = useRef(null);
    const eventSourceRef = useRef(null);

    const codePart = useMemo(() => {
        // Concatenate all message contents
        const text = messages.map((m) => m?.content ?? "").join("\n");
        if (!text) return [];

        // Split by fences and ignore a trailing, incomplete block if streaming
        const parts = text.split("```");
        const fenceCount = (text.match(/```/g) || []).length;
        const upper = fenceCount % 2 === 0 ? parts.length : parts.length - 1;

        const blocks = [];
        for (let i = 1; i < upper; i += 2) {
            const block = parts[i];

            // First line may be a language tag (js, ts, python, bash, etc.)
            const [firstLine, ...rest] = block.split("\n");
            const first = (firstLine || "").trim();
            const isLang = /^[a-zA-Z0-9+#!._-]+$/.test(first);

            const lang = isLang ? first : "plaintext";
            const code = (isLang ? rest.join("\n") : block).trim();

            if (code) blocks.push({ lang, code });
        }

        return blocks;
    }, [messages]);

    /**
     * 它負責將純文本 (包含 Markdown 標記) 轉換為 HTML。
     */
    // const renderMarkdown = (markdownText) => {
    //   // 透過 ``` 分割文字，來區分"一般文字"和"程式碼"
    //   const parts = markdownText.split("```");
    //   let htmlOutput = "";

    //   parts.forEach((part, index) => {
    //     if (index % 2 === 0) {
    //       // --- 一般文字 (索引 0, 2, 4...) ---

    //       // 1. 轉義 HTML 特殊字元 (避免 XSS)
    //       let regularText = part
    //         .replace(/&/g, "&amp;")
    //         .replace(/</g, "&lt;")
    //         .replace(/>/g, "&gt;")
    //         .replace(/"/g, "&quot;")
    //         .replace(/'/g, "&#39;");

    //       // 2. 處理粗體 (必須在轉義之後)
    //       regularText = regularText.replace(
    //         /\*\*([^\*]+)\*\*/g,
    //         "<strong>$1</strong>"
    //       );

    //       // 3. 處理換行：這是一個簡單的 Markdown 模擬
    //       // 3a. 先處理多個換行 (視為段落間隔)
    //       regularText = regularText.replace(/(\n\s*\n)+/g, "</p><p>");
    //       // 3b. 再將單一換行轉換為 <br/> (行內換行)
    //       regularText = regularText.replace(/\n/g, "<br/>");

    //       // 加上 <p> 標籤包裝內容 (如果內容非空)
    //       if (regularText.trim()) {
    //         htmlOutput += `<p style="margin: 0; padding: 0;">${regularText}</p>`;
    //       } else {
    //         // 如果是空的，可能只是程式碼區塊之間的分隔，給一個小間隔
    //         htmlOutput += "<div></div>";
    //       }
    //     } else {
    //       // --- 程式碼 (索引 1, 3, 5...) ---
    //       const lines = part.split("\n");
    //       // 取得語言名稱，並移除多餘的空白字元
    //       const language =
    //         (lines.length > 0 ? lines.shift().trim() : "") || "plaintext";

    //       // 我們信任 LLM 輸出時會包含正確的換行符 \n
    //       let codeContent = lines.join("\n").trim();

    //       // 只轉義 HTML 特殊字元，不要改變換行或空格
    //       const cleanCode = codeContent
    //         .replace(/&/g, "&amp;")
    //         .replace(/</g, "&lt;")
    //         .replace(/>/g, "&gt;")
    //         .replace(/"/g, "&quot;")
    //         .replace(/'/g, "&#39;");

    //       // 回傳帶有樣式的 <pre> 區塊
    //       htmlOutput += `
    //           <div style="
    //           background-color: #2d2d2d;
    //           color: #f8f8f2;
    //           padding: 15px;
    //           border-radius: 8px;
    //           margin: 10px 0;
    //           overflow-x: auto;
    //           border: 1px solid #1c1c1c;
    //           font-size: 0.9em;
    //           font-family: 'Consolas', 'Monaco', monospace;
    //           ">
    //           <div style="
    //               font-size: 0.75em;
    //               color: #ccc;
    //               margin-bottom: 8px;
    //               user-select: none;
    //           ">${language.toUpperCase()}</div>
    //           <pre style="
    //               margin: 0;
    //               white-space: pre-wrap;  /* 關鍵：保留空格和換行 */
    //               word-break: break-word;
    //               background-color: transparent;
    //               padding: 0;
    //               font-family: inherit;
    //               line-height: 1.5;
    //           ">${cleanCode}</pre>
    //           </div>
    //       `;
    //     }
    //   });

    //   return htmlOutput;
    // };

    // ===== ADD：提取單個訊息中的程式碼區塊 =====
    const extractCodeFromMessage = (content) => {
        const codeBlocks = [];
        const regex = /```(?:[\w]+)?\s*([\s\S]*?)```/g;
        let match;

        while ((match = regex.exec(content)) !== null) {
            const code = match[1].trim();
            if (code) {
                codeBlocks.push(code);
            }
        }

        return codeBlocks;
    };

    // ===== ADD：複製訊息中的所有程式碼 =====
    const copyAllCode = (messageId, content) => {
        const codeBlocks = extractCodeFromMessage(content);

        if (codeBlocks.length === 0) {
            alert("這個訊息沒有程式碼區塊");
            return;
        }

        // 合併所有程式碼區塊，用註釋分隔
        const allCode = codeBlocks
            .map((code, index) => {
                if (codeBlocks.length === 1) {
                    return code; // 如果只有一個區塊，直接返回
                }
                // 多個區塊時加分隔註釋
                return `// ========== 程式碼區塊 ${
                    index + 1
                } ==========\n${code}`;
            })
            .join("\n\n");

        navigator.clipboard
            .writeText(allCode)
            .then(() => {
                setCopiedMessageId(messageId);
                setTimeout(() => setCopiedMessageId(null), 2000);
            })
            .catch((err) => {
                console.error("複製失敗:", err);
                alert("複製失敗，請重試");
            });
    };

    const submitQuestion = () => {
        if (!input.trim() || isStreaming) return;

        const userQuestion = input;
        setInput("");
        setIsStreaming(true);

        // 用戶訊息
        setMessages((prev) => [
            ...prev,
            {
                role: "user",
                content: userQuestion, // 儲存純文本
                id: Date.now()
            }
        ]);

        // Chatbot 初始訊息
        const chatbotMessageId = Date.now() + 1;
        setMessages((prev) => [
            ...prev,
            {
                role: "chatbot",
                content: "請稍後...", // 儲存純文本
                id: chatbotMessageId,
                streaming: ""
            }
        ]);

        // 選擇端點
        let endpoint;
        if (mode === "gemini") {
            endpoint = "/gemini_stream";
        } else if (mode === "geminiNative") {
            endpoint = "/gemini_native_stream";
        } else if (mode === "dms") {
            endpoint = "/dms_stream";
        } else if (mode === "openrouter") {
            endpoint = "/openrouter_stream";
        } else {
            endpoint = "/stream";
        }

        // 建立 EventSource
        const eventSource = new EventSource(
            `${endpoint}?question=${encodeURIComponent(userQuestion)}`
        );
        eventSourceRef.current = eventSource;
        console.log(`Connecting to: ${endpoint}`);

        let accumulatedText = "";
        let isFirstChunk = true;

        eventSource.onmessage = (event) => {
            if (event.data === "[DONE]") {
                eventSource.close();
                if (codePart) console.log(codePart);
                setIsStreaming(false);
                return;
            }

            // 處理錯誤訊息
            if (event.data.startsWith("[錯誤]")) {
                setMessages((prev) => {
                    const newMessages = [...prev];
                    const lastIndex = newMessages.length - 1;
                    newMessages[lastIndex] = {
                        ...newMessages[lastIndex],
                        content: `[連線錯誤] ${event.data}`
                    };
                    return newMessages;
                });
                eventSource.close();
                setIsStreaming(false);
                return;
            }

            // 清除「請稍後...」
            if (isFirstChunk) {
                accumulatedText = "";
                isFirstChunk = false;
            }

            // 只累積原始文本，不做任何 HTML 處理
            if (event.data) {
                accumulatedText += event.data;

                // 使用函數式更新並強制重新渲染
                setMessages((prev) => {
                    const newMessages = [...prev];
                    const lastIndex = newMessages.length - 1;

                    // 創建新物件以觸發重新渲染
                    newMessages[lastIndex] = {
                        ...newMessages[lastIndex],
                        content: accumulatedText, // 傳遞純文本（包含 Markdown 標記）
                        timestamp: Date.now() // 強制更新
                    };

                    return newMessages;
                });
            }
        };

        eventSource.onerror = (error) => {
            console.error("EventSource error:", error);
            eventSource.close();
            setIsStreaming(false);
        };
    };

    // 停止串流
    const stopStreaming = () => {
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
            setIsStreaming(false);
        }
    };

    // 自動滾動到底部
    useEffect(() => {
        if (chatboxRef.current) {
            chatboxRef.current.scrollTop = chatboxRef.current.scrollHeight;
        }
    }, [messages]);

    // Enter 鍵提交 (Shift+Enter 換行)
    const handleKeyPress = (event) => {
        if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            submitQuestion();
        }
    };

    return (
        <div
            style={{
                padding: "20px",
                maxWidth: "800px",
                margin: "0 auto",
                fontFamily: "Inter, Arial, sans-serif"
            }}
        >
            <h1 style={{ color: "#2C3E50", textAlign: "center" }}>
                📘 TDD Chatbot
            </h1>

            <div
                ref={chatboxRef}
                style={{
                    border: "1px solid #ddd",
                    borderRadius: "8px",
                    padding: "15px",
                    height: "400px",
                    overflowY: "auto",
                    backgroundColor: "#f9f9f9",
                    marginBottom: "15px"
                }}
            >
                {messages.map((msg, index) => {
                    const hasCode = msg.content.includes("```"); // ADD：檢查是否有程式碼
                    return (
                        <div
                            key={`${msg.id}-${msg.timestamp || index}`}
                            style={{
                                marginBottom: "10px",
                                padding: "10px",
                                backgroundColor:
                                    msg.role === "user" ? "#e3f2fd" : "#fff",
                                borderRadius: "8px" /* 使用圓角 */,
                                boxShadow:
                                    "0 1px 3px rgba(0,0,0,0.05)" /* 添加輕微陰影 */,
                                borderLeft:
                                    msg.role === "user"
                                        ? "4px solid #3498db"
                                        : "4px solid #2ecc71",
                                overflowX:
                                    "hidden" /* 程式碼區塊自行處理滾動 */,
                                position: "relative" // ADD：讓按鈕可以定位
                            }}
                        >
                            {/* ===== 修改：標題列加入複製按鈕 ===== */}
                            <div
                                style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    marginBottom: "5px"
                                }}
                            >
                                <div
                                    style={{
                                        color:
                                            msg.role === "user"
                                                ? "#3498db"
                                                : "#2ecc71",
                                        fontWeight: "bold"
                                    }}
                                >
                                    {msg.role === "user" ? "User" : "Chatbot"}：
                                </div>
                                {/* 根據角色顯示標題和內容
               {msg.role === "user" ? (
                   <div
                       style={{
                       color: "#3498db",
                       fontWeight: "bold",
                       marginBottom: "5px",
                       }}
                   >
                       User：
                   </div>
                   ) : (
                   <div
                       style={{
                       color: "#2ecc71",
                       fontWeight: "bold",
                       marginBottom: "5px",
                       }}
                   >
                       Chatbot：
                   </div>
               )} */}
                                {/*
           ADD：複製按鈕（只在有程式碼的 Chatbot 訊息顯示，放在標題下方）
           {hasCode && msg.role === "chatbot" && (
               <button
                   onClick={() => copyAllCode(msg.id, msg.content)}
                   style={{
                       marginBottom: "5px",
                       padding: "4px 10px",
                       fontSize: "12px",
                       backgroundColor: copiedMessageId === msg.id ? "#27ae60" : "#3498db",
                       color: "white",
                       border: "none",
                       borderRadius: "4px",
                       cursor: "pointer",
                   }}
               >
                   {copiedMessageId === msg.id ? "✓ 已複製" : "📋 複製程式碼"}
                   </button>
               )} */}
                            </div>

                            {/* 使用自定義的渲染器渲染內容 */}
                            <div
                                style={{
                                    wordBreak:
                                        "break-word" /* 確保長單字也能換行 */,
                                    lineHeight: "1.6"
                                }}
                            >
                                <Markdown
                                    remarkPlugins={[remarkGfm]}
                                    components={{ code: CodeRenderer }}
                                >
                                    {msg.content}
                                </Markdown>
                            </div>
                            {/* ADD：ST 解析器組件，只在 chatbot 訊息顯示 */}
                            {/* {msg.role === "chatbot" && (
               <STCodeExtractor
                   messageContent={msg.content}
                   messageId={msg.id}
               />
           )} */}
                        </div>
                    );
                })}
            </div>

            <select
                value={mode}
                onChange={(e) => setMode(e.target.value)}
                disabled={isStreaming}
                style={{
                    width: "100%",
                    padding: "10px",
                    marginBottom: "10px",
                    borderRadius: "5px",
                    border: "1px solid #ddd",
                    fontSize: "14px",
                    opacity: isStreaming ? 0.6 : 1
                }}
            >
                <option value="geminiNative">Gemini Native 問答</option>
                <option value="gemini">Gemini 問答</option>
                <option value="rag">Edge LLM 問答</option>
                <option value="dms">DMS 問答</option>
                <option value="openrouter">OpenRouter 問答</option>
            </select>

            <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={isStreaming}
                placeholder="請輸入您的問題..."
                style={{
                    width: "100%",
                    padding: "10px",
                    minHeight: "80px",
                    borderRadius: "5px",
                    border: "1px solid #ddd",
                    fontSize: "14px",
                    marginBottom: "10px",
                    resize: "vertical",
                    boxSizing: "border-box",
                    opacity: isStreaming ? 0.6 : 1
                }}
            />

            <div style={{ display: "flex", gap: "10px" }}>
                <button
                    onClick={submitQuestion}
                    disabled={isStreaming || !input.trim()}
                    style={{
                        flex: 1,
                        padding: "12px",
                        backgroundColor:
                            isStreaming || !input.trim()
                                ? "#95a5a6"
                                : "#2ecc71",
                        color: "white",
                        border: "none",
                        borderRadius: "5px",
                        fontSize: "16px",
                        cursor:
                            isStreaming || !input.trim()
                                ? "not-allowed"
                                : "pointer",
                        fontWeight: "bold",
                        transition: "background-color 0.3s"
                    }}
                >
                    {isStreaming ? "生成中..." : "送出"}
                </button>

                {isStreaming && (
                    <button
                        onClick={stopStreaming}
                        style={{
                            padding: "12px 20px",
                            backgroundColor: "#e74c3c",
                            color: "white",
                            border: "none",
                            borderRadius: "5px",
                            fontSize: "16px",
                            cursor: "pointer",
                            fontWeight: "bold",
                            transition: "background-color 0.3s"
                        }}
                    >
                        停止
                    </button>
                )}
            </div>

            {isStreaming && (
                <div
                    style={{
                        marginTop: "10px",
                        textAlign: "center",
                        color: "#7f8c8d",
                        fontSize: "14px"
                    }}
                >
                    ⏳ 正在接收回應...
                </div>
            )}
        </div>
    );
}

export default App;
