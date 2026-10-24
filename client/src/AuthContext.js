import React, { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext();

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem("pv_token"));

    // 1. On page load, re-hydrate user session if stored in localStorage
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

    // 2. Login: send Google credential token to our Express backend
    const login = async (credentialResponse) => {
        try {
            const res = await fetch("http://localhost:3000/api/auth/google", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ credential: credentialResponse.credential })
            });

            if (!res.ok) {
                throw new Error("Authentication failed on server");
            }

            const data = await res.json();

            // Persist session in localStorage
            localStorage.setItem("pv_token", data.token);
            localStorage.setItem("pv_user", JSON.stringify(data.user));

            setToken(data.token);
            setUser(data.user);
            return data.user;
        } catch (error) {
            console.error("Google Login Error:", error);
            throw error;
        }
    };

    // 3. Logout: clear tokens and reset state
    const logout = () => {
        localStorage.removeItem("pv_token");
        localStorage.removeItem("pv_user");
        setToken(null);
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, token, login, logout, isAuthenticated: !!user }}>
            {children}
        </AuthContext.Provider>
    );
}

// Custom hook for convenient consumption: const { user, logout } = useAuth();
export const useAuth = () => useContext(AuthContext);
