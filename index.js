// index.js - Yellow Peak API Backend

require("dotenv").config();
const express = require("express");
const axios = require("axios");
const cors = require("cors");
const { createClient } = require("@supabase/supabase-js");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const MODEL = "gpt-4";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function deductCredit(userToken) {
  const { data: user, error } = await supabase
    .from("users")
    .select("credits")
    .eq("token", userToken)
    .single();

  if (error || !user || user.credits <= 0) {
    throw new Error("❌ User not found or out of credits");
  }

  const { error: updateError } = await supabase
    .from("users")
    .update({ credits: user.credits - 1 })
    .eq("token", userToken);

  if (updateError) throw new Error("❌ Failed to update credits");
  return true;
}

app.post("/generate", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const userToken = authHeader.split(" ")[1];

    await deductCredit(userToken);

    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: "Missing prompt" });

    const payload = {
      model: MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.8,
    };

    const openaiRes = await axios.post("https://api.openai.com/v1/chat/completions", payload, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
    });

    const result = openaiRes.data.choices[0].message.content;
    res.status(200).json({ result });
  } catch (err) {
    console.error("/generate error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/check-credits", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const userToken = authHeader.split(" ")[1];

    const { data: user, error } = await supabase
      .from("users")
      .select("credits")
      .eq("token", userToken)
      .single();

    if (error || !user) {
      throw new Error("❌ User not found");
    }

    res.status(200).json({ credits: user.credits });
  } catch (err) {
    console.error("/check-credits error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Yellow Peak backend running on port ${PORT}`);
});
