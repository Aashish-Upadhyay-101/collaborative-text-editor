const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
const { Document } = require("./document.model");

const app = express();

const corsOptions = {
  origin: "*",
};

app.use(cors(corsOptions));
app.use(express.json());

const appPort = 8000;
const socketPort = 8001;

// database connection
mongoose
  .connect(
    "mongodb+srv://aashish:aashish@cluster0.rmrp5.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"
  )
  .then((res) => {
    console.log("Database connection successful");
  })
  .catch((err) => {
    console.log("There was error setting up database:", err.message);
  });

const socketServer = http.createServer();
const io = new Server(socketServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// get all documents
app.get("/", async (req, res) => {
  const documents = await Document.find();
  res.json({ documents });
});

app.post("/", async (req, res) => {
  try {
    const { name } = req.body;

    console.log({ name });

    const document = new Document({
      name,
    });

    await document.save();
    res.status(201).json({ document });
  } catch (err) {
    console.log(err);
    res.json({ err });
  }
});

// socket connections
io.on("connection", (socket) => {
  console.log("Connection Established!", socket.id);

  socket.on("get-document", async (id) => {
    socket.join(id);

    const document = await getDocumentById(id);
    socket.emit("load-document", document.data);

    socket.on("send-changes", (data) => {
      socket.broadcast.to(id).emit("receive-changes", data);
    });

    socket.on("send-cursor-position", (data) => {
      socket.broadcast.to(id).emit("receive-cursor-position", data);
    });

    socket.on("save-document", async (data) => {
      await getDocumentAndSave(data);
    });
  });
});

app.listen(appPort, () => {
  console.log(`Server running on https://localhost:${appPort}`);
});

socketServer.listen(socketPort, () => {
  console.log(`Socket server is running on https://localhost:${socketPort}`);
});

async function getDocumentById(id) {
  const document = await Document.findById(id);
  return document;
}

async function getDocumentAndSave(doc) {
  await Document.findByIdAndUpdate(doc.id, { data: doc.data });
}
