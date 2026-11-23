// Centralized API configuration
// Automatically trims any trailing slash to prevent double-slash (//api/books) 404 errors
const rawUrl = process.env.REACT_APP_API_URL || "http://localhost:3000";
export const API_BASE_URL = rawUrl.replace(/\/+$/, "");

