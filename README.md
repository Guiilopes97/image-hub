# Image Hub

Uma aplicação web moderna desenvolvida em React com TypeScript para gerenciamento de imagens com autenticação por CPF.

## Visão Geral

O Image Hub é uma aplicação de página única (SPA) que permite aos usuários gerenciar suas imagens de forma segura e isolada. A característica principal é o sistema de autenticação baseado em CPF, oferecendo uma experiência única e personalizada para cada usuário.

## Tecnologias Utilizadas

- **React 19.2** - Biblioteca JavaScript para construção de interfaces
- **TypeScript** - Superset do JavaScript com tipagem estática
- **Tailwind CSS 3.4** - Framework CSS utility-first
- **Supabase** - Backend-as-a-Service para armazenamento de imagens
- **React Context API** - Gerenciamento de estado global
- **LocalStorage** - Persistência de sessão no navegador

## Funcionalidades

### 🔐 Autenticação por CPF
- Tela de login com campo de CPF formatado (000.000.000-00)
- Validação completa de CPF com verificação de dígitos verificadores
- Máscara automática de formatação durante a digitação
- Persistência de sessão no LocalStorage
- Área isolada por usuário

### 🖼️ Gerenciamento de Imagens
- **Uploader de Imagens**: Componente interativo com suporte a drag-and-drop
- **Galeria de Imagens**: Grid responsivo para visualização (preparado para integração futura)
- Design moderno e responsivo
- Feedback visual durante interações

### 🎨 Interface Responsiva
- Design adaptável para diferentes tamanhos de tela
- Gradientes modernos e transições suaves
- Experiência de usuário intuitiva

## Estrutura do Projeto

```
src/
├── components/          # Componentes React
│   ├── Dashboard.tsx    # Painel principal autenticado
│   ├── Login.tsx        # Tela de login
│   ├ufficient── ImageUploader.tsx # Componente de upload
│   └── ImageGallery.tsx  # Componente de galeria
├── config/             # Configurações
│   └── supabase.ts     # Cliente do Supabase
├── contexts/            # Contextos React
│   └── AuthContext.tsлота-  # Contexto de autenticação
├── services/           # Serviços
│   └── imageService.ts molded# Serviço de gerenciamento de imagens
├── utils/               # Funções utilitárias
│   └── cpf.ts          # Validação e formatação de CPF
├── App.tsx             # Componente raiz
└── index.tsx           # Ponto de entrada
```

## Como Executar

### Pré-requisitos

1. **Configurar Supabase** - Siga o guia em [SUPABASE_SETUP.md](./SUPABASE_SETUP.md)
2. **Criar arquivo .env** com as credenciais do Supabase:
```env
REACT_APP_SUPABASE_URL=https://seu-projeto.supabase.co
REACT_APP_SUPABASE_ANON_KEY=sua-chave-anon-key
```

### Instalação

```bash
npm install
```

### Desenvolvimento

```bash
npm start
```

Abra [http://localhost:3000](http://localhost:3000) para ver a aplicação no navegador.

### Build para Produção

```bash
npm run build
```

### Executar Testes

```bash
npm test
```

## Uso

1. **Acesse a aplicação** através do navegador
2. **Digite seu CPF** na tela de login (a máscara será aplicada automaticamente)
3. **Clique em "Entrar"** após inserir um CPF válido
4. **Explore o painel**:
   - Faça upload de imagens arrastando e soltando ou clicando para selecionar
   - Visualize sua galeria (quando houver imagens)
5. **Clique em "Sair"** para fazer logout

## Funcionalidades Implementadas

✅ **Upload de Imagens**
- Suporte para múltiplas imagens simultâneas
- Drag-and-drop funcional
- Seleção de arquivos por clique
- Feedback visual durante upload

✅ **Galeria de Imagens**
- Exibição de todas as imagens do usuário
- Grid responsivo
- Botão de atualização manual
- Exclusão de imagens com confirmação

✅ **Armazenamento Seguro**
- Todas as imagens são armazenadas no Supabase
- Organização por CPF (cada usuário tem sua pasta isolada)
- URLs públicas para acesso seguro

## Observações Importantes

- O CPF é validado com cálculo de dígitos verificadores
- A sessão persiste mesmo após fechar o navegador
- As imagens são armazenadas no Supabase Storage
- Cada usuário (CPF) tem sua própria pasta isolada de imagens

## Configuração do Supabase

Para que a aplicação funcione completamente, é necessário configurar o Supabase. Consulte o arquivo [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) para instruções detalhadas.
