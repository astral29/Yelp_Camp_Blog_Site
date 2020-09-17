var express = require("express");
var app = express();
const PORT = process.env.PORT || 3000;
var flash = require("connect-flash");
var bodyParser = require("body-parser");
var methodOverride = require("method-override");
var moment = require("moment");
var request = require("request");
var Comment = require("./models/comment");
var Campground = require("./models/campgrounds");
var User = require("./models/user");
var Notification = require("./models/notification");
var seedDB = require("./seeds");
var passport = require("passport"),
  localStrategy = require("passport-local"),
  passportLocalMongoose = require("passport-local-mongoose");

var commentRoutes = require("./routes/comments"),
  CampgroundRoutes = require("./routes/campgrounds"),
  indexRoutes = require("./routes/index"),
  passwordRoutes = require("./routes/passwordReset");

//seedDB();

app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(methodOverride("_method"));
app.use(flash());

//passport config
app.use(
  require("express-session")({
    secret: "what are the odds of you being a hacker",
    resave: false,
    saveUninitialized: false,
  })
);
app.use(passport.initialize());
app.use(passport.session());
passport.use(new localStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use(async function (req, res, next) {
  res.locals.currentUser = req.user;
  if (req.user) {
    try {
      let user = await User.findById(req.user._id)
        .populate("notifications", null, { isRead: false })
        .exec();
      res.locals.notifications = user.notifications.reverse();
    } catch (err) {
      console.log(err.message);
    }
  }
  res.locals.error = req.flash("error");
  res.locals.success = req.flash("success");
  res.locals.moment = moment;
  next();
});

app.use("/", indexRoutes);
app.use("/campgrounds/:id/comments", commentRoutes);
app.use("/campgrounds", CampgroundRoutes);
app.use("/", passwordRoutes);

console.log(process.env.DATABASE_URL);
console.log(process.env.ACCUWTR_KEY);

const mongoose = require("mongoose");
mongoose
  .connect(`${process.env.DATABASE_URL}`, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("Connected to DB!"))
  .catch((error) => console.log(error.message));

app.listen(PORT, () => {
  console.log(`YelpCamp ready to go ${PORT}`);
});
