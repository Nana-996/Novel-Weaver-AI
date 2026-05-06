const apiKey = "sk-2x0z1UYvrYyqu5tHS3YEUeR33h7X13AMW6lk0VLcQLpZUBha";

fetch('https://openrouter.ai/api/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`,
    'HTTP-Referer': 'http://localhost:3006',
    'X-Title': 'Novel Weaver'
  },
  body: JSON.stringify({
    model: "claude-opus-4-6",
    messages: [{ role: "user", content: "hello" }]
  })
}).then(res => res.text()).then(console.log).catch(console.error);
