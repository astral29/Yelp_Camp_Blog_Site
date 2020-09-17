var express = require("express");
var router = express.Router();
var Campground = require("../models/campgrounds");
var User = require("../models/user");
var Notification = require("../models/notification");
var middleware = require("../middleware");
var request = require("request");
var multer = require("multer");

var storage = multer.diskStorage({
  filename: function (req, file, callback) {
    callback(null, Date.now() + file.originalname);
  },
});

var imageFilter = function (req, file, cb) {
  //accept image files only
  if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/i)) {
    return cb(new Error("Only image files are allowed!"), false);
  }
  cb(null, true);
};

var upload = multer({ storage: storage, fileFilter: imageFilter });

//cloudinary setup
var cloudinary = require("cloudinary");
const user = require("../models/user");

cloudinary.config({
  cloud_name: "ingenious4u",
  api_key: "842481355482816",
  api_secret: "7T2axZPfnkFwtyt7S7R5qi2iVsg",
});

router.get("/", function (req, res) {
  var nomatch = "";
  if (req.query.search) {
    const regex = new RegExp(escapeRegex(req.query.search), "gi");
    Campground.find({ name: regex }, function (err, allcampgrounds) {
      if (err) {
        console.log(err);
      } else {
        if (allcampgrounds.length == 0) {
          nomatch = "No Campground Found , Please try again";
          res.render("campgrounds", {
            campgrounds: allcampgrounds,
            nomatch: nomatch,
          });
        } else {
          res.render("campgrounds", {
            campgrounds: allcampgrounds,
            nomatch: nomatch,
          });
        }
      }
    });
  } else {
    //show all campgrounds
    Campground.find({}, function (err, allcampgrounds) {
      if (err) {
        console.log(err);
      } else {
        res.render("campgrounds", {
          campgrounds: allcampgrounds,
          nomatch: nomatch,
        });
      }
    });
  }
});

router.get("/new", middleware.isLoggedIn, function (req, res) {
  res.render("new");
});

router.post("/", middleware.isLoggedIn, upload.single("image"), function (
  req,
  res
) {
  cloudinary.uploader.upload(req.file.path, function (result) {
    var url = result.secure_url;
    console.log(req.body);
    Campground.create(req.body, function (err, cg) {
      if (err) {
        console.log(err);
      } else {
        cg.image = url;
        cg.author.id = req.user._id;
        cg.author.username = req.user.username;
        cg.save();
        User.findById(req.user._id)
          .populate("followers")
          .exec(function (err, foundUser) {
            if (err) {
              console.log(err.message);
            } else {
              var newNotification = {
                username: req.user.username,
                campgroundId: cg.id,
                totalRead: foundUser.followers.length,
                readCount: 0,
              };
              Notification.create(newNotification, function (err, crnot) {
                if (err) {
                  console.log(err.message);
                } else {
                  foundUser.followers.forEach(function (follower) {
                    follower.notifications.push(crnot);
                    follower.save();
                  });
                }
              });
            }
          });
      }
    });
    res.redirect("/campgrounds");
  });
});

//show page of a campground
router.get("/:id", function (req, res) {
  Campground.findById(req.params.id)
    .populate("comments")
    .exec(function (err, foundCampground) {
      if (err) {
        console.log(err);
      } else {
        var query = foundCampground.location;
        /*var key = locationKey(query);
        console.log(key);*/
        request(
          `http://dataservice.accuweather.com/locations/v1/search?apikey=${process.env.ACCUWTR_KEY}&q=` +
            query,
          function (error, response, body) {
            if (error) {
              res.send(error);
            } else {
              var parsedData = JSON.parse(body);
              if (parsedData.length == 0) {
                var defData = { WeatherText: "Thunderstorm", WeatherIcon: 15 };
                res.render("show", {
                  campground: foundCampground,
                  data: defData,
                });
              } else {
                var key = parsedData[0].Key;

                request(
                  "http://dataservice.accuweather.com/currentconditions/v1/" +
                    key +
                    `?apikey=${process.env.ACCUWTR_KEY}`,
                  function (error, response, body) {
                    if (error) {
                      console.log(error);
                    } else {
                      var parsedData = JSON.parse(body);

                      res.render("show", {
                        campground: foundCampground,
                        data: parsedData,
                      });
                    }
                  }
                );
              }
            }
          }
        );
        /*res.render("show", { campground: foundCampground });*/
      }
    });
});

//edit campground form
router.get("/:id/edit", middleware.checkCampgroundOwnership, function (
  req,
  res
) {
  Campground.findById(req.params.id, function (err, foundCampground) {
    if (err) {
      console.log(err);
    } else {
      res.render("edit", { campground: foundCampground });
    }
  });
});

//Update campground

router.put(
  "/:id/edit",
  middleware.checkCampgroundOwnership,
  upload.single("image"),
  function (req, res) {
    cloudinary.uploader.upload(req.file.path, function (result) {
      var url = result.secure_url;
      Campground.findByIdAndUpdate(req.params.id, req.body, function (err, cg) {
        if (err) {
          console.log(err);
        } else {
          cg.image = url;
          cg.save();
        }
        res.redirect("/campgrounds/" + req.params.id);
      });
    });
  }
);

//delete route
router.get("/:id/delete", middleware.checkCampgroundOwnership, function (
  req,
  res
) {
  Campground.findByIdAndRemove(req.params.id, function (err) {
    if (err) {
      res.redirect("/campgrounds/" + req.params.id);
    } else {
      res.redirect("/campgrounds");
    }
  });
});

//regexp maker

function escapeRegex(text) {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
}

module.exports = router;
