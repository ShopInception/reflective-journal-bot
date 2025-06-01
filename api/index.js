// api/index.js

import { OpenAI } from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // Your API Key comes from Vercel environment variable
});

export default async (req, res) => {
  const speechResult = req.body.SpeechResult; // This is what Twilio sends — your spoken text

  // Send speech to GPT-4o
  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: "You are a reflective journal bot. Respond warmly, thoughtfully, and guide the user through self-reflection.",
      },
      {
        role: "user",
        content: speechResult,
      },
    ],
  });

  const botResponse = completion.choices[0].message.content;

  // Send TwiML response
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
    <Response>
      <Say voice="Polly.Joanna">${botResponse}</Say>
      <Pause length="1"/>
      <Say>Would you like to continue reflecting?</Say>
      <Gather input="speech" action="/api/index" method="POST" timeout="5"/>
    </Response>`;

  res.setHeader("Content-Type", "application/xml");
  res.status(200).send(twiml);
};
