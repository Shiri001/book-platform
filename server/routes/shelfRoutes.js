const express = require("express");
const router = express.Router();
const { requireAuth } = require("../middlewares/authMiddleware");
const {
    addToShelf,
    getShelf,
    updateShelf,
    addNote,
    deleteNote,
    deleteShelf
} = require("../controllers/shelfController");

// All shelf routes require user authentication
router.use(requireAuth);

router.post("/", addToShelf);
router.get("/", getShelf);
router.put("/:id", updateShelf);
router.post("/:id/notes", addNote);
router.delete("/:id/notes/:noteId", deleteNote);
router.delete("/:id", deleteShelf);

module.exports = router;
