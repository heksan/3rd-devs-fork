import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

export async function fetchConnectionsFromApiDb() {
  const apiKey = process.env.PERSONAL_API_KEY;
  if (!apiKey) throw new Error("PERSONAL_API_KEY not set in .env");

  const response = await axios.post("https://c3ntrala.ag3nts.org/apidb", {
    task: "database",
    apikey: apiKey,
    query: "Select * from connections",
  });

  return response.data;
}
