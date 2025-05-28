// index.js — Yellow Peak Backend

const express = require("express");
const axios = require("axios");
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const MODEL = "gpt-4";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Validate user and deduct credit
async function validateUser(token) {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("token", token)
    .single();

  if (error || !data || data.credits <= 0) {
    throw new Error("Invalid or insufficient credits.");
  }

  // Deduct 1 credit
  await supabase
    .from("users")
    .update({ credits: data.credits - 1, last_used: new Date().toISOString() })
    .eq("token", token);

  // Log usage
  await supabase.from("usage_logs").insert({
    token,
    prompt_type: "email_generation",
    timestamp: new Date().toISOString(),
  });

  return data;
}

// Main AI generation route
app.post("/generate", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const token = authHeader.split(" ")[1];
    await validateUser(token);

    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: "Missing prompt" });

    const payload = {
      model: MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.85,
    };

    const openaiRes = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      payload,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
      }
    );

    const response = openaiRes.data.choices[0].message.content;
    res.json({ response });
  } catch (error) {
    console.error("/generate error:", error);
    res.status(400).json({ error: error.message || "Something went wrong" });
  }
});

// Health check
app.get("/ping", (req, res) => {
  res.send("Yellow Peak API is live ✅");
});

app.listen(PORT, () => {
  console.log(`🚀 Yellow Peak API running on port ${PORT}`);
});
