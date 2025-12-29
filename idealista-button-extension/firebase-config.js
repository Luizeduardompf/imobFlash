// ============================================================================
// CONFIGURAÇÃO DO FIREBASE
// ============================================================================
// INSTRUÇÕES:
// 1. Acesse https://console.firebase.google.com/
// 2. Crie um novo projeto
// 3. Ative Firestore Database
// 4. Vá em Project Settings > General > Your apps > Web
// 5. Copie as credenciais abaixo e substitua os valores

const FIREBASE_CONFIG = {
    apiKey: "SUA_API_KEY_AQUI",
    authDomain: "SEU_PROJETO.firebaseapp.com",
    projectId: "SEU_PROJECT_ID",
    storageBucket: "SEU_PROJETO.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abcdef"
};

// Nome da coleção no Firestore
const FIRESTORE_COLLECTION = "idealista_conversations";

