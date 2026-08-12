// Простой сервер для Telegram Mini App с нейросетью (Claude API)
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

// Раздаём фронтенд (папку public) как статику
app.use(express.static(path.join(__dirname, 'public')));

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

if (!GROQ_API_KEY) {
  console.warn('⚠️  GROQ_API_KEY не задан! Добавьте его в файл .env');
}

// Главный endpoint, который вызывает фронтенд
app.post('/api/chat', async (req, res) => {
  try {
    const { messages } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Нужно передать массив messages' });
    }

    // Groq использует формат, совместимый с OpenAI: системный промпт — это
    // просто первое сообщение с ролью "system" в общем массиве messages.
    const groqMessages = [
      {
        role: 'system',
        content: 'Ты дружелюбный ассистент внутри Telegram Mini App. Отвечай кратко, понятно и по делу на русском языке (если пользователь не пишет на другом языке — тогда отвечай на его языке).',
      },
      ...messages,
    ];

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1024,
        messages: groqMessages,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Groq API error:', data);
      return res.status(response.status).json({ error: data.error?.message || 'Ошибка нейросети' });
    }

    const reply = data.choices?.[0]?.message?.content || '';

    res.json({ reply });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// health-check, удобно для Render/Railway
app.get('/health', (req, res) => res.send('ok'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Сервер запущен: http://localhost:${PORT}`);
});
