// index.js (updated with Supabase integration)
const express = require("express");
const axios = require("axios");
const cors = require("cors");
const bodyParser = require("body-parser");
const { createClient } = require("@supabase/supabase-js");
require("dotenv\config");

const app = express();
app.use(cors());
app.use(bodyParser.json());

const PORT = process.env.PORT || 3000;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const MODEL = "gpt-4";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

app.post("/generate", async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const token = authHeader.split(" ")[1];

  // Get user from Supabase
  const { data: user, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", token)
    .single();

  if (error || !user) {
    return res.status(404).json({ error: "User not found" });
  }

  if (user.credits <= 0) {
    return res.status(402).json({ error: "Out of credits" });
  }

  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: "Missing prompt" });

  // Deduct one credit
  await supabase
    .from("users")
    .update({ credits: user.credits - 1 })
    .eq("id", token);

  // Generate with OpenAI
  const payload = {
    model: MODEL,
    messages: [{ role: "user", content: prompt }],
    temperature: 0.8,
  };

  try {
    const openaiRes = await axios.post("https://api.openai.com/v1/chat/completions", payload, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
    });

    const aiResponse = openaiRes.data.choices[0].message.content;
    return res.json({ result: aiResponse });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "OpenAI request failed" });
  }
});

app.listen(PORT, () => console.log(`🚀 YellowPeak running on port ${PORT}`));
