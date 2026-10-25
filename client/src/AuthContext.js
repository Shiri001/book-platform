import React, { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext();

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem("pv_token"));
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    const [authModalTab, setAuthModalTab] = useState("signin"); // "signin" | "signup"

    // 1. Re-hydrate session from localStorage on page refresh
    useEffect(() => {
        const savedUser = localStorage.getItem("pv_user");
        if (savedUser && token) {
            try {
                setUser(JSON.parse(savedUser));
            } catch (e) {
                console.error("Failed to parse saved user", e);
            }
        }
    }, [token]);

    // Helper to persist auth data
    const handleAuthSuccess = (data) => {
        localStorage.setItem("pv_token", data.token);
        localStorage.setItem("pv_user", JSON.stringify(data.user));
        setToken(data.token);
        setUser(data.user);
        setIsAuthModalOpen(false); // Close modal on success
        return data.user;
    };

    // 2. Google OAuth Login
    const loginWithGoogle = async (credentialResponse) => {
        const res = await fetch("http://localhost:3000/api/auth/google", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ credential: credentialResponse.credential })
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.message || "Google authentication failed");
        }
        const data = await res.json();
        return handleAuthSuccess(data);
    };

    // 3. Email & Password Login
    const loginWithEmail = async (email, password) => {
        const res = await fetch("http://localhost:3000/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (!res.ok) {
            throw new Error(data.message || "Login failed");
        }
        return handleAuthSuccess(data);
    };

    // 4. Email & Password Registration
    const registerWithEmail = async (name, email, password) => {
        const res = await fetch("http://localhost:3000/api/auth/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, email, password })
        });
        const data = await res.json();
        if (!res.ok) {
            throw new Error(data.message || "Registration failed");
        }
        return handleAuthSuccess(data);
    };

    // 5. Logout
    const logout = () => {
        localStorage.removeItem("pv_token");
        localStorage.removeItem("pv_user");
        setToken(null);
        setUser(null);
    };

    // Modal helpers
    const openAuthModal = (tab = "signin") => {
        setAuthModalTab(tab);
        setIsAuthModalOpen(true);
    };

    const closeAuthModal = () => setIsAuthModalOpen(false);

    return (
        <AuthContext.Provider value={{
            user,
            token,
            isAuthenticated: !!user,
            loginWithGoogle,
            login: loginWithGoogle,
            loginWithEmail,
            registerWithEmail,
            logout,
            isAuthModalOpen,
            authModalTab,
            openAuthModal,
            closeAuthModal,
            setAuthModalTab
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
