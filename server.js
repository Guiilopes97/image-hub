// Carregar variáveis de ambiente do arquivo .env
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';
const isDevelopment = !isProduction;

// Configuração CORS
app.use(cors());

// Configuração do Supabase
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Erro: Variáveis de ambiente não configuradas!');
  console.error('');
  console.error('📝 Crie um arquivo .env na raiz do projeto com:');
  console.error('   REACT_APP_SUPABASE_URL=https://seu-projeto.supabase.co');
  console.error('   REACT_APP_SUPABASE_ANON_KEY=sua-chave-anon-key');
  console.error('   SUPABASE_SERVICE_ROLE_KEY=sua-chave-service-role-key');
  console.error('');
  console.error('💡 Você pode encontrar essas chaves em:');
  console.error('   Dashboard do Supabase → Settings → API');
  console.error('');
  process.exit(1);
}

// Cliente Supabase com Service Role Key para acesso completo
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Rota para servir imagens via uniqueId
 * GET /image/:uniqueId
 */
app.get('/image/:uniqueId', async (req, res) => {
  try {
    const { uniqueId } = req.params;

    if (!uniqueId) {
      return res.status(400).json({ error: 'uniqueId é obrigatório' });
    }

    // Buscar file_path da tabela image_links usando unique_id
    const { data: linkData, error: linkError } = await supabaseAdmin
      .from('image_links')
      .select('file_path')
      .eq('unique_id', uniqueId)
      .single();

    if (linkError || !linkData || !linkData.file_path) {
      // Fallback: tentar decodificar do base64 (compatibilidade com links antigos)
      try {
        const decodedStr = Buffer.from(uniqueId.replace(/-/g, '/').replace(/_/g, '+'), 'base64').toString('utf-8');
        const parts = decodedStr.split('-');
        
        if (parts.length >= 2) {
          const identifier = parts[0];
          const filename = parts.slice(1).join('-');
          const filePath = `${identifier}/${filename}`;

          // Tentar baixar a imagem
          const { data: fileData, error: downloadError } = await supabaseAdmin.storage
            .from('images')
            .download(filePath);

          if (!downloadError && fileData) {
            const arrayBuffer = await fileData.arrayBuffer();
            const contentType = fileData.type || 'image/webp';
            
            res.setHeader('Content-Type', contentType);
            res.setHeader('Cache-Control', 'public, max-age=3600');
            return res.send(Buffer.from(arrayBuffer));
          }
        }
      } catch (error) {
        // Continuar para retornar erro 404
      }

      return res.status(404).json({ error: 'Imagem não encontrada' });
    }

    // Download da imagem do Storage
    const { data: fileData, error: downloadError } = await supabaseAdmin.storage
      .from('images')
      .download(linkData.file_path);

    if (downloadError || !fileData) {
      console.error('Erro ao fazer download:', downloadError);
      return res.status(500).json({ error: 'Erro ao carregar imagem' });
    }

    // Converter para Buffer e determinar content-type
    const arrayBuffer = await fileData.arrayBuffer();
    const contentType = fileData.type || 'image/webp';

    // Retornar a imagem com headers apropriados
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(Buffer.from(arrayBuffer));
  } catch (error) {
    console.error('Erro na rota /image:', error);
    res.status(500).json({ error: error.message || 'Erro interno do servidor' });
  }
});

// Rota de health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'image-server' });
});

// Servir arquivos estáticos do React
if (isProduction) {
  // Em produção: servir o build do React
  app.use(express.static(path.join(__dirname, 'build')));
  
  // Todas as rotas que não são /image/* ou /health devem servir o React
  app.get('*', (req, res) => {
    // Se não for rota de API, servir React
    if (!req.path.startsWith('/image') && !req.path.startsWith('/api') && req.path !== '/health') {
      res.sendFile(path.join(__dirname, 'build', 'index.html'));
    }
  });
  } else {
    // Em desenvolvimento: fazer proxy para o webpack dev server do React (porta 3001)
    const { createProxyMiddleware } = require('http-proxy-middleware');
    
    // Proxy para React dev server (exceto rotas de API)
    app.use(
      createProxyMiddleware({
        target: 'http://localhost:3001',
        changeOrigin: true,
        ws: true, // WebSocket support para hot reload
        logLevel: 'silent',
        // Todas as rotas exceto /image, /health e /api vão para o React
        filter: (pathname, req) => {
          return !pathname.startsWith('/image') && 
                 !pathname.startsWith('/health') && 
                 !pathname.startsWith('/api');
        }
      })
    );
  }

// Tratamento de erros não capturados
process.on('unhandledRejection', (error) => {
  console.error('Erro não tratado:', error);
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`✅ Servidor rodando na porta ${PORT}`);
  console.log(`📸 API de imagens: http://localhost:${PORT}/image/{uniqueId}`);
  console.log(`🔍 Health check: http://localhost:${PORT}/health`);
  if (isProduction) {
    console.log(`⚛️  React app: http://localhost:${PORT}`);
  } else {
    console.log(`⚛️  React app: http://localhost:${PORT}`);
    console.log(`   (Proxy para React dev server na porta 3001)`);
  }
}).on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`❌ Erro: Porta ${PORT} já está em uso.`);
    console.error(`   Tente parar outros processos ou usar uma porta diferente.`);
  } else {
    console.error('❌ Erro ao iniciar servidor:', error);
  }
  process.exit(1);
});

