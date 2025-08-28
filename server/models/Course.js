import mongoose from "mongoose";

const lectureSchema = new mongoose.Schema(
  {
    lectureId: { type: String, required: true },
    lectureOrder: { type: Number, required: true },
    lectureTitle: { type: String, required: true },
    lectureDuration: { type: Number, required: true }, // in minutes
    lectureURL: { type: String, required: true },
    isPreviewFree: { type: Boolean, default: false },
  },
  { _id: false }
); // Do not create an _id for subdocuments unless explicitly needed

const chapterSchema = new mongoose.Schema(
  {
    chapterId: { type: String, required: true },
    chapterOrder: { type: Number, required: true },
    chapterTitle: { type: String, required: true },
    chapterContent: [lectureSchema],
  },
  { _id: false }
);
const courseSchema = new mongoose.Schema(
  {
    courseTitle: { type: String, required: true },
    courseDescription: { type: String, required: true },
    courseThumbnail: { type: String }, // URL from Cloudinary
    coursePrice: { type: Number, required: true },
    isPublished: { type: Boolean, default: true },
    discount: { type: Number, required: true, min: 0, max: 100 },
    courseContent: [chapterSchema],
    courseRatings: [
      {
        userId: { type: String, required: true },
        rating: { type: Number, min: 1, max: 5 },
      },
    ],
    educator: {
      type: String,
      ref: "User",
      required: true,
    },
    enrolledStudents: [
      {
        type: String,
        ref: "User",
      },
    ],
  },
  { timestamps: true, minimize: false }
); // minimize: false to keep empty arrays/objects in schema

const Course = mongoose.model("Course", courseSchema);
export default Course;
