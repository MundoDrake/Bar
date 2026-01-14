import type { ProductWithStock, StockMovement } from '../types/database'

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY

interface GeminiMessage {
    role: 'user' | 'model'
    parts: { text: string }[]
}

interface ChatContext {
    products: ProductWithStock[]
    movements: StockMovement[]
}

// Build context prompt with stock data
function buildContextPrompt(context: ChatContext): string {
    const productsList = context.products.map(p =>
        `- ${p.name}: ${p.stock?.quantity ?? 0} ${p.unit} (categoria: ${p.category}, mínimo: ${p.min_stock_level})`
    ).join('\n')

    const recentMovements = context.movements.slice(0, 10).map(m =>
        `- ${m.type}: ${m.quantity} de ${m.product_id} em ${new Date(m.created_at).toLocaleDateString('pt-BR')}`
    ).join('\n')

    return `Você é o assistente inteligente do Bar Stock Manager, um sistema de gestão de estoque para bares.

Dados atuais do estoque:
${productsList || 'Nenhum produto cadastrado.'}

Últimas movimentações:
${recentMovements || 'Nenhuma movimentação registrada.'}

Responda às perguntas do usuário sobre o estoque de forma concisa e útil. 
Se perguntarem sobre quantidades, use os dados acima.
Se for uma pergunta genérica, responda de forma amigável.
Responda sempre em português brasileiro.`
}

// Send message to Gemini API
export async function sendMessageToGemini(
    userMessage: string,
    context: ChatContext,
    history: GeminiMessage[] = []
): Promise<string> {
    if (!GEMINI_API_KEY) {
        return 'IA não configurada. Adicione VITE_GEMINI_API_KEY no arquivo .env'
    }

    const systemContext = buildContextPrompt(context)

    const contents = [
        {
            role: 'user',
            parts: [{ text: systemContext }],
        },
        {
            role: 'model',
            parts: [{ text: 'Entendido! Estou pronto para ajudar com o estoque do bar. Como posso ajudar?' }],
        },
        ...history,
        {
            role: 'user',
            parts: [{ text: userMessage }],
        },
    ]

    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents,
                    generationConfig: {
                        temperature: 0.7,
                        maxOutputTokens: 1024,
                    },
                }),
            }
        )

        if (!response.ok) {
            const error = await response.json()
            console.error('Gemini API error:', error)
            return 'Desculpe, ocorreu um erro ao processar sua pergunta. Tente novamente.'
        }

        const data = await response.json()
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text

        if (!text) {
            return 'Não consegui gerar uma resposta. Tente reformular sua pergunta.'
        }

        return text
    } catch (error) {
        console.error('Error calling Gemini:', error)
        return 'Erro de conexão com a IA. Verifique sua internet e tente novamente.'
    }
}

// Generate stock replenishment suggestions
export async function generateReplenishmentSuggestions(
    context: ChatContext
): Promise<string> {
    const prompt = `Analise o estoque atual e as movimentações recentes. 
Sugira quais produtos devem ser repostos e em que quantidade, considerando:
1. Produtos com estoque abaixo do mínimo
2. Padrões de consumo baseados nas movimentações
3. Previsão para os próximos dias

Formate a resposta como uma lista clara com quantidades sugeridas.`

    return sendMessageToGemini(prompt, context)
}

// Generate demand prediction
export async function generateDemandPrediction(
    context: ChatContext
): Promise<string> {
    const prompt = `Baseado no histórico de movimentações, faça uma análise preditiva:
1. Quais produtos têm maior consumo?
2. Existe algum padrão de consumo (dias da semana, tendências)?
3. Quais produtos podem precisar de reposição nos próximos 7 dias?

Seja conciso e prático nas sugestões.`

    return sendMessageToGemini(prompt, context)
}
