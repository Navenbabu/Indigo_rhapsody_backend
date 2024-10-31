const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");

router.get("/getUser", userController.getUsers);
router.get("/:userId", userController.getUserById);
router.post("/createUser", userController.createUser);
router.put("/:userId", userController.updateUser);
router.post("/user-designer", userController.createUserAndDesigner);
router.post("/login", userController.loginDesigner);
module.exports = router;
