var express = require("express");
var router = express.Router({ mergeParams: true });
var Campground = require("../models/campgrounds");
var Comment = require("../models/comment");
var middleware = require("../middleware");

//Get comment form
router.get("/new", middleware.isLoggedIn, function (req, res) {
  Campground.findById(req.params.id, function (err, foundCampground) {
    if (err) {
      console.log(err);
    } else {
      res.render("comment", {
        /*campgroundId: req.params.id,*/
        campground: foundCampground,
      });
    }
  });
});

//Create Comment
router.post("/", middleware.isLoggedIn, function (req, res) {
  // var cid = req.params.id;

  Comment.create(req.body, function (err, comment) {
    if (err) {
      req.flash("error", "Something went wrong");
      console.log(err);
    } else {
      Campground.findById(req.params.id, function (err, foundCampground) {
        if (err) {
          console.log(err);
        } else {
          comment.author.id = req.user._id;
          comment.author.username = req.user.username;
          comment.save();

          foundCampground.comments.push(comment);
          foundCampground.save(function (err) {
            if (err) {
              console.log(err);
            } else {
              req.flash("success", "Successfully added comment!!!");
              res.redirect("/campgrounds/" + req.params.id);
            }
          });
        }
      });
    }
  });
});

router.get("/:cid/edit", middleware.checkCommentOwnership, function (req, res) {
  Campground.findById(req.params.id, function (err, foundCampground) {
    if (err) {
      console.log(err);
    } else {
      Comment.findById(req.params.cid, function (err, foundComment) {
        if (err) {
          console.log(err);
        } else {
          console.log("edit your comment");
          res.render("commentEdit", {
            campground: foundCampground,
            comment: foundComment,
          });
        }
      });
    }
  });
});

//Update comment

router.put("/:cid/edit", middleware.checkCommentOwnership, function (req, res) {
  Comment.findByIdAndUpdate(req.params.cid, req.body, function (
    err,
    foundComment
  ) {
    if (err) {
      console.log(err);
    } else {
      res.redirect("/campgrounds/" + req.params.id);
    }
  });
});

//delete route

router.get("/:cid/delete", middleware.checkCommentOwnership, function (
  req,
  res
) {
  Comment.findByIdAndRemove(req.params.cid, function (err, cg) {
    if (err) {
      console.log(err);
    } else {
      res.redirect("/campgrounds/" + req.params.id);
    }
  });
});

module.exports = router;
