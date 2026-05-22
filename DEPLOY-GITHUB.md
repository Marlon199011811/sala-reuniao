# 🚀 Guia de Deploy no GitHub Pages

Este guia ensina como hospedar a aplicação **Sala de Reunião** no GitHub Pages gratuitamente.

---

## 📋 Pré-requisitos

- Conta no [GitHub](https://github.com) (gratuita)
- Conta no [Firebase](https://console.firebase.google.com) (gratuita)
- Git instalado no computador (opcional, pode usar interface web)

---

## 🔧 Passo 1: Configurar o Firebase

### 1.1 Criar Projeto Firebase
1. Acesse: https://console.firebase.google.com
2. Clique em **"Create a project"** (ou "Adicionar projeto")
3. Dê um nome (ex: `sala-reuniao-app`)
4. Desmarque "Enable Google Analytics for this project" (opcional)
5. Clique **"Create project"**

### 1.2 Registrar App Web
1. No dashboard do projeto, clique no ícone **"</>"** (Web)
2. Dê um apelido: `sala-reuniao-web`
3. Clique **"Register app"**
4. **Copie o objeto `firebaseConfig`** que aparecerá

### 1.3 Colar Credenciais
Abra o arquivo `firebase-config.js` e substitua:

```javascript
const firebaseConfig = {
    apiKey: "COLE_AQUI_SUA_API_KEY",
    authDomain: "SEU_PROJETO.firebaseapp.com",
    projectId: "SEU_PROJETO",
    storageBucket: "SEU_PROJETO.appspot.com",
    messagingSenderId: "COLE_AQUI",
    appId: "COLE_AQUI"
};
```

### 1.4 Ativar Authentication
1. Menu lateral → **"Build"** → **"Authentication"**
2. Clique **"Get started"**
3. Ative **"Email/Password"**
4. Clique **"Save"**

### 1.5 Ativar Firestore Database
1. Menu lateral → **"Build"** → **"Firestore Database"**
2. Clique **"Create database"**
3. Escolha **"Start in production mode"**
4. Selecione a região mais próxima (ex: `us-central` ou `southamerica-east1`)
5. Clique **"Enable"**

### 1.6 Configurar Regras de Segurança
1. No Firestore, vá na aba **"Rules"**
2. Substitua tudo por:

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

3. Clique **"Publish"**

---

## 📁 Passo 2: Criar Repositório no GitHub

### Opção A: Via Interface Web (Mais Fácil)

1. Acesse: https://github.com/new
2. **Repository name**: `sala-reuniao` (ou nome que preferir)
3. Escolha **"Public"** (obrigatório para GitHub Pages gratuito)
4. Marque **"Add a README file"** (opcional)
5. Clique **"Create repository"**

### Opção B: Via Git (Terminal)

```bash
# Criar repositório local
git init sala-reuniao
cd sala-reuniao

# Copiar todos os arquivos do projeto para esta pasta
# (index.html, style.css, app.js, firebase-config.js, etc.)

# Inicializar
git add .
git commit -m "Initial commit: Sala de Reunião app"

# Criar no GitHub e conectar
git remote add origin https://github.com/SEU_USUARIO/sala-reuniao.git
git branch -M main
git push -u origin main
```

---

## 📤 Passo 3: Fazer Upload dos Arquivos

### Via Interface Web:
1. No repositório criado, clique em **"Add file"** → **"Upload files"**
2. Arraste ou selecione todos os arquivos:
   - `index.html`
   - `style.css`
   - `app.js`
   - `firebase-config.js` (já com suas credenciais!)
   - `404.html`
   - `.nojekyll`
   - `.github/workflows/deploy.yml`
   - `.gitignore`
3. Em **"Commit changes"**, escreva: `Deploy: Sala de Reunião v1.0`
4. Clique **"Commit changes"**

### Via Git:
```bash
git add .
git commit -m "Deploy: Sala de Reunião v1.0"
git push origin main
```

---

## 🌐 Passo 4: Ativar GitHub Pages

1. No repositório, clique em **"Settings"** (aba superior)
2. Menu lateral → **"Pages"**
3. Em **"Source"**, selecione:
   - **"Deploy from a branch"**
   - Branch: **"main"** (ou "master")
   - Folder: **"/ (root)"**
4. Clique **"Save"**

> **Alternativa (GitHub Actions - Recomendado):**
> Se você fez upload do arquivo `.github/workflows/deploy.yml`, o GitHub Actions já está configurado. Vá em **"Actions"** no menu superior e verifique se o workflow "Deploy to GitHub Pages" está rodando. Após concluir, a URL estará disponível em Settings > Pages.

### Aguardar Deploy
- O GitHub leva de **1 a 5 minutos** para publicar
- Acesse: `https://SEU_USUARIO.github.io/sala-reuniao/`

---

## 🔐 Passo 5: Configurar Autenticação Firebase para GitHub Pages

### 5.1 Adicionar Domínio Autorizado
1. Firebase Console → **Authentication** → **Settings** (ícone de engrenagem)
2. Aba **"Authorized domains"**
3. Clique **"Add domain"**
4. Digite: `SEU_USUARIO.github.io`
5. Clique **"Add"**

> Isso permite que usuários façam login a partir do GitHub Pages.

---

## 👤 Passo 6: Criar Primeiro Administrador

### 6.1 Cadastrar Primeiro Usuário
1. Acesse a URL do app: `https://SEU_USUARIO.github.io/sala-reuniao/`
2. Clique em **"Cadastre-se"**
3. Preencha os dados e crie a conta

### 6.2 Promover para Admin
1. Firebase Console → **Firestore Database**
2. Coleção `usuarios` → Documento com seu UID
3. Clique em **"Editar"** (lápis)
4. Altere o campo `perfil` de `"usuario"` para `"admin"`
5. Clique **"Save"**

> **Pronto!** Agora você tem acesso a relatórios e pode gerenciar todos os agendamentos.

---

## 🔄 Atualizações Futuras

Para atualizar o app:

```bash
# Editar arquivos localmente
# Depois:
git add .
git commit -m "Update: nova funcionalidade"
git push origin main
```

O GitHub Pages atualiza automaticamente em alguns minutos.

---

## 🛠️ Solução de Problemas

| Problema | Causa | Solução |
|----------|-------|---------|
| Página branca | Firebase não configurado | Verifique `firebase-config.js` |
| Erro 404 | Jekyll ativo | Arquivo `.nojekyll` deve estar na raiz |
| Login não funciona | Domínio não autorizado | Adicione `github.io` no Firebase Auth |
| Dados não salvam | Regras do Firestore | Copie as regras exatas do guia |
| CSS não carrega | Caminho errado | Use caminhos relativos (`style.css`) |
| App não atualiza | Cache do navegador | Ctrl+Shift+R (hard refresh) |

---

## 📱 URL Final

```
https://SEU_USUARIO.github.io/sala-reuniao/
```

Substitua `SEU_USUARIO` pelo seu nome de usuário no GitHub.

---

**🎉 Pronto! Sua aplicação está no ar e acessível de qualquer dispositivo!**
