# Como Aplicar a Migração do Banco de Dados

## Problema Resolvido
Este migration adiciona a função `register_stock_movement` que estava faltando no banco de dados, causando o erro:
```
"Could not find the function public.register_stock_movement(...) in the schema cache"
```

## Como Aplicar

### Opção 1: Via Dashboard do Supabase (Recomendado)

1. Acesse o [Dashboard do Supabase](https://app.supabase.com)
2. Selecione seu projeto
3. Vá em **SQL Editor** no menu lateral
4. Clique em **New Query**
5. Copie e cole o conteúdo do arquivo `migrations/002_add_register_stock_movement_function.sql`
6. Clique em **Run** (ou pressione Ctrl/Cmd + Enter)
7. Verifique se a mensagem de sucesso aparece

### Opção 2: Via Supabase CLI (Se instalado)

```bash
# No diretório do projeto
npx supabase db push
```

### Verificar se funcionou

Para verificar se a função foi criada corretamente, execute esta query no SQL Editor:

```sql
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name = 'register_stock_movement';
```

Você deve ver um resultado mostrando a função.

## Testando

Após aplicar a migração:

1. Vá para a página de Produtos no app
2. Tente adicionar uma movimentação de estoque (entrada/saída)
3. O erro deve ter desaparecido e a movimentação deve ser registrada com sucesso

## O que a Função Faz

A função `register_stock_movement` faz o seguinte de forma atômica:

1. **Registra a movimentação** na tabela `stock_movements`
2. **Atualiza o estoque** na tabela `stock` baseado no tipo:
   - `entrada`: adiciona a quantidade
   - `saida`: subtrai a quantidade
   - `perda`: subtrai a quantidade
   - `ajuste`: adiciona ou subtrai baseado no valor

Isso garante que o histórico e o estoque atual fiquem sempre sincronizados.
