# 📦 Configuração do Supabase Storage para Avatares

Este guia explica como configurar o Supabase Storage para permitir upload de fotos de agentes.

## 📋 Passo 1: Criar Bucket no Supabase

1. Acesse o painel do Supabase: https://supabase.com/dashboard
2. Selecione seu projeto
3. Vá em **Storage** no menu lateral
4. Clique em **"New bucket"**
5. Configure:
   - **Name**: `avatars`
   - **Public bucket**: ✅ **Marcar como público** (para que as imagens sejam acessíveis via URL pública)
6. Clique em **"Create bucket"**

## 🔒 Passo 2: Configurar Políticas de Acesso

1. No bucket `avatars`, vá em **"Policies"**
2. Clique em **"New Policy"**
3. Selecione **"Create a policy from scratch"**
4. Configure:

### Política para Upload (INSERT):
- **Policy name**: `Allow public uploads`
- **Allowed operation**: `INSERT`
- **Policy definition**: 
  ```sql
  true
  ```
- **With check expression**:
  ```sql
  true
  ```

### Política para Leitura (SELECT):
- **Policy name**: `Allow public reads`
- **Allowed operation**: `SELECT`
- **Policy definition**: 
  ```sql
  true
  ```

### Política para Atualização (UPDATE):
- **Policy name**: `Allow public updates`
- **Allowed operation**: `UPDATE`
- **Policy definition**: 
  ```sql
  true
  ```

### Política para Deleção (DELETE):
- **Policy name**: `Allow public deletes`
- **Allowed operation**: `DELETE`
- **Policy definition**: 
  ```sql
  true
  ```

**Alternativa rápida (via SQL):**

Execute no SQL Editor do Supabase:

```sql
-- Cria políticas para o bucket avatars
CREATE POLICY "Allow public uploads"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "Allow public reads"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'avatars');

CREATE POLICY "Allow public updates"
ON storage.objects
FOR UPDATE
TO public
USING (bucket_id = 'avatars');

CREATE POLICY "Allow public deletes"
ON storage.objects
FOR DELETE
TO public
USING (bucket_id = 'avatars');
```

## ✅ Verificação

Após configurar, teste fazendo upload de uma foto no CRUD de agentes. Se funcionar, você verá a imagem sendo exibida no preview e salva no banco de dados.

## 🔒 Segurança (Opcional - Para Produção)

Para maior segurança em produção, você pode:

1. **Restringir uploads apenas para usuários autenticados**:
   - Modifique as políticas para verificar autenticação
   - Use `auth.uid()` nas políticas

2. **Limitar tamanho de arquivo**:
   - Configure limites no Supabase Storage
   - O código já valida 5MB no frontend

3. **Validar tipos de arquivo**:
   - O código já valida apenas imagens
   - Você pode adicionar validação adicional no backend

