const express = require("express");
const router = express.Router();
const { getBooks, getBookById, getRecommendations } = require("../controllers/bookController");

router.get("/", getBooks);
router.get("/:id", getBookById);
router.get("/:id/recommendations", getRecommendations);

module.exports = router;
