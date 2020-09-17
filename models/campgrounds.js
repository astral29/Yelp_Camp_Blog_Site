var mongoose = require("mongoose");
var campgroundSchema = new mongoose.Schema({
  name: String,
  location: String,
  price: String,
  image: String,
  description: String,
  comments: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Comment",
    },
  ],
  author: {
    id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    username: String,
  },
  created: { type: Date, default: Date.now },
});

var Campground = mongoose.model("Campground", campgroundSchema);

module.exports = Campground;
