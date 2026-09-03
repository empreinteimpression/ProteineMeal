import express from "express";
import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

const app = express();

app.use(express.json());

app.use(express.static("."));


/* =====================================================
   OPENAI
===================================================== */

const client = new OpenAI({

    apiKey:
        process.env.OPENAI_API_KEY

});


/* =====================================================
   GENERATE RECIPE
===================================================== */

app.post(

    "/api/generate-recipe",

    async (req, res) => {

        try {

            const {

                ingredients = [],

                mealType = "all"

            } = req.body;


            if (!ingredients.length) {

                return res.status(400).json({

                    error:
                        "Au moins un ingrédient est requis."

                });

            }


            const prompt = `

Tu es un chef nutritionniste français spécialisé dans les recettes healthy et riches en protéines.

Ta mission est de créer UNE recette originale, réaliste et appétissante.

INGRÉDIENTS PRINCIPAUX DISPONIBLES :
${ingredients.join(", ")}

TYPE DE REPAS DEMANDÉ :
${mealType}


IMPORTANT :

- La recette doit être en français.
- Elle doit être riche en protéines.
- Elle doit être simple à réaliser.
- Elle doit être réaliste.
- Les quantités doivent être cohérentes.
- Les macros sont des estimations réalistes pour une portion.
- Utilise les ingrédients demandés quand c'est pertinent.
- Ne donne aucune explication supplémentaire.


Retourne UNIQUEMENT du JSON valide.

Utilise EXACTEMENT cette structure :

{
    "title": "Nom appétissant de la recette",
    "type": "petit-dej ou diner ou dessert",
    "emoji": "🍽️",
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
        "Étape 1 claire",
        "Étape 2 claire",
        "Étape 3 claire"
    ]
}

`;


            const response =
                await client.responses.create({

                    model:

                        process.env.OPENAI_MODEL
                        || "gpt-5-mini",


                    input:
                        prompt

                });


            const text =
                response.output_text

                .replace(
                    /```json|```/g,
                    ""
                )

                .trim();


            const recipe =
                JSON.parse(text);


            res.json({

                recipe

            });

        }

        catch (error) {

            console.error(error);


            res.status(500).json({

                error:

                    "Impossible de générer la recette. Vérifie ta clé API et le serveur."

            });

        }

    }

);


/* =====================================================
   START SERVER
===================================================== */

const PORT =
    process.env.PORT || 3000;


app.listen(

    PORT,

    () => {

        console.log(

            `ProteineMeal lancé sur http://localhost:${PORT}`

        );

    }

);
