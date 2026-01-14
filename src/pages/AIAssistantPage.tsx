import { useState, FormEvent, useRef, useEffect } from 'react'
import { useStock, useMovements } from '../hooks/useStock'
import {
    sendMessageToGemini,
    generateReplenishmentSuggestions,
    generateDemandPrediction
} from '../services/aiService'

interface Message {
    id: string
    role: 'user' | 'assistant'
    content: string
    timestamp: Date
}

export function AIAssistantPage() {
    const [messages, setMessages] = useState<Message[]>([
        {
            id: '1',
            role: 'assistant',
            content: 'Olá! 👋 Sou o assistente inteligente do Bar Stock Manager. Posso ajudar com perguntas sobre seu estoque, sugestões de reposição e análises. Como posso ajudar?',
            timestamp: new Date(),
        },
    ])
    const [input, setInput] = useState('')
    const [loading, setLoading] = useState(false)
    const messagesEndRef = useRef<HTMLDivElement>(null)

    const { stockItems } = useStock()
    const { movements } = useMovements()

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    useEffect(() => {
        scrollToBottom()
    }, [messages])

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault()
        if (!input.trim() || loading) return

        const userMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: input.trim(),
            timestamp: new Date(),
        }

        setMessages(prev => [...prev, userMessage])
        setInput('')
        setLoading(true)

        try {
            const response = await sendMessageToGemini(
                userMessage.content,
                { products: stockItems, movements },
                messages.slice(1).map(m => ({
                    role: m.role === 'user' ? 'user' : 'model',
                    parts: [{ text: m.content }],
                }))
            )

            const assistantMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: response,
                timestamp: new Date(),
            }

            setMessages(prev => [...prev, assistantMessage])
        } catch {
            setMessages(prev => [...prev, {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: 'Desculpe, ocorreu um erro. Tente novamente.',
                timestamp: new Date(),
            }])
        } finally {
            setLoading(false)
        }
    }

    const handleQuickAction = async (type: 'replenishment' | 'prediction') => {
        if (loading) return

        const actionMessage = type === 'replenishment'
            ? 'Me sugira quais produtos devo repor'
            : 'Faça uma análise preditiva do meu estoque'

        setMessages(prev => [...prev, {
            id: Date.now().toString(),
            role: 'user',
            content: actionMessage,
            timestamp: new Date(),
        }])

        setLoading(true)

        try {
            const response = type === 'replenishment'
                ? await generateReplenishmentSuggestions({ products: stockItems, movements })
                : await generateDemandPrediction({ products: stockItems, movements })

            setMessages(prev => [...prev, {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: response,
                timestamp: new Date(),
            }])
        } catch {
            setMessages(prev => [...prev, {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: 'Desculpe, ocorreu um erro ao processar a análise.',
                timestamp: new Date(),
            }])
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="page-container ai-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">🤖 Assistente IA</h1>
                    <p className="page-subtitle">Pergunte sobre seu estoque</p>
                </div>
            </div>

            <div className="ai-container">
                <div className="quick-actions">
                    <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleQuickAction('replenishment')}
                        disabled={loading}
                    >
                        💡 Sugerir Reposição
                    </button>
                    <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleQuickAction('prediction')}
                        disabled={loading}
                    >
                        📊 Análise Preditiva
                    </button>
                </div>

                <div className="chat-container">
                    <div className="messages-list">
                        {messages.map((message) => (
                            <div
                                key={message.id}
                                className={`message ${message.role === 'user' ? 'message-user' : 'message-assistant'}`}
                            >
                                <div className="message-content">
                                    {message.content}
                                </div>
                                <div className="message-time">
                                    {message.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                </div>
                            </div>
                        ))}
                        {loading && (
                            <div className="message message-assistant">
                                <div className="message-content typing">
                                    <span className="typing-dot"></span>
                                    <span className="typing-dot"></span>
                                    <span className="typing-dot"></span>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    <form className="chat-input-form" onSubmit={handleSubmit}>
                        <input
                            type="text"
                            className="form-input chat-input"
                            placeholder="Pergunte sobre seu estoque..."
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            disabled={loading}
                        />
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={loading || !input.trim()}
                        >
                            Enviar
                        </button>
                    </form>
                </div>
            </div>
        </div>
    )
}
