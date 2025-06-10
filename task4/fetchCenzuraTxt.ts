// Utility to fetch cenzura.txt with API key replacement
import https from "https";

export function fetchCenzuraTxt(apiKey: string): Promise<string> {
  const url = `https://c3ntrala.ag3nts.org/data/${apiKey}/cenzura.txt`;
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        let data = "";
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => resolve(data));
      })
      .on("error", reject);
  });
}
