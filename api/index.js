import axios from 'axios';

// Export API handler
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed');
    return;
  }

  try {
    // Capture the incoming speech text from Twilio (SpeechResult)
    const { SpeechResult } = req.body;

    if (!SpeechResult) {
      return res.status(400).send('No speech input provided.');
    }

    console.log('User said:', SpeechResult);

    // 🧠 Step 1: Send user speech to OpenAI (GPT) to generate a response
    const openaiResponse = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4', // or 'gpt-3.5-turbo' if you want cheaper/faster
        messages: [
          { role: 'system', content: 'You are a reflective journal assistant. Respond thoughtfully and encouragingly.' },
          { role: 'user', content: SpeechResult }
        ],
        temperature: 0.7
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const gptResponse = openaiResponse.data.choices[0].message.content.trim();
    console.log('GPT Response:', gptResponse);

    // 🗣️ Step 2: Send GPT response text to ElevenLabs to generate audio
    const voiceId = 'EXAVITQu4vr4xnSDxMaL'; // Rachel's Voice ID or your favorite
    
    const elevenLabsResponse = await axios.post(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        text: gptResponse,
        model_id: "eleven_monolingual_v1", // default English voice model
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75
        }
      },
      {
        headers: {
          "xi-api-key": process.env.ELEVEN_LABS_API_KEY,
          "Content-Type": "application/json"
        },
        responseType: 'arraybuffer'
      }
    );

    // 🛠️ Step 3: Return audio back to Twilio
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Disposition', 'inline');
    res.status(200).send(Buffer.from(elevenLabsResponse.data, 'binary'));

  } catch (error) {
    console.error('Error occurred:', error.message || error);
    res.status(500).send('Internal Server Error');
  }
}
