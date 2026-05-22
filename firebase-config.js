/**
 * ============================================
 * CONFIGURAÇÃO FIREBASE
 * ============================================
 * 
 * INSTRUÇÕES DE CONFIGURAÇÃO:
 * 
 * 1. Acesse https://console.firebase.google.com
 * 2. Crie um novo projeto (ou use um existente)
 * 3. Vá em "Configurações do Projeto" > "Geral" > "Seus aplicativos"
 * 4. Clique no ícone </> para adicionar um app Web
 * 5. Copie as credenciais abaixo e cole neste arquivo
 * 6. Ative o Firestore Database e Authentication no console
 * 7. Configure as regras de segurança do Firestore
 * 
 * REGRAS FIRESTORE (firestore.rules):
 * -----------------------------------
 * rules_version = '2';
 * service cloud.firestore {
 *   match /databases/{database}/documents {
 *     match /usuarios/{userId} {
 *       allow read: if request.auth != null;
 *       allow write: if request.auth != null && request.auth.uid == userId;
 *     }
 *     match /agendamentos/{bookingId} {
 *       allow read: if request.auth != null;
 *       allow create: if request.auth != null;
 *       allow update, delete: if request.auth != null && 
 *         (resource.data.criadoPor == request.auth.uid || 
 *          get(/databases/$(database)/documents/usuarios/$(request.auth.uid)).data.perfil == 'admin');
 *     }
 *   }
 * }
 * 
 * PARA HOSPEDAR NO FIREBASE HOSTING:
 * ----------------------------------
 * 1. Instale Firebase CLI: npm install -g firebase-tools
 * 2. Login: firebase login
 * 3. Init: firebase init hosting
 * 4. Deploy: firebase deploy
 */

// ============================================
// SUBSTITUA ESTAS CREDENCIAIS PELAS SUAS
// ============================================
const firebaseConfig = {
    apiKey: "AIzaSyCtCGRS-f7m10C-ufOYga_BWjejrf7UR2U",
    authDomain: "saladereuniao-4fffa.firebaseapp.com",
    projectId: "saladereuniao-4fffa",
    storageBucket: "saladereuniao-4fffa.firebasestorage.app",
    messagingSenderId: "458370618055",
    appId: "1:458370618055:web:5e1a0ac51828ba8d62a4e2"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);

// Exportar instâncias para uso global
const db = firebase.firestore();
const auth = firebase.auth();

// Configurações do Firestore
db.settings({ 
    timestampsInSnapshots: true,
    cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED 
});

// Habilitar persistência offline
db.enablePersistence({ synchronizeTabs: true })
    .catch((err) => {
        if (err.code === 'failed-precondition') {
            console.warn('Persistência offline: múltiplas abas abertas');
        } else if (err.code === 'unimplemented') {
            console.warn('Persistência offline não suportada neste navegador');
        }
    });

console.log('🔥 Firebase inicializado com sucesso');
