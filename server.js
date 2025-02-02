import express from "express";
import multer from "multer";
import { ImageAnnotatorClient } from "@google-cloud/vision";
import dotenv from "dotenv";
import sharp from "sharp";
import fetch from "node-fetch";

dotenv.config();

const app = express();
const port = 8000;
const upload = multer();
const visionClient = new ImageAnnotatorClient();

app.use(express.static("public"));
app.use(express.json());

// Function to preprocess the image
const preprocessImage = async (buffer) => {
  try {
    console.log("Processing image...");
    return await sharp(buffer).resize(800, 800).jpeg({ quality: 85 }).toBuffer();
  } catch (error) {
    console.error("Error processing image:", error);
    return buffer;
  }
};

// Detect labels using Google Cloud Vision API
const detectLabels = async (imageBuffer) => {
  try {
    const [result] = await visionClient.labelDetection({ image: { content: imageBuffer } });
    console.log("Labels detected:", result.labelAnnotations.map(label => label.description));
    return result.labelAnnotations.map(label => label.description);
  } catch (error) {
    console.error("Error detecting labels:", error);
    return [];
  }
};

// Function to query Gemini API for filtering
const geminiFilter = async (labels) => {
    try {
        console.log("Querying Gemini API for filtering...");
      const query = `From [${labels.join(", ")}] return a plain JSON array (without any special formatting as text) of specific edible ingredients: ` +
        `- Include common fruits, vegetables, meats, seafood, dairy, eggs, grains, spices, herbs, teas, coffees, and condiments. ` +
        `- Exclude generic terms, prepared foods, non-consumables, and broad categories. Plain text response required.`;
  
      const apiKey = process.env.GEMINI_API_KEY; // Ensure .env file has this key
      const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
  
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: query }] }]
        })
      });
      console.log("Gemini API response:", response);
      const data = await response.json();
      console.log("Gemini API data:", data.candidates[0].content.parts[0].text);
  
      if (!data || !data.candidates || !data.candidates[0]?.content?.parts) {
        console.error("Unexpected response from Gemini API:", data);
        return [];
      }
  
      const responseText = data.candidates[0].content.parts[0].text;
      return JSON.parse(responseText);
    } catch (error) {
      console.error("Error querying Gemini API:", error);
      return [];
    }
  };  

  const getRecipes = async (ingredients, dietPrefs, allergyPrefs) => {
    console.log(ingredients, dietPrefs, allergyPrefs);
    try {
       
        const query = `Provide up to 5 complete meal recipes that include [${ingredients.join(", ")}] and are suitable for a [${dietPrefs.join(", ")}] diet, excluding any recipes with [${allergyPrefs.join(", ")}]. ` +  
        `Assume the user has common pantry staples (e.g., salt, pepper, oil, flour, sugar, basic spices, garlic, onions, butter, etc.). ` +  
        `Recipes should be full meal items, not snacks or side dishes, and may include additional ingredients to enhance the dish. ` +  
        `For each recipe, include: ` +  
        `1. A unique title. ` +   
        `2. A keyword for recipe image search ` +  
        `Return the response in this format (as plain text without any extra formatting, especially no code formatting, no other text or explanation required):` +
        `{ "recipes": [ { "id", "title", "image" } ] }`;
      const apiKey = process.env.GEMINI_API_KEY;
      const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
  
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: query }] }] })
      });
  
      const data = await response.json();
      const recipesText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      console.log("Recipes text:", recipesText);
  
      // If recipesText is not valid, default to an empty array
      if (!recipesText) {
        console.error("No valid recipe data found.");
        return [];
      }
  
      // Try parsing the response into a valid format
      try {
        const recipesData = JSON.parse(recipesText);
        return recipesData.recipes || [];
      } catch (parseError) {
        console.error("Error parsing the recipes data:", parseError);
        return [];
      }
    } catch (error) {
      console.error("Error fetching recipes:", error);
      return [];
    }
  };
  
  // Query Gemini API for recipe details
  const getRecipeDetails = async (recipe, ingredients, dietPrefs, allergyPrefs) => {
    console.log(recipe, ingredients, dietPrefs, allergyPrefs);
    try {
      const query = `Provide full details for recipe ${recipe}, including ingredients with measurements, must include [${ingredients.join(", ")}] and be suitable for a [${dietPrefs.join(", ")}] diet, with allergy concerns [${allergyPrefs.join(", ")}]. ` +
        `step-by-step instructions, preparation time, and substitution suggestions. ` +
        `Return the response in this plain text format (no formatting): { "title", "image", "readyInMinutes", "servings", "ingredients": [], "steps": [{ "number", "instruction" }], "substitutions": [{ "ingredient", "substitute" }] }`;
  
      const apiKey = process.env.GEMINI_API_KEY;
      const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
  
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: query }] }] })
      });
  
      const data = await response.json();
      console.log(data.candidates[0].content.parts[0].text);
      return JSON.parse(data.candidates[0].content.parts[0].text || "{}");
    } catch (error) {
      console.error("Error fetching recipe details:", error);
      return {};
    }
  };

app.get("/", (req, res) => {
  res.sendFile("index.html", { root: "public" });
});

// Image upload and processing endpoint
app.post("/api/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    console.log("Received image:", req.file.originalname);

    const processedImage = await preprocessImage(req.file.buffer);
    console.log("Image processed");
    const labels = await detectLabels(processedImage);
    console.log("Labels detected:", labels);
    const filteredLabels = await geminiFilter(labels);
    console.log("Filtered labels:", filteredLabels);

    res.json({ filtered_fruits_and_vegetables: filteredLabels });
  } catch (error) {
    console.error("Error processing image:", error);
    res.status(500).json({ error: "An error occurred while processing the image" });
  }
});

app.post("/api/getRecipes", async (req, res) => {
    try {
      const { ingredients, dietaryPreferences, allergyPreferences } = req.body;
      const recipes = await getRecipes(ingredients, dietaryPreferences, allergyPreferences);
      console.log("Final Recipes: ", recipes)
      res.json(recipes);
    } catch (error) {
      console.error("Error getting recipes:", error);
      res.status(500).json({ error: "Failed to fetch recipes" });
    }
  });
  
  // Get full recipe details
  app.post("/api/getRecipeDetails", async (req, res) => {
    try {
      const { recipeName, ingredients, dietaryPreferences, allergyPreferences } = req.body;
      console.log("Recipe Details: ", recipeName, ingredients, dietaryPreferences, allergyPreferences);
      const recipeDetails = await getRecipeDetails(recipeName, ingredients, dietaryPreferences, allergyPreferences);
      res.json(recipeDetails);
    } catch (error) {
      console.error("Error fetching recipe details:", error);
      res.status(500).json({ error: "Failed to fetch recipe details" });
    }
  });  

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
