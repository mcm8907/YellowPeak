// File: index.js (Node.js Express server for Render)
const express = require("express");
const axios = require("axios");
const cors = require("cors");
const app = express();

app.use(cors());
app.use(express.json());

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const MODEL = "gpt-4"; // or "gpt-3.5-turbo"

const SUPABASE_URL = "https://<your-project-id>.supabase.co";
const SUPABASE_KEY = "your-service-role-key"; // NEVER expose this to frontend

const { createClient } = require("@supabase/supabase-js");
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

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
    .update({ credits: data.credits - 1, last_used: new Date() })
    .eq("token", token);

  // Log the use
  await supabase.from("usage_logs").insert({
    token,
    prompt_type: "email_generation"
  });

  return data;
}

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

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
    .update({ credits: data.credits - 1, last_used: new Date() })
    .eq("token", token);

  // Log usage
  await supabase.from("usage_logs").insert({
    token,
    prompt_type: "email_generation",
  });

  return data;
}

app.post("/generate", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const token = authHeader.split(" ")[1];
    await validateUser(token); // ✅ Supabase check and deduction

    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: "Missing prompt" });
    }

    const payload = {
      model: MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.8,
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
    console.error(error);
    res.status(400).json({ error: error.message || "Something went wrong" });
  }
});

    const openaiRes = await axios.post("https://api.openai.com/v1/chat/completions", payload, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
    });

    const reply = openaiRes.data.choices[0].message.content;
    const tokenUsage = openaiRes.data.usage.total_tokens || 1000;
    const creditCost = Math.ceil(tokenUsage / 1000); // Simulate billing

    // In production: update user credit balance in DB
    console.log(`User ${token} used ${creditCost} credits.`);

    return res.json({ response: reply });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server listening on port ${PORT}`));
