# Image Hub

Uma aplicação web moderna desenvolvida em React com TypeScript para gerenciamento de imagens com autenticação por CPF.

## 🚀 Visão Geral

O Image Hub é uma aplicação de página única (SPA) que permite aos usuários gerenciar suas imagens de forma segura e isolada. A característica principal é o sistema de autenticação baseado em CPF, oferecendo uma experiência única e personalizada para cada usuário.

## ✨ Funcionalidades Principais

### 🔐 Autenticação por CPF
- Tela de login com campo de CPF formatado (000.000.000-00)
- Validação completa de CPF com verificação de dígitos verificadores
- Máscara automática de formatação durante a digitação
- Persistência de sessão no LocalStorage
- Área isolada por usuário

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
  - Máximo de 100 imagens por usuário
  - Máximo de 20MB de armazenamento por usuário
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

### 🔗 Links Únicos
- Cada imagem recebe um link único baseado em base64
- Acesso público sem necessidade de autenticação
- Visualizador de imagem dedicado em tela cheia
- URLs limpas sem expor CPF

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
│   └── cpf.ts              # Validação e formatação de CPF
├── App.tsx                 # Componente raiz com rotas
└── index.tsx               # Ponto de entrada
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
- Digite seu CPF no formato 000.000.000-00
- A máscara é aplicada automaticamente
- Clique em "Entrar" após inserir um CPF válido

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

### 4. Visualizar Imagem
- Use o link único compartilhado para acessar uma imagem
- A imagem será exibida em tela cheia
- Não é necessário estar autenticado para visualizar

## 🔒 Limites e Recursos

### Limites por Usuário
- **Quantidade máxima**: 100 imagens
- **Espaço máximo**: 20MB de armazenamento
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
- Geração determinística usando base64
- Não expõe CPF na URL
- Acesso público sem autenticação
- Persistência no localStorage como backup

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
- Verifique se não excedeu os limites (100 imagens ou 20MB)
- Confirme que as imagens são válidas
- Verifique sua conexão com a internet

**Limite atingido:**
- Exclua algumas imagens antigas
- O limite é de 100 imagens OU 20MB (o que ocorrer primeiro)

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

- CPF é validado antes do acesso
- Cada usuário tem acesso apenas às suas próprias imagens
- Links únicos são gerados de forma determinística mas não reversível facilmente
- Imagens são armazenadas de forma isolada por CPF
- Validação de limites no cliente e servidor

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
