import mongoose from "mongoose";

// Connect to the MongoDB database
const connectDB = async () => {
  try {
    mongoose.connection.on("connected", () => {
      console.log("Database connected");
    });

    await mongoose.connect(`${process.env.MONGODB_URI}/lms`);
  } catch (error) {
    console.error("Error connecting to database:", error);
  }
};

export default connectDB;
