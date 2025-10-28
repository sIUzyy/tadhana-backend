require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/schema/user-schema");

mongoose
  .connect(process.env.URL_STRING)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error(err));

const users = [
  {
    email: "alice@example.com",
    password: "password123",
    name: "Alice",
    age: 24,
    gender: "Female",
    location: "Manila",
    photo: "https://i.pravatar.cc/150?img=1",
    preferences: { gender: "Male", ageRange: { min: 18, max: 99 } },
    bio: "Hi, I love adventures!",
  },
  {
    email: "bob@example.com",
    password: "password123",
    name: "Bob",
    age: 28,
    gender: "Male",
    location: "Cebu",
    photo: "https://i.pravatar.cc/150?img=2",
    preferences: { gender: "Female", ageRange: { min: 18, max: 99 } },
    bio: "Coffee lover and gamer.",
  },
  {
    email: "carol@example.com",
    password: "password123",
    name: "Carol",
    age: 22,
    gender: "Female",
    location: "Davao",
    photo: "https://i.pravatar.cc/150?img=3",
    preferences: { gender: "Male", ageRange: { min: 18, max: 99 } },
    bio: "Bookworm and foodie.",
  },
  {
    email: "dave@example.com",
    password: "password123",
    name: "Dave",
    age: 30,
    gender: "Male",
    location: "Quezon City",
    photo: "https://i.pravatar.cc/150?img=4",
    preferences: { gender: "Any", ageRange: { min: 18, max: 99 } },
    bio: "Love traveling and photography.",
  },
  {
    email: "eve@example.com",
    password: "password123",
    name: "Eve",
    age: 26,
    gender: "Any",
    location: "Manila",
    photo: "https://i.pravatar.cc/150?img=5",
    preferences: { gender: "Any", ageRange: { min: 18, max: 99 } },
    bio: "Curious about everything!",
  },
];

async function seed() {
  try {
    await User.deleteMany(); // clear previous users
    const created = await User.insertMany(users);
    console.log(
      "Fake users created:",
      created.map((u) => u.email)
    );
  } catch (err) {
    console.error(err);
  } finally {
    mongoose.connection.close();
  }
}

seed();
