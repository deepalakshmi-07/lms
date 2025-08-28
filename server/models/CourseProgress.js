import mongoose from "mongoose";

const courseProgressSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },
    completed: { type: Boolean, default: false }, // Overall course completion
    lectureCompleted: [{ type: String }], // Array of lecture IDs completed
  },
  { minimize: false, timestamps: true }
); // minimize: false to keep empty arrays

const CourseProgress = mongoose.model("CourseProgress", courseProgressSchema);
export default CourseProgress;
