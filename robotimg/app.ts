import express from "express";
import path from "path";

const app = express();
const port = 3000;

app.get("/", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { font-family: Arial, sans-serif; text-align: center; margin-top: 40px; }
        img { max-width: 90vw; max-height: 70vh; border: 1px solid #ccc; margin-top: 20px; }
        .url { margin-top: 20px; color: #555; }
      </style>
    </head>
    <body>
      <div class="url">Image URL: <span id="img-url">(local file)</span></div>
      <img id="robot-img" src="/image.png" alt="Robot will appear here" />
    </body>
    </html>
  `);
});

// Serve the static image file
app.use("/image.png", express.static(path.join(__dirname, "image.png")));

app.listen(port, () => {
  console.log(`Image host listening at http://localhost:${port}`);
});
