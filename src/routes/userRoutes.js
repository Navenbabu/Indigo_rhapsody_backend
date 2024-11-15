const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");

router.get("/total-count", userController.getTotalUserCount);
router.get("/new-users-month", userController.getNewUsersByCurrentMonth);
router.get("/user-count-by-state", userController.getUserCountByState);
router.get("/most-users-state", userController.getStateWithMostUsers);
router.get("/role-user", userController.getAllUsersWithRoleUser);

// CRUD routes for users
router.get("/getUser", userController.getUsers);
router.get("/:userId", userController.getUserById);
router.post("/createUser", userController.createUser);
router.put("/:userId", userController.updateUser);

// User and Designer creation/login
router.post("/user-designer", userController.createUserAndDesigner);
router.post("/login", userController.loginDesigner);
router.post("/adminLogin", userController.loginAdmin);
module.exports = router;
