const OPENROUTER_KEY = process.env.OPENROUTER_KEY;

const MODELS = [
  'openai/gpt-4o-mini',
  'anthropic/claude-3-haiku',
];

async function tryModel(model, messages) {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENROUTER_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://avaliacao-encarregado.vercel.app',
      'X-Title': 'Avaliacao Encarregado AI',
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: 1000,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`${model} retornou ${response.status}: ${err}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error(`${model} retornou conteúdo vazio`);
  return content;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { systemPrompt, userMsg, mode, context } = req.body;
    
    let finalSystem = systemPrompt;
    let finalUser = userMsg;

    if (mode === 'refine') {
      finalSystem = `Você é um supervisor de loja experiente. Seu objetivo é refinar o texto de uma evidência de avaliação para torná-lo mais profissional, claro e direto, mantendo o sentido original. Use linguagem de chão de loja, mas bem escrita. O colaborador se chama ${context.nome} e a nota atribuída foi ${context.nota}.`;
      finalUser = `Refine este texto de evidência: "${userMsg}"`;
    } else if (mode === 'suggest') {
      finalSystem = `Você é um supervisor de loja. Dê 3 sugestões curtas e práticas de evidências para o critério "${userMsg}" baseadas na nota ${context.nota} para o colaborador ${context.nome}. RETORNE APENAS JSON: {"sugestoes":["...","...","..."]}`;
      finalUser = `Sugira 3 evidências curtas para a nota ${context.nota}.`;
    }

    const messages = [
      { role: 'system', content: finalSystem },
      { role: 'user', content: finalUser }
    ];

    let content = null;
    let lastError = null;

    for (const model of MODELS) {
      try {
        content = await tryModel(model, messages);
        break;
      } catch (err) {
        console.error(`Falha no modelo ${model}:`, err.message);
        lastError = err;
      }
    }

    if (!content) {
      return res.status(502).json({
        error: 'Todos os modelos falharam',
        details: lastError?.message,
      });
    }

    return res.status(200).json({ content });
  } catch (err) {
    console.error('AI handler error:', err);
    return res.status(500).json({ error: err.message });
  }
}
