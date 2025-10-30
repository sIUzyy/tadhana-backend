![alt text](image.png)

# Tadhana - A filipino dating app

Tadhana is designed to help people find genuine love and lasting relationships. Connect with Filipino singles who share your values, culture, and passion for meaningful connections. This app serves as an MVP project for the Builder Round at Whitecloak.

## Tech Stack

**Client:** Next.js (SPA), Tailwind CSS, ShadCN UI Components

**Server:** Node.js, Express.js

**Authentication:** JWT (JSON Web Tokens)

**Database:** MongoDB

**Messaging / Chat Platform:** GetStream

## Features

### 1. User Registration & Login (JWT)

- **Sign-Up:** Register using email, enter name, age, gender, location, password, and upload a profile picture
- **Login:** Secure login for returning users with email and password

### 2. User Profile Management

- View your profile in the browser
- Edit profile details: name, bio, profile photo

### 3. User Discovery & Matching

- Browse profiles via desktop interface
- Swipe right to like, left to skip
- Form a match when both users like each other
- Avoid showing the same profile again
- Filters by age and gender

### 4. Messaging / Chat (Get Stream Messaging Service)

- Chat unlocked only after matching
- Send and receive text messages

### 5. Match List

- Display all current matches
- View matches profile
- Unmatch to remove chat access

### 6. Bonus Features

- Light/dark mode UI toggle

## Run Locally

Clone the project

```bash
  git clone https://github.com/sIUzyy/tadhana-backend.git
```

Go to the project directory

```bash
  cd tadhana-backend
```

Install dependencies

```bash
  npm install
```

Start the server (make sure you add .env.local in your root directory)

```bash
  npm start
```

## Environment Variables

To run this project, you will need to add the following environment variables to your .env file

`PORT_ALTER`=5000

`GLOBAL_ACCESS`=0.0.0.0

Create a new database in your MongoDB instance for the app.

`URL_STRING`=mongodb+srv://<username>:<password>/

`JWT_SECRET`=generate_your_own_key

`JWT_EXPIRES_IN`=0.0.0.0

You can get the Stream API key by creating an account at https://getstream.io/. After signing up, copy the Key and Secret.

`STREAM_API_KEY`=
`STREAM_API_SECRET`=

## Author

- [@sIUzyy](https://github.com/sIUzyy)
