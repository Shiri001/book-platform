const express = require("express");
const router = express.Router();
const { getAuthorDetails } = require("../controllers/authorController");

router.get("/:name", getAuthorDetails);

module.exports = router;
