import https from "https";

export function reportCentrala(
  apiKey: string,
  answer: string
): Promise<any> {
  const data = JSON.stringify({
    task: "mp3",
    apikey: apiKey,
    answer: answer,
  });

  const options = {
    hostname: "c3ntrala.ag3nts.org",
    path: "/report",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(data),
    },
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let response = "";
      res.on("data", (chunk) => {
        response += chunk;
      });
      res.on("end", () => resolve(response));
    });
    req.on("error", reject);
    req.write(data);
    req.end();
  });
}
