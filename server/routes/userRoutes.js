import express from "express";
import {
  addUserRatingToCourse,
  getUserCourseProgress,
  getUserData,
  purchaseCourse,
  updateUserCourseProgress,
  userEnrolledCourses,
} from "../controllers/userController.js";
import { updateRoleToEducator } from "../controllers/educatorController.js";
import { requireAuth } from "@clerk/express";

const userRouter = express.Router();

userRouter.get("/data", getUserData);
userRouter.get("/enrolled-courses", userEnrolledCourses);
userRouter.post("/purchase", requireAuth(), purchaseCourse);

userRouter.post(
  "/update-course-progress",
  requireAuth(),
  updateUserCourseProgress
);
userRouter.post("/get-course-progress", requireAuth(), getUserCourseProgress);
userRouter.post("/add-rating", requireAuth(), addUserRatingToCourse);

export default userRouter;
