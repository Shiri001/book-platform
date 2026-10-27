const { Shelf, Book } = require("../models");

// POST /api/shelf — Add book to shelf
const addToShelf = async (req, res) => {
    try {
        const { bookId, status } = req.body;
        const entry = await Shelf.create({
            BookId: bookId,
            userId: req.user.id,
            status: status
        });
        res.status(201).json(entry);
    } catch (error) {
        res.status(500).json({ message: "Failed to add book to shelf" });
    }
};

// GET /api/shelf — Get current user's shelf
const getShelf = async (req, res) => {
    try {
        const shelf = await Shelf.findAll({
            where: { userId: req.user.id },
            include: Book
        });
        res.json(shelf);
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch shelf" });
    }
};

// PUT /api/shelf/:id — Update progress, pace & daily streak
const updateShelf = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, currentPage, totalPages, pagesPerDay, dailyGoal, notes } = req.body;

        const entry = await Shelf.findOne({
            where: { id, userId: req.user.id },
            include: Book
        });

        if (!entry) {
            return res.status(404).json({ message: "Shelf entry not found" });
        }

        let updatedStatus = status || entry.status;
        let newCurrent = currentPage !== undefined ? parseInt(currentPage) : entry.currentPage;
        let newTotal = totalPages !== undefined ? parseInt(totalPages) : entry.totalPages;
        let newPace = pagesPerDay !== undefined ? parseInt(pagesPerDay) : entry.pagesPerDay;
        let newGoal = dailyGoal !== undefined ? parseInt(dailyGoal) : (entry.dailyGoal || 25);

        // Daily Streak Calculation:
        const todayStr = new Date().toISOString().split("T")[0];
        let todayPages = entry.todayPages || 0;
        let lastReadDate = entry.lastReadDate;

        if (currentPage !== undefined && newCurrent > entry.currentPage) {
            const pagesDelta = newCurrent - entry.currentPage;
            if (lastReadDate === todayStr) {
                todayPages += pagesDelta;
            } else {
                todayPages = pagesDelta;
                lastReadDate = todayStr;
            }
        }

        if (newCurrent >= newTotal && newTotal > 0) {
            updatedStatus = "finished";
            newCurrent = newTotal;
        }
        if (status === "finished") {
            newCurrent = newTotal;
        }

        const progress = newTotal > 0 ? Math.min(100, Math.round((newCurrent / newTotal) * 100)) : 0;

        await entry.update({
            status: updatedStatus,
            currentPage: newCurrent,
            totalPages: newTotal,
            pagesPerDay: newPace,
            dailyGoal: newGoal,
            todayPages,
            lastReadDate,
            notes: notes !== undefined ? notes : entry.notes,
            progress
        });

        res.json(entry);
    } catch (error) {
        console.error("Failed to update shelf entry:", error);
        res.status(500).json({ message: "Failed to update shelf entry" });
    }
};

// POST /api/shelf/:id/notes — Add note / quote
const addNote = async (req, res) => {
    try {
        const { id } = req.params;
        const { type = "note", content, page } = req.body;

        if (!content || !content.trim()) {
            return res.status(400).json({ message: "Content is required" });
        }

        const entry = await Shelf.findOne({
            where: { id, userId: req.user.id }
        });

        if (!entry) {
            return res.status(404).json({ message: "Shelf entry not found" });
        }

        const currentNotes = Array.isArray(entry.notes) ? entry.notes : [];
        const newNote = {
            id: Date.now().toString(),
            type,
            content: content.trim(),
            page: page ? parseInt(page) : null,
            createdAt: new Date().toISOString()
        };

        const updatedNotes = [newNote, ...currentNotes];
        await entry.update({ notes: updatedNotes });

        res.status(201).json(updatedNotes);
    } catch (error) {
        console.error("Failed to add note:", error);
        res.status(500).json({ message: "Failed to add note" });
    }
};

// DELETE /api/shelf/:id/notes/:noteId — Remove note
const deleteNote = async (req, res) => {
    try {
        const { id, noteId } = req.params;

        const entry = await Shelf.findOne({
            where: { id, userId: req.user.id }
        });

        if (!entry) {
            return res.status(404).json({ message: "Shelf entry not found" });
        }

        const currentNotes = Array.isArray(entry.notes) ? entry.notes : [];
        const updatedNotes = currentNotes.filter(n => n.id !== noteId);
        await entry.update({ notes: updatedNotes });

        res.json(updatedNotes);
    } catch (error) {
        console.error("Failed to remove note:", error);
        res.status(500).json({ message: "Failed to remove note" });
    }
};

// DELETE /api/shelf/:id — Remove book from shelf
const deleteShelf = async (req, res) => {
    try {
        const { id } = req.params;

        const deletedCount = await Shelf.destroy({
            where: { id, userId: req.user.id }
        });

        if (deletedCount === 0) {
            return res.status(404).json({ message: "Shelf entry not found" });
        }

        res.json({ message: "Book removed from shelf successfully", id: parseInt(id) });
    } catch (error) {
        console.error("Failed to remove book from shelf:", error);
        res.status(500).json({ message: "Failed to remove book from shelf" });
    }
};

module.exports = {
    addToShelf,
    getShelf,
    updateShelf,
    addNote,
    deleteNote,
    deleteShelf
};
