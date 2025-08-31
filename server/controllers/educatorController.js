import { clerkClient } from "@clerk/express";
import Course from "../models/Course.js";
import { v2 as cloudinary } from "cloudinary";
import Purchase from "../models/Purchase.js";
import User from "../models/User.js";

// Update role to educator
export const updateRoleToEducator = async (req, res) => {
  try {
    const { userId } = req.auth();

    await clerkClient.users.updateUserMetadata(userId, {
      publicMetadata: {
        role: "educator",
      },
    });

    res.json({ success: true, message: "You can publish a course now" });
  } catch (error) {
    console.error("Error updating role:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Add new course
export const addCourse = async (req, res) => {
  try {
    const { userId: educatorId } = req.auth();
    // const educatorId = req.auth.userId;
    const { courseData } = req.body;
    const imageFile = req.file;

    if (!imageFile) {
      return res.json({ success: false, message: "Thumbnail not attached" });
    }

    const parsedCourseData = JSON.parse(courseData);
    parsedCourseData.educator = educatorId;
    const newCourse = await Course.create(parsedCourseData);
    const imageUpload = await cloudinary.uploader.upload(imageFile.path);
    newCourse.courseThumbnail = imageUpload.secure_url;
    await newCourse.save();

    return res.json({
      success: true,
      message: "Course added",
      course: newCourse,
    });
  } catch (error) {
    console.error("Error adding course:", error);
    return res.json({ success: false, message: error.message });
  }
};

// Get educator courses
export const getEducatorCourses = async (req, res) => {
  try {
    const { userId: educator } = req.auth();
    // const educator = req.auth.userId;
    const courses = await Course.find({ educator });
    res.status(200).json({ success: true, courses });
  } catch (error) {
    console.error("Error fetching educator courses:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Get educator dashboard data  (Total earnings,enrolled students and no of courses)
export const getEducatorDashboardData = async (req, res) => {
  try {
    const { userId: educator } = req.auth();
    //const educator = req.auth.userId;

    // Find all courses created by this educator
    const courses = await Course.find({ educator });
    const totalCourses = courses.length;

    // Get IDs of all courses for this educator
    const courseIds = courses.map((course) => course._id);

    // Calculate total earning from purchases for these courses
    const purchases = await Purchase.find({
      courseId: { $in: courseIds },
      status: "completed",
    });

    const totalEarnings = purchases.reduce(
      (sum, purchase) => sum + purchase.amount,
      0
    );

    // Collect unique enrolled student IDs with their course titles
    const enrolledStudentsData = [];
    for (const course of courses) {
      const students = await User.find(
        {
          _id: { $in: course.enrolledStudents },
        },
        "name imageUrl"
      ); // Fetch only name and imageUrl

      students.forEach((student) => {
        enrolledStudentsData.push({
          courseTitle: course.courseTitle,
          student,
        });
      });
    }
    res.json({
      success: true,
      dashboardData: {
        totalEarnings,
        enrolledStudentsData,
        totalCourses,
      },
    });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

// Get enrolled student data with purchase data for a specific educator
export const getEnrolledStudentsData = async (req, res) => {
  try {
    const { userId: educator } = req.auth();
    //const educator = req.auth.userId;

    // Fetch all courses created by the educator
    const courses = await Course.find({ educator });
    const courseIds = courses.map((course) => course._id);

    // Find purchases for these courses, populating user and course details
    const purchases = await Purchase.find({
      courseId: { $in: courseIds },
      status: "completed",
    })
      .populate("userId", "name imageUrl") // Populate user details
      .populate("courseId", "courseTitle"); // Populate course title

    const enrolledStudents = purchases.map((purchase) => ({
      student: purchase.userId, // Contains _id, name, imageUrl
      courseTitle: purchase.courseId.courseTitle,
      purchaseDate: purchase.createdAt, // Timestamp of purchase
      amountPaid: purchase.amount,
    }));

    return res.json({ success: true, enrolledStudents });
  } catch (error) {
    console.error("Error fetching enrolled students data:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
