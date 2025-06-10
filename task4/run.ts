// Example usage for Task 4
import { fetchCenzuraTxt } from "./fetchCenzuraTxt.js";

const apiKey = process.env.API_KEY || "";
if (!apiKey) {
  console.error("Please set your API_KEY environment variable.");
  process.exit(1);
}

fetchCenzuraTxt(apiKey)
  .then((data) => {
    console.log("Fetched cenzura.txt contents:");
    console.log(data);
  })
  .catch((err) => {
    console.error("Error fetching cenzura.txt:", err);
  });
