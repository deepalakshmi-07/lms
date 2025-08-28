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

const userRouter = express.Router();

userRouter.get("/data", getUserData);
userRouter.get("/enrolled-courses", userEnrolledCourses);
userRouter.get("/purchase", purchaseCourse);

userRouter.get("/update-course-progress", updateUserCourseProgress);
userRouter.get("/get-course-progress", getUserCourseProgress);
userRouter.get("/add-rating", addUserRatingToCourse);

export default userRouter;
