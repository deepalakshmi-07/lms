import User from "../models/User.js";
import Course from "../models/Course.js";
import Purchase from "../models/Purchase.js";
import Stripe from "stripe";

// Get user data
export const getUserData = async (req, res) => {
  try {
    const userId = req.auth.userId;
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
    const userId = req.auth.userId;
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
    const userId = req.auth.userId;
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
