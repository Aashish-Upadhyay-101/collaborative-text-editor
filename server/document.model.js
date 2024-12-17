import mongoose from "mongoose";

const documentSchema = new mongoose.Schema({
  name: String,
  data: Object,
});

const Document = mongoose.model("Document", documentSchema);

export { Document };
