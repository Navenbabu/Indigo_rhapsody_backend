const express = require("express");
const router = express.Router();
const stateController = require("../controllers/stateController");

router.post("/", stateController.CreateState);
router.get("/", stateController.getStates);

module.exports = router;
