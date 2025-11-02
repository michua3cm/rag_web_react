import React, { useState, useRef, useEffect } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import CodeRenderer from "./components/CodeBlockRenderer/index";

function App() {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");
    const [mode, setMode] = useState("geminiNative");
    const [isStreaming, setIsStreaming] = useState(false);
    const chatboxRef = useRef(null);
    const eventSourceRef = useRef(null);

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
                display: "flex",
                flexDirection: "column",
                height: "calc(100dvh - 16px)",
                maxWidth: "900px",
                margin: "0 auto",
                fontFamily: "Inter, Arial, sans-serif",
                boxSizing: "border-box"
            }}
        >
            {/* ===== 標題（置中） ===== */}
            <div
                style={{
                    textAlign: "center",
                    padding: "15px 20px",
                    backgroundColor: "transparent",
                    marginBottom: 0
                }}
            >
                <h1
                    style={{
                        margin: 0,
                        color: "#2C3E50",
                        fontSize: "28px",
                        fontWeight: "bold"
                    }}
                >
                    📘 TDD Chatbot
                </h1>
            </div>

            {/* ===== 聊天區容器（相對定位，內含：孤島 + chatbox）===== */}
            <div
                style={{
                    position: "relative",
                    flex: "1 1 auto",
                    minHeight: 0, // 讓子元素可在 flex 內正確收縮
                    margin: "30px 15px 15px 15px"
                }}
            >
                {/* 模型選擇孤島（不參與滾動） */}
                <div
                    style={{
                        position: "absolute",
                        top: -40,
                        right: 0,
                        backgroundColor: "#fff",
                        borderRadius: "10px",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                        padding: "6px 10px",
                        zIndex: 10
                    }}
                >
                    <select
                        value={mode}
                        onChange={(e) => setMode(e.target.value)}
                        disabled={isStreaming}
                        style={{
                            border: "none",
                            outline: "none",
                            backgroundColor: "transparent",
                            fontSize: "14px",
                            cursor: isStreaming ? "not-allowed" : "pointer",
                            color: "#2C3E50",
                            fontWeight: 500,
                            opacity: isStreaming ? 0.6 : 1
                        }}
                    >
                        <option value="geminiNative">Gemini Native 問答</option>
                        <option value="gemini">Gemini 問答</option>
                        <option value="rag">Edge LLM 問答</option>
                        <option value="dms">DMS 問答</option>
                        <option value="openrouter">OpenRouter 問答</option>
                    </select>
                </div>

                {/* Chatbox 本體（綁定滾動在此） */}
                <div
                    ref={chatboxRef}
                    style={{
                        position: "relative",
                        height: "100%", // 吃滿父容器高度
                        overflowY: "auto", // ✅ 只在 chatbox 內滾動
                        backgroundColor: "#f9f9f9",
                        border: "1px solid #ccc",
                        borderRadius: "10px",
                        boxSizing: "border-box",
                        padding: "10px",
                        paddingTop: "20px"
                    }}
                >
                    {messages.map((msg, index) => (
                        <div
                            key={`${msg.id}-${msg.timestamp || index}`}
                            style={{
                                marginBottom: "10px",
                                padding: "10px",
                                backgroundColor:
                                    msg.role === "user" ? "#e3f2fd" : "#fff",
                                borderRadius: "8px",
                                boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                                borderLeft:
                                    msg.role === "user"
                                        ? "4px solid #3498db"
                                        : "4px solid #2ecc71",
                                overflowX: "hidden"
                            }}
                        >
                            <div
                                style={{
                                    color:
                                        msg.role === "user"
                                            ? "#3498db"
                                            : "#2ecc71",
                                    fontWeight: "bold",
                                    marginBottom: "5px"
                                }}
                            >
                                {msg.role === "user" ? "User：" : "Chatbot："}
                            </div>

                            <div
                                style={{
                                    wordBreak: "break-word",
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
                        </div>
                    ))}
                </div>
            </div>

            {/* ===== 狀態提示 ===== */}
            {/* {isStreaming && (
                <div
                    style={{
                        margin: "5px 0 10px",
                        textAlign: "center",
                        color: "#7f8c8d",
                        fontSize: "14px"
                    }}
                >
                    ⏳ 正在接收回應...
                </div>
            )} */}

            {/* ===== 輸入列 (固定底部) ===== */}
            <div
                style={{
                    position: "sticky",
                    bottom: 0,
                    backgroundColor: "#fff",
                    // borderTop: "1px solid #ddd",
                    padding: "10px 15px"
                }}
            >
                <div
                    style={{
                        position: "relative",
                        display: "flex",
                        alignItems: "flex-end"
                    }}
                >
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyPress={handleKeyPress}
                        disabled={isStreaming}
                        placeholder="請輸入您的問題..."
                        style={{
                            flexGrow: 1,
                            width: "100%",
                            minHeight: "50px",
                            maxHeight: "200px",
                            padding: "10px 45px 10px 10px", // 🔹 右邊預留空間放按鈕
                            borderRadius: "25px",
                            border: "1px solid #ccc",
                            fontSize: "14px",
                            resize: "none", // 🔹 停用拖曳調整
                            outline: "none",
                            lineHeight: "1.5",
                            overflowY: "auto", // 🔹 多行仍可滾動
                            whiteSpace: "pre-wrap", // 🔹 自動換行
                            wordBreak: "break-word",
                            boxSizing: "border-box",
                            opacity: isStreaming ? 0.6 : 1
                        }}
                    />

                    {/* 🔹 合併按鈕放在 textarea 右下角 */}
                    <button
                        onClick={
                            isStreaming
                                ? stopStreaming // 生成中 → 停止
                                : submitQuestion // 未生成 → 送出
                        }
                        disabled={!input.trim() && !isStreaming}
                        style={{
                            position: "absolute",
                            right: "10px",
                            bottom: "8px",
                            backgroundColor: isStreaming
                                ? "#e74c3c"
                                : !input.trim()
                                ? "#95a5a6"
                                : "#2ecc71",
                            color: "white",
                            border: "none",
                            borderRadius: "50%",
                            width: "36px",
                            height: "36px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            cursor:
                                !input.trim() && !isStreaming
                                    ? "not-allowed"
                                    : "pointer",
                            transition: "background-color 0.3s"
                        }}
                    >
                        <span
                            className="material-symbols-outlined filled"
                            style={{ fontSize: "20px" }}
                        >
                            {isStreaming ? "stop" : "send"}
                        </span>
                    </button>
                </div>
            </div>
        </div>
    );
}

export default App;
