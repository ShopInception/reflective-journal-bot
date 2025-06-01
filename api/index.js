import { OpenAI } from "openai";
import axios from "axios";
import { put } from "@vercel/blob";  // Upload file to Vercel Blob

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const elevenlabsApiKey = process.env.ELEVENLABS_API_KEY;
const voiceId = "pFZP5JQG7iQjIQuC4Bku";  // Replace with your Voice ID

export default async (req, res) => {
  try {
    if (req.method !== "POST") {
      return res.status(405).send("Method Not Allowed");
    }

    const speechResult = req.body.SpeechResult;

    if (!speechResult) {
      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
      <Response>
        <Say voice="Polly.Joanna">I'm sorry, I didn't catch that. Could you please repeat?</Say>
        <Gather input="speech" action="/api/index" method="POST" timeout="5"/>
      </Response>`;
      return res.setHeader("Content-Type", "application/xml").status(200).send(twiml);
    }

    // GPT-4o generates response
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `
You are a friendly and empathetic reflective journal companion. 
Your role is to actively listen to the user's reflections and respond with thoughtful, conversational follow-up questions that encourage deeper insight and personal growth. 
Keep your tone warm, supportive, and natural — like a trusted friend or mentor.
Responses should be concise and end with a gentle open-ended question to keep the conversation flowing.
Avoid sounding robotic or overly formal — aim for real human connection.
          `,
        },
        {
          role: "user",
          content: speechResult,
        },
      ],
    });

    const botResponse = completion.choices[0].message.content;

    // ElevenLabs - synthesize voice
    const audioResponse = await axios.post(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        text: botResponse,
        model_id: "eleven_monolingual_v1",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75
        }
      },
      {
        headers: {
          "xi-api-key": elevenlabsApiKey,
          "Content-Type": "application/json"
        },
        responseType: "arraybuffer"
      }
    );

    // Upload audio to Vercel Blob
    const fileName = `journal-audio-${Date.now()}.mp3`;
    const blob = await put(fileName, audioResponse.data, {
      access: "public",
      contentType: "audio/mpeg",
    });

    // Return TwiML
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
      <Response>
        <Play>${blob.url}</Play>
        <Pause length="1"/>
        <Say voice="Polly.Joanna">Would you like to continue reflecting?</Say>
        <Gather input="speech" action="/api/index" method="POST" timeout="5"/>
      </Response>`;

    return res.setHeader("Content-Type", "application/xml").status(200).send(twiml);
  } catch (error) {
    console.error("Error in function:", error);
    return res.status(500).send("Internal Server Error");
  }
};
