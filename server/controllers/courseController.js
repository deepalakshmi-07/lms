import Course from "../models/Course.js";
// Get all courses
export const getAllCourses = async (req, res) => {
  try {
    const courses = await Course.find({ isPublished: true })
      .select("-courseContent -enrolledStudents")
      .populate({ path: "educator" });

    return res.status(200).json({ success: true, courses });
  } catch (error) {
    console.error("Error fetching all courses:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Get course by ID
export const getCourseId = async (req, res) => {
  try {
    const { id } = req.params;

    const courseData = await Course.findById(id).populate({ path: "educator" });

    // Remove lectureURL if isPreviewFree is false
    courseData.courseContent.forEach((chapter) => {
      chapter.chapterContent.forEach((lecture) => {
        if (!lecture.isPreviewFree) {
          lecture.lectureURL = ""; // Clear URL for non-free previews
        }
      });
    });

    return res.status(200).json({ success: true, courseData });
  } catch (error) {
    console.error("Error fetching course by ID:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
