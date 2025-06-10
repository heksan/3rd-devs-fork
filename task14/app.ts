// app.ts
import express from "express";
import { OpenAIService } from "./OpenAIService";

const app = express();
app.use(express.json());

const openaiService = new OpenAIService();

app.post("/api/chat", async (req, res) => {
  try {
    const response = await fetch(
      "https://c3ntrala.ag3nts.org/dane/barbara.txt"
    );
    const note = await response.text();
    const completion = await openaiService.completion(note);
    console.log("Completion:", completion);
    // Try to extract JSON object from completion
    let resultObj = null;
    let initialCities: string[] = [];
    if (
      completion &&
      typeof completion === "object" &&
      "choices" in completion &&
      Array.isArray(completion.choices)
    ) {
      const text = completion.choices[0]?.message?.content || "";
      try {
        // Find the first JSON object in the string
        const match = text.match(/\{[\s\S]*\}/);
        if (match) {
          resultObj = JSON.parse(match[0]);
          initialCities = Array.isArray(resultObj.kolejka_miast)
            ? [...resultObj.kolejka_miast]
            : [];
        }
      } catch (e) {
        console.error("Failed to parse JSON from completion:", e);
      }
    }
    // Use getCitiesForPeople to get all cities for kolejka_osob
    let allCities: string[] = [];
    if (resultObj && Array.isArray(resultObj.kolejka_osob)) {
      const apiKey = process.env.PEOPLE_API_KEY || "TWÓJ_KLUCZ_API";
      allCities = await getCitiesForPeople(resultObj.kolejka_osob, apiKey);
      // Merge with initialCities, ensuring uniqueness
      for (const city of allCities) {
        if (!initialCities.includes(city)) {
          initialCities.push(city);
        }
      }
          console.log("All cities:", initialCities);

      // Use getPeopleForCities to get all additional people for all cities
      let additionalPeople = await getPeopleForCities(initialCities, apiKey);
      // Remove duplicates: only keep people not already in resultObj.kolejka_osob
      if (resultObj) {
        additionalPeople = additionalPeople.filter(
          (person) => !resultObj.kolejka_osob.includes(person)
        );
      }
      //replace Ł with L
        additionalPeople = additionalPeople.map(person =>
            person.replace(/Ł/g, "L").replace(/ł/g, "l")
        );
        
      console.log("All additional people:", additionalPeople);

      // Get additional cities for additional people, ensuring no duplicates with initialCities
      const additionalCities = await getCitiesForPeople(additionalPeople, apiKey);
      const uniqueAdditionalCities = additionalCities.filter(city => !initialCities.includes(city));
      console.log("All additional cities:", uniqueAdditionalCities);

            let additionalPeople2 = await getPeopleForCities(uniqueAdditionalCities, apiKey);

    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({ error: errorMessage });
  }
});

/**
 * Calls the people API for a list of names and returns a unique list of cities.
 * @param people Array of names to query.
 * @param apiKey API key for authentication.
 * @returns Promise<string[]> Unique list of cities.
 */
export async function getCitiesForPeople(
  people: string[],
  apiKey: string
): Promise<string[]> {
  const cities: Set<string> = new Set();
  for (const imie of people) {
    try {
      const peopleRes = await fetch("https://c3ntrala.ag3nts.org/people", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apikey: apiKey, query: imie }),
      });
      const peopleData = await peopleRes.json();
      //log
        console.log(`Response for ${imie}:`, peopleData);
      if (
        peopleData &&
        peopleData.code === 0 &&
        peopleData.message !== "[**RESTRICTED DATA**]" &&
        typeof peopleData.message === "string"
      ) {
        const cityList = (peopleData.message as string)
          .split(" ")
          .map((city: string) => city.trim())
          .filter(Boolean);
        for (const city of cityList) {
          cities.add(city);
        }
      }
    } catch (e) {
      console.error(`Error calling people API for ${imie}:`, e);
    }
  }
  return Array.from(cities);
}

/**
 * Calls the places API for a list of cities and returns a unique list of people.
 * @param cities Array of city names to query.
 * @param apiKey API key for authentication.
 * @returns Promise<string[]> Unique list of people.
 */
export async function getPeopleForCities(cities: string[], apiKey: string): Promise<string[]> {
  const people: Set<string> = new Set();
  for (const city of cities) {
    try {
      const placesRes = await fetch("https://c3ntrala.ag3nts.org/places", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apikey: apiKey, query: city }),
      });
      const placesData = await placesRes.json();
      //log
        console.log(`Response for ${city}:`, placesData);
      if (
        placesData &&
        placesData.code === 0 &&
        placesData.message !== "[RESTRICTED DATA]" &&
        typeof placesData.message === "string"
      ) {
        const peopleList = (placesData.message as string)
          .split(" ")
          .map((person: string) => person.trim())
          .filter(Boolean);
        for (const person of peopleList) {
          people.add(person);
        }
      }
    } catch (e) {
      console.error(`Error calling places API for ${city}:`, e);
    }
  }
  return Array.from(people);
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
