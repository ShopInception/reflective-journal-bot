import { OpenAI } from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async (req, res) => {
  const speechResult = req.body.SpeechResult;

  // 🚨 Add a check for empty input
  if (!speechResult) {
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
    <Response>
      <Say voice="Polly.Joanna">I'm sorry, I didn't catch that. Could you please repeat?</Say>
      <Gather input="speech" action="/api/index" method="POST" timeout="5"/>
    </Response>`;
    
    return res.setHeader("Content-Type", "application/xml").status(200).send(twiml);
  }

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: "You are a reflective journal bot. Respond warmly, thoughtfully, and guide the user through self-reflection.",
      },
      {
        role: "user",
        content: speechResult,  // <-- This must be a string, no null!
      },
    ],
  });

  const botResponse = completion.choices[0].message.content;

  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
    <Response>
      <Say voice="Polly.Joanna">${botResponse}</Say>
      <Pause length="1"/>
      <Say>Would you like to continue reflecting?</Say>
      <Gather input="speech" action="/api/index" method="POST" timeout="5"/>
    </Response>`;

  return res.setHeader("Content-Type", "application/xml").status(200).send(twiml);
};
