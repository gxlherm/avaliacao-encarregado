const OPENROUTER_KEY = process.env.OPENROUTER_KEY;

// Modelos de visão disponíveis (em ordem de preferência)
const VISION_MODELS = [
  'openai/gpt-4o',
  'openai/gpt-4o-mini',
];

const SYSTEM_PROMPT = `Você é um especialista em extração de dados de formulários físicos de "Avaliação Individual por Setor — Encarregado".
INSTRUÇÕES DE EXTRAÇÃO (MODELO REAL):
1. IDENTIFICAÇÃO (Página 1):
   - nome: Nome do colaborador (ex: "Bruno")
   - setor: Setor avaliado (ex: "FLV")
   - formador: Formador responsável (ex: "Noêmia")
   - semana: Período da semana (ex: "9 a 15/04")
   - data: Converter data manuscrita para YYYY-MM-DD (ex: "16/04/25" -> "2025-04-16")
2. COMPETÊNCIAS (Tabela 1 - Notas de 1 a 5):
   Mapeie as linhas para as seguintes chaves:
   - comunicacao: "Comunicação com equipe"
   - lideranca: "Postura de liderança"
   - decisao: "Tomada de decisão"
   - organizacao: "Organização e disciplina"
   - urgencia: "Senso de urgência"
   - emocional: "Inteligência emocional"
   - conflitos: "Resolução de conflitos"
   - resultado: "Responsabilidade pelos resultados"
   - influencia: "Influência positiva na equipe"
   - treinar: "Capacidade de treinar colegas"
3. PERFORMANCE (Tabela 2 - Notas de 1 a 5):
   Mapeie as linhas para as seguintes chaves:
   - dominio: "Domínio técnico do processo"
   - aprendiz: "Velocidade de aprendizagem"
   - rotina: "Organização da rotina"
   - perdas: "Atenção a perdas / qualidade"
   - equipe: "Relacionamento com equipe do setor"
   - orientar: "Capacidade de orientar colegas"
   - postura: "Postura para assumir o setor"

4. ANÁLISE E OBSERVAÇÕES:
   - fortes: Texto manuscrito em "Pontos Fortes"
   - melhoria: Texto manuscrito em "Pontos de Melhoria"
   - observacoes: Texto manuscrito em "Observações" ou recomendações finais.

RETORNE APENAS JSON válido, sem markdown, no formato:
{
  "nome": "",
  "setor": "",
  "formador": "",
  "semana": "",
  "data": "",
  "competencias": {
    "comunicacao": {"nota": 0, "evidencia": ""},
    "lideranca": {"nota": 0, "evidencia": ""},
    "decisao": {"nota": 0, "evidencia": ""},
    "organizacao": {"nota": 0, "evidencia": ""},
    "urgencia": {"nota": 0, "evidencia": ""},
    "emocional": {"nota": 0, "evidencia": ""},
    "conflitos": {"nota": 0, "evidencia": ""},
    "resultado": {"nota": 0, "evidencia": ""},
    "influencia": {"nota": 0, "evidencia": ""},
    "treinar": {"nota": 0, "evidencia": ""}
  },
  "performance": {
    "dominio": {"nota": 0, "evidencia": ""},
    "aprendiz": {"nota": 0, "evidencia": ""},
    "rotina": {"nota": 0, "evidencia": ""},
    "perdas": {"nota": 0, "evidencia": ""},
    "equipe": {"nota": 0, "evidencia": ""},
    "orientar": {"nota": 0, "evidencia": ""},
    "postura": {"nota": 0, "evidencia": ""}
  },
  "diagnostico": "chave",
  "proximosPassos": ["chave1", "chave2"],
  "fortes": "texto extraído",
  "melhoria": "texto extraído",
  "observacoes": "texto extraído"
}`;

async function tryModel(model, messages) {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENROUTER_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://avaliacao-encarregado.vercel.app',
      'X-Title': 'Avaliacao Encarregado OCR',
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: 1500,
      temperature: 0.1,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`${model} retornou ${response.status}: ${err}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error(`${model} retornou conteúdo vazio`);
  return { content, model };
}

function buildMessages(images) {
  const content = [
    { type: 'text', text: 'Extraia os dados deste formulário de avaliação. ' + (images.length > 1 ? `São ${images.length} imagens da mesma ficha (páginas diferentes).` : '') + ' Retorne APENAS JSON válido.' },
    ...images.map(b64 => ({
      type: 'image_url',
      image_url: { url: `data:image/jpeg;base64,${b64}`, detail: 'high' },
    })),
  ];
  return [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content },
  ];
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { image, images } = req.body;
    const imgs = images || (image ? [image] : []);

    if (!imgs.length) {
      return res.status(400).json({ error: 'Nenhuma imagem enviada' });
    }

    const messages = buildMessages(imgs);

    let result = null;
    let lastError = null;

    for (const model of VISION_MODELS) {
      try {
        result = await tryModel(model, messages);
        break;
      } catch (err) {
        console.error(`Falha no modelo ${model}:`, err.message);
        lastError = err;
      }
    }

    if (!result) {
      return res.status(502).json({
        error: 'Todos os modelos falharam',
        details: lastError?.message,
      });
    }

    // Parse JSON da resposta
    let extracted;
    try {
      const clean = result.content
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```$/, '')
        .trim();
      extracted = JSON.parse(clean);
    } catch {
      // Tenta extrair JSON embutido no texto
      const match = result.content.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          extracted = JSON.parse(match[0]);
        } catch {
          return res.status(422).json({
            error: 'Não foi possível interpretar a resposta da IA',
            raw: result.content,
          });
        }
      } else {
        return res.status(422).json({
          error: 'Resposta da IA não contém JSON válido',
          raw: result.content,
        });
      }
    }

    return res.status(200).json({
      extracted,
      model_used: result.model,
    });
  } catch (err) {
    console.error('OCR handler error:', err);
    return res.status(500).json({ error: err.message });
  }
}
