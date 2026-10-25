import React, { useState } from "react";
import { GoogleLogin } from "@react-oauth/google";
import { useAuth } from "./AuthContext";

function AuthModal() {
    const {
        isAuthModalOpen,
        closeAuthModal,
        authModalTab,
        setAuthModalTab,
        loginWithGoogle,
        loginWithEmail,
        registerWithEmail
    } = useAuth();

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    if (!isAuthModalOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            if (authModalTab === "signup") {
                await registerWithEmail(name, email, password);
            } else {
                await loginWithEmail(email, password);
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            backgroundColor: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px"
        }}
            onClick={closeAuthModal}
        >
            <div
                style={{
                    width: "100%",
                    maxWidth: "420px",
                    backgroundColor: "#0d0d12",
                    border: "1px solid rgba(255, 255, 255, 0.12)",
                    borderRadius: "16px",
                    padding: "32px",
                    boxShadow: "0 20px 50px rgba(0, 0, 0, 0.8)",
                    position: "relative"
                }}
                onClick={e => e.stopPropagation()} // Prevent closing when clicking inside
            >
                {/* Close X Button */}
                <button
                    onClick={closeAuthModal}
                    style={{
                        position: "absolute",
                        top: "16px",
                        right: "16px",
                        background: "transparent",
                        border: "none",
                        color: "var(--text-muted)",
                        fontSize: "20px",
                        cursor: "pointer"
                    }}
                >
                    ✕
                </button>

                {/* Header */}
                <div style={{ textAlign: "center", marginBottom: "24px" }}>
                    <h2 style={{
                        fontFamily: "var(--font-serif)",
                        fontSize: "26px",
                        fontWeight: 400,
                        color: "var(--text-primary)",
                        marginBottom: "6px"
                    }}>
                        {authModalTab === "signup" ? "Create an Account" : "Welcome Back"}
                    </h2>
                    <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>
                        {authModalTab === "signup"
                            ? "Join PageValence to curate shelves and discover books."
                            : "Sign in to access your personal reading shelf."}
                    </p>
                </div>

                {/* Option 1: 1-Click Google Sign-In */}
                <div style={{ display: "flex", justifyContent: "center", marginBottom: "20px" }}>
                    <GoogleLogin
                        onSuccess={loginWithGoogle}
                        onError={() => setError("Google sign-in was cancelled or failed.")}
                        theme="filled_black"
                        shape="pill"
                        size="large"
                        text={authModalTab === "signup" ? "signup_with" : "signin_with"}
                    />
                </div>

                {/* Divider */}
                <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    margin: "20px 0",
                    color: "var(--text-muted)",
                    fontSize: "11px",
                    fontFamily: "var(--font-mono)"
                }}>
                    <div style={{ flex: 1, height: "1px", backgroundColor: "var(--border-hairline)" }} />
                    <span>OR WITH EMAIL</span>
                    <div style={{ flex: 1, height: "1px", backgroundColor: "var(--border-hairline)" }} />
                </div>

                {/* Error Banner */}
                {error && (
                    <div style={{
                        padding: "10px 14px",
                        background: "rgba(239, 68, 68, 0.12)",
                        border: "1px solid rgba(239, 68, 68, 0.3)",
                        borderRadius: "8px",
                        color: "#f87171",
                        fontSize: "12px",
                        marginBottom: "16px",
                        fontFamily: "var(--font-mono)"
                    }}>
                        {error}
                    </div>
                )}

                {/* Email Form */}
                <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                    {authModalTab === "signup" && (
                        <div>
                            <label style={{ display: "block", fontSize: "11px", fontFamily: "var(--font-mono)", color: "var(--text-muted)", marginBottom: "6px" }}>
                                FULL NAME
                            </label>
                            <input
                                type="text"
                                required
                                value={name}
                                onChange={e => setName(e.target.value)}
                                placeholder="Jane Austen"
                                style={{
                                    width: "100%",
                                    padding: "10px 14px",
                                    backgroundColor: "rgba(255, 255, 255, 0.04)",
                                    border: "1px solid var(--border-hairline)",
                                    borderRadius: "8px",
                                    color: "var(--text-primary)",
                                    fontSize: "14px",
                                    outline: "none",
                                    boxSizing: "border-box"
                                }}
                            />
                        </div>
                    )}

                    <div>
                        <label style={{ display: "block", fontSize: "11px", fontFamily: "var(--font-mono)", color: "var(--text-muted)", marginBottom: "6px" }}>
                            EMAIL ADDRESS
                        </label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            placeholder="reader@example.com"
                            style={{
                                width: "100%",
                                padding: "10px 14px",
                                backgroundColor: "rgba(255, 255, 255, 0.04)",
                                border: "1px solid var(--border-hairline)",
                                borderRadius: "8px",
                                color: "var(--text-primary)",
                                fontSize: "14px",
                                outline: "none",
                                boxSizing: "border-box"
                            }}
                        />
                    </div>

                    <div>
                        <label style={{ display: "block", fontSize: "11px", fontFamily: "var(--font-mono)", color: "var(--text-muted)", marginBottom: "6px" }}>
                            PASSWORD (MIN 6 CHARS)
                        </label>
                        <input
                            type="password"
                            required
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            placeholder="••••••••"
                            style={{
                                width: "100%",
                                padding: "10px 14px",
                                backgroundColor: "rgba(255, 255, 255, 0.04)",
                                border: "1px solid var(--border-hairline)",
                                borderRadius: "8px",
                                color: "var(--text-primary)",
                                fontSize: "14px",
                                outline: "none",
                                boxSizing: "border-box"
                            }}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            marginTop: "8px",
                            padding: "12px",
                            background: "var(--text-primary)",
                            color: "var(--bg-primary)",
                            border: "none",
                            borderRadius: "8px",
                            fontWeight: 600,
                            fontSize: "14px",
                            cursor: loading ? "default" : "pointer",
                            transition: "opacity 0.2s"
                        }}
                    >
                        {loading
                            ? "Please wait..."
                            : authModalTab === "signup" ? "Create Account" : "Sign In"}
                    </button>
                </form>

                {/* Tab Switcher Footer */}
                <div style={{ marginTop: "20px", textAlign: "center", fontSize: "13px", color: "var(--text-muted)" }}>
                    {authModalTab === "signup" ? (
                        <span>
                            Already have an account?{" "}
                            <button
                                onClick={() => { setAuthModalTab("signin"); setError(""); }}
                                style={{ background: "none", border: "none", color: "var(--accent-cyan)", cursor: "pointer", fontWeight: 600 }}
                            >
                                Sign In
                            </button>
                        </span>
                    ) : (
                        <span>
                            Don't have an account?{" "}
                            <button
                                onClick={() => { setAuthModalTab("signup"); setError(""); }}
                                style={{ background: "none", border: "none", color: "var(--accent-cyan)", cursor: "pointer", fontWeight: 600 }}
                            >
                                Sign Up
                            </button>
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}

export default AuthModal;
