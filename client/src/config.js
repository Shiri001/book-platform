// Centralized API configuration
// In production (Vercel/Netlify), set REACT_APP_API_URL to your deployed Express backend URL (e.g., https://pagevalence-api.onrender.com)
export const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:3000";
