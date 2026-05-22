# 🏢 Sistema de Agendamento - Sala de Reunião

Aplicação web completa para gerenciamento de agendamentos de sala de reunião, com calendário visual estilo Google Calendar, autenticação Firebase e sincronização em tempo real.

## ✨ Funcionalidades

### 📅 Calendário Visual
- **3 modos de visualização**: Dia, Semana e Mês
- Navegação intuitiva com botões Hoje/Anterior/Próximo
- **Swipe gestures** no mobile para navegar entre datas
- Eventos em blocos coloridos alternados (Azul, Verde, Laranja, Roxo, Vermelho, Cinza)
- Clique em horário vazio para criar agendamento
- Clique em evento para ver detalhes

### 🔐 Autenticação
- Login com e-mail e senha
- Cadastro de novos usuários
- Recuperação de senha
- Persistência de sessão (Lembrar-me)
- Perfis: **Admin** e **Usuário**

### 📝 Agendamentos
- Cadastro completo com todos os campos obrigatórios
- **Validações automáticas**:
  - Impede conflito de horários
  - Bloqueia agendamento no passado
  - Valida hora final > hora inicial
- Edição e exclusão (com permissões)
- Status: Ativo, Cancelado, Concluído

### 📊 Dashboard
- Cards de resumo em tempo real:
  - Agendamentos do dia
  - Próxima reunião
  - Status da sala (Livre/Ocupada)
  - Total do mês

### 🔍 Filtros
- Por data, solicitante, setor e status
- Filtros salvos no LocalStorage

### 📈 Relatórios (Admin)
- Exportação para **PDF** (impressão)
- Exportação para **Excel/CSV**
- Filtro por período

### 🎨 UI/UX
- Design **Mobile First** totalmente responsivo
- Tema **Claro/Escuro** com persistência
- Animações suaves e transições
- Toast notifications
- Loading states
- Ícones modernos (Font Awesome)

## 🚀 Tecnologias

| Tecnologia | Uso |
|------------|-----|
| HTML5 | Estrutura semântica |
| CSS3 | Estilos customizados, variáveis, Grid/Flexbox |
| JavaScript Vanilla | Lógica completa sem frameworks |
| Firebase Auth | Autenticação de usuários |
| Firestore | Banco de dados em tempo real |
| LocalStorage | Cache offline e preferências |

## 📁 Estrutura do Projeto

```
├── index.html          # Estrutura completa da aplicação
├── style.css           # Estilos responsivos e temas
├── app.js              # Lógica principal e Firebase
├── firebase-config.js  # Configuração do Firebase
└── README.md           # Este arquivo
```

## ⚙️ Configuração do Firebase

### 1. Criar Projeto no Firebase Console
1. Acesse [Firebase Console](https://console.firebase.google.com)
2. Clique em **"Adicionar projeto"**
3. Dê um nome ao projeto e siga as instruções

### 2. Registrar App Web
1. No projeto, clique no ícone **"</>"** (Web)
2. Dê um apelido ao app
3. **Copie as credenciais** (apiKey, authDomain, etc.)
4. Cole no arquivo `firebase-config.js`

### 3. Ativar Serviços
- **Authentication** > "Get started" > Ativar "Email/Password"
- **Firestore Database** > "Create database" > Modo "Start in production mode"

### 4. Configurar Regras de Segurança
No Firestore, vá em "Rules" e cole:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /usuarios/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    match /agendamentos/{bookingId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update, delete: if request.auth != null && 
        (resource.data.criadoPor == request.auth.uid || 
         get(/databases/$(database)/documents/usuarios/$(request.auth.uid)).data.perfil == 'admin');
    }
  }
}
```

### 5. Criar Primeiro Admin
Após o primeiro cadastro, altere o perfil no Firestore:
1. Firestore > "usuarios" > [ID do usuário]
2. Altere `perfil` de `"usuario"` para `"admin"`

## 🌐 Hospedagem

### Opção 1: Firebase Hosting (Recomendado)
```bash
npm install -g firebase-tools
firebase login
firebase init hosting
# Selecione o projeto, use "public" como pasta pública
firebase deploy
```

### Opção 2: Servidor Web Simples
```bash
# Python 3
python -m http.server 8000

# Node.js
npx serve .

# PHP
php -S localhost:8000
```

### Opção 3: GitHub Pages
1. Faça upload dos arquivos para um repositório GitHub
2. Vá em Settings > Pages
3. Selecione a branch principal

## 📱 Compatibilidade

| Plataforma | Suporte |
|------------|---------|
| Chrome/Edge | ✅ Completo |
| Firefox | ✅ Completo |
| Safari | ✅ Completo |
| Android Chrome | ✅ Completo |
| iOS Safari | ✅ Completo |
| Tablet | ✅ Adaptado |

## 🔧 Personalização

### Cores dos Eventos
Edite no `style.css`:
```css
--event-blue: #3b82f6;
--event-green: #10b981;
--event-orange: #f97316;
--event-purple: #8b5cf6;
--event-red: #ef4444;
--event-gray: #6b7280;
```

### Horário de Funcionamento
Edite no `app.js`:
```javascript
const START_HOUR = 7;   // 07:00
const END_HOUR = 20;    // 20:00
```

## 🐛 Troubleshooting

| Problema | Solução |
|----------|---------|
| "Firebase não inicializado" | Verifique as credenciais no `firebase-config.js` |
| "Permissão negada" | Verifique as regras do Firestore |
| Calendário vazio | Verifique conexão com internet / Firestore |
| Tema não persiste | Verifique se LocalStorage está habilitado |
| Swipe não funciona | Use navegador atualizado com suporte a touch |

## 📄 Licença

Projeto livre para uso corporativo e pessoal.

---

**Desenvolvido com ❤️ usando Firebase + JavaScript Vanilla**
