require("dotenv").config();
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const CustomError = require("./utils/CustomError");

const authRouter = require("./routes/authRouter");
const profileRouter = require("./routes/profileRouter");
const requestRouter = require("./routes/requestRouter");
const friendRouter = require("./routes/friendRouter");
const userRouter = require("./routes/userRouter");

const app = express();

app.use(
  cors({
    credentials: true,
    origin: [process.env.FRONTEND_URL],
  }),
);
app.use(cookieParser());
app.use(express.json());

app.use(authRouter);
app.use("/profiles", profileRouter);
app.use("/requests", requestRouter);
app.use("/friends", friendRouter);
app.use("/users", userRouter);

// if no route matched then it's a 404
app.use((req, res, next) => next(new CustomError("Not Found", 404)));
// eslint-disable-next-line no-unused-vars
app.use((error, req, res, next) => {
  if (!error.statusCode) {
    console.log(error);
    error.statusCode = 500;
    error.message = "Internal Server Error";
  }

  res
    .status(error.statusCode)
    .json({ error: `${error.statusCode}: ${error.message}` });
});

module.exports = app;
