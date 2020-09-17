var mongoose = require("mongoose");

var notificationSchema = new mongoose.Schema({
  username: String,
  campgroundId: String,
  isRead: { type: Boolean, default: false },
  totalRead: Number,
  readCount: Number,
});
module.exports = mongoose.model("Notification", notificationSchema);
