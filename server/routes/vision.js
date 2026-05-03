const express = require('express');
const OpenAI = require('openai');
const router = express.Router();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// POST /api/vision/detect-obstacles
// Body: { image: "data:image/jpeg;base64,..." }
router.post('/detect-obstacles', async (req, res) => {
  const { image } = req.body;

  if (!image) {
    return res.status(400).json({ error: 'image (base64) is required' });
  }

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are an obstacle detection assistant helping visually impaired users navigate safely.
Analyze the image and respond with a JSON object in this exact format:
{
  "hasObstacle": true/false,
  "obstacleType": "description of obstacle or null",
  "severity": "none" | "low" | "medium" | "high",
  "action": "short instruction for the user (e.g. 'Step slightly to the right', 'Stop, wall ahead', 'Path is clear')",
  "distance": "estimated distance like 'very close', '1-2 meters', 'far away' or null"
}
Be concise. The action field will be read aloud to the user.`,
        },
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: { url: image, detail: 'low' },
            },
            {
              type: 'text',
              text: 'Detect any obstacles in my path. Respond only with the JSON object.',
            },
          ],
        },
      ],
      max_tokens: 200,
      response_format: { type: 'json_object' },
    });

    const result = JSON.parse(response.choices[0].message.content);
    res.json(result);
  } catch (err) {
    console.error('Vision API error:', err.message);
    res.status(500).json({ error: 'Failed to analyze image' });
  }
});

module.exports = router;
