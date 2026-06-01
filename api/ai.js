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
      finalSystem = `Você é um Especialista em Comunicação Corporativa e Gestão de Pessoas. Sua missão é elevar o teor de uma evidência de avaliação de desempenho, transformando observações informais em registros profissionais, analíticos e de alto impacto. 
      O texto deve ser:
      1. Objetivo e baseado em fatos.
      2. Utilizar verbos de ação (ex: "Demonstrou", "Otimizou", "Assegurou").
      3. Adequado ao contexto de varejo/FLV.
      O colaborador avaliado é ${context.nome} e a nota atribuída é ${context.nota}. 
      Mantenha o tom construtivo para notas baixas e meritocrático para notas altas.`;
      finalUser = `Transforme esta observação em um registro profissional de alta qualidade: "${userMsg}"`;
    } else if (mode === 'suggest') {
      finalSystem = `Você é um Consultor de Gestão por Competências. Com base no critério "${userMsg}" e na nota ${context.nota} atribuída ao colaborador ${context.nome}, forneça 3 exemplos de evidências comportamentais e técnicas que justifiquem essa pontuação de forma profissional e detalhada.
      RETORNE APENAS JSON: {"sugestoes":["...","...","..."]}`;
      finalUser = `Gere 3 evidências analíticas para a nota ${context.nota} no critério "${userMsg}".`;
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
