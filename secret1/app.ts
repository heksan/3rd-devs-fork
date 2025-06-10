import express from "express";

const app = express();
const port = 54018;

app.use(express.json());

app.get("/", (req, res) => {
    // log req
    console.log("Received request");
    console.log("Request headers:", req.headers);
  res.send("Hello, world! The server is running on port 54018.");
});

app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});
