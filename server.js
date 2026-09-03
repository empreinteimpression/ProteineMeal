import express from "express";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();

app.use(express.json());
app.use(express.static("."));

/* =====================================================
   GEMINI INITIALIZATION
===================================================== */

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});

/* =====================================================
   GENERATE 10 RECIPES
===================================================== */

app.post("/api/generate-recipe", async (req, res) => {
    try {
        const {
            ingredients = [],
            mealType = "all"
        } = req.body;

        const cleanIngredients = Array.isArray(ingredients)
            ? ingredients.map(item => String(item).trim()).filter(Boolean)
            : [];

        const ingredientsText = cleanIngredients.length > 0
            ? cleanIngredients.join(", ")
            : "Poulet, œufs, skyr, riz, avoine, tofu, thon, banane et légumes";

        const mealInstruction =
            mealType === "all"
                ? "Tous les types de repas sont autorisés. Varie les recettes."
                : `Le type de repas demandé est : ${mealType}. Respecte ce type.`;

        const prompt = `
Tu es un chef nutritionniste français spécialisé dans les recettes healthy,
simples et riches en protéines.

Crée EXACTEMENT 10 recettes différentes pour ProteineMeal.

INGRÉDIENTS FOURNIS :
${ingredientsText}

TYPE DE REPAS :
${mealInstruction}

RÈGLES :
- EXACTEMENT 10 recettes.
- Les 10 recettes doivent être réellement différentes.
- Utilise les ingrédients fournis quand c'est pertinent.
- Tu peux ajouter des ingrédients courants.
- Recettes réalistes et faciles à préparer.
- Riches en protéines.
- Quantités pour UNE portion.
- Macros réalistes pour UNE portion.
- Réponds uniquement en français.
- Aucun texte avant ou après le JSON.

Pour chaque recette, utilise exactement cette structure :

{
  "title": "Nom de la recette",
  "type": "petit-dej",
  "emoji": "🥞",
  "rating": 5,
  "prot": 35,
  "carbs": 40,
  "fat": 12,
  "cal": 400,
  "prep": 10,
  "cook": 15,
  "rest": 0,
  "ingredients": [
    "150g de poulet",
    "100g de riz"
  ],
  "instructions": [
    "Première étape.",
    "Deuxième étape.",
    "Troisième étape."
  ]
}

Le champ "type" doit être uniquement :
- "petit-dej"
- "diner"
- "dessert"

Retourne UNIQUEMENT un tableau JSON avec exactement 10 recettes.
`;

        let response;

        // Utilisation des versions à jour des modèles
        try {
            response = await ai.models.generateContent({
                model: "gemini-3.6-flash",
                contents: prompt,
            });
        } catch (modelError) {
            console.warn("gemini-3.6-flash indisponible, bascule sur gemini-3.5-flash-lite...");
            response = await ai.models.generateContent({
                model: "gemini-3.5-flash-lite",
                contents: prompt,
            });
        }

        let text = response.text || "";

        text = text
            .replace(/```json/gi, "")
            .replace(/```/g, "")
            .trim();

        const start = text.indexOf("[");
        const end = text.lastIndexOf("]");

        if (start === -1 || end === -1) {
            throw new Error(
                "Gemini n'a pas renvoyé un tableau JSON valide."
            );
        }

        text = text.substring(start, end + 1);

        const recipes = JSON.parse(text);

        if (!Array.isArray(recipes) || recipes.length < 10) {
            throw new Error(
                `Gemini a généré ${Array.isArray(recipes) ? recipes.length : 0} recettes au lieu de 10.`
            );
        }

        const finalRecipes = recipes.slice(0, 10).map((recipe, index) => ({
            title: recipe.title || `Recette protéinée ${index + 1}`,
            type: recipe.type || "diner",
            emoji: recipe.emoji || "🍽️",
            rating: Number(recipe.rating) || 5,
            prot: Number(recipe.prot) || 0,
            carbs: Number(recipe.carbs) || 0,
            fat: Number(recipe.fat) || 0,
            cal: Number(recipe.cal) || 0,
            prep: Number(recipe.prep) || 0,
            cook: Number(recipe.cook) || 0,
            rest: Number(recipe.rest) || 0,
            ingredients: Array.isArray(recipe.ingredients)
                ? recipe.ingredients
                : [],
            instructions: Array.isArray(recipe.instructions)
                ? recipe.instructions
                : []
        }));

        res.json({
            recipes: finalRecipes
        });

    } catch (error) {
        console.error("Erreur détaillée Gemini :", error);

        res.status(500).json({
            error: "Impossible de générer les 10 recettes avec Gemini.",
            details: error.message
        });
    }
});

/* =====================================================
   START SERVER
===================================================== */

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(
        `ProteineMeal lancé sur http://localhost:${PORT}`
    );
});