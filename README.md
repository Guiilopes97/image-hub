# Image Hub

Uma aplicação web moderna em React + TypeScript para gerenciamento de imagens com autenticação baseada em CPF (sem expor CPF no Supabase). O projeto utiliza um identificador derivado do CPF (userId) e Edge Functions para proteger requisições e links públicos.

## 🚀 Visão Geral

O Image Hub é uma aplicação de página única (SPA) que permite aos usuários gerenciar suas imagens de forma segura e isolada. A característica principal é o sistema de autenticação baseado em CPF, oferecendo uma experiência única e personalizada para cada usuário.

## ✨ Funcionalidades Principais

### 🔐 Autenticação por CPF (sem expor CPF)
- Tela de login com campo de CPF formatado (000.000.000-00)
- Validação completa de CPF com verificação de dígitos verificadores
- Geração de `userId` determinístico a partir do hash do CPF (client-side)
- Chamada de Edge Function (`auth-user`) que recebe apenas o hash (não o CPF)
- Persistência de sessão no LocalStorage (CPF local + `userId` público)
- Área isolada por usuário usando `userId` no Storage (não usa CPF)

### 📤 Upload de Imagens
- **Drag-and-drop**: Arraste e solte imagens diretamente na área de upload
- **Upload múltiplo**: Até 10 imagens por vez
- **Compressão automática**: Redução de tamanho mantendo qualidade
  - Formato: WebP (com fallback para JPEG)
  - Tamanho máximo: 2MB após compressão
  - Resolução máxima: 2048px
  - Qualidade: 90%
- **Upload paralelo**: Todas as imagens são enviadas simultaneamente para maior velocidade
- **Barra de progresso**: Acompanhe o upload em tempo real com porcentagem
- **Limites inteligentes**: 
  - Máximo de 50 imagens por usuário
  - Máximo de 10MB de armazenamento por usuário
  - Verificação automática antes e durante o upload

### 🖼️ Galeria de Imagens
- **Grid responsivo**: Adapta-se a diferentes tamanhos de tela (1 a 5 colunas)
- **Paginação**: Navegação por páginas com opções de 10, 20, 30, 40 ou 50 imagens por página
- **Miniaturas otimizadas**: Thumbnails de 400x300px para carregamento rápido
- **Links únicos**: Cada imagem possui um link único e compartilhável
- **Funcionalidades por imagem**:
  - Copiar link único
  - Abrir em nova guia
  - Excluir individual
- **Seleção múltipla**: 
  - Selecione várias imagens com checkboxes
  - Exclusão em massa com uma única requisição
  - Selecionar página inteira
- **Informações de uso**: Visualize quantidade de imagens e espaço utilizado em tempo real

### 🔗 Links Únicos (sem expor paths)
- Cada imagem recebe um `uniqueId` (base64 determinístico)
- Acesso público sem necessidade de autenticação
- Visualizador dedicado em tela cheia
- Entrega via Edge Function (`image-proxy`) que busca o arquivo interno e retorna o binário (o path real não é exposto)

### 🎨 Interface e Experiência
- **Dark Mode**: Suporte completo a tema claro/escuro com detecção automática de preferência do sistema
- **Design responsivo**: Funciona perfeitamente em desktop, tablet e mobile
- **Feedback visual**: Mensagens claras durante todas as operações
- **Performance otimizada**:
  - Cache inteligente para reduzir requisições
  - Deduplicação de requisições simultâneas
  - Lazy loading de imagens

## 🛠️ Tecnologias Utilizadas

- **React 19.2** - Biblioteca JavaScript para construção de interfaces
- **TypeScript** - Superset do JavaScript com tipagem estática
- **Tailwind CSS 3.4** - Framework CSS utility-first
- **Supabase Storage** - Armazenamento de imagens na nuvem
- **Supabase Edge Functions** - Autenticação por hash e proxy seguro de imagens
- **React Router DOM** - Roteamento de páginas
- **browser-image-compression** - Compressão de imagens no cliente
- **React Context API** - Gerenciamento de estado global (Auth e Theme)

## 📁 Estrutura do Projeto

```
src/
├── components/              # Componentes React
│   ├── Dashboard.tsx        # Painel principal autenticado
│   ├── Login.tsx           # Tela de login
│   ├── ImageUploader.tsx   # Componente de upload com limites
│   ├── ImageGallery.tsx    # Galeria com paginação e seleção múltipla
│   └── ImageViewer.tsx     # Visualizador de imagens
├── config/                 # Configurações
│   └── supabase.ts         # Cliente do Supabase
├── contexts/               # Contextos React
│   ├── AuthContext.tsx     # Contexto de autenticação
│   └── ThemeContext.tsx    # Contexto de tema (dark/light)
├── services/               # Serviços
│   └── imageService.ts     # Serviço de gerenciamento de imagens
│                            # (upload, listagem, exclusão, compressão, cache)
├── utils/                  # Funções utilitárias
│   ├── cpf.ts              # Validação e formatação de CPF
│   └── userMapping.ts      # Hash de CPF e geração de userId
├── App.tsx                 # Componente raiz com rotas
└── index.tsx               # Ponto de entrada

supabase/
└── functions/
    ├── auth-user/          # Edge Function: autenticação por hash CPF
    │   └── index.ts
    └── image-proxy/        # Edge Function: proxy seguro de imagens públicas
        └── index.ts
```

## ⚙️ Configuração e Instalação

### Pré-requisitos

1. **Node.js** (versão 18 ou superior)
2. **Conta no Supabase** com um projeto criado

### Configuração do Supabase

1. **Criar bucket de storage**:
   - Acesse Storage no seu projeto Supabase
   - Crie um bucket chamado `images`
   - Configure como público se desejar acesso público às imagens

2. **Criar arquivo .env** na raiz do projeto:
```env
REACT_APP_SUPABASE_URL=https://seu-projeto.supabase.co
REACT_APP_SUPABASE_ANON_KEY=sua-chave-anon-key
```

3. **Criar tabelas e políticas (SQL)**

Execute no SQL Editor do Supabase o script:

```
supabase_migration.sql
```

Ele cria as tabelas:
- `users` (mapeia `cpf_hash` → `user_id`)
- `image_links` (mapeia `unique_id` → `file_path`)

E habilita as políticas (RLS) adequadas para leitura pública de links e operação via funções.

4. **Deploy das Edge Functions**

Configure as secrets e faça o deploy:

```bash
supabase functions deploy auth-user
supabase functions deploy image-proxy
```

No Dashboard → Edge Functions → Secrets, adicione:
- `SUPABASE_SERVICE_ROLE_KEY` (Service Role Key do projeto)

### Instalação

```bash
# Instalar dependências
npm install

# Iniciar servidor de desenvolvimento
npm start
```

Abra [http://localhost:3000](http://localhost:3000) para ver a aplicação no navegador.

### Build para Produção

```bash
npm run build
```

O build será gerado na pasta `build/`.

## 📖 Como Usar

### 1. Login
- Acesse a aplicação no navegador
- Digite seu CPF (000.000.000-00)
- O cliente gera `userId` via hash e autentica na Edge Function `auth-user`
- Ao sucesso, você é redirecionado para o Dashboard

### 2. Upload de Imagens
- **Método 1**: Arraste e solte imagens na área de upload
- **Método 2**: Clique na área para abrir o seletor de arquivos
- Selecione até 10 imagens por vez
- As imagens serão comprimidas automaticamente antes do upload
- Acompanhe o progresso pela barra de progresso

### 3. Gerenciar Imagens na Galeria
- Visualize todas as suas imagens em formato de grid
- Use a paginação para navegar entre páginas
- Ajuste a quantidade de imagens por página (10-50)
- Para uma imagem:
  - Clique para abrir em nova guia
  - Use o botão de copiar para obter o link único
  - Use o botão de excluir para remover
- Para múltiplas imagens:
  - Selecione usando os checkboxes
  - Use "Selecionar página" para selecionar todas da página atual
  - Clique em "Excluir selecionadas" para remover em massa

### 4. Visualizar Imagem (link público)
- Use o link único `/image/{uniqueId}`
- A página chama a Edge Function `image-proxy` com `uniqueId`
- A função retorna o binário da imagem (o path real `userId/filename` não é exposto)

## 🔒 Limites e Recursos

### Limites por Usuário
- **Quantidade máxima**: 50 imagens
- **Espaço máximo**: 10MB de armazenamento
- **Upload por vez**: Máximo de 10 imagens
- **Tamanho por imagem**: Máximo 2MB após compressão

### Otimizações
- **Compressão automática**: Reduz tamanho mantendo qualidade
- **Cache inteligente**: Reduz requisições duplicadas
- **Upload paralelo**: Envia múltiplas imagens simultaneamente
- **Exclusão em massa**: Remove múltiplas imagens em uma única requisição
- **Lazy loading**: Carrega imagens sob demanda

## 🎯 Funcionalidades Detalhadas

### Sistema de Limites
- Verificação antes do upload para evitar exceder limites
- Cálculo baseado no tamanho final após compressão
- Feedback claro quando limites são atingidos
- Informações de uso sempre visíveis

### Compressão de Imagens
- Conversão automática para WebP quando possível
- Mantém JPEGs pequenos e otimizados
- Reduz dimensões grandes automaticamente
- Se a compressão falhar, a imagem não é enviada (proteção de qualidade)

### Links Únicos
- `uniqueId` determinístico (base64 de `userId-filename`)
- Não expõe CPF nem caminhos internos
- Acesso público sem autenticação via Edge Function
- Persistência no localStorage como backup (mapeamento auxiliar)

### Performance
- Cache de 5 segundos para contagens de imagens
- Cache de 2 segundos para listagens paginadas
- Deduplicação de requisições simultâneas
- Requisições paralelas quando apropriado

## 🐛 Troubleshooting

### Problemas Comuns

**Imagens não aparecem na galeria:**
- Verifique a conexão com o Supabase
- Confirme que o bucket está configurado corretamente
- Verifique os logs do console do navegador

**Upload falha:**
- Verifique se não excedeu os limites (50 imagens ou 10MB)
- Confirme que as imagens são válidas
- Verifique sua conexão com a internet

**Limite atingido:**
- Exclua algumas imagens antigas
- O limite é de 50 imagens OU 10MB (o que ocorrer primeiro)

## 📝 Scripts Disponíveis

```bash
# Desenvolvimento
npm start

# Build de produção
npm run build

# Testes
npm test

# Análise de bundle
npm run build && npx serve -s build
```

## 🔐 Segurança

- CPF é validado e transformado em hash (client-side); o CPF nunca é enviado ao Supabase
- `userId` (derivado do hash) é usado para isolar diretórios no Storage
- Edge Function `image-proxy` evita exposição de caminhos e oculta identifiers em requisições públicas
- Links únicos são determinísticos e não expõem CPF
- Limites por usuário (50 imagens ou 10MB) calculados com base no tamanho pós-compressão

## 📊 Requisitos Técnicos

- Navegadores modernos (Chrome, Firefox, Safari, Edge)
- JavaScript habilitado
- Conexão com internet para acessar o Supabase
- Tela com resolução mínima recomendada: 320px (mobile)

## 🤝 Contribuindo

Este é um projeto privado, mas sinta-se à vontade para fazer fork e adaptar para suas necessidades.

## 📄 Licença

Este projeto é privado e de uso interno.

---

**Desenvolvido com ❤️ usando React e TypeScript**

---

Notas de migração e proteção de CPF: consulte `MIGRACAO_PROTECAO_CPF.md`.
