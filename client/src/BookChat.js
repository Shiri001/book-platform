import { useState, useRef, useEffect } from "react";
import { API_BASE_URL } from "./config";

function BookChat({ bookId, bookTitle, bookAuthor, isDrawer = false, onClose }) {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef(null);

    // Reset message history when active book changes
    useEffect(() => {
        setMessages([]);
        setInput("");
    }, [bookId]);

    // Handle ESC key to dismiss drawer
    useEffect(() => {
        if (!isDrawer || !onClose) return;
        const handleKeyDownEsc = (e) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", handleKeyDownEsc);
        return () => window.removeEventListener("keydown", handleKeyDownEsc);
    }, [isDrawer, onClose]);

    // Dynamic conversation sparks based on book title
    const starterPrompts = [
        `What is the central philosophical dilemma in "${bookTitle}"?`,
        `Analyze the moral complexity of the protagonist's decisions.`,
        `Explain the ending and the most common alternative interpretations.`,
        `How does ${bookAuthor}'s prose style and symbolism reinforce the main themes?`
    ];

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, loading]);

    const sendMessage = async (textToSend) => {
        const queryText = (textToSend || input).trim();
        if (!queryText || loading) return;

        const userMessage = { role: "user", content: queryText };
        const updatedMessages = [...messages, userMessage];

        setMessages(updatedMessages);
        setInput("");
        setLoading(true);

        try {
            // Build history payload for Gemini multi-turn context
            const historyPayload = messages.map(m => ({
                role: m.role,
                content: m.content
            }));

            const res = await fetch(`${API_BASE_URL}/api/books/${bookId}/chat`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    message: queryText,
                    conversationHistory: historyPayload,
                    stream: true
                })
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.message || "Failed to formulate literary response.");
            }

            const contentType = res.headers.get("content-type") || "";

            if (contentType.includes("text/event-stream") && res.body) {
                // Real-time token streaming
                setMessages(prev => [...prev, { role: "assistant", content: "" }]);
                setLoading(false); // Disable blocking loader so streaming tokens render live

                const reader = res.body.getReader();
                const decoder = new TextDecoder("utf-8");
                let accumulated = "";
                let buffer = "";

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split("\n");
                    buffer = lines.pop(); // keep incomplete chunk

                    for (const line of lines) {
                        const trimmed = line.trim();
                        if (trimmed.startsWith("data: ")) {
                            const payload = trimmed.slice(6).trim();
                            if (payload === "[DONE]") break;
                            try {
                                const parsed = JSON.parse(payload);
                                if (parsed.text) {
                                    accumulated += parsed.text;
                                    const textSnapshot = accumulated;
                                    setMessages(prev => {
                                        const next = [...prev];
                                        next[next.length - 1] = { role: "assistant", content: textSnapshot };
                                        return next;
                                    });
                                }
                            } catch (e) {
                                // ignore parse error for fragmented lines
                            }
                        }
                    }
                }
            } else {
                // Fallback standard JSON
                const data = await res.json();
                if (data.reply) {
                    setMessages([...updatedMessages, { role: "assistant", content: data.reply }]);
                } else {
                    throw new Error(data.message || "No response received.");
                }
            }
        } catch (err) {
            console.error("Chat error:", err);
            setMessages(prev => [
                ...prev.filter(m => m.content !== ""),
                { role: "assistant", content: err.message || "Connection error with literary companion. Please try again." }
            ]);
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    const chatContent = (
        <div style={isDrawer ? {
            position: "fixed",
            top: 0,
            right: 0,
            bottom: 0,
            width: "min(560px, 94vw)",
            background: "linear-gradient(180deg, rgba(18, 18, 24, 0.98) 0%, rgba(10, 10, 14, 0.99) 100%)",
            borderLeft: "1px solid var(--border-hairline)",
            boxShadow: "-12px 0 45px rgba(0, 0, 0, 0.8)",
            zIndex: 9999,
            display: "flex",
            flexDirection: "column",
            padding: "24px",
            animation: "slideInRight 0.25s cubic-bezier(0.16, 1, 0.3, 1)"
        } : {
            background: "linear-gradient(180deg, rgba(20, 20, 26, 0.7) 0%, rgba(12, 12, 16, 0.95) 100%)",
            border: "1px solid var(--border-hairline)",
            borderRadius: "16px",
            padding: "24px",
            marginBottom: "24px",
            boxShadow: "0 12px 30px rgba(0, 0, 0, 0.4)",
            backdropFilter: "blur(12px)"
        }}>
            {/* Header */}
            <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: "12px",
                marginBottom: "16px",
                borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
                paddingBottom: "14px"
            }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                        <h3 style={{
                            fontFamily: "var(--font-serif)",
                            fontSize: "20px",
                            fontWeight: 500,
                            color: "var(--text-primary)",
                            margin: 0,
                            display: "flex",
                            alignItems: "center",
                            gap: "8px"
                        }}>
                            <span>💬</span> Literary Companion
                        </h3>
                        <span style={{
                            fontFamily: "var(--font-mono)",
                            fontSize: "10px",
                            color: "var(--accent-cyan)",
                            border: "1px solid rgba(56, 189, 248, 0.25)",
                            background: "rgba(56, 189, 248, 0.08)",
                            padding: "2px 8px",
                            borderRadius: "16px"
                        }}>
                            ✦ GEMINI RAG
                        </span>
                    </div>
                    <p style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: "11px",
                        color: "var(--text-muted)",
                        marginTop: "4px",
                        letterSpacing: "0.5px",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis"
                    }}>
                        Discussing: <strong style={{ color: "var(--text-secondary)" }}>{bookTitle}</strong> by {bookAuthor}
                    </p>
                </div>

                {isDrawer && onClose && (
                    <button
                        onClick={onClose}
                        title="Close Companion (Esc)"
                        style={{
                            background: "rgba(255, 255, 255, 0.05)",
                            border: "1px solid var(--border-hairline)",
                            color: "var(--text-muted)",
                            borderRadius: "8px",
                            width: "32px",
                            height: "32px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            cursor: "pointer",
                            fontSize: "16px",
                            transition: "all 0.2s"
                        }}
                        onMouseEnter={e => {
                            e.currentTarget.style.color = "var(--text-primary)";
                            e.currentTarget.style.background = "rgba(255, 255, 255, 0.12)";
                        }}
                        onMouseLeave={e => {
                            e.currentTarget.style.color = "var(--text-muted)";
                            e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)";
                        }}
                    >
                        ✕
                    </button>
                )}
            </div>

            {/* Conversation Starter Sparks (shown before conversation begins) */}
            {messages.length === 0 && (
                <div style={{ marginBottom: "16px" }}>
                    <p style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: "11px",
                        color: "var(--accent-gold)",
                        textTransform: "uppercase",
                        letterSpacing: "1px",
                        marginBottom: "8px"
                    }}>
                        Suggested Sparks:
                    </p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                        {starterPrompts.map((prompt, idx) => (
                            <button
                                key={idx}
                                onClick={() => sendMessage(prompt)}
                                style={{
                                    background: "rgba(255, 255, 255, 0.03)",
                                    border: "1px solid var(--border-hairline)",
                                    color: "var(--text-secondary)",
                                    borderRadius: "14px",
                                    padding: "6px 12px",
                                    fontSize: "11px",
                                    fontFamily: "var(--font-sans)",
                                    cursor: "pointer",
                                    textAlign: "left",
                                    transition: "all 0.2s"
                                }}
                                onMouseEnter={e => {
                                    e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.08)";
                                    e.currentTarget.style.borderColor = "var(--border-focus)";
                                    e.currentTarget.style.color = "var(--text-primary)";
                                }}
                                onMouseLeave={e => {
                                    e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.03)";
                                    e.currentTarget.style.borderColor = "var(--border-hairline)";
                                    e.currentTarget.style.color = "var(--text-secondary)";
                                }}
                            >
                                ✦ {prompt}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Message Thread Scroll Area */}
            <div style={{
                flex: isDrawer ? 1 : "initial",
                minHeight: isDrawer ? "0" : (messages.length === 0 ? "100px" : "240px"),
                maxHeight: isDrawer ? "none" : "480px",
                overflowY: "auto",
                display: "flex",
                flexDirection: "column",
                gap: "14px",
                paddingRight: "6px",
                marginBottom: "16px"
            }}>
                {messages.length === 0 && (
                    <div style={{
                        textAlign: "center",
                        padding: "30px 16px",
                        color: "var(--text-muted)",
                        fontFamily: "var(--font-mono)",
                        fontSize: "12px",
                        lineHeight: 1.6
                    }}>
                        Engage in thoughtful debate on motifs, character arcs, and moral underpinnings in "{bookTitle}".
                    </div>
                )}

                {messages.map((m, idx) => (
                    <div
                        key={idx}
                        style={{
                            alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                            maxWidth: m.role === "user" ? "82%" : "92%",
                            background: m.role === "user"
                                ? "linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.06))"
                                : "rgba(10, 10, 14, 0.8)",
                            border: m.role === "user"
                                ? "1px solid rgba(255, 255, 255, 0.2)"
                                : "1px solid var(--border-hairline)",
                            borderRadius: m.role === "user" ? "14px 14px 2px 14px" : "14px 14px 14px 2px",
                            padding: "12px 16px",
                            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.25)"
                        }}
                    >
                        <div style={{
                            fontSize: "10px",
                            fontFamily: "var(--font-mono)",
                            color: m.role === "user" ? "var(--accent-gold)" : "var(--accent-cyan)",
                            marginBottom: "4px",
                            letterSpacing: "1px",
                            textTransform: "uppercase"
                        }}>
                            {m.role === "user" ? "You" : "Literary Scholar"}
                        </div>
                        <div style={{
                            fontSize: "13px",
                            lineHeight: "1.65",
                            color: "var(--text-primary)",
                            fontFamily: "var(--font-sans)",
                            whiteSpace: "pre-wrap"
                        }}>
                            {m.content}
                        </div>
                    </div>
                ))}

                {/* Loading typing indicator */}
                {loading && (
                    <div style={{
                        alignSelf: "flex-start",
                        background: "rgba(10, 10, 14, 0.8)",
                        border: "1px solid var(--border-hairline)",
                        borderRadius: "14px 14px 14px 2px",
                        padding: "10px 16px",
                        fontFamily: "var(--font-mono)",
                        fontSize: "11px",
                        color: "var(--accent-cyan)",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px"
                    }}>
                        <span style={{ display: "inline-block", animation: "pulse 1.2s infinite" }}>●</span>
                        Synthesizing literary analysis from Goodreads dossier...
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Input Bar */}
            <div style={{
                display: "flex",
                gap: "8px",
                background: "rgba(5, 5, 8, 0.85)",
                border: "1px solid var(--border-hairline)",
                borderRadius: "10px",
                padding: "8px 10px",
                alignItems: "flex-end",
                marginTop: "auto"
            }}>
                <textarea
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    rows={1}
                    placeholder={`Ask about motives, themes, or symbolism in "${bookTitle}" (Enter)...`}
                    style={{
                        flex: 1,
                        background: "transparent",
                        border: "none",
                        outline: "none",
                        color: "var(--text-primary)",
                        fontSize: "13px",
                        fontFamily: "var(--font-sans)",
                        resize: "none",
                        padding: "4px 2px",
                        lineHeight: "1.4"
                    }}
                />
                <button
                    onClick={() => sendMessage()}
                    disabled={loading || !input.trim()}
                    style={{
                        padding: "6px 14px",
                        background: input.trim() && !loading ? "var(--text-primary)" : "rgba(255, 255, 255, 0.08)",
                        color: input.trim() && !loading ? "var(--bg-primary)" : "var(--text-muted)",
                        border: "none",
                        borderRadius: "6px",
                        fontFamily: "var(--font-sans)",
                        fontWeight: 600,
                        fontSize: "12px",
                        cursor: input.trim() && !loading ? "pointer" : "default",
                        transition: "all 0.2s"
                    }}
                >
                    Send ↵
                </button>
            </div>
        </div>
    );

    if (isDrawer) {
        return (
            <>
                <div
                    onClick={onClose}
                    style={{
                        position: "fixed",
                        inset: 0,
                        background: "rgba(0, 0, 0, 0.7)",
                        backdropFilter: "blur(6px)",
                        zIndex: 9998,
                        animation: "fadeIn 0.2s ease"
                    }}
                />
                {chatContent}
            </>
        );
    }

    return chatContent;
}

export default BookChat;