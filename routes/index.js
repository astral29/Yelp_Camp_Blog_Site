var express = require("express");
var router = express.Router();
var passport = require("passport");
var User = require("../models/user");
var Campground = require("../models/campgrounds");
var Notification = require("../models/notification");
var async = require("async");
var nodemailer = require("nodemailer");
var crypto = require("crypto");
const { nextTick } = require("process");
const { isLoggedIn } = require("../middleware");
const { db } = require("../models/campgrounds");

router.get("/", function (req, res) {
  res.render("landing");
});

//===================
//Auth Routes

//register page show
router.get("/register", function (req, res) {
  res.render("register");
});

router.post("/register", function (req, res) {
  var newUser = new User({
    username: req.body.username,
    firstName: req.body.firstName,
    email: req.body.email,
    avatar: req.body.avatar,
  });
  if (req.body.adminCode === "secret") {
    newUser.isAdmin = true;
  }
  User.register(newUser, req.body.password, function (err, user) {
    if (err) {
      console.log(err);
      req.flash("error", err.message);
      return res.redirect("/register");
    }
    passport.authenticate("local")(req, res, function () {
      req.flash("success", "Welcome to YelpCamp " + user.username);
      res.redirect("/campgrounds");
    });
  });
});

//login page show
router.get("/login", function (req, res) {
  res.render("login");
});

router.post(
  "/login",
  passport.authenticate("local", {
    successFlash: "Welcome!",
    successRedirect: "/campgrounds",
    failureFlash: "Invalid username or password.",
    failureRedirect: "/login",
  }),
  function (req, res) {
    console.log(req.User.username);
  }
);

//logout route
router.get("/logout", function (req, res) {
  req.logOut();
  req.flash("success", "Logged you out!");
  res.redirect("/campgrounds");
});

// user profile search
router.get("/users", function (req, res) {
  var nomatch = "";
  if (req.query.search) {
    const regex = new RegExp(escapeRegex(req.query.search), "gi");
    User.find({ username: regex }, function (err, allUsers) {
      if (err) {
        console.log(err);
      } else {
        if (allUsers.length == 0) {
          nomatch = "No User Found , Please try again";
          res.render("users", {
            users: allUsers,
            nomatch: nomatch,
          });
        } else {
          res.render("users", {
            users: allUsers,
            nomatch: nomatch,
          });
        }
      }
    });
  } else {
    User.find({}, function (err, allUsers) {
      if (err) {
        console.log(err.message);
      } else {
        res.render("users", {
          users: allUsers,
          nomatch: nomatch,
        });
      }
    });
  }
});

//get a user profile
router.get("/users/:id", isLoggedIn, function (req, res) {
  var follow = false;
  if (req.user._id != req.params.id) {
    follow = true;
  }
  console.log(follow);

  User.findById(req.params.id)
    .populate("followers")
    .exec(function (err, foundUser) {
      if (err) {
        res.redirect("/");
      } else {
        Campground.find()
          .where("author.id")
          .equals(foundUser._id)
          .exec(function (err, foundCampgrounds) {
            if (err) {
              res.redirect("/");
            } else {
              res.render("userProfile", {
                user: foundUser,
                follow: follow,
                campgrounds: foundCampgrounds,
              });
            }
          });
      }
    });
});

//follow a user
router.get("/follow/:id", isLoggedIn, function (req, res) {
  User.findById(req.params.id, function (err, foundUser) {
    if (err) {
      req.flash("error", err.message);
      res.redirect("back");
    } else {
      foundUser.followers.push(req.user._id);
      foundUser.save();
      req.flash("success", "Successfully followed " + foundUser.username + "!");
      res.redirect("/users/" + req.params.id);
    }
  });
});

//view all notifications
router.get("/notifications", isLoggedIn, function (req, res) {
  User.findById(req.user._id)
    .populate({ path: "notifications", options: { sort: { _id: -1 } } })
    .exec(function (err, foundUser) {
      if (err) {
        req.flash("error", err.message);
        res.redirect("back");
      } else {
        var allNotifications = foundUser.allNotifications;
        res.render("notifications/index", {
          allNotifications: allNotifications,
        });
      }
    });
});

//handle notifications
router.get("/notifications/:id", isLoggedIn, function (req, res) {
  Notification.findById(req.params.id, function (err, foundNotification) {
    if (err) {
      req.flash("error", err.message);
      res.redirect("back");
    } else {
      //foundNotification.isRead = true;
      foundNotification.readCount = foundNotification.readCount + 1;
      foundNotification.save();
      if (foundNotification.readCount == foundNotification.totalRead) {
        console.log(foundNotification.readCount);
        Notification.findByIdAndRemove(foundNotification._id, function (
          err,
          toberem
        ) {
          if (err) {
            console.log(err.message);
          } else {
            res.redirect("/campgrounds/" + toberem.campgroundId);
          }
        });
      } else {
        console.log(foundNotification.readCount + "from normal");
        res.redirect("/campgrounds/" + foundNotification.campgroundId);
      }
    }
  });
});

//regexp maker

function escapeRegex(text) {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
}
module.exports = router;
