require("dotenv").config();
const BASE_URL = "http://localhost:5000";
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs"); // ✅ for password hashing
const User = require("../models/schema/user-schema");

mongoose
  .connect(process.env.URL_STRING)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB connection failed:", err));

const users = [
  {
    email: "tony.stark@gmail.com",
    password: "ironman123",
    name: "Tony Stark",
    age: 45,
    gender: "Male",
    location: "Makati City",
    photo: `uploads\\images\\ironman.jpg`,
    preferences: { gender: "Female", ageRange: { min: 25, max: 45 } },
    bio: "Genius. Billionaire. Playboy. Philanthropist. Always up for a challenge.",
  },
  {
    email: "natasha.romanoff@gmail.com",
    password: "blackwidow123",
    name: "Natasha Romanoff",
    age: 34,
    gender: "Female",
    location: "Pasig City",
    photo: "uploads\\images\\blackwidow.jpeg",
    preferences: { gender: "Male", ageRange: { min: 25, max: 50 } },
    bio: "Ex-spy, martial artist, and master of secrets. Looking for peace and maybe love.",
  },
  {
    email: "steve.rogers@gmail.com",
    password: "captain123",
    name: "Steve Rogers",
    age: 90,
    gender: "Male",
    location: "Taguig City",
    photo: "uploads\\images\\captainamerica.jpg",
    preferences: { gender: "Female", ageRange: { min: 25, max: 40 } },
    bio: "Just a kid from Brooklyn trying to do what's right.",
  },
  {
    email: "carol.danvers@gmail.com",
    password: "captainmarvel123",
    name: "Carol Danvers",
    age: 38,
    gender: "Female",
    location: "Quezon City",
    photo: "uploads\\images\\captainmarvel.jpg",
    preferences: { gender: "Any", ageRange: { min: 25, max: 99 } },
    bio: "Pilot. Avenger. Cosmic powerhouse. I travel light-years, but I miss good coffee.",
  },
  {
    email: "thor.odinson@gmail.com",
    password: "mjolnir123",
    name: "Thor Odinson",
    age: 90,
    gender: "Male",
    location: "Cebu City",
    photo: "uploads/images/thor.jpg",
    preferences: { gender: "Any", ageRange: { min: 21, max: 99 } },
    bio: "God of Thunder. Defender of realms. Loves ale, lightning, and long walks on Bifröst.",
  },
  {
    email: "wanda.maximoff@gmail.com",
    password: "scarletwitch123",
    name: "Wanda Maximoff",
    age: 32,
    gender: "Female",
    location: "Davao City",
    photo: "uploads\\images\\wanda.jpg",
    preferences: { gender: "Male", ageRange: { min: 25, max: 45 } },
    bio: "Reality can be whatever I want it to be. But I’d rather it be real this time.",
  },
  {
    email: "peter.parker@gmail.com",
    password: "spidey123",
    name: "Peter Parker",
    age: 18,
    gender: "Male",
    location: "Manila City",
    photo: "uploads\\images\\spiderman.jpg",
    preferences: { gender: "Female", ageRange: { min: 18, max: 30 } },
    bio: "Student by day, friendly neighborhood Spider-Man by night. Love pizza and science.",
  },
  {
    email: "clint.barton@gmail.com",
    password: "hawkeye123",
    name: "Clint Barton",
    age: 38,
    gender: "Male",
    location: "Mandaluyong City",
    photo: "uploads\\images\\hawkeye.jpg",
    preferences: { gender: "Female", ageRange: { min: 25, max: 45 } },
    bio: "Master archer. Family man. I don’t miss — unless it’s a date night.",
  },
  {
    email: "bruce.banner@gmail.com",
    password: "hulk123",
    name: "Bruce Banner",
    age: 42,
    gender: "Male",
    location: "Baguio City",
    photo: "uploads\\images\\bruce.jpg",
    preferences: { gender: "Any", ageRange: { min: 25, max: 50 } },
    bio: "Scientist with a temper. Just trying to keep things calm… most of the time.",
  },
];

async function seed() {
  try {
    await User.deleteMany();
    console.log("🧹 Old users removed.");

    // ✅ Hash passwords before saving
    const hashedUsers = await Promise.all(
      users.map(async (user) => {
        const hashedPassword = await bcrypt.hash(user.password, 10);
        return { ...user, password: hashedPassword };
      })
    );

    const created = await User.insertMany(hashedUsers);
    console.log("✅ Marvel users created:");
    created.forEach((u) => console.log(` - ${u.name} (${u.email})`));
  } catch (err) {
    console.error("❌ Seeding failed:", err);
  } finally {
    mongoose.connection.close();
  }
}

seed();
