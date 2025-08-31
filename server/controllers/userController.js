import User from "../models/User.js";
import Course from "../models/Course.js";
import Purchase from "../models/Purchase.js";
import CourseProgress from "../models/CourseProgress.js";
import Stripe from "stripe";

// Get user data
export const getUserData = async (req, res) => {
  try {
    const { userId } = req.auth();
    const user = await User.findById(userId);

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    return res.status(200).json({ success: true, user });
  } catch (error) {
    console.error("Error fetching user data:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Get user enrolled courses
export const userEnrolledCourses = async (req, res) => {
  try {
    const { userId } = req.auth();
    //const userId = req.auth.userId;
    const userData = await User.findById(userId).populate("enrolledCourses");

    return res
      .status(200)
      .json({ success: true, enrolledCourses: userData.enrolledCourses });
  } catch (error) {
    console.error("Error fetching user enrolled courses:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Purchase course
export const purchaseCourse = async (req, res) => {
  try {
    const { userId } = req.auth();
    // const userId = req.auth.userId;
    const { courseId } = req.body;
    const origin = req.headers.origin || "http://localhost:5173"; // Fallback for local testing

    const userData = await User.findById(userId);
    const courseData = await Course.findById(courseId);

    if (!userData || !courseData) {
      return res
        .status(404)
        .json({ success: false, message: "User or Course data not found" });
    }

    // Check if user is already enrolled
    if (userData.enrolledCourses.includes(courseId)) {
      return res.status(400).json({
        success: false,
        message: "You are already enrolled in this course.",
      });
    }

    // Calculate final price with discount
    const finalAmount =
      courseData.coursePrice -
      (courseData.coursePrice * courseData.discount) / 100;

    const purchaseData = {
      courseId: courseData._id,
      userId: userData._id,
      amount: parseFloat(finalAmount.toFixed(2)),
      status: "pending",
    };

    const newPurchase = await Purchase.create(purchaseData);

    const stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY);

    const currency = process.env.CURRENCY.toLowerCase();

    const lineItems = [
      {
        price_data: {
          currency: currency,
          product_data: {
            name: courseData.courseTitle,
          },
          unit_amount: Math.floor(finalAmount * 100), // Stripe expects amount in cents
        },
        quantity: 1,
      },
    ];

    const session = await stripeInstance.checkout.sessions.create({
      line_items: lineItems,
      mode: "payment",
      success_url: `${origin}/loading/my-enrollments`,
      cancel_url: `${origin}/`,
      metadata: {
        purchaseId: newPurchase._id.toString(), // Store purchase ID in metadata
      },
    });

    return res.status(200).json({ success: true, sessionURL: session.url });
  } catch (error) {
    console.error("Error purchasing course:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Update user course progress
export const updateUserCourseProgress = async (req, res) => {
  try {
    const { userId } = req.auth();
    //const userId = req.auth.userId;
    const { courseId, lectureId } = req.body;

    let progressData = await CourseProgress.findOne({ userId, courseId });

    if (!progressData) {
      // If no progress data exists, create a new entry
      progressData = await CourseProgress.create({
        userId,
        courseId,
        lectureCompleted: [lectureId],
        completed: false, // Initially false, might be updated later if all lectures are done
      });
      return res
        .status(201)
        .json({ success: true, message: "Progress updated", progressData });
    }

    // If progress data exists, check if lecture is already completed
    if (progressData.lectureCompleted.includes(lectureId)) {
      return res
        .status(200)
        .json({ success: true, message: "Lecture already completed" });
    }

    // Add the new lectureId to completed lectures
    progressData.lectureCompleted.push(lectureId);
    await progressData.save();

    // Optional: Check if all lectures in the course are completed to mark overall course as completed
    const course = await Course.findById(courseId);
    if (course) {
      let totalLectures = 0;
      course.courseContent.forEach((chapter) => {
        totalLectures += chapter.chapterContent.length;
      });

      if (progressData.lectureCompleted.length === totalLectures) {
        progressData.completed = true;
        await progressData.save();
      }
    }

    return res
      .status(200)
      .json({ success: true, message: "Progress updated", progressData });
  } catch (error) {
    console.error("Error updating user course progress:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Get user course progress
export const getUserCourseProgress = async (req, res) => {
  try {
    const { userId } = req.auth();
    //const userId = req.auth.userId;
    const { courseId } = req.body; // Assuming courseId is sent in body for POST, or req.query for GET

    const progressData = await CourseProgress.findOne({ userId, courseId });

    if (!progressData) {
      // Return empty progress if no record found
      return res
        .status(200)
        .json({ success: true, progressData: { lectureCompleted: [] } });
    }

    return res.status(200).json({ success: true, progressData });
  } catch (error) {
    console.error("Error getting user course progress:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Add user rating to course
export const addUserRatingToCourse = async (req, res) => {
  try {
    const { userId } = req.auth();
    //const userId = req.auth.userId;
    const { courseId, rating } = req.body;

    // Validate input
    if (!courseId || !userId || !rating || rating < 1 || rating > 5) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid details provided." });
    }

    const course = await Course.findById(courseId);
    if (!course) {
      return res
        .status(404)
        .json({ success: false, message: "Course not found." });
    }

    const user = await User.findById(userId);
    if (!user || !user.enrolledCourses.includes(courseId)) {
      return res.status(403).json({
        success: false,
        message: "User has not purchased this course.",
      });
    }

    const existingRatingIndex = course.courseRatings.findIndex(
      (r) => r.userId === userId
    );

    if (existingRatingIndex > -1) {
      // Update existing rating
      course.courseRatings[existingRatingIndex].rating = rating;
    } else {
      // Add new rating
      course.courseRatings.push({ userId, rating });
    }

    await course.save();

    return res
      .status(200)
      .json({ success: true, message: "Rating added successfully." });
  } catch (error) {
    console.error("Error adding user rating:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
