const express = require("express");
const router = express.Router();
const { googleAuth, register, login } = require("../controllers/authController");

router.post("/google", googleAuth);
router.post("/register", register);
router.post("/login", login);

module.exports = router;
