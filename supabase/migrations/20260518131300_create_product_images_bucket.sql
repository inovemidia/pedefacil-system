/*
  # Criar bucket product-images no Supabase Storage

  ## O que faz
  - Cria o bucket público "product-images" para armazenar imagens de produtos
  - Habilita acesso público de leitura (qualquer pessoa pode ver imagens do cardápio)
  - Admins autenticados podem fazer upload, atualizar e deletar imagens
  - Limite de 5 MB por arquivo
  - Tipos aceitos: image/jpeg, image/png, image/webp

  ## Segurança
  - Leitura pública (necessário para exibir imagens no cardápio para clientes)
  - Escrita restrita a admins (role = 'admin' na tabela profiles)
*/

-- Criar bucket público para imagens de produtos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images',
  'product-images',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

-- Leitura pública: qualquer pessoa pode ver imagens do cardápio
CREATE POLICY "Public read product images"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'product-images');

-- Upload: somente admins autenticados
CREATE POLICY "Admins can upload product images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'product-images'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

-- Atualizar: somente admins
CREATE POLICY "Admins can update product images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'product-images'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

-- Deletar: somente admins
CREATE POLICY "Admins can delete product images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'product-images'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );
