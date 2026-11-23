const { GoogleGenAI } = require("@google/genai");
const axios = require("axios");
const { Book } = require("../models");

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || "http://127.0.0.1:8000";

// POST /api/books/:id/chat — Literary Discussion RAG Endpoint (Grounded in Goodreads Data)
const discussBook = async (req, res) => {
    try {
        const bookId = parseInt(req.params.id);
        const { message, conversationHistory = [], stream = false } = req.body;

        if (!message || !message.trim()) {
            return res.status(400).json({ message: "Message content is required." });
        }

        // 1 & 2. PARALLEL RETRIEVE: PostgreSQL metadata & FastAPI vector neighbors concurrently
        const [book, semanticNeighbors] = await Promise.all([
            Book.findByPk(bookId),
            axios.get(`${ML_SERVICE_URL}/recommend`, {
                params: { book_id: bookId, mode: "discover", top_n: 3 },
                timeout: 1200 // Fast 1.2s timeout so recommender never stalls chat
            }).then(r => r.data.recommendations || []).catch(err => {
                console.warn("⚠️ Semantic recommender offline during chat RAG, proceeding with Goodreads metadata.");
                return [];
            })
        ]);

        if (!book) {
            return res.status(404).json({ message: "Book volume not found in catalog." });
        }

        const neighborsContext = semanticNeighbors.length > 0
            ? semanticNeighbors.map(n => `- "${n.title}" by ${n.author} (${n.genre || "Fiction"}, ${Math.round(n.similarityScore * 100)}% thematic match)`).join("\n")
            : "No thematic neighbors mapped.";

        // 3. AUGMENT: System prompt grounded in authentic Goodreads reception & synopsis
        const systemPrompt = `You are the PageValence Literary Discussion Companion—an articulate, deeply well-read literary scholar and debate partner.

You are discussing the following specific work with a reader, strictly anchored in its official Goodreads metadata and historical literary consensus:

========================================
OFFICIAL GOODREADS WORK DOSSIER:
- Title: "${book.title}"
- Author: ${book.author}
- Genre: ${book.genre || "Literary Fiction"}
- Goodreads Rating: ${book.averageRating ? Number(book.averageRating).toFixed(2) : "4.00"} / 5.00
- Synopsis:
"""
${book.description ? book.description.slice(0, 700) : "A celebrated literary work in the catalog."}
"""

THEMATICALLY ALIGNED WORKS (vector space):
${neighborsContext}
========================================

YOUR INSTRUCTIONS:
1. Grounded Literary Dialogue: Focus on this work's themes, character motivations, narrative arc, moral dilemmas, and prose style.
2. Rely on Real Goodreads Reception: Cite world consensus & synopsis rather than app-level user reviews.
3. Compare Thematic Parallels: Where relevant, briefly contrast with aligned works above.
4. Voice: Erudite, passionate, warm, and concise. Avoid robotic filler. Keep answer within 2-3 focused paragraphs.
5. Discussion Sparks: At the very end, provide 2 brief, thought-provoking questions for the reader under a "### ✦ Discussion Sparks" header.`;

        // 4. Format multi-turn conversation history for Gemini
        const contents = [];

        if (Array.isArray(conversationHistory)) {
            conversationHistory.slice(-6).forEach(turn => {
                if (turn.role && turn.content) {
                    contents.push({
                        role: turn.role === "assistant" ? "model" : "user",
                        parts: [{ text: turn.content }]
                    });
                }
            });
        }

        contents.push({
            role: "user",
            parts: [{ text: message.trim() }]
        });

        // 5. GENERATE: Open low-latency stream with Gemini
        let activeStream;
        const candidateModels = ["gemini-3.5-flash-lite", "gemini-3.5-flash"];

        for (const modelName of candidateModels) {
            for (let attempt = 1; attempt <= 2; attempt++) {
                try {
                    activeStream = await ai.models.generateContentStream({
                        model: modelName,
                        contents: contents,
                        config: {
                            systemInstruction: {
                                parts: [{ text: systemPrompt }]
                            },
                            temperature: 0.7,
                            maxOutputTokens: 600
                        }
                    });
                    if (activeStream) break;
                } catch (modelErr) {
                    console.warn(`[Gemini] ${modelName} attempt ${attempt} failed (${modelErr.status || modelErr.message})`);
                    if (attempt === 1 && (modelErr.status === 503 || modelErr.status === 429)) {
                        await new Promise(r => setTimeout(r, 600));
                    }
                }
            }
            if (activeStream) break;
        }

        if (!activeStream) {
            throw new Error("All candidate Gemini models were unavailable or rate-limited.");
        }

        // If client requested real-time streaming (SSE)
        if (stream) {
            res.setHeader("Content-Type", "text/event-stream");
            res.setHeader("Cache-Control", "no-cache");
            res.setHeader("Connection", "keep-alive");
            if (res.flushHeaders) res.flushHeaders();

            try {
                for await (const chunk of activeStream) {
                    if (chunk.text) {
                        res.write(`data: ${JSON.stringify({ text: chunk.text })}\n\n`);
                    }
                }
                res.write("data: [DONE]\n\n");
                return res.end();
            } catch (streamErr) {
                console.error("Streaming error mid-transfer:", streamErr);
                res.write(`data: ${JSON.stringify({ error: "Stream interrupted." })}\n\n`);
                return res.end();
            }
        }

        // Backward compatibility: accumulate full text and return JSON
        let fullReply = "";
        for await (const chunk of activeStream) {
            if (chunk.text) fullReply += chunk.text;
        }

        res.json({
            reply: fullReply,
            book: {
                id: book.id,
                title: book.title,
                author: book.author
            }
        });

    } catch (error) {
        console.error("Literary Discussion RAG Error:", error);
        res.status(500).json({
            message: "Failed to generate literary response. Please check your Gemini API key or try again."
        });
    }
};

module.exports = {
    discussBook
};