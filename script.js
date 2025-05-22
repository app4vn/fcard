// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js"; 
import { 
  getAuth, 
  onAuthStateChanged, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { 
  getFirestore, collection, addDoc, getDocs, doc, setDoc, updateDoc, deleteDoc, query, where, orderBy, serverTimestamp, getDoc 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js"; 

const firebaseConfig = {
  apiKey: "AIzaSyBcBpsCGt-eWyAvtNaqxG0QncqzYDJwG70", // Thay thế bằng API key của bạn
  authDomain: "fcard-84890.firebaseapp.com", // Thay thế bằng authDomain của bạn
  projectId: "fcard-84890", // Thay thế bằng projectId của bạn
  storageBucket: "fcard-84890.appspot.com", // Thay thế bằng storageBucket của bạn
  messagingSenderId: "195942452341", // Thay thế bằng messagingSenderId của bạn
  appId: "1:195942452341:web:b995a99ae0d1fbb47a7c3c" // Thay thế bằng appId của bạn
};

// Initialize Firebase
const fbApp = initializeApp(firebaseConfig); 
const fbAuth = getAuth(fbApp); 
const db = getFirestore(fbApp); 

let currentUserId = null;
let isUserAnonymous = true; 

// DOM Elements cho Auth (khai báo sớm để có thể dùng trong updateAuthUI)
const authContainer = document.getElementById('auth-container');
const userEmailDisplay = document.getElementById('user-email-display');
const authActionButton = document.getElementById('auth-action-btn');
const authModal = document.getElementById('auth-modal');
const authModalContent = document.getElementById('auth-modal-content');
const authModalTitle = document.getElementById('auth-modal-title');
const closeAuthModalBtn = document.getElementById('close-auth-modal-btn');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const loginErrorMessage = document.getElementById('login-error-message');
const registerErrorMessage = document.getElementById('register-error-message');
const toggleAuthModeBtn = document.getElementById('toggle-auth-mode-btn');


// *** DI CHUYỂN KHAI BÁO appState VÀ CÁC HÀM LIÊN QUAN RA NGOÀI DOMContentLoaded ***
const defaultCategoryState = {
    searchTerm: '',
    baseVerb: 'all',
    tag: 'all',
    filterMarked: 'all_study',
    currentIndex: 0,
    deckId: 'all_user_cards'
};

const defaultAppState = {
    lastSelectedCategory: 'phrasalVerbs',
    lastSelectedSource: 'web',
    lastSelectedDeckId: 'all_user_cards', 
    categoryStates: {}
};
let appState = JSON.parse(JSON.stringify(defaultAppState)); // Khởi tạo với bản sao sâu

const appStateStorageKey = 'flashcardAppState_v4_firestore_sync_v2'; // Đổi key để tránh xung đột với dữ liệu cũ không tương thích

async function loadAppState() {
    console.log("Attempting to load AppState. Current user ID:", currentUserId);
    if (currentUserId) {
        const appStateRef = doc(db, 'users', currentUserId, 'userSettings', 'appStateDoc');
        try {
            const docSnap = await getDoc(appStateRef);
            if (docSnap.exists()) {
                const firestoreState = docSnap.data();
                // Merge cẩn thận, đảm bảo categoryStates là một object
                appState = { 
                    ...defaultAppState, 
                    ...firestoreState,
                    categoryStates: firestoreState.categoryStates ? { ...firestoreState.categoryStates } : {} 
                };
                // Đảm bảo mỗi categoryState có đủ các trường từ defaultCategoryState
                Object.keys(appState.categoryStates).forEach(k => {
                    appState.categoryStates[k] = {
                        ...defaultCategoryState,
                        ...(appState.categoryStates[k] || {}),
                        searchTerm: appState.categoryStates[k]?.searchTerm || '' // Đảm bảo searchTerm không undefined
                    };
                });
                console.log("AppState loaded from Firestore and merged with defaults:", JSON.parse(JSON.stringify(appState)));
                localStorage.setItem(appStateStorageKey, JSON.stringify(appState)); // Đồng bộ xuống localStorage
                return; 
            } else {
                console.log("No AppState in Firestore for this user, trying localStorage or defaults.");
            }
        } catch (error) {
            console.error("Error loading appState from Firestore:", error);
            // Tiếp tục thử localStorage hoặc default nếu Firestore lỗi
        }
    }

    // Fallback to localStorage or defaults
    try {
        const s = localStorage.getItem(appStateStorageKey);
        if (s) {
            const p = JSON.parse(s);
            appState = { 
                ...defaultAppState, 
                lastSelectedCategory: p.lastSelectedCategory || defaultAppState.lastSelectedCategory,
                lastSelectedSource: p.lastSelectedSource || defaultAppState.lastSelectedSource,
                lastSelectedDeckId: p.lastSelectedDeckId || defaultAppState.lastSelectedDeckId,
                categoryStates: p.categoryStates ? { ...p.categoryStates } : {} 
            };
            Object.keys(appState.categoryStates).forEach(k => {
                 appState.categoryStates[k] = {
                    ...defaultCategoryState,
                    ...(appState.categoryStates[k] || {}),
                    searchTerm: appState.categoryStates[k]?.searchTerm || ''
                };
            });
            console.log("AppState loaded from localStorage and merged with defaults:", JSON.parse(JSON.stringify(appState)));
            if (currentUserId) { // Nếu có user, đồng bộ lên Firestore
                await saveAppStateToFirestore(); 
            }
        } else {
            console.log("No AppState in localStorage, using defaults.");
            appState = JSON.parse(JSON.stringify(defaultAppState)); 
             if (currentUserId) {
                await saveAppStateToFirestore();
            } else {
                // Chỉ lưu vào localStorage nếu không có user và không có gì trong localStorage
                localStorage.setItem(appStateStorageKey, JSON.stringify(appState));
            }
        }
    } catch (e) {
        console.error("Lỗi load appState từ localStorage, using defaults:", e);
        appState = JSON.parse(JSON.stringify(defaultAppState)); 
        if (currentUserId) {
            await saveAppStateToFirestore();
        }
    }
}

async function saveAppStateToFirestore() {
    const currentUserId = window.authFunctions.getCurrentUserId();
    if (!currentUserId) {
        console.log("Cannot save AppState to Firestore: User not logged in.");
        return; 
    }

    const appStateRef = doc(db, 'users', currentUserId, 'userSettings', 'appStateDoc');
    try {
        // Tạo một bản sao sâu của appState để tránh các vấn đề với serverTimestamp nếu nó được dùng trực tiếp
        const stateToSave = JSON.parse(JSON.stringify(appState)); 
        await setDoc(appStateRef, stateToSave); 
        console.log("AppState saved to Firestore for user:", currentUserId);
    } catch (error) {
        console.error("Error saving appState to Firestore:", error);
    }
}

async function saveAppState(){ 
    const currentCategory = categorySelect.value;
    const stateForCategory = getCategoryState(currentDatasetSource, currentCategory);

    stateForCategory.currentIndex = window.currentIndex;
    stateForCategory.filterMarked = filterCardStatusSelect.value;
    if (currentDatasetSource === 'user') {
        stateForCategory.deckId = userDeckSelect.value;
    }
    if (currentCategory === 'phrasalVerbs' || currentCategory === 'collocations') {
        stateForCategory.baseVerb = baseVerbSelect.value;
        stateForCategory.tag = tagSelect.value;
    }
    appState.lastSelectedCategory = currentCategory;
    appState.lastSelectedSource = currentDatasetSource;
    appState.lastSelectedDeckId = (currentDatasetSource === 'user') ? userDeckSelect.value : 'all_user_cards';


    try{
        localStorage.setItem(appStateStorageKey,JSON.stringify(appState));
        console.log("AppState saved to localStorage.");
    }catch(e){
        console.error("Lỗi save appState vào localStorage:", e);
    }
    if (window.authFunctions.getCurrentUserId()) { // Chỉ lưu vào Firestore nếu người dùng đã đăng nhập
        await saveAppStateToFirestore();
    }
}

function getCategoryState(src, cat) {
    const key = `${src}_${cat}`;
    if (!appState.categoryStates[key]) {
        // Nếu không tồn tại, tạo mới dựa trên defaultCategoryState
        appState.categoryStates[key] = JSON.parse(JSON.stringify(defaultCategoryState));
    } else {
        // Đảm bảo tất cả các trường từ defaultCategoryState đều tồn tại
        appState.categoryStates[key] = {
            ...defaultCategoryState,
            ...appState.categoryStates[key],
            searchTerm: appState.categoryStates[key].searchTerm || '' // Đảm bảo searchTerm không undefined
        };
    }
    return appState.categoryStates[key];
}
// *** KẾT THÚC DI CHUYỂN ***


function openAuthModal(mode = 'login') { 
    loginErrorMessage.classList.add('hidden');
    registerErrorMessage.classList.add('hidden');
    if (mode === 'login') {
        authModalTitle.textContent = 'Đăng nhập';
        loginForm.classList.remove('hidden');
        registerForm.classList.add('hidden');
        toggleAuthModeBtn.textContent = 'Chưa có tài khoản? Đăng ký ngay';
        loginForm.reset();
    } else {
        authModalTitle.textContent = 'Đăng ký';
        loginForm.classList.add('hidden');
        registerForm.classList.remove('hidden');
        toggleAuthModeBtn.textContent = 'Đã có tài khoản? Đăng nhập';
        registerForm.reset();
    }
    authModal.classList.remove('hidden', 'opacity-0');
    authModalContent.classList.remove('scale-95');
    authModalContent.classList.add('scale-100');
    if (mode === 'login' && document.getElementById('login-email')) {
      document.getElementById('login-email').focus();
    } else if (document.getElementById('register-email')) {
      document.getElementById('register-email').focus();
    }
}

function closeAuthModal() {
    authModal.classList.add('opacity-0');
    authModalContent.classList.add('scale-95');
    setTimeout(() => authModal.classList.add('hidden'), 250);
}

async function updateAuthUI(user) {
    const localCardSourceSelect = document.getElementById('card-source-select'); 
    const localWordDisplay = document.getElementById('word-display'); 

    if (user) {
        isUserAnonymous = user.isAnonymous; 
        currentUserId = user.uid;
        
        await loadAppState(); 

        userEmailDisplay.textContent = user.email ? user.email : (user.isAnonymous ? "Khách" : "Người dùng");
        userEmailDisplay.classList.remove('hidden');
        authActionButton.classList.remove('bg-indigo-500', 'hover:bg-indigo-600');
        authActionButton.classList.add('bg-red-500', 'hover:bg-red-600');
        authActionButton.innerHTML = `
            <i class="fas fa-sign-out-alt"></i>
            <span class="hidden sm:inline ml-1 sm:ml-2">Đăng xuất</span>
        `;
        authActionButton.title = "Đăng xuất";
        
        if (typeof window.updateSidebarFilterVisibility === 'function') {
            window.updateSidebarFilterVisibility(); 
        }

        if (localCardSourceSelect && localCardSourceSelect.value === 'user') {
            console.log("User logged in, source is 'user'. Reloading user data after appState load.");
            if (window.currentData && window.currentData.length === 0 && localWordDisplay) { 
               localWordDisplay.classList.add('word-display-empty-state');
               localWordDisplay.innerHTML = `<p>Chào mừng ${user.email || 'bạn'}! Hãy bắt đầu tạo bộ thẻ của riêng mình.</p><button id="empty-state-add-card-btn-on-card" class="mt-2"><i class="fas fa-plus mr-2"></i>Tạo Thẻ Đầu Tiên</button>`;
               const btn = document.getElementById('empty-state-add-card-btn-on-card');
               if(btn) btn.onclick = async () => { 
                   const mainOpenBtn = document.getElementById('open-add-card-modal-btn');
                   if (mainOpenBtn) await openAddEditModal('add'); 
               }
            }
            if (typeof window.loadVocabularyData === 'function' && document.getElementById('category')) {
                if (typeof loadUserDecks === 'function') {
                    await loadUserDecks(); 
                }
                window.loadVocabularyData(document.getElementById('category').value);
            }
        }

    } else {
        isUserAnonymous = true; 
        currentUserId = null;
        userEmailDisplay.classList.add('hidden');
        userEmailDisplay.textContent = '';

        authActionButton.classList.remove('bg-red-500', 'hover:bg-red-600');
        authActionButton.classList.add('bg-indigo-500', 'hover:bg-indigo-600');
        authActionButton.innerHTML = `
            <i class="fas fa-sign-in-alt"></i>
            <span class="hidden sm:inline ml-1 sm:ml-2">Đăng nhập</span>
        `;
        authActionButton.title = "Đăng nhập";
        
        appState = JSON.parse(JSON.stringify(defaultAppState)); 
        localStorage.removeItem(appStateStorageKey);
        console.log("User logged out. AppState reset and removed from localStorage.");


        if (typeof window.updateSidebarFilterVisibility === 'function') {
            window.updateSidebarFilterVisibility(); 
        }

        if (localCardSourceSelect && localCardSourceSelect.value === 'user') {
            console.log("User logged out or not logged in, source is 'user'. Clearing user data and prompting login.");
            if(window.currentData) window.currentData = []; 
            if(window.hasOwnProperty('currentIndex')) window.currentIndex = 0; 
            
            if (typeof window.updateFlashcard === 'function') {
                window.updateFlashcard(); 
            }
            if (localWordDisplay) { 
              localWordDisplay.classList.add('word-display-empty-state');
              localWordDisplay.innerHTML = `<p>Vui lòng đăng nhập để xem hoặc tạo thẻ của bạn.</p><button id="login-prompt-btn" class="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-md mt-2">Đăng nhập ngay</button>`;
              const loginPromptBtn = document.getElementById('login-prompt-btn');
              if(loginPromptBtn) loginPromptBtn.onclick = () => openAuthModal('login');
            }
        }
    }
    if (typeof window.updateMainHeaderTitle === 'function') {
       window.updateMainHeaderTitle(); 
    }
}

authActionButton.addEventListener('click', () => {
    if (currentUserId) { 
        signOut(fbAuth).catch(error => {
            console.error("Lỗi đăng xuất:", error);
        });
    } else {
        openAuthModal('login');
    }
});

closeAuthModalBtn.addEventListener('click', closeAuthModal);
authModal.addEventListener('click', (e) => { 
    if (e.target === authModal) { 
        closeAuthModal();
    }
});

toggleAuthModeBtn.addEventListener('click', () => {
    if (loginForm.classList.contains('hidden')) { 
        openAuthModal('login');
    } else { 
        openAuthModal('register');
    }
});

loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = loginForm.email.value;
    const password = loginForm.password.value;
    loginErrorMessage.classList.add('hidden'); 
    signInWithEmailAndPassword(fbAuth, email, password)
        .then((userCredential) => {
            console.log("Đăng nhập thành công:", userCredential.user);
            closeAuthModal();
        })
        .catch((error) => {
            console.error("Lỗi đăng nhập:", error.code, error.message);
            loginErrorMessage.textContent = mapAuthErrorCodeToMessage(error.code);
            loginErrorMessage.classList.remove('hidden');
        });
});

registerForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = registerForm.email.value;
    const password = registerForm.password.value;
    const confirmPassword = registerForm['confirm-password'].value;
    registerErrorMessage.classList.add('hidden'); 

    if (password !== confirmPassword) {
        registerErrorMessage.textContent = "Mật khẩu xác nhận không khớp.";
        registerErrorMessage.classList.remove('hidden');
        return;
    }

    createUserWithEmailAndPassword(fbAuth, email, password)
        .then((userCredential) => {
            console.log("Đăng ký thành công:", userCredential.user);
            closeAuthModal();
        })
        .catch((error) => {
            console.error("Lỗi đăng ký:", error.code, error.message);
            registerErrorMessage.textContent = mapAuthErrorCodeToMessage(error.code);
            registerErrorMessage.classList.remove('hidden');
        });
});

function mapAuthErrorCodeToMessage(errorCode) {
    switch (errorCode) {
        case 'auth/invalid-email': return 'Địa chỉ email không hợp lệ.';
        case 'auth/user-disabled': return 'Tài khoản người dùng này đã bị vô hiệu hóa.';
        case 'auth/user-not-found': return 'Không tìm thấy người dùng với email này.';
        case 'auth/wrong-password': return 'Sai mật khẩu. Vui lòng thử lại.';
        case 'auth/email-already-in-use': return 'Địa chỉ email này đã được sử dụng.';
        case 'auth/weak-password': return 'Mật khẩu quá yếu. Mật khẩu phải có ít nhất 6 ký tự.';
        case 'auth/operation-not-allowed': return 'Đăng nhập bằng email và mật khẩu chưa được kích hoạt.';
        case 'auth/requires-recent-login': return 'Thao tác này nhạy cảm và yêu cầu xác thực gần đây. Vui lòng đăng nhập lại.';
        case 'auth/invalid-credential': return 'Thông tin đăng nhập không hợp lệ. Vui lòng kiểm tra lại email và mật khẩu.'; 
        default: return 'Đã xảy ra lỗi. Vui lòng thử lại. (' + errorCode + ')';
    }
}

onAuthStateChanged(fbAuth, async (user) => { 
    await updateAuthUI(user); 
    if (user) {
        console.log("onAuthStateChanged: User is now fully processed, appState loaded.");
    } else {
        console.log("onAuthStateChanged: User logged out, appState reset.");
        if (typeof window.loadVocabularyData === 'function' && document.getElementById('category')) {
            window.loadVocabularyData(document.getElementById('category').value);
        }
    }
});

window.authFunctions = {
    openAuthModal,
    closeAuthModal,
    getCurrentUserId: () => currentUserId
};

// Logic chính của ứng dụng
document.addEventListener('DOMContentLoaded', async () => { 
    const mainHeaderTitle = document.getElementById('main-header-title');
    const cardSourceSelect = document.getElementById('card-source-select'); 
    const categorySelect = document.getElementById('category');
    const flashcardElement = document.getElementById('flashcard');
    
    const wordDisplay = document.getElementById('word-display'); 
    const pronunciationDisplay = document.getElementById('pronunciation-display');
    const meaningDisplayContainer = document.getElementById('meaning-display-container');
    const notesDisplay = document.getElementById('notes-display');
    const prevBtn = document.getElementById('prev-btn');
    const flipBtn = document.getElementById('flip-btn');
    const nextBtn = document.getElementById('next-btn');
    const currentCardIndexDisplay = document.getElementById('current-card-index');
    const totalCardsDisplay = document.getElementById('total-cards');
    const speakerBtn = document.getElementById('speaker-btn');
    const speakerExampleBtn = document.getElementById('speaker-example-btn');
    const tagFilterContainer = document.getElementById('tag-filter-container');
    const tagSelect = document.getElementById('tags');
    const searchInput = document.getElementById('search-input');
    const baseVerbFilterContainer = document.getElementById('base-verb-filter-container');
    const baseVerbSelect = document.getElementById('base-verb-filter');
    const practiceTypeSelect = document.getElementById('practice-type-select');
    const practiceArea = document.getElementById('practice-area');
    const multipleChoiceOptionsContainer = document.getElementById('multiple-choice-options');
    const feedbackMessage = document.getElementById('feedback-message');
    const filterCardStatusSelect = document.getElementById('filter-card-status');
    const statusBtnNew = document.getElementById('btn-status-new');
    const statusBtnLearning = document.getElementById('btn-status-learning');
    const statusBtnLearned = document.getElementById('btn-status-learned');
    const hamburgerMenuBtn = document.getElementById('hamburger-menu-btn');
    const filterSidebar = document.getElementById('filter-sidebar');
    const closeSidebarBtn = document.getElementById('close-sidebar-btn');
    const sidebarOverlay = document.getElementById('sidebar-overlay');
    const tagsDisplayFront = document.getElementById('tags-display-front');
    const typingInputContainer = document.getElementById('typing-input-container');
    const typingInput = document.getElementById('typing-input');
    const submitTypingAnswerBtn = document.getElementById('submit-typing-answer-btn');

    const openAddCardModalBtn = document.getElementById('open-add-card-modal-btn'); 
    const addEditCardModal = document.getElementById('add-edit-card-modal');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const addEditCardForm = document.getElementById('add-edit-card-form');
    const modalTitle = document.getElementById('modal-title');
    const cardIdInput = document.getElementById('card-id-input');
    const cardWordInput = document.getElementById('card-word-input');
    const cardPronunciationInput = document.getElementById('card-pronunciation-input');
    const cardGeneralNotesInput = document.getElementById('card-general-notes-input');
    const meaningBlocksContainer = document.getElementById('meaning-blocks-container');
    const addAnotherMeaningBlockAtEndBtn = document.getElementById('add-another-meaning-block-at-end-btn');
    const phrasalVerbSpecificFields = document.getElementById('phrasal-verb-specific-fields');
    const cardBaseVerbInput = document.getElementById('card-base-verb-input');
    const cardTagsInput = document.getElementById('card-tags-input');
    const cancelCardBtn = document.getElementById('cancel-card-btn');
    const saveCardBtn = document.getElementById('save-card-btn');
    const deckCreationHint = document.getElementById('deck-creation-hint');
    const userDeckFilterContainer = document.getElementById('user-deck-filter-container'); 
    const userDeckSelect = document.getElementById('user-deck-select'); 
    const manageDecksBtn = document.getElementById('manage-decks-btn'); 
    const modalDeckAssignmentContainer = document.getElementById('modal-deck-assignment-container');
    const cardDeckAssignmentSelect = document.getElementById('card-deck-assignment-select');
    const manageDecksModal = document.getElementById('manage-decks-modal');
    const deckModalContent = manageDecksModal.querySelector('.modal-content'); 
    const closeDeckModalBtn = document.getElementById('close-deck-modal-btn');
    const newDeckNameInput = document.getElementById('new-deck-name-input');
    const addNewDeckBtn = document.getElementById('add-new-deck-btn');
    const existingDecksList = document.getElementById('existing-decks-list');
    const cardWordError = document.getElementById('card-word-error');
    const meaningBlocksGeneralError = document.getElementById('meaning-blocks-general-error');

    const manualInputModeBtn = document.getElementById('manual-input-mode-btn');
    const jsonInputModeBtn = document.getElementById('json-input-mode-btn');
    const jsonInputArea = document.getElementById('json-input-area');
    const cardJsonInput = document.getElementById('card-json-input');
    const processJsonBtn = document.getElementById('process-json-btn');
    const jsonImportErrorMessage = document.getElementById('json-import-error-message');
    const jsonImportSuccessMessage = document.getElementById('json-import-success-message');
    const jsonCardDeckAssignmentSelect = document.getElementById('json-card-deck-assignment-select'); 
    const jsonDeckCreationHint = document.getElementById('json-deck-creation-hint');

    const copyWebCardBtn = document.getElementById('copy-web-card-btn');
    const copyToDeckModal = document.getElementById('copy-to-deck-modal');
    const closeCopyToDeckModalBtn = document.getElementById('close-copy-to-deck-modal-btn');
    const copyToDeckSelect = document.getElementById('copy-to-deck-select');
    const copyNewDeckNameContainer = document.getElementById('copy-new-deck-name-container');
    const copyNewDeckNameInput = document.getElementById('copy-new-deck-name-input');
    const copyNewDeckError = document.getElementById('copy-new-deck-error');
    const copyToDeckErrorMessage = document.getElementById('copy-to-deck-error-message');
    const copyToDeckSuccessMessage = document.getElementById('copy-to-deck-success-message');
    const cancelCopyToDeckBtn = document.getElementById('cancel-copy-to-deck-btn');
    const confirmCopyToDeckBtn = document.getElementById('confirm-copy-to-deck-btn');


    let baseVerbSuggestions = [];
    let tagSuggestions = [];

    let currentDatasetSource = 'web'; 
    window.currentData = []; 
    window.currentIndex = 0; 
    let currentWordSpansMeta = [];
    let activeMasterList = [];
    let practiceType = "off";
    let currentInputMode = 'manual'; 
    let currentAnswerChecked = false;
    let currentCorrectAnswerForPractice = '';
    
    let userDecks = []; 
    let learningCardNextButtonTimer = null;
    let learningCardCountdownInterval = null;
    let exampleSpeechQueue = [];
    let currentExampleSpeechIndex = 0;
    let isSpeakingExampleQueue = false;
    let currentEditingCardId = null;
    let currentEditingDeckId = null; 

    const tagDisplayNames = {"all": "Tất cả chủ đề", "actions_general": "Hành động chung", "actions_tasks": "Hành động & Nhiệm vụ", "movement_travel": "Di chuyển & Du lịch", "communication": "Giao tiếp", "relationships_social": "Quan hệ & Xã hội", "emotions_feelings": "Cảm xúc & Cảm giác", "problems_solutions": "Vấn đề & Giải pháp", "work_business": "Công việc & Kinh doanh", "learning_information": "Học tập & Thông tin", "daily_routine": "Thói quen hàng ngày", "health_wellbeing": "Sức khỏe & Tinh thần", "objects_possession": "Đồ vật & Sở hữu", "time_planning": "Thời gian & Kế hoạch", "money_finance": "Tiền bạc & Tài chính", "behavior_attitude": "Hành vi & Thái độ", "begin_end_change": "Bắt đầu, Kết thúc & Thay đổi", "food_drink": "Ăn uống", "home_living": "Nhà cửa & Đời sống", "rules_systems": "Quy tắc & Hệ thống", "effort_achievement": "Nỗ lực & Thành tựu", "safety_danger": "An toàn & Nguy hiểm", "technology": "Công nghệ", "nature": "Thiên nhiên & Thời tiết", "art_creation": "Nghệ thuật & Sáng tạo" };
    
    const sampleData = { 
        "phrasalVerbs": [
            { "phrasalVerb": "Look up", "baseVerb": "look", "category": "phrasalVerbs", "pronunciation": "/lʊk ʌp/", "meanings": [ { "id": "m_pv_sample_1_1", "text": "Tra cứu (thông tin)", "notes": "Trong từ điển, danh bạ...", "examples": [ { "id": "ex_pv_sample_1_1_1", "eng": "I need to look up this word in the dictionary.", "vie": "Tôi cần tra từ này trong từ điển." }, { "id": "ex_pv_sample_1_1_2", "eng": "Can you look up the train times for me?", "vie": "Bạn có thể tra giờ tàu cho tôi được không?" } ]}], "tags": ["learning_information", "actions_tasks"], "generalNotes": "Một cụm động từ phổ biến." },
            { "phrasalVerb": "Give up", "baseVerb": "give", "category": "phrasalVerbs", "pronunciation": "/ɡɪv ʌp/", "meanings": [ { "id": "m_pv_sample_2_1", "text": "Từ bỏ", "notes": "Ngừng cố gắng làm gì đó.", "examples": [ { "id": "ex_pv_sample_2_1_1", "eng": "Don't give up on your dreams.", "vie": "Đừng từ bỏ ước mơ của bạn." }, { "id": "ex_pv_sample_2_1_2", "eng": "He gave up smoking last year.", "vie": "Anh ấy đã bỏ hút thuốc vào năm ngoái." } ]}], "tags": ["effort_achievement", "health_wellbeing"], "generalNotes": "" },
        ],
        "nouns": [ { "word": "Solution", "category": "nouns", "pronunciation": "/səˈluːʃən/", "meanings": [ { "id": "m_noun_sample_1_1", "text": "Giải pháp cho một vấn đề."}], "generalNotes": "Danh từ đếm được." } ],
        "verbs": [ { "word": "Set", "category": "verbs", "pronunciation": "/set/", "meanings": [ { "id": "m_verb_sample_1_1", "text": "Đặt, để một cái gì đó ở một vị trí cụ thể."}], "generalNotes": "Một động từ có nhiều nghĩa." } ],
        "adjectives": [ { "word": "Happy", "category": "adjectives", "pronunciation": "/ˈhæpi/", "meanings": [ { "id": "m_adj_sample_1_1", "text": "Cảm thấy hoặc thể hiện sự vui vẻ, hài lòng."}], "generalNotes": "" } ],
        "collocations": [
            { "collocation": "take a break", "baseVerb": "take", "category": "collocations", "pronunciation": "/teɪk ə breɪk/", "meanings": [ { "id": "m_col_sample_1_1", "text": "Nghỉ giải lao, nghỉ ngơi một lát", "notes": "Thường dùng trong công việc hoặc học tập", "examples": [ { "id": "ex_col_sample_1_1_1", "eng": "Let's take a break for 10 minutes.", "vie": "Chúng ta hãy nghỉ giải lao 10 phút." }, { "id": "ex_col_sample_1_1_2", "eng": "She's been working all day, she needs to take a break.", "vie": "Cô ấy đã làm việc cả ngày, cô ấy cần nghỉ ngơi." } ]}], "tags": ["daily_routine", "work_business"], "generalNotes": "Một collocation phổ biến với động từ 'take'." },
            { "collocation": "make an effort", "baseVerb": "make", "category": "collocations", "pronunciation": "/meɪk ən ˈefərt/", "meanings": [ { "id": "m_col_sample_2_1", "text": "Nỗ lực, cố gắng", "examples": [ { "id": "ex_col_sample_2_1_1", "eng": "You need to make an effort to improve your grades.", "vie": "Bạn cần phải nỗ lực để cải thiện điểm số của mình." } ]}], "tags": ["effort_achievement"], "generalNotes": "" }
        ]
    };

    window.wordDisplay = wordDisplay; 
    window.updateSidebarFilterVisibility = updateSidebarFilterVisibility;
    window.updateMainHeaderTitle = updateMainHeaderTitle;
    window.loadVocabularyData = loadVocabularyData;
    window.updateFlashcard = updateFlashcard; 

    await loadAppState(); 
    setupInitialCategoryAndSource(); 
    setupEventListeners(); 

    function generateUniqueId(prefix = 'id') {
        return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 7)}`;
    }

    function displayFieldError(inputElement, errorElement, message) { if (errorElement) { errorElement.textContent = message; errorElement.classList.remove('hidden'); } if (inputElement) { inputElement.classList.add('input-error-border'); } }
    function clearFieldError(inputElement, errorElement) { if (errorElement) { errorElement.textContent = ''; errorElement.classList.add('hidden'); } if (inputElement) { inputElement.classList.remove('input-error-border'); } }
    function clearAllFormErrors() { 
        clearFieldError(cardWordInput, cardWordError); 
        if (meaningBlocksGeneralError) meaningBlocksGeneralError.classList.add('hidden'); 
        if (meaningBlocksGeneralError) meaningBlocksGeneralError.textContent = ''; 
        const meaningTextInputs = meaningBlocksContainer.querySelectorAll('.card-meaning-text-input'); 
        meaningTextInputs.forEach(input => { 
            const errorMsgElement = input.parentNode.nextElementSibling; 
            clearFieldError(input, errorMsgElement); 
        }); 
        if (jsonImportErrorMessage) jsonImportErrorMessage.classList.add('hidden');
        if (jsonImportSuccessMessage) jsonImportSuccessMessage.classList.add('hidden');
    }
    
    function createClearButtonForInput(inputElement) { let clearBtn = inputElement.parentNode.querySelector('.input-clear-btn'); if (clearBtn) { clearBtn.style.display = inputElement.value ? 'block' : 'none'; return clearBtn; } clearBtn = document.createElement('button'); clearBtn.type = 'button'; clearBtn.className = 'input-clear-btn'; clearBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>`; clearBtn.setAttribute('aria-label', 'Xóa nội dung'); clearBtn.style.display = inputElement.value ? 'block' : 'none'; clearBtn.addEventListener('click', (e) => { e.stopPropagation(); const oldValue = inputElement.value; inputElement.value = ''; clearBtn.style.display = 'none'; inputElement.focus(); if (oldValue !== '') { inputElement.dispatchEvent(new Event('input', { bubbles: true })); } }); inputElement.addEventListener('input', () => { clearBtn.style.display = inputElement.value ? 'block' : 'none'; }); if(inputElement.parentNode.classList.contains('relative')) { inputElement.parentNode.appendChild(clearBtn); } return clearBtn; }
    function initializeClearButtonsForModal() { const inputsWithClear = [ cardWordInput, cardPronunciationInput, cardBaseVerbInput, cardTagsInput, cardGeneralNotesInput ]; inputsWithClear.forEach(inputEl => { if (inputEl && inputEl.parentNode.classList.contains('relative')) { createClearButtonForInput(inputEl); } }); meaningBlocksContainer.querySelectorAll('.card-meaning-text-input, .card-meaning-notes-input').forEach(input => { if (input && input.parentNode.classList.contains('relative')) createClearButtonForInput(input); }); }
    function initializeClearButtonForSearch() { if (searchInput && searchInput.parentNode.classList.contains('relative')) { createClearButtonForInput(searchInput); } }

    function createExampleEntryElement(exampleData = { id: generateUniqueId('ex'), eng: '', vie: '', exampleNotes: '' }) { const exampleEntryDiv = document.createElement('div'); exampleEntryDiv.className = 'example-entry space-y-1'; exampleEntryDiv.dataset.exampleId = exampleData.id || generateUniqueId('ex'); exampleEntryDiv.innerHTML = `<div class="flex justify-between items-center"><label class="block text-xs font-medium text-slate-500">Ví dụ Tiếng Anh</label><button type="button" class="remove-example-entry-btn text-red-400 hover:text-red-600 text-xs remove-entry-btn" title="Xóa ví dụ này"><i class="fas fa-times-circle"></i> Xóa</button></div><textarea rows="2" class="card-example-eng-input block w-full p-1.5 border border-slate-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm" placeholder="Câu ví dụ (Tiếng Anh)">${exampleData.eng}</textarea><label class="block text-xs font-medium text-slate-500 mt-1">Nghĩa ví dụ (Tiếng Việt - tùy chọn)</label><textarea rows="1" class="card-example-vie-input block w-full p-1.5 border border-slate-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm" placeholder="Nghĩa tiếng Việt của ví dụ">${exampleData.vie}</textarea><label class="block text-xs font-medium text-slate-500 mt-1">Ghi chú cho ví dụ này (tùy chọn)</label><textarea rows="1" class="card-example-notes-input block w-full p-1.5 border border-slate-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm" placeholder="Ghi chú cho ví dụ">${exampleData.exampleNotes || ''}</textarea>`; exampleEntryDiv.querySelector('.remove-example-entry-btn').addEventListener('click', function() { this.closest('.example-entry').remove(); }); return exampleEntryDiv; }
    function createMeaningBlockElement(meaningBlockData = { id: generateUniqueId('meaning'), text: '', notes: '', examples: [] }) { const meaningBlockDiv = document.createElement('div'); meaningBlockDiv.className = 'meaning-block'; meaningBlockDiv.dataset.meaningId = meaningBlockData.id || generateUniqueId('meaning'); meaningBlockDiv.innerHTML = `<div class="flex justify-between items-center mb-2"><label class="block text-sm font-medium text-slate-700">Nghĩa (Tiếng Việt) <span class="text-red-500">*</span></label><button type="button" class="remove-meaning-block-btn text-red-500 hover:text-red-700 text-sm remove-entry-btn" title="Xóa khối nghĩa này"><i class="fas fa-trash-alt"></i> Xóa Khối</button></div><div class="relative"><input type="text" class="card-meaning-text-input block w-full p-2 pr-8 border border-slate-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500" value="${meaningBlockData.text}" placeholder="Nội dung nghĩa..." required></div><p class="meaning-text-error form-error-message hidden"></p><label class="block text-xs font-medium text-slate-500 mt-2">Ghi chú cho nghĩa này (tùy chọn)</label><div class="relative"><textarea rows="1" class="card-meaning-notes-input block w-full p-1.5 pr-8 border border-slate-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm" placeholder="Ghi chú cho nghĩa...">${meaningBlockData.notes}</textarea></div><div class="mt-3 border-t pt-3"><h4 class="text-xs font-semibold text-slate-600 mb-2">Các ví dụ cho nghĩa này:</h4><div class="examples-for-meaning-container space-y-2"></div><button type="button" class="add-example-to-meaning-btn text-xs bg-sky-500 hover:bg-sky-600 text-white font-semibold py-1.5 px-3 rounded-md shadow-sm mt-3 w-full"><i class="fas fa-plus mr-1"></i>Thêm Ví dụ</button></div>`; const examplesContainerDiv = meaningBlockDiv.querySelector('.examples-for-meaning-container'); if (meaningBlockData.examples && meaningBlockData.examples.length > 0) { meaningBlockData.examples.forEach(ex => examplesContainerDiv.appendChild(createExampleEntryElement(ex))); } meaningBlockDiv.querySelector('.remove-meaning-block-btn').addEventListener('click', function() { this.closest('.meaning-block').remove(); updateRemoveMeaningBlockButtonsState(); }); meaningBlockDiv.querySelector('.add-example-to-meaning-btn').addEventListener('click', function() { this.closest('.meaning-block').querySelector('.examples-for-meaning-container').appendChild(createExampleEntryElement()); }); const meaningTextInput = meaningBlockDiv.querySelector('.card-meaning-text-input'); const meaningTextError = meaningBlockDiv.querySelector('.meaning-text-error'); meaningTextInput.addEventListener('input', () => clearFieldError(meaningTextInput, meaningTextError)); if (meaningTextInput.parentNode.classList.contains('relative')) { createClearButtonForInput(meaningTextInput); } const meaningNotesInput = meaningBlockDiv.querySelector('.card-meaning-notes-input'); if (meaningNotesInput.parentNode.classList.contains('relative')) { createClearButtonForInput(meaningNotesInput); } return meaningBlockDiv; }
    function addMeaningBlockToEnd(meaningBlockData) { meaningBlocksContainer.appendChild(createMeaningBlockElement(meaningBlockData)); updateRemoveMeaningBlockButtonsState(); }
    function updateRemoveMeaningBlockButtonsState() { const meaningBlocks = meaningBlocksContainer.querySelectorAll('.meaning-block'); meaningBlocks.forEach(block => { const removeBtn = block.querySelector('.remove-meaning-block-btn'); if (removeBtn) removeBtn.disabled = meaningBlocks.length <= 1; }); }

    async function loadUserDecks() { 
        const currentUserId = window.authFunctions.getCurrentUserId(); 
        if (!currentUserId) { 
            userDecks = []; 
            populateDeckSelects(); 
            renderExistingDecksList(); 
            return; 
        } 
        console.log("Loading decks from Firestore for user ID:", currentUserId); 
        const decksCollectionRef = collection(db, 'users', currentUserId, 'decks');
        const q = query(decksCollectionRef, orderBy('name', 'asc')); 
        try {
            const querySnapshot = await getDocs(q);
            userDecks = querySnapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
            console.log("Decks loaded from Firestore:", userDecks);
        } catch (error) {
            console.error("Error loading decks from Firestore:", error);
            userDecks = []; 
            alert("Không thể tải danh sách bộ thẻ từ cơ sở dữ liệu. Vui lòng thử lại.");
        }
        populateDeckSelects(); 
        renderExistingDecksList(); 
    }

    async function createDeck(name) { 
        const currentUserId = window.authFunctions.getCurrentUserId(); 
        if (!currentUserId) { 
            alert("Vui lòng đăng nhập để tạo bộ thẻ."); 
            if (typeof window.authFunctions !== 'undefined' && typeof window.authFunctions.openAuthModal === 'function') {
                window.authFunctions.openAuthModal('login');
            }
            return null; 
        } 
        if (!name || !name.trim()) { 
            alert("Tên bộ thẻ không được để trống!"); 
            return null; 
        } 
        
        if (!Array.isArray(userDecks)) userDecks =[]; 
        if (userDecks.some(d => d.name.toLowerCase() === name.trim().toLowerCase())) { 
            alert("Tên bộ thẻ đã tồn tại!"); 
            return null; 
        } 
        
        const newDeckData = { 
            name: name.trim(), 
            createdAt: serverTimestamp(), 
            owner: currentUserId
        }; 

        try {
            const decksCollectionRef = collection(db, 'users', currentUserId, 'decks');
            const docRef = await addDoc(decksCollectionRef, newDeckData);
            console.log("Deck created in Firestore with ID:", docRef.id);
            
            const createdDeckForUI = { id: docRef.id, ...newDeckData, createdAt: Date.now() }; 
            userDecks.push(createdDeckForUI); 
            userDecks.sort((a,b)=>a.name.localeCompare(b.name,'vi')); 

            populateDeckSelects(); 
            renderExistingDecksList(); 
            return createdDeckForUI; 
        } catch (error) {
            console.error("Error creating deck in Firestore:", error);
            alert("Đã xảy ra lỗi khi tạo bộ thẻ. Vui lòng thử lại.");
            return null;
        }
    }

    async function updateDeckName(id, newName) { 
        const currentUserId = window.authFunctions.getCurrentUserId(); 
        if (!currentUserId) { alert("Vui lòng đăng nhập."); return false; } 
        if (!newName || !newName.trim()) { alert("Tên bộ thẻ không được để trống!"); return false; } 
        
        if (!Array.isArray(userDecks)) userDecks =[]; 
        if (userDecks.some(d => d.id !== id && d.name.toLowerCase() === newName.trim().toLowerCase())) { 
            alert("Tên bộ thẻ đã tồn tại!"); 
            return false; 
        } 
        
        const deckRef = doc(db, 'users', currentUserId, 'decks', id);
        try {
            await updateDoc(deckRef, { name: newName.trim() });
            console.log("Deck name updated in Firestore for ID:", id);

            const idx = userDecks.findIndex(d => d.id === id); 
            if (idx > -1) { 
                userDecks[idx].name = newName.trim(); 
                userDecks.sort((a,b)=>a.name.localeCompare(b.name,'vi'));
            }
            populateDeckSelects(); 
            renderExistingDecksList(); 
            updateMainHeaderTitle(); 
            return true; 
        } catch (error) {
            console.error("Error updating deck name in Firestore:", error);
            alert("Đã xảy ra lỗi khi cập nhật tên bộ thẻ. Vui lòng thử lại.");
            return false;
        }
    }
    
    function populateDeckSelects() { 
        const deckSelects = [userDeckSelect, cardDeckAssignmentSelect, jsonCardDeckAssignmentSelect, copyToDeckSelect]; 
        deckSelects.forEach(selectEl => {
            if (selectEl) {
                const currentValue = selectEl.value; 
                selectEl.innerHTML = ''; 
                if (selectEl === userDeckSelect) {
                     selectEl.innerHTML = '<option value="all_user_cards">Tất cả thẻ của tôi</option><option value="unassigned_cards">Thẻ chưa có bộ</option>';
                } else {
                     selectEl.innerHTML = '<option value="">-- Chọn bộ thẻ --</option>';
                }
                if (Array.isArray(userDecks)) { 
                    userDecks.forEach(d=>{const o=document.createElement('option');o.value=d.id;o.textContent=d.name;selectEl.appendChild(o);});
                }
                if (selectEl !== userDeckSelect) { 
                    const createNewOpt = document.createElement('option');
                    createNewOpt.value = "_create_new_deck_"; 
                    createNewOpt.textContent = "< Tạo bộ thẻ mới... >";
                    selectEl.appendChild(createNewOpt);
                }

                if (Array.from(selectEl.options).some(opt => opt.value === currentValue)) {
                    selectEl.value = currentValue;
                } else if (selectEl === userDeckSelect) {
                    selectEl.value = 'all_user_cards'; 
                }
            }
        });
    }
    function renderExistingDecksList() { 
        existingDecksList.innerHTML = ''; 
        if (!Array.isArray(userDecks) || !userDecks.length) { 
            existingDecksList.innerHTML = '<p class="text-slate-500 italic">Chưa có bộ thẻ nào.</p>'; return; 
        } 
        userDecks.forEach(d=>{ 
            const itemDiv = document.createElement('div');
            itemDiv.className='deck-item flex justify-between items-center p-2 border border-slate-200 rounded-md hover:bg-slate-50 transition-colors';
            itemDiv.dataset.deckId=d.id;
            
            const nameSpan = document.createElement('span');
            nameSpan.className='deck-name-display text-slate-700';
            nameSpan.textContent=d.name;
            
            const actionsDiv = document.createElement('div');
            actionsDiv.className='deck-actions space-x-2';
            
            const editBtn = document.createElement('button');
            editBtn.className='edit-deck-btn text-blue-500 hover:text-blue-700 p-1 transition-colors';
            editBtn.title = "Sửa tên bộ thẻ";
            editBtn.innerHTML='<i class="fas fa-edit"></i>';
            editBtn.onclick=()=>startEditDeckName(d.id, itemDiv);
            
            actionsDiv.appendChild(editBtn);
            itemDiv.appendChild(nameSpan);
            itemDiv.appendChild(actionsDiv);
            existingDecksList.appendChild(itemDiv);
        });
    }
    function startEditDeckName(id, el) { 
        const currentlyEditingInput = existingDecksList.querySelector('.editing-deck-input'); 
        if(currentlyEditingInput){
            const parentItem = currentlyEditingInput.closest('.deck-item'); 
            if(parentItem && parentItem.dataset.deckId) cancelEditDeckName(parentItem.dataset.deckId, parentItem);
        } 
        currentEditingDeckId = id;
        const nameSpan = el.querySelector('.deck-name-display');
        const actionsDiv = el.querySelector('.deck-actions');
        const originalName = nameSpan.textContent;
        
        nameSpan.style.display='none';
        actionsDiv.style.display='none';
        
        const input = document.createElement('input');
        input.type='text';
        input.value=originalName;
        input.className='editing-deck-input'; 
        
        const saveButton = document.createElement('button');
        saveButton.innerHTML='<i class="fas fa-check"></i>';
        saveButton.className='text-green-500 hover:text-green-700 p-1 ml-1 transition-colors';
        saveButton.title = "Lưu tên";
        saveButton.onclick= async () => { 
            const success = await handleSaveDeckName(id, input.value, el);
            if (!success) input.focus(); 
        };
        
        const cancelButton = document.createElement('button');
        cancelButton.innerHTML='<i class="fas fa-times"></i>';
        cancelButton.className='text-red-500 hover:text-red-700 p-1 ml-1 transition-colors';
        cancelButton.title = "Hủy";
        cancelButton.onclick=()=>cancelEditDeckName(id, el, originalName);
        
        const editControlsDiv = document.createElement('div');
        editControlsDiv.className='flex items-center edit-deck-controls w-full'; 
        editControlsDiv.appendChild(input);
        editControlsDiv.appendChild(saveButton);
        editControlsDiv.appendChild(cancelButton);
        
        el.insertBefore(editControlsDiv, actionsDiv); 
        input.focus();
        input.select();
    } 
    async function handleSaveDeckName(id, name, el){ 
        const success = await updateDeckName(id, name.trim());
        if (success) {
            cancelEditDeckName(id, el, name.trim()); 
        }
        currentEditingDeckId = null;
        return success; 
    }
    function cancelEditDeckName(id, el, originalName = null){
        const nameSpan = el.querySelector('.deck-name-display');
        const actionsDiv = el.querySelector('.deck-actions');
        const editControlsDiv = el.querySelector('.edit-deck-controls');
        
        if(editControlsDiv) el.removeChild(editControlsDiv);
        
        if (nameSpan) nameSpan.style.display='flex'; 
        if (originalName !== null && nameSpan) nameSpan.textContent = originalName; 
        if (actionsDiv) actionsDiv.style.display='flex'; 
        currentEditingDeckId = null;
    }

    function getWebCardGlobalId(cardItem) {
        if (!cardItem || cardItem.isUserCard) return null;
        let keyPart;
        switch(cardItem.category) {
            case 'phrasalVerbs':
                keyPart = cardItem.phrasalVerb;
                break;
            case 'collocations': 
                keyPart = cardItem.collocation; 
                break;
            default:
                keyPart = cardItem.word;
        }
        if (!keyPart) return `unknown-${generateUniqueId('uid')}`; 
        const sanitizedKeyPart = keyPart.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        return `${cardItem.category}-${sanitizedKeyPart}`;
    }

    async function getAllUniqueBaseVerbs() { 
        const allBaseVerbs = new Set(); 
        if (sampleData.phrasalVerbs) { 
            sampleData.phrasalVerbs.forEach(card => {if (card.baseVerb) allBaseVerbs.add(card.baseVerb.trim())}); 
        } 
        if (sampleData.collocations) {
            sampleData.collocations.forEach(card => {if (card.baseVerb) allBaseVerbs.add(card.baseVerb.trim())});
        }

        const userCards = await loadUserCards(); 
        if (Array.isArray(userCards)) {
            userCards.forEach(card => { 
                if ((card.category === 'phrasalVerbs' || card.category === 'collocations') && card.baseVerb) { 
                    allBaseVerbs.add(card.baseVerb.trim()); 
                } 
            }); 
        } else {
            console.warn("getAllUniqueBaseVerbs: userCards is not an array after load.", userCards);
        }
        return [...allBaseVerbs].filter(bv => bv).sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase())); 
    }
    async function getAllUniqueTags() { 
        const allTags = new Set(); 
        const categoriesWithTags = ['phrasalVerbs', 'collocations']; 

        categoriesWithTags.forEach(category => {
            if (sampleData[category]) {
                sampleData[category].forEach(card => {
                    if (card.tags && Array.isArray(card.tags)) {
                        card.tags.forEach(tag => allTags.add(tag.trim().toLowerCase()));
                    }
                });
            }
        });
        
        const userCards = await loadUserCards(); 
        if (Array.isArray(userCards)) {
            userCards.forEach(card => { 
                if (categoriesWithTags.includes(card.category) && card.tags && Array.isArray(card.tags)) { 
                    card.tags.forEach(tag => allTags.add(tag.trim().toLowerCase())); 
                } 
            }); 
        } else {
            console.warn("getAllUniqueTags: userCards is not an array after load.", userCards);
        }
        return [...allTags].filter(tag => tag && tag !== 'all' && !tag.startsWith('particle_')).sort((a,b) => a.localeCompare(b)); 
    }

    function showAutocompleteSuggestions(inputElement, suggestions, forTags = false) { hideAutocompleteSuggestions(inputElement); if (suggestions.length === 0) { return; } const suggestionsList = document.createElement('div'); suggestionsList.className = 'autocomplete-suggestions-list'; suggestionsList.id = `${inputElement.id}-suggestions`; suggestions.forEach(suggestionText => { const item = document.createElement('div'); item.className = 'autocomplete-suggestion-item'; item.textContent = suggestionText; item.onclick = () => { if (forTags) { const currentValue = inputElement.value; const parts = currentValue.split(',').map(p => p.trim()); parts.pop(); parts.push(suggestionText); inputElement.value = parts.join(', ') + ', '; } else { inputElement.value = suggestionText; } hideAutocompleteSuggestions(inputElement); inputElement.focus(); inputElement.dispatchEvent(new Event('input', { bubbles: true })); }; suggestionsList.appendChild(item); }); inputElement.parentNode.appendChild(suggestionsList); }
    function hideAutocompleteSuggestions(inputElement) { const listId = `${inputElement.id}-suggestions`; const existingList = document.getElementById(listId); if (existingList) { existingList.remove(); } }

    function openSidebar(){filterSidebar.classList.remove('-translate-x-full');filterSidebar.classList.add('translate-x-0');sidebarOverlay.classList.remove('hidden');updateSidebarFilterVisibility();}
    function closeSidebar(){filterSidebar.classList.add('-translate-x-full');filterSidebar.classList.remove('translate-x-0');sidebarOverlay.classList.add('hidden');}
    
    function updateSidebarFilterVisibility (){ 
        const cat=categorySelect.value;
        const isPVOrCollocation = cat === 'phrasalVerbs' || cat === 'collocations';
        baseVerbFilterContainer.style.display = isPVOrCollocation ?'block':'none';
        tagFilterContainer.style.display = isPVOrCollocation ?'block':'none'; 
        
        const isUserSource = cardSourceSelect.value === 'user';
        const currentUserId = window.authFunctions.getCurrentUserId(); 
        const isLoggedIn = !!currentUserId;

        userDeckFilterContainer.style.display = isUserSource ? 'block' : 'none';
        manageDecksBtn.style.display = isUserSource ? 'block' : 'none';
        
        if (userDeckSelect) userDeckSelect.disabled = !isUserSource || !isLoggedIn;
        if (manageDecksBtn) manageDecksBtn.disabled = !isUserSource || !isLoggedIn;
        if (openAddCardModalBtn) openAddCardModalBtn.disabled = !isUserSource || !isLoggedIn;
    }
    
    function updateMainHeaderTitle() { 
        const currentUserId = window.authFunctions.getCurrentUserId();
        const sourceText = currentDatasetSource === 'web' ? "Thẻ của Web" : (currentUserId ? "Thẻ của Tôi" : "Thẻ của Web (Chưa đăng nhập)"); 
        let deckText = "";
        if (currentDatasetSource === 'user' && currentUserId && userDeckSelect.value && userDeckSelect.value !== 'all_user_cards' && userDeckSelect.value !== 'unassigned_cards') {
            const selectedDeck = Array.isArray(userDecks) ? userDecks.find(d => d.id === userDeckSelect.value) : null;
            if (selectedDeck) deckText = ` - ${selectedDeck.name}`;
        } else if (currentDatasetSource === 'user' && currentUserId && userDeckSelect.value === 'unassigned_cards') {
            deckText = " - Thẻ chưa có bộ";
        }
        const categoryText = categorySelect.options[categorySelect.selectedIndex].text;
        mainHeaderTitle.textContent = `${sourceText}${deckText} - ${categoryText}`;
    }

    async function openAddEditModal(mode = 'add', cardData = null) {
        const currentUserId = window.authFunctions.getCurrentUserId();
        if (cardSourceSelect.value === 'user' && !currentUserId && mode !== 'json_import') { 
            alert("Vui lòng đăng nhập để thêm hoặc sửa thẻ của bạn.");
            if (typeof window.authFunctions !== 'undefined' && typeof window.authFunctions.openAuthModal === 'function') {
                window.authFunctions.openAuthModal('login');
            }
            return;
        }
        clearAllFormErrors();
        modalTitle.textContent = mode === 'add' ? 'Thêm thẻ mới' : (mode === 'edit' ? 'Sửa thẻ' : 'Nhập thẻ từ JSON');
        
        if (mode === 'json_import') {
            switchToInputMode('json');
        } else {
            switchToInputMode('manual');
        }

        addEditCardForm.reset();
        cardJsonInput.value = ''; 
        jsonImportErrorMessage.classList.add('hidden');
        jsonImportSuccessMessage.classList.add('hidden');

        cardIdInput.value = ''; 
        currentEditingCardId = cardData && mode === 'edit' ? cardData.id : null; 
        currentEditingDeckId = cardData && mode === 'edit' ? cardData.deckId : (userDeckSelect.value !== 'all_user_cards' && userDeckSelect.value !== 'unassigned_cards' ? userDeckSelect.value : null); 


        meaningBlocksContainer.innerHTML = '';
        const currentCategoryForForm = cardData ? cardData.category : categorySelect.value; 
        const isPVOrCollocation = currentCategoryForForm === 'phrasalVerbs' || currentCategoryForForm === 'collocations';
        phrasalVerbSpecificFields.style.display = isPVOrCollocation ? 'block' : 'none';
        
        if (isPVOrCollocation) { 
            baseVerbSuggestions = await getAllUniqueBaseVerbs(); 
            tagSuggestions = await getAllUniqueTags(); 
        } else { 
            hideAutocompleteSuggestions(cardBaseVerbInput); 
            hideAutocompleteSuggestions(cardTagsInput); 
        }
        initializeClearButtonsForModal();

        
        populateDeckSelects(); 
        const deckSelectToUse = currentInputMode === 'json' ? jsonCardDeckAssignmentSelect : cardDeckAssignmentSelect;
        const deckHintToUse = currentInputMode === 'json' ? jsonDeckCreationHint : deckCreationHint;


        if (cardSourceSelect.value === 'user' || mode === 'json_import') { 
            if (currentInputMode === 'json') {
                document.getElementById('json-deck-assignment-container').style.display = 'block';
            } else {
                modalDeckAssignmentContainer.style.display = 'block';
            }

            if (mode === 'edit' && cardData && cardData.deckId) { 
                deckSelectToUse.value = cardData.deckId; 
                if (deckHintToUse) deckHintToUse.classList.add('hidden'); 
            } else if (mode === 'add' && userDeckSelect.value && userDeckSelect.value !== 'all_user_cards' && userDeckSelect.value !== 'unassigned_cards') { 
                deckSelectToUse.value = userDeckSelect.value; 
                if (deckHintToUse) deckHintToUse.classList.add('hidden'); 
            } else { 
                deckSelectToUse.value = ''; 
                if ((!Array.isArray(userDecks) || userDecks.length === 0) && (mode === 'add' || mode === 'json_import')) { 
                    if (deckHintToUse) {
                        deckHintToUse.innerHTML = "Mẹo: Bạn cần tạo một bộ thẻ trước khi thêm thẻ mới. Hãy vào menu <i class='fas fa-bars'></i> > Quản lý Bộ thẻ."; 
                        deckHintToUse.classList.remove('hidden'); 
                    }
                } else { 
                    if (deckHintToUse) deckHintToUse.classList.add('hidden'); 
                } 
            }
        } else {
            modalDeckAssignmentContainer.style.display = 'none';
            if (deckHintToUse) deckHintToUse.classList.add('hidden');
            document.getElementById('json-deck-assignment-container').style.display = 'none';
        }

        if (mode === 'edit' && cardData) { 
            cardIdInput.value = cardData.id; 
            let wordOrPhrase = '';
            if (cardData.category === 'phrasalVerbs') wordOrPhrase = cardData.phrasalVerb;
            else if (cardData.category === 'collocations') wordOrPhrase = cardData.collocation;
            else wordOrPhrase = cardData.word;
            cardWordInput.value = wordOrPhrase || ''; 

            cardPronunciationInput.value = cardData.pronunciation || ''; 
            cardGeneralNotesInput.value = cardData.generalNotes || ''; 
            if (cardData.meanings && cardData.meanings.length > 0) { 
                cardData.meanings.forEach(meaningBlock => addMeaningBlockToEnd(meaningBlock)); 
            } else {
                addMeaningBlockToEnd(); 
            }
            if (cardData.category === 'phrasalVerbs' || cardData.category === 'collocations') { 
                cardBaseVerbInput.value = cardData.baseVerb || ''; 
                cardTagsInput.value = Array.isArray(cardData.tags) ? cardData.tags.filter(t => t && t !== 'all' && !t.startsWith('particle_')).join(', ') : ''; 
            } 
        } else if (mode === 'add') { 
            addMeaningBlockToEnd(); 
            cardGeneralNotesInput.value = ''; 
        }
        updateRemoveMeaningBlockButtonsState();
        [cardWordInput, cardPronunciationInput, cardBaseVerbInput, cardTagsInput, cardGeneralNotesInput].forEach(input => { if (input) input.dispatchEvent(new Event('input', { bubbles: true })); });
        meaningBlocksContainer.querySelectorAll('.card-meaning-text-input, .card-meaning-notes-input').forEach(input => { if (input) input.dispatchEvent(new Event('input', { bubbles: true })); });
        addEditCardModal.classList.remove('hidden', 'opacity-0');
        addEditCardModal.querySelector('.modal-content').classList.remove('scale-95');
        addEditCardModal.querySelector('.modal-content').classList.add('scale-100');
        if (currentInputMode === 'manual') {
            cardWordInput.focus(); 
        } else {
            cardJsonInput.focus();
        }
    }

    function closeAddEditModal(){ 
        hideAutocompleteSuggestions(cardBaseVerbInput); 
        hideAutocompleteSuggestions(cardTagsInput); 
        addEditCardModal.classList.add('opacity-0'); 
        addEditCardModal.querySelector('.modal-content').classList.add('scale-95'); 
        setTimeout(()=>{
            addEditCardModal.classList.add('hidden');
            switchToInputMode('manual'); 
        },250); 
    }
    function clearLearningTimer(){clearTimeout(learningCardNextButtonTimer);learningCardNextButtonTimer=null;clearInterval(learningCardCountdownInterval);learningCardCountdownInterval=null;if(nextBtn&&nextBtn.textContent.includes('('))nextBtn.innerHTML='Tiếp <i class="fas fa-arrow-right ml-1"></i>';}
    
    async function startLearningTimer(){ 
        clearLearningTimer();
        if(window.currentData.length===0||practiceType!=="off"||!nextBtn){
            if(nextBtn){
                nextBtn.disabled=(window.currentIndex>=window.currentData.length-1||window.currentData.length===0);
                if(!nextBtn.textContent.includes('('))nextBtn.innerHTML='Tiếp <i class="fas fa-arrow-right ml-1"></i>';
            }
            updateCardInfo();
            return;
        }
        const i=window.currentData[window.currentIndex];
        const sO = await getCardStatus(i); 

        if(currentDatasetSource==='web'&&sO&&sO.status==='learning'&&!i.isUserCard){
            nextBtn.disabled=true;let c=30;nextBtn.innerHTML=`Tiếp (${c}s) <i class="fas fa-arrow-right ml-1"></i>`;
            learningCardCountdownInterval=setInterval(()=>{c--;if(c>0){if(nextBtn.disabled)nextBtn.innerHTML=`Tiếp (${c}s) <i class="fas fa-arrow-right ml-1"></i>`;}else{clearInterval(learningCardCountdownInterval);learningCardCountdownInterval=null;}},1000);
            learningCardNextButtonTimer=setTimeout(()=>{clearInterval(learningCardCountdownInterval);learningCardCountdownInterval=null;nextBtn.disabled=false;nextBtn.innerHTML='Tiếp <i class="fas fa-arrow-right ml-1"></i>';updateCardInfo();},30000);
        }else{
            nextBtn.disabled=(window.currentIndex>=window.currentData.length-1||window.currentData.length===0);
            nextBtn.innerHTML='Tiếp <i class="fas fa-arrow-right ml-1"></i>';
        }
        updateCardInfo();
    }
    
    function getCardIdentifier(item){
        if(!item) return null; 
        return item.id; 
    }
    
    async function getCardStatus(cardItem){ 
        if (!cardItem) return {status:'new',lastReviewed:null,reviewCount:0};
        
        if (cardItem.isUserCard) { 
            return {
                status: cardItem.status || 'new',
                lastReviewed: cardItem.lastReviewed || null, 
                reviewCount: cardItem.reviewCount || 0
            };
        } else { 
            const currentUserId = window.authFunctions.getCurrentUserId();
            if (currentUserId) { 
                return {
                    status: cardItem.status || 'new',
                    lastReviewed: cardItem.lastReviewed || null,
                    reviewCount: cardItem.reviewCount || 0
                };
            } else { 
                const webCardGlobalId = getWebCardGlobalId(cardItem);
                const defaultStatus = {status:'new',lastReviewed:null,reviewCount:0};
                if (!webCardGlobalId) return defaultStatus;
                try {
                    const legacyStatuses = JSON.parse(localStorage.getItem('flashcardCardStatuses_v4_nested_linked_ui_fixed_v2') || '{}'); 
                    const statusKey = webCardGlobalId; 
                    if (!legacyStatuses[statusKey]) return defaultStatus;
                    const s = legacyStatuses[statusKey];
                    return {status:s.status||'new',lastReviewed:s.lastReviewed||null,reviewCount:s.reviewCount||0};
                } catch (e) {
                    console.error("Error parsing legacy card statuses from localStorage", e);
                    return defaultStatus;
                }
            }
        }
    }

    async function setCardStatus(newStatusValue){ 
        if(window.currentData.length===0)return;
        const cardItem = window.currentData[window.currentIndex];
        if(!cardItem) return;

        const currentUserId = window.authFunctions.getCurrentUserId();

        if (cardItem.isUserCard) {
            if (!currentUserId || !cardItem.deckId || !cardItem.id) {
                console.error("Không thể cập nhật trạng thái thẻ người dùng: thiếu userId, deckId hoặc cardId.");
                alert("Lỗi: Không tìm thấy thông tin cần thiết để cập nhật trạng thái thẻ.");
                return;
            }
            
            const cardRef = doc(db, 'users', currentUserId, 'decks', cardItem.deckId, 'cards', cardItem.id);
            const newStatusData = {
                status: newStatusValue,
                lastReviewed: serverTimestamp(), 
                reviewCount: (cardItem.reviewCount || 0) + (newStatusValue !== 'new' ? 1 : 0)
            };

            try {
                await updateDoc(cardRef, newStatusData);
                console.log(`Card status updated in Firestore for user card ID: ${cardItem.id} to ${newStatusValue}`);
                cardItem.status = newStatusValue;
                cardItem.lastReviewed = Date.now(); 
                cardItem.reviewCount = newStatusData.reviewCount;
            } catch (error) {
                console.error("Error updating user card status in Firestore:", error);
                alert("Lỗi cập nhật trạng thái thẻ trên server. Vui lòng thử lại.");
                return; 
            }
        } else { // Thẻ của Web
            if (currentUserId) { 
                const webCardGlobalId = getWebCardGlobalId(cardItem);
                if (!webCardGlobalId) {
                    console.error("Không thể tạo ID cho thẻ web để lưu trạng thái.");
                    alert("Lỗi: Không thể xác định thẻ web để cập nhật trạng thái.");
                    return;
                }
                const statusRef = doc(db, 'users', currentUserId, 'webCardStatuses', webCardGlobalId);
                const currentReviewCount = cardItem.reviewCount || 0; 
                const newStatusDataForWebCard = {
                    status: newStatusValue,
                    lastReviewed: serverTimestamp(),
                    reviewCount: currentReviewCount + (newStatusValue !== 'new' ? 1 : 0),
                    originalCategory: cardItem.category, 
                    originalWordOrPhrase: cardItem.category === 'phrasalVerbs' ? cardItem.phrasalVerb : (cardItem.category === 'collocations' ? cardItem.collocation : cardItem.word)
                };
                try {
                    await setDoc(statusRef, newStatusDataForWebCard, { merge: true }); 
                    console.log(`Web card status updated/set in Firestore for ID: ${webCardGlobalId} to ${newStatusValue}`);
                    cardItem.status = newStatusValue;
                    cardItem.lastReviewed = Date.now();
                    cardItem.reviewCount = newStatusDataForWebCard.reviewCount;
                } catch (error) {
                    console.error("Error updating web card status in Firestore:", error);
                    alert("Lỗi cập nhật trạng thái thẻ web trên server. Vui lòng thử lại.");
                    return;
                }
            } else {
                console.log("Người dùng chưa đăng nhập, trạng thái thẻ web không được lưu vào Firestore. Nút trạng thái sẽ không hoạt động cho thẻ web.");
                return; 
            }
        }
        
        updateStatusButtonsUI(getCardIdentifier(cardItem), cardItem.category); 
        startLearningTimer();
        if(newStatusValue==='learned'&&getCategoryState(currentDatasetSource,categorySelect.value).filterMarked==='all_study')applyAllFilters();
    }

    async function updateStatusButtonsUI(cardId, cardCategory){ 
        const statusButtons = [{btn:statusBtnNew,status:'new'},{btn:statusBtnLearning,status:'learning'},{btn:statusBtnLearned,status:'learned'}];
        const currentCardItem = window.currentData.length > 0 ? window.currentData[window.currentIndex] : null;

        if(!currentCardItem || (!currentCardItem.isUserCard && !window.authFunctions.getCurrentUserId()) ){ 
            statusButtons.forEach(obj=>{if(obj.btn){obj.btn.classList.remove('bg-indigo-600','text-white','border-indigo-700');obj.btn.classList.add('bg-white','text-slate-700','border-slate-300');obj.btn.disabled=true;}}); 
            return;
        }
        statusButtons.forEach(obj=>{if(obj.btn)obj.btn.disabled=false;});
        
        const cardStatusObject = await getCardStatus(currentCardItem); 
        const currentStatusValue = cardStatusObject.status;

        statusButtons.forEach(obj=>{
            if(obj.btn){
                obj.btn.classList.toggle('bg-indigo-600',obj.status===currentStatusValue);
                obj.btn.classList.toggle('text-white',obj.status===currentStatusValue);
                obj.btn.classList.toggle('border-indigo-700',obj.status===currentStatusValue);
                obj.btn.classList.toggle('bg-white',obj.status!==currentStatusValue);
                obj.btn.classList.toggle('text-slate-700',obj.status!==currentStatusValue);
                obj.btn.classList.toggle('border-slate-300',obj.status!==currentStatusValue);
            }
        });
        if(statusBtnNew && currentDatasetSource === 'web' && currentStatusValue === 'learning' && !currentCardItem.isUserCard) {
            statusBtnNew.disabled = true;
        }
    }
    
    async function loadUserCards(deckIdToLoad = null) { 
        const currentUserId = window.authFunctions.getCurrentUserId(); 
        if (!currentUserId) { 
            console.log("loadUserCards: No user logged in.");
            return []; 
        } 

        let cards = [];
        const selectedDeckId = deckIdToLoad || userDeckSelect.value; 

        if (selectedDeckId && selectedDeckId !== 'all_user_cards' && selectedDeckId !== 'unassigned_cards') {
            console.log(`loadUserCards: Loading cards for deck ID: ${selectedDeckId} for user ID: ${currentUserId}`);
            const cardsCollectionRef = collection(db, 'users', currentUserId, 'decks', selectedDeckId, 'cards');
            const qCards = query(cardsCollectionRef, orderBy('createdAt', 'asc')); 
            try {
                const querySnapshot = await getDocs(qCards);
                cards = querySnapshot.docs.map(docSnap => {
                    const data = docSnap.data();
                    return { 
                        id: docSnap.id, 
                        ...data, 
                        isUserCard: true, 
                        status: data.status || 'new',
                        lastReviewed: data.lastReviewed?.toDate ? data.lastReviewed.toDate().getTime() : (data.lastReviewed || null),
                        reviewCount: data.reviewCount || 0,
                        createdAt: data.createdAt?.toDate ? data.createdAt.toDate().getTime() : (data.createdAt || null),
                        updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().getTime() : (data.updatedAt || null)
                    };
                });
                console.log(`Cards loaded from Firestore for deck ${selectedDeckId}:`, cards);
            } catch (error) {
                console.error(`Error loading cards for deck ${selectedDeckId} from Firestore:`, error);
                alert("Không thể tải danh sách thẻ. Vui lòng thử lại.");
            }
        } else if (selectedDeckId === 'all_user_cards') {
            console.log(`loadUserCards: Loading ALL cards for user ID: ${currentUserId}`);
            if (Array.isArray(userDecks)) {
                for (const deck of userDecks) {
                    const deckCards = await loadUserCards(deck.id); 
                    cards.push(...deckCards);
                }
            }
             console.log(`All cards loaded for user ${currentUserId}:`, cards);
        } else if (selectedDeckId === 'unassigned_cards') {
            console.log(`loadUserCards: Loading UNASSIGNED cards for user ID: ${currentUserId} - NOT IMPLEMENTED YET`);
        }
        
        return cards;
    }
    
    async function handleSaveCard() { 
        const currentUserId = window.authFunctions.getCurrentUserId();
        if (!currentUserId && cardSourceSelect.value === 'user') { 
            alert("Vui lòng đăng nhập để lưu thẻ.");
            if (typeof window.authFunctions !== 'undefined' && typeof window.authFunctions.openAuthModal === 'function') {
                window.authFunctions.openAuthModal('login');
            }
            return;
        }
        clearAllFormErrors(); 
        let isValid = true; 
        const cardCategory = categorySelect.value; 
        const wordValue = cardWordInput.value.trim(); 
        if (!wordValue) { displayFieldError(cardWordInput, cardWordError, "Từ/Cụm từ không được để trống."); isValid = false; } 
        
        const meaningBlockElements = meaningBlocksContainer.querySelectorAll('.meaning-block'); 
        let hasAtLeastOneValidMeaning = false; 
        if (meaningBlockElements.length === 0) { 
            meaningBlocksGeneralError.textContent = "Cần ít nhất một khối nghĩa."; 
            meaningBlocksGeneralError.classList.remove('hidden'); 
            isValid = false; 
        } else { 
            meaningBlockElements.forEach(block => { 
                const meaningTextInput = block.querySelector('.card-meaning-text-input'); 
                const meaningTextError = meaningTextInput.parentNode.nextElementSibling; 
                const meaningText = meaningTextInput.value.trim(); 
                if (!meaningText) { 
                    displayFieldError(meaningTextInput, meaningTextError, "Nội dung nghĩa không được để trống."); 
                    isValid = false; 
                } else { 
                    hasAtLeastOneValidMeaning = true; 
                    clearFieldError(meaningTextInput, meaningTextError); 
                } 
            }); 
        } 
        if (!hasAtLeastOneValidMeaning && meaningBlockElements.length > 0) { 
            meaningBlocksGeneralError.textContent = "Cần ít nhất một khối nghĩa có nội dung."; 
            meaningBlocksGeneralError.classList.remove('hidden'); 
            isValid = false; 
        } 
        
        const assignedDeckId = cardDeckAssignmentSelect.value;
        if (cardSourceSelect.value === 'user' && !assignedDeckId) {
            alert("Vui lòng chọn một bộ thẻ để lưu thẻ này.");
            isValid = false;
        }

        if (!isValid) { return; } 
        
        const meaningsData = Array.from(meaningBlockElements).map(block => { 
            const meaningText = block.querySelector('.card-meaning-text-input').value.trim(); 
            if (!meaningText) return null; 
            const exampleEntryElements = block.querySelectorAll('.example-entry'); 
            const examplesForThisMeaning = Array.from(exampleEntryElements).map(exEntry => { 
                const eng = exEntry.querySelector('.card-example-eng-input').value.trim(); 
                if (!eng) return null; 
                return { 
                    id: exEntry.dataset.exampleId || generateUniqueId('ex'), 
                    eng: eng, 
                    vie: exEntry.querySelector('.card-example-vie-input').value.trim(), 
                    exampleNotes: exEntry.querySelector('.card-example-notes-input').value.trim() 
                }; 
            }).filter(ex => ex); 
            return { 
                id: block.dataset.meaningId || generateUniqueId('meaning'), 
                text: meaningText, 
                notes: block.querySelector('.card-meaning-notes-input').value.trim(), 
                examples: examplesForThisMeaning 
            }; 
        }).filter(m => m); 
        
        const cardDataToSave = { 
            pronunciation: cardPronunciationInput.value.trim(), 
            meanings: meaningsData, 
            generalNotes: cardGeneralNotesInput.value.trim(), 
            category: cardCategory, 
            deckId: assignedDeckId, 
            status: 'new',
            lastReviewed: null, 
            reviewCount: 0,
            updatedAt: serverTimestamp() 
        }; 
        
        if (cardCategory === 'phrasalVerbs' || cardCategory === 'collocations') { 
            if (cardCategory === 'phrasalVerbs') cardDataToSave.phrasalVerb = wordValue;
            if (cardCategory === 'collocations') cardDataToSave.collocation = wordValue; 
            cardDataToSave.baseVerb = cardBaseVerbInput.value.trim() || null; 
            cardDataToSave.tags = cardTagsInput.value.trim().split(',').map(t => t.trim().toLowerCase()).filter(t => t && t !== 'all' && !t.startsWith('particle_')); 
        } else {
            cardDataToSave.word = wordValue;
        }

        const editingCardId = cardIdInput.value; 

        try {
            if (editingCardId) { 
                cardDataToSave.updatedAt = serverTimestamp(); 
                const cardRef = doc(db, 'users', currentUserId, 'decks', assignedDeckId, 'cards', editingCardId);
                await updateDoc(cardRef, cardDataToSave);
                console.log("Card updated in Firestore with ID:", editingCardId);
                alert("Đã cập nhật thẻ!");
            } else { 
                cardDataToSave.createdAt = serverTimestamp(); 
                const cardsCollectionRef = collection(db, 'users', currentUserId, 'decks', assignedDeckId, 'cards');
                const docRef = await addDoc(cardsCollectionRef, cardDataToSave);
                console.log("Card added to Firestore with ID:", docRef.id);
                alert("Đã thêm thẻ mới!");
            }
            
            closeAddEditModal();
            if (currentDatasetSource === 'user') {
                await loadVocabularyData(categorySelect.value); 
            }

        } catch (error) {
            console.error("Error saving card to Firestore:", error);
            alert("Đã xảy ra lỗi khi lưu thẻ. Vui lòng thử lại.");
        }
        currentEditingCardId = null; 
    }

    async function handleDeleteCard(){ 
        const currentUserId = window.authFunctions.getCurrentUserId(); 
        if (!currentUserId) { 
            alert("Vui lòng đăng nhập để xóa thẻ."); 
            return; 
        } 
        if(window.currentData.length===0 || !window.currentData[window.currentIndex].isUserCard) {
            alert("Không thể xóa thẻ này (không phải thẻ của bạn hoặc không có thẻ).");
            return;
        }

        const cardToDelete = window.currentData[window.currentIndex];
        const cardIdToDelete = cardToDelete.id;
        const deckIdOfCard = cardToDelete.deckId;

        if (!cardIdToDelete || !deckIdOfCard) {
            alert("Không thể xác định thẻ để xóa. Thiếu ID thẻ hoặc ID bộ thẻ.");
            return;
        }

        if(!confirm(`Bạn có chắc chắn muốn xóa thẻ "${getCardIdentifier(cardToDelete,cardToDelete.category)}"? Hành động này không thể hoàn tác.`))return;
        
        try {
            const cardRef = doc(db, 'users', currentUserId, 'decks', deckIdOfCard, 'cards', cardIdToDelete);
            await deleteDoc(cardRef);
            console.log("Card deleted from Firestore:", cardIdToDelete);
            alert("Đã xóa thẻ.");

            let newIndex = window.currentIndex;
            if(window.currentIndex >= window.currentData.length - 1 && window.currentIndex > 0) {
                newIndex = window.currentIndex - 1;
            } else if (window.currentData.length - 1 === 0) {
                newIndex = 0;
            }
            
            await loadVocabularyData(categorySelect.value); 
            
            if(window.currentData.length > 0){
                window.currentIndex = Math.min(newIndex, window.currentData.length - 1);
                window.currentIndex = Math.max(0, window.currentIndex);
            } else {
                window.currentIndex = 0;
            }
            getCategoryState(currentDatasetSource,categorySelect.value).currentIndex = window.currentIndex;
            saveAppState(); 
            window.updateFlashcard();

        } catch (error) {
            console.error("Error deleting card from Firestore:", error);
            alert("Đã xảy ra lỗi khi xóa thẻ. Vui lòng thử lại.");
        }
    }
    function shuffleArray(arr){const nA=[...arr];for(let i=nA.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[nA[i],nA[j]]=[nA[j],nA[i]];}return nA;}
    function speakText(txt,meta=[],cb=null){if(!txt||!txt.trim()){if(cb)cb();return;}if('speechSynthesis'in window){const u=new SpeechSynthesisUtterance(txt);u.lang='en-US';u.rate=0.9;u.pitch=1;window.speechSynthesis.cancel();if(meta.length>0){u.onstart=()=>meta.forEach(m=>m.element.classList.remove('highlighted-word'));u.onboundary=e=>{meta.forEach(m=>m.element.classList.remove('highlighted-word'));let f=false;for(const m of meta){if(e.charIndex>=m.start&&e.charIndex<m.start+m.length){m.element.classList.add('highlighted-word');f=true;break;}}if(!f&&meta.length>0){for(let i=meta.length-1;i>=0;i--){const m=meta[i];if(e.charIndex>=m.start){if((i===meta.length-1)||(e.charIndex<meta[i+1].start)){m.element.classList.add('highlighted-word');break;}}}}};u.onend=()=>{meta.forEach(m=>m.element.classList.remove('highlighted-word'));if(cb)cb();};u.onerror=e=>{meta.forEach(m=>m.element.classList.remove('highlighted-word'));console.error("Lỗi phát âm:", e);if(cb)cb();};}else{u.onend=()=>{if(cb)cb();};u.onerror=e=>{console.error("Lỗi phát âm:", e);if(cb)cb();};}window.speechSynthesis.speak(u);}else{console.warn("Trình duyệt không hỗ trợ Speech Synthesis.");if(cb)cb();}}
    function playNextExampleInQueue(){if(!isSpeakingExampleQueue||currentExampleSpeechIndex>=exampleSpeechQueue.length){isSpeakingExampleQueue=false;currentExampleSpeechIndex=0;exampleSpeechQueue=[];speakerExampleBtn.disabled=!(window.currentData[window.currentIndex]&&window.currentData[window.currentIndex].meanings.some(m=>m.examples&&m.examples.length>0));return;}const p=exampleSpeechQueue[currentExampleSpeechIndex];speakText(p.text,p.spansMeta,()=>{currentExampleSpeechIndex++;playNextExampleInQueue();});}
    function populateBaseVerbFilter(arr){const bV=new Set();arr.forEach(i=>{if(i.baseVerb)bV.add(i.baseVerb);});baseVerbSelect.innerHTML='';const oA=document.createElement('option');oA.value='all';oA.textContent='Tất cả từ gốc';baseVerbSelect.appendChild(oA);const sBV=Array.from(bV).sort((a,b)=>a.localeCompare(b,'en'));sBV.forEach(v=>{const o=document.createElement('option');o.value=v;o.textContent=v.charAt(0).toUpperCase()+v.slice(1);baseVerbSelect.appendChild(o);});}
    function populateTagFilter(arr){const tT=new Set();arr.forEach(i=>{if(i.tags&&Array.isArray(i.tags)){i.tags.forEach(t=>{if(tagDisplayNames[t]&&t!=='all'&&!t.startsWith('particle_'))tT.add(t);});}});tagSelect.innerHTML='';const oA=document.createElement('option');oA.value='all';oA.textContent=tagDisplayNames["all"]||'Tất cả chủ đề';tagSelect.appendChild(oA);const sTK=Array.from(tT).sort((a,b)=>(tagDisplayNames[a]||a).localeCompare(tagDisplayNames[b]||b,'vi'));sTK.forEach(tK=>{const o=document.createElement('option');o.value=tK;o.textContent=tagDisplayNames[tK]||(tK.charAt(0).toUpperCase()+tK.slice(1));tagSelect.appendChild(o);});}

    async function applyAllFilters(fromLoad=false){ 
        const currentUserId = window.authFunctions.getCurrentUserId();
        clearLearningTimer();const cCV=categorySelect.value;const sFCSC=getCategoryState(currentDatasetSource,cCV);let cST=searchInput.value.trim().toLowerCase();if(!fromLoad){if(cCV==='phrasalVerbs' || cCV === 'collocations'){sFCSC.baseVerb=baseVerbSelect.value;sFCSC.tag=tagSelect.value;}if(currentDatasetSource==='user' && currentUserId)sFCSC.deckId=userDeckSelect.value;sFCSC.filterMarked=filterCardStatusSelect.value;sFCSC.currentIndex=0;}let lTP=[...activeMasterList];if(currentDatasetSource==='user' && currentUserId){const sDI=sFCSC.deckId||userDeckSelect.value;if(sDI&&sDI!=='all_user_cards'){if(sDI==='unassigned_cards')lTP=lTP.filter(i=>!i.deckId);else lTP=lTP.filter(i=>i.deckId===sDI);}}if(currentDatasetSource==='user' && currentUserId)lTP=lTP.filter(i=>i.category===cCV);if(cCV==='phrasalVerbs' || cCV === 'collocations'){if(sFCSC.baseVerb&&sFCSC.baseVerb!=='all')lTP=lTP.filter(i=>i.baseVerb===sFCSC.baseVerb);if(sFCSC.tag&&sFCSC.tag!=='all')lTP=lTP.filter(i=>i.tags&&i.tags.includes(sFCSC.tag));}if(cST){lTP=lTP.filter(i=>{const wOP=(i.category==='phrasalVerbs'?i.phrasalVerb:(i.category === 'collocations' ? i.collocation : i.word))||'';if(wOP.toLowerCase().includes(cST))return true;if(i.meanings&&i.meanings.some(m=>m.text.toLowerCase().includes(cST)))return true;if(i.meanings){for(const meaning of i.meanings){if(meaning.examples && meaning.examples.some(ex => ex.eng.toLowerCase().includes(cST) || (ex.vie && ex.vie.toLowerCase().includes(cST)) )) return true;}}return false;});}const sFV=sFCSC.filterMarked;if(sFV!=='all_visible'){
            const filteredByStatus = [];
            for (const item of lTP) {
                const cardStatusObj = await getCardStatus(item); 
                const sV = cardStatusObj.status;
                if(sFV==='all_study' && (sV==='new'||sV==='learning')) filteredByStatus.push(item);
                else if(sFV==='new' && sV==='new') filteredByStatus.push(item);
                else if(sFV==='learning' && sV==='learning') filteredByStatus.push(item);
                else if(sFV==='learned' && sV==='learned') filteredByStatus.push(item);
                else if (sFV === 'all_visible') filteredByStatus.push(item); 
            }
            lTP = filteredByStatus;
        }
        window.currentData=lTP;if(fromLoad){let nI=sFCSC.currentIndex||0;if(window.currentData.length===0)nI=0;else{nI=Math.min(nI,window.currentData.length-1);nI=Math.max(0,nI);}window.currentIndex=nI;}else window.currentIndex=0;sFCSC.currentIndex=window.currentIndex;saveAppState();window.updateFlashcard();window.updateMainHeaderTitle();}

    async function loadVocabularyData (category) { 
        const currentUserId = window.authFunctions.getCurrentUserId();
        clearLearningTimer();
        wordDisplay.innerHTML = '<span class="text-slate-400 text-xl">Đang tải dữ liệu...</span>';
        currentWordSpansMeta = []; pronunciationDisplay.textContent = ''; tagsDisplayFront.textContent = ''; meaningDisplayContainer.innerHTML = ''; notesDisplay.innerHTML = '';
        window.currentData = []; activeMasterList = []; speakerBtn.disabled = true; speakerExampleBtn.disabled = true;

        const stateForCurrentSourceCategory = getCategoryState(currentDatasetSource, category);
        filterCardStatusSelect.value = stateForCurrentSourceCategory.filterMarked;
        
        if (currentDatasetSource === 'user') {
            if (!currentUserId) { 
                wordDisplay.classList.add('word-display-empty-state');
                wordDisplay.innerHTML = `<p>Vui lòng đăng nhập để xem hoặc tạo thẻ của bạn.</p><button id="login-prompt-btn" class="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-md mt-2">Đăng nhập ngay</button>`;
                const loginPromptBtn = document.getElementById('login-prompt-btn');
                if(loginPromptBtn) loginPromptBtn.onclick = () => {
                    if (typeof window.authFunctions !== 'undefined' && typeof window.authFunctions.openAuthModal === 'function') {
                            window.authFunctions.openAuthModal('login');
                    }
                };
                pronunciationDisplay.style.display = 'none'; tagsDisplayFront.style.display = 'none'; speakerBtn.style.display = 'none'; speakerExampleBtn.style.display = 'none';
                updateStatusButtonsUI(null, null); updateCardInfo(); window.updateMainHeaderTitle(); window.updateSidebarFilterVisibility();
                return; 
            }
            await loadUserDecks(); 
            userDeckSelect.value = stateForCurrentSourceCategory.deckId || appState.lastSelectedDeckId || 'all_user_cards';
            activeMasterList = await loadUserCards(); 
        } else { 
            try {
                const response = await fetch(`data/${category}.json?v=${new Date().getTime()}`);
                if (!response.ok) { 
                    console.warn(`Lỗi HTTP: ${response.status} khi tải ${category}.json. Sử dụng dữ liệu mẫu.`); 
                    throw new Error(`HTTP error ${response.status}`); 
                }
                const jsonData = await response.json();
                if (jsonData && jsonData[category] && jsonData[category].length > 0) { 
                    let webCards = jsonData[category].map(card => {
                        let meaningsArray = [];
                        if (Array.isArray(card.meanings)) { 
                            meaningsArray = card.meanings.map(m => ({
                                id: m.id || generateUniqueId('wm_'),
                                text: m.text || '',
                                notes: m.notes || '',
                                examples: Array.isArray(m.examples) ? m.examples.map(ex => ({
                                    id: ex.id || generateUniqueId('wex_'),
                                    eng: ex.eng || '',
                                    vie: ex.vie || '',
                                    exampleNotes: ex.exampleNotes || ''
                                })) : []
                            }));
                        } else if (card.meaning) { 
                            let examplesArray = [];
                            if (card.example) {
                                examplesArray.push({
                                    id: generateUniqueId('wex_'),
                                    eng: card.example,
                                    vie: card.exampleVie || ''
                                });
                            }
                            meaningsArray.push({
                                id: generateUniqueId('wm_'),
                                text: card.meaning,
                                notes: '', 
                                examples: examplesArray
                            });
                        }

                        return { 
                            ...card, 
                            id: getWebCardGlobalId(card), 
                            isUserCard: false, 
                            category: category, 
                            meanings: meaningsArray, 
                            generalNotes: card.generalNotes || card.notes || '', 
                            status: 'new', 
                            lastReviewed: null,
                            reviewCount: 0
                        };
                    }); 

                    if (currentUserId && webCards.length > 0) {
                        const statusPromises = webCards.map(async (card) => {
                            const webId = card.id; 
                            if (webId) {
                                const statusRef = doc(db, 'users', currentUserId, 'webCardStatuses', webId);
                                try {
                                    const statusSnap = await getDoc(statusRef);
                                    if (statusSnap.exists()) {
                                        const firestoreStatus = statusSnap.data();
                                        card.status = firestoreStatus.status || 'new';
                                        card.lastReviewed = firestoreStatus.lastReviewed?.toDate ? firestoreStatus.lastReviewed.toDate().getTime() : (firestoreStatus.lastReviewed || null);
                                        card.reviewCount = firestoreStatus.reviewCount || 0;
                                    }
                                } catch (err) {
                                    console.error("Error fetching web card status for", webId, err);
                                }
                            }
                            return card;
                        });
                        activeMasterList = await Promise.all(statusPromises);
                    } else {
                        activeMasterList = webCards;
                    }
                } else { 
                    console.warn(`Không có dữ liệu trong ${category}.json. Sử dụng dữ liệu mẫu.`); 
                    throw new Error('Empty JSON data'); 
                }
            } catch (error) {
                console.error(`Lỗi tải dữ liệu Web cho '${category}':`, error.message);
                if (sampleData[category] && sampleData[category].length > 0) { 
                    activeMasterList = sampleData[category].map(card => ({
                        ...card, 
                        id: getWebCardGlobalId({category: category, word: card.word, phrasalVerb: card.phrasalVerb, collocation: card.collocation}),
                        isUserCard: false, 
                        category: category,
                        status: 'new', 
                        lastReviewed: null,
                        reviewCount: 0
                    })); 
                    console.log(`Đã tải dữ liệu mẫu cho '${category}'.`); 
                } else { 
                    activeMasterList = []; 
                    console.log(`Không có dữ liệu mẫu cho '${category}'.`); 
                }
            }
        }
        window.updateSidebarFilterVisibility(); 
        baseVerbSelect.innerHTML = ''; tagSelect.innerHTML = '';
        if (category !== 'phrasalVerbs' && category !== 'collocations') { 
            stateForCurrentSourceCategory.baseVerb = 'all'; 
            stateForCurrentSourceCategory.tag = 'all'; 
        }
        
        activeMasterList = shuffleArray(activeMasterList);
        const relevantCardsForFilters = (currentDatasetSource === 'web' || !currentUserId) ? activeMasterList : activeMasterList.filter(card => card.category === category);
        if ((category === 'phrasalVerbs' || category === 'collocations') && relevantCardsForFilters.length > 0) { 
            populateBaseVerbFilter(relevantCardsForFilters); 
            populateTagFilter(relevantCardsForFilters); 
            baseVerbSelect.value = stateForCurrentSourceCategory.baseVerb || 'all'; 
            tagSelect.value = stateForCurrentSourceCategory.tag || 'all'; 
        }
        applyAllFilters(true); 
    }
    
    function updateFlashcard() { 
        const currentUserId = window.authFunctions.getCurrentUserId();
        clearLearningTimer(); currentAnswerChecked = false;
        feedbackMessage.textContent = ''; feedbackMessage.className = 'mt-3 p-3 rounded-md w-full text-center font-semibold hidden';
        multipleChoiceOptionsContainer.innerHTML = '';
        typingInputContainer.style.display = 'none'; typingInput.value = ''; typingInput.disabled = false; submitTypingAnswerBtn.disabled = false;
        
        if(wordDisplay) { 
            wordDisplay.innerHTML = '';
            wordDisplay.className = 'text-3xl sm:text-4xl font-bold break-words'; 
        }
        if(pronunciationDisplay) pronunciationDisplay.textContent = '';
        if(tagsDisplayFront) tagsDisplayFront.textContent = '';
        if(meaningDisplayContainer) meaningDisplayContainer.innerHTML = '';
        if(notesDisplay) notesDisplay.innerHTML = '';
        if(flashcardElement) flashcardElement.classList.remove('flipped');

        const oldEditBtnOnCard = document.getElementById('edit-card-on-back-btn');
        if (oldEditBtnOnCard) oldEditBtnOnCard.remove();
        const oldDeleteBtnOnCard = document.getElementById('delete-card-on-back-btn');
        if (oldDeleteBtnOnCard) oldDeleteBtnOnCard.remove();
        const oldOriginalTermOnBack = flashcardElement.querySelector('.original-term-on-back');
        if (oldOriginalTermOnBack) oldOriginalTermOnBack.remove();
        if (copyWebCardBtn) copyWebCardBtn.style.display = 'none';


        if (practiceType !== "off") {
            if(flipBtn) flipBtn.style.display = 'none'; 
            if(practiceArea) practiceArea.style.display = 'block';
            if(flashcardElement) flashcardElement.classList.add('practice-mode-front-only');
            if (practiceType === 'typing_practice') {
                if(typingInputContainer) typingInputContainer.style.display = 'block'; 
                if(multipleChoiceOptionsContainer) multipleChoiceOptionsContainer.style.display = 'none';
                if (window.currentData.length > 0 && window.currentData[window.currentIndex]) { 
                    const cI = window.currentData[window.currentIndex]; 
                    if (cI.category === 'phrasalVerbs') currentCorrectAnswerForPractice = cI.phrasalVerb || '';
                    else if (cI.category === 'collocations') currentCorrectAnswerForPractice = cI.collocation || '';
                    else currentCorrectAnswerForPractice = cI.word || '';
                } else { 
                    if(typingInputContainer) typingInputContainer.innerHTML = '<p class="text-slate-500 italic">Không có thẻ để luyện tập.</p>'; 
                }
            } else { 
                if(typingInputContainer) typingInputContainer.style.display = 'none'; 
                if(multipleChoiceOptionsContainer) multipleChoiceOptionsContainer.style.display = 'grid';
                if (window.currentData.length > 0 && window.currentData[window.currentIndex]) {
                    displayMultipleChoiceOptions(); 
                } else {
                     if(multipleChoiceOptionsContainer) multipleChoiceOptionsContainer.innerHTML = '<p class="text-slate-500 italic">Không có thẻ để luyện tập.</p>';
                }
            }
            if (practiceType === 'word_quiz') {  
                if(pronunciationDisplay) pronunciationDisplay.style.display = 'none';  
                if(tagsDisplayFront) tagsDisplayFront.style.display = 'none';  
                if(speakerBtn) speakerBtn.style.display = 'none';  
                if(flashcardElement) flashcardElement.classList.add('practice-mode-word-quiz');  
            } else {
                if(pronunciationDisplay) pronunciationDisplay.style.display = 'block';
                if(tagsDisplayFront) tagsDisplayFront.style.display = 'block';
                if(speakerBtn) speakerBtn.style.display = 'block';
                if(flashcardElement) flashcardElement.classList.remove('practice-mode-word-quiz');
            }
        } else {
            if(practiceArea) practiceArea.style.display = 'none'; 
            if(flashcardElement) flashcardElement.classList.remove('practice-mode-front-only');
            if(pronunciationDisplay) pronunciationDisplay.style.display = 'block';
            if(tagsDisplayFront) tagsDisplayFront.style.display = 'block';
            if(speakerBtn) speakerBtn.style.display = 'block';
            if(flipBtn) flipBtn.style.display = 'inline-flex';
        }

        const item = window.currentData.length > 0 ? window.currentData[window.currentIndex] : null;
        
        if (!item) { 
            if(wordDisplay) {
                wordDisplay.classList.add('word-display-empty-state'); 
                if (currentDatasetSource === 'user' && !currentUserId) { 
                     wordDisplay.innerHTML = `<p>Vui lòng đăng nhập để xem hoặc tạo thẻ của bạn.</p><button id="login-prompt-btn" class="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-md mt-2">Đăng nhập ngay</button>`;
                     const loginPromptBtn = document.getElementById('login-prompt-btn');
                     if(loginPromptBtn) loginPromptBtn.onclick = () => {
                         if (typeof window.authFunctions !== 'undefined' && typeof window.authFunctions.openAuthModal === 'function') {
                             window.authFunctions.openAuthModal('login');
                         }
                     };
                } else if (currentDatasetSource === 'user' && currentUserId && (!userDecks || userDecks.length === 0) && activeMasterList.length === 0) { 
                    wordDisplay.innerHTML = `<p>Bạn chưa có thẻ nào và chưa có bộ thẻ nào. Hãy bắt đầu bằng cách tạo một bộ thẻ từ menu <i class='fas fa-bars'></i>, sau đó thêm thẻ mới!</p>`;
                } else if (currentDatasetSource === 'user' && currentUserId && activeMasterList.length === 0) { 
                    wordDisplay.innerHTML = `<p>Bạn chưa có thẻ nào trong bộ sưu tập "Thẻ của Tôi" cho bộ lọc hiện tại.</p><button id="empty-state-add-card-btn-on-card"><i class="fas fa-plus mr-2"></i>Tạo Thẻ Đầu Tiên</button>`;
                    const emptyAddBtn = document.getElementById('empty-state-add-card-btn-on-card');
                    if(emptyAddBtn) emptyAddBtn.addEventListener('click', async (e) => { 
                        e.stopPropagation(); 
                        await openAddEditModal('add'); 
                    });
                } else {
                    wordDisplay.innerHTML = `<p class="text-xl text-slate-200">Không có thẻ nào phù hợp với bộ lọc hiện tại. Hãy thử điều chỉnh bộ lọc trong menu <i class="fas fa-bars"></i> nhé!</p>`;
                }
            }
            if(pronunciationDisplay) pronunciationDisplay.style.display = 'none';
            if(tagsDisplayFront) tagsDisplayFront.style.display = 'none';
            if(speakerBtn) speakerBtn.style.display = 'none';
            if(speakerExampleBtn) speakerExampleBtn.style.display = 'none'; 
            if(flipBtn) flipBtn.disabled = true; 
            updateStatusButtonsUI(null, null); 
        } else { 
            if(pronunciationDisplay) pronunciationDisplay.style.display = 'block';
            if(tagsDisplayFront) tagsDisplayFront.style.display = 'block'; 
            if(speakerBtn) speakerBtn.style.display = 'block';
            if(speakerExampleBtn) speakerExampleBtn.style.display = 'block';
            if(flipBtn) flipBtn.disabled = (practiceType !== "off");

            currentWordSpansMeta = []; let accCC = 0;
            const iCV = item.category;
            const firstMeaningText = (item.meanings && item.meanings.length > 0) ? item.meanings[0].text : '';
            let textForTTS;
            let mainTermToDisplay = '';

            if (iCV === 'phrasalVerbs') mainTermToDisplay = item.phrasalVerb || '';
            else if (iCV === 'collocations') mainTermToDisplay = item.collocation || '';
            else mainTermToDisplay = item.word || '';

            if (practiceType === 'word_quiz') {
                textForTTS = firstMeaningText;
                const mTSp = document.createElement('span'); 
                mTSp.className = 'text-3xl sm:text-4xl font-bold'; 
                const segs = firstMeaningText.split(/(\s+)/);
                segs.forEach(s => { if (s.trim() !== '') { const wS = document.createElement('span'); wS.textContent = s; mTSp.appendChild(wS); currentWordSpansMeta.push({ element: wS, start: accCC, length: s.length }); } else mTSp.appendChild(document.createTextNode(s)); accCC += s.length; });
                if(wordDisplay) wordDisplay.appendChild(mTSp);
                if(pronunciationDisplay) pronunciationDisplay.style.display = 'none'; 
                if(tagsDisplayFront) tagsDisplayFront.style.display = 'none'; 
                if(speakerBtn) speakerBtn.style.display = 'none'; 
            } else {
                let bTFM = "";
                const pts = mainTermToDisplay.split(/(\([^)]+\))/g).filter(p => p);
                pts.forEach((p, pI) => { const iD = p.startsWith('(') && p.endsWith(')'); const cS = document.createElement('span'); cS.className = iD ? 'text-xl opacity-80 ml-1' : 'text-3xl sm:text-4xl font-bold'; const segs = p.split(/(\s+)/); segs.forEach(s => { bTFM += s; if (s.trim() !== '') { const wS = document.createElement('span'); wS.textContent = s; cS.appendChild(wS); currentWordSpansMeta.push({ element: wS, start: bTFM.length - s.length, length: s.length }); } else cS.appendChild(document.createTextNode(s)); }); if(wordDisplay) wordDisplay.appendChild(cS); if (pI < pts.length - 1) { const nPID = pts[pI + 1].startsWith('(') && pts[pI + 1].endsWith(')'); if (!p.endsWith(' ') && !pts[pI + 1].startsWith(' ') && !(iD && nPID)) { if(wordDisplay) wordDisplay.appendChild(document.createTextNode(' ')); bTFM += ' '; } } });
                textForTTS = bTFM;
            }
            if(wordDisplay) wordDisplay.dataset.ttsText = textForTTS;
            if(pronunciationDisplay) pronunciationDisplay.textContent = item.pronunciation || '';
            if ((iCV === 'phrasalVerbs' || iCV === 'collocations') && item.tags && practiceType !== 'word_quiz') { 
                const dT = item.tags.filter(t => t && t !== 'all' && !t.startsWith('particle_') && tagDisplayNames[t]).map(t => tagDisplayNames[t]); 
                if(tagsDisplayFront) {tagsDisplayFront.textContent = dT.join(' | '); tagsDisplayFront.style.display = dT.length > 0 ? 'block' : 'none';} 
            } else { 
                if(tagsDisplayFront) {tagsDisplayFront.textContent = ''; tagsDisplayFront.style.display = 'none';} 
            }

            const cardBackScrollableContent = flashcardElement.querySelector('.card-back .card-scrollable-content');
            if (cardBackScrollableContent && mainTermToDisplay && practiceType === 'off') { 
                const originalTermDiv = document.createElement('div');
                originalTermDiv.className = 'original-term-on-back';
                originalTermDiv.textContent = mainTermToDisplay;
                if (meaningDisplayContainer && meaningDisplayContainer.parentNode === cardBackScrollableContent) {
                     cardBackScrollableContent.insertBefore(originalTermDiv, meaningDisplayContainer);
                } else {
                    cardBackScrollableContent.prepend(originalTermDiv);
                }
            }

            if (copyWebCardBtn) {
                if (!item.isUserCard && currentUserId) {
                    copyWebCardBtn.style.display = 'block';
                } else {
                    copyWebCardBtn.style.display = 'none';
                }
            }


            if (item.isUserCard && currentUserId) { 
                const cardBackElement = flashcardElement.querySelector('.card-back');
                const editOnBackBtn = document.createElement('button'); editOnBackBtn.id = 'edit-card-on-back-btn'; editOnBackBtn.title = 'Sửa thẻ này'; editOnBackBtn.className = 'card-action-btn-on-back absolute top-1.5 right-1.5 p-1.5 text-white hover:text-indigo-200 transition-colors rounded-full hover:bg-black hover:bg-opacity-20'; editOnBackBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.75" stroke="currentColor" style="width: 20px; height: 20px;"><path stroke-linecap="round" stroke-linejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" /></svg>`; 
                editOnBackBtn.onclick = async (e) => { 
                    e.stopPropagation(); 
                    await openAddEditModal('edit', item); 
                }; 
                if(cardBackElement) cardBackElement.appendChild(editOnBackBtn);
                const deleteOnBackBtn = document.createElement('button'); deleteOnBackBtn.id = 'delete-card-on-back-btn'; deleteOnBackBtn.title = 'Xóa thẻ này'; deleteOnBackBtn.className = 'card-action-btn-on-back absolute top-1.5 left-1.5 p-1.5 text-white hover:text-red-300 transition-colors rounded-full hover:bg-black hover:bg-opacity-20'; deleteOnBackBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.75" stroke="currentColor" style="width: 20px; height: 20px;"><path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12.502 0c-.34.055-.68.11-.1.023.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>`; deleteOnBackBtn.onclick = (e) => { e.stopPropagation(); handleDeleteCard(); }; if(cardBackElement) cardBackElement.appendChild(deleteOnBackBtn);
            }

            if (item.meanings && item.meanings.length > 0) { item.meanings.forEach((mObj, idx) => { const meaningBlockDiv = document.createElement('div'); meaningBlockDiv.className = `meaning-block-on-card ${idx > 0 ? "mt-4 pt-3 border-t border-blue-400 border-opacity-50" : (item.meanings.length > 1 ? "bg-black bg-opacity-10 p-3 rounded-lg" : "") }`; const meaningTextP = document.createElement('p'); meaningTextP.className = "meaning-text-on-card"; if (item.meanings.length > 1) { meaningTextP.textContent = `${idx + 1}. ${mObj.text}`; } else { meaningTextP.textContent = mObj.text; } meaningBlockDiv.appendChild(meaningTextP); if (mObj.notes) { const meaningNotesP = document.createElement('p'); meaningNotesP.className = "meaning-notes-on-card"; meaningNotesP.textContent = mObj.notes; meaningBlockDiv.appendChild(meaningNotesP); } if (mObj.examples && mObj.examples.length > 0) { const examplesContainer = document.createElement('div'); examplesContainer.className = "ml-3 mt-3"; const examplesListDiv = document.createElement('div'); examplesListDiv.className = "space-y-1.5"; examplesListDiv.dataset.meaningId = mObj.id; const maxVisibleExamples = 1; const totalExamples = mObj.examples.length; mObj.examples.forEach((ex, exIdx) => { const exD = document.createElement('div'); exD.className="example-item-on-card"; if (exIdx >= maxVisibleExamples) { exD.classList.add('hidden'); } const eP = document.createElement('p'); eP.className="example-eng-on-card"; const textSpan = document.createElement('span'); const enLabel = document.createElement('span'); enLabel.className = 'example-label'; enLabel.textContent = 'EN: '; textSpan.appendChild(enLabel); textSpan.appendChild(document.createTextNode(ex.eng)); eP.appendChild(textSpan); const copyBtn = document.createElement('button'); copyBtn.className = 'copy-example-btn'; copyBtn.title = 'Sao chép ví dụ'; const initialCopySvg = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.75" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184" /></svg>`; const copiedSvg = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.75" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>`; copyBtn.innerHTML = initialCopySvg; copyBtn.onclick = (e) => { e.stopPropagation(); navigator.clipboard.writeText(ex.eng).then(() => { copyBtn.innerHTML = copiedSvg; setTimeout(() => { copyBtn.innerHTML = initialCopySvg; }, 1500); }).catch(err => { console.error('Không thể sao chép: ', err); }); }; eP.appendChild(copyBtn); exD.appendChild(eP); if(ex.vie){ const vP = document.createElement('p');vP.className="example-vie-on-card";const vnLabel = document.createElement('span');vnLabel.className = 'example-label';vnLabel.textContent = 'VN: ';vP.appendChild(vnLabel);vP.appendChild(document.createTextNode(`(${ex.vie})`));exD.appendChild(vP); } if(ex.exampleNotes){ const nP=document.createElement('p');nP.className="example-notes-on-card";nP.textContent=`Ghi chú VD: ${ex.exampleNotes}`;exD.appendChild(nP); } examplesListDiv.appendChild(exD); }); examplesContainer.appendChild(examplesListDiv); if (totalExamples > maxVisibleExamples) { const toggleExamplesBtn = document.createElement('button'); toggleExamplesBtn.className = "toggle-examples-btn"; let hiddenCount = totalExamples - maxVisibleExamples; toggleExamplesBtn.textContent = `Xem thêm ${hiddenCount} ví dụ...`; toggleExamplesBtn.dataset.expanded = "false"; toggleExamplesBtn.onclick = (e) => { e.stopPropagation(); const isExpanded = toggleExamplesBtn.dataset.expanded === "true"; const exampleItems = examplesListDiv.querySelectorAll('.example-item-on-card'); exampleItems.forEach((item, itemIdx) => { if (itemIdx >= maxVisibleExamples) { item.classList.toggle('hidden', isExpanded); } }); if (isExpanded) { toggleExamplesBtn.textContent = `Xem thêm ${hiddenCount} ví dụ...`; toggleExamplesBtn.dataset.expanded = "false"; } else { toggleExamplesBtn.textContent = "Ẩn bớt ví dụ"; toggleExamplesBtn.dataset.expanded = "true"; } }; examplesContainer.appendChild(toggleExamplesBtn); } meaningBlockDiv.appendChild(examplesContainer); } if(meaningDisplayContainer) meaningDisplayContainer.appendChild(meaningBlockDiv); }); } 
                else if(meaningDisplayContainer) meaningDisplayContainer.innerHTML = '<p class="text-slate-400 italic">Chưa có nghĩa.</p>';

                const notesSectionEl = document.getElementById('notes-section');
                if (item.generalNotes) { if(notesDisplay) notesDisplay.innerHTML = `Ghi chú chung: ${item.generalNotes}`; if(notesSectionEl) notesSectionEl.style.display = 'block'; } 
                else { if(notesDisplay) notesDisplay.innerHTML = ''; if(notesSectionEl) notesSectionEl.style.display = 'none'; }

                if(speakerBtn) speakerBtn.disabled = !textForTTS.trim() || (practiceType === 'word_quiz');
                const hasExamplesToSpeak = item.meanings && item.meanings.some(m => m.examples && m.examples.some(ex => ex.eng.trim()));
                if(speakerExampleBtn) speakerExampleBtn.disabled = !hasExamplesToSpeak;
                const cardIdForStatus = getCardIdentifier(item, iCV);
                updateStatusButtonsUI(cardIdForStatus, iCV);
            }
            updateCardInfo();
            if (practiceType === 'off') startLearningTimer();
        };

        function updateCardInfo(){if(currentCardIndexDisplay) currentCardIndexDisplay.textContent=window.currentData.length>0?window.currentIndex+1:0; if(totalCardsDisplay) totalCardsDisplay.textContent=window.currentData.length; if(prevBtn) prevBtn.disabled=window.currentIndex===0||window.currentData.length===0; let nextDisabled=(window.currentIndex>=window.currentData.length-1||window.currentData.length===0); if(practiceType!=="off")nextDisabled=nextDisabled||(!currentAnswerChecked&&window.currentData.length>0)||(window.currentData.length>0&&window.currentIndex>=window.currentData.length-1&&!currentAnswerChecked); if(!learningCardNextButtonTimer && nextBtn)nextBtn.disabled=nextDisabled; if(flipBtn) flipBtn.disabled=window.currentData.length===0||(practiceType!=="off");}

        function displayMultipleChoiceOptions() {
            multipleChoiceOptionsContainer.innerHTML = ''; 
            if (window.currentData.length === 0 || !window.currentData[window.currentIndex]) {
                multipleChoiceOptionsContainer.innerHTML = '<p class="text-slate-500 italic col-span-full">Không có thẻ để luyện tập.</p>';
                return;
            }

            const currentCard = window.currentData[window.currentIndex];
            let questionText = ''; 
            let correctAnswerText = '';
            let options = [];
            const numberOfOptions = 4; 

            if (practiceType === 'meaning_quiz') { 
                questionText = currentCard.category === 'phrasalVerbs' ? currentCard.phrasalVerb : (currentCard.category === 'collocations' ? currentCard.collocation : currentCard.word);
                correctAnswerText = currentCard.meanings[0].text; 
                options.push(correctAnswerText);
                
                let wrongOptionsCount = 0;
                const otherCards = activeMasterList.filter(card => 
                    card.category === currentCard.category && 
                    getCardIdentifier(card) !== getCardIdentifier(currentCard) && 
                    card.meanings && card.meanings.length > 0 && card.meanings[0].text
                );
                shuffleArray(otherCards); 
                for (const otherCard of otherCards) {
                    if (wrongOptionsCount < (numberOfOptions - 1) && otherCard.meanings[0].text !== correctAnswerText) {
                        options.push(otherCard.meanings[0].text);
                        wrongOptionsCount++;
                    }
                    if (wrongOptionsCount >= (numberOfOptions - 1)) break;
                }
            } else if (practiceType === 'word_quiz') { 
                questionText = currentCard.meanings[0].text;
                correctAnswerText = currentCard.category === 'phrasalVerbs' ? currentCard.phrasalVerb : (currentCard.category === 'collocations' ? currentCard.collocation : currentCard.word);
                options.push(correctAnswerText);

                let wrongOptionsCount = 0;
                const otherCards = activeMasterList.filter(card => 
                    card.category === currentCard.category && 
                    getCardIdentifier(card) !== getCardIdentifier(currentCard)
                );
                shuffleArray(otherCards);
                for (const otherCard of otherCards) {
                    const wrongOption = otherCard.category === 'phrasalVerbs' ? otherCard.phrasalVerb : (otherCard.category === 'collocations' ? otherCard.collocation : otherCard.word);
                    if (wrongOptionsCount < (numberOfOptions - 1) && wrongOption !== correctAnswerText) {
                        options.push(wrongOption);
                        wrongOptionsCount++;
                    }
                    if (wrongOptionsCount >= (numberOfOptions - 1)) break;
                }
            }
            
            let dummyOptionIndex = 1;
            while (options.length < Math.min(numberOfOptions, activeMasterList.filter(c => c.category === currentCard.category).length) && options.length > 0 && options.length < numberOfOptions) {
                 options.push(`Lựa chọn sai ${dummyOptionIndex++}`);
            }
             while (options.length < 2 && options.length > 0) { 
                options.push(`Lựa chọn sai ${dummyOptionIndex++}`);
            }


            options = shuffleArray(options); 

            options.forEach(optionText => {
                const button = document.createElement('button');
                button.className = 'choice-button';
                button.textContent = optionText;
                button.addEventListener('click', () => checkMultipleChoiceAnswer(optionText, correctAnswerText, button));
                multipleChoiceOptionsContainer.appendChild(button);
            });
        }

        function checkMultipleChoiceAnswer(selectedAnswer, correctAnswer, buttonElement) {
            currentAnswerChecked = true;
            feedbackMessage.classList.remove('hidden');
            const allChoiceButtons = multipleChoiceOptionsContainer.querySelectorAll('.choice-button');
            allChoiceButtons.forEach(btn => btn.disabled = true); 

            const isCorrect = selectedAnswer === correctAnswer;

            if (isCorrect) {
                buttonElement.classList.add('correct');
                feedbackMessage.textContent = 'Chính xác!';
                feedbackMessage.className = 'mt-3 p-3 rounded-md w-full text-center font-semibold bg-green-100 text-green-700 border border-green-300';
            } else {
                buttonElement.classList.add('incorrect');
                feedbackMessage.textContent = `Không đúng! Đáp án là: ${correctAnswer}`;
                feedbackMessage.className = 'mt-3 p-3 rounded-md w-full text-center font-semibold bg-red-100 text-red-700 border border-red-300';
                allChoiceButtons.forEach(btn => {
                    if (btn.textContent === correctAnswer) {
                        btn.classList.add('correct');
                    }
                });
            }
            
            flashcardElement.classList.remove('practice-mode-front-only');
            flashcardElement.classList.add('flipped'); 
            
            const cardItem = window.currentData[window.currentIndex];
            setCardStatus(isCorrect ? 'learned' : 'learning'); 
            updateCardInfo(); 
        }
        
        function switchToInputMode(mode) {
            currentInputMode = mode;
            clearAllFormErrors(); 
            if (mode === 'json') {
                addEditCardForm.style.display = 'none';
                jsonInputArea.style.display = 'block';
                document.getElementById('json-deck-assignment-container').style.display = 'block'; 
                modalDeckAssignmentContainer.style.display = 'none'; 

                saveCardBtn.style.display = 'none';
                processJsonBtn.style.display = 'inline-flex';
                manualInputModeBtn.classList.remove('active');
                jsonInputModeBtn.classList.add('active');
                modalTitle.textContent = 'Nhập thẻ từ JSON';
                cardJsonInput.value = ''; 
                jsonImportErrorMessage.classList.add('hidden');
                jsonImportSuccessMessage.classList.add('hidden');
                jsonCardDeckAssignmentSelect.value = cardDeckAssignmentSelect.value;

            } else { 
                addEditCardForm.style.display = 'block';
                jsonInputArea.style.display = 'none';
                document.getElementById('json-deck-assignment-container').style.display = 'none'; 
                if (cardSourceSelect.value === 'user') { 
                     modalDeckAssignmentContainer.style.display = 'block';
                } else {
                     modalDeckAssignmentContainer.style.display = 'none';
                }

                saveCardBtn.style.display = 'inline-flex';
                processJsonBtn.style.display = 'none';
                manualInputModeBtn.classList.add('active');
                jsonInputModeBtn.classList.remove('active');
                modalTitle.textContent = currentEditingCardId ? 'Sửa thẻ' : 'Thêm thẻ mới';
                cardDeckAssignmentSelect.value = jsonCardDeckAssignmentSelect.value;
            }
        }

        async function processAndSaveJsonCards() {
            const currentUserId = window.authFunctions.getCurrentUserId();
            if (!currentUserId) {
                jsonImportErrorMessage.textContent = "Vui lòng đăng nhập để tạo thẻ từ JSON.";
                jsonImportErrorMessage.classList.remove('hidden');
                if (typeof window.authFunctions !== 'undefined' && typeof window.authFunctions.openAuthModal === 'function') {
                    window.authFunctions.openAuthModal('login');
                }
                return;
            }

            const jsonString = cardJsonInput.value.trim();
            if (!jsonString) {
                jsonImportErrorMessage.textContent = "Vui lòng dán mã JSON vào ô nhập liệu.";
                jsonImportErrorMessage.classList.remove('hidden');
                return;
            }

            const selectedDeckId = jsonCardDeckAssignmentSelect.value;
            if (!selectedDeckId) {
                jsonImportErrorMessage.textContent = "Vui lòng chọn một bộ thẻ để gán các thẻ này vào.";
                jsonImportErrorMessage.classList.remove('hidden');
                return;
            }

            jsonImportErrorMessage.classList.add('hidden');
            jsonImportSuccessMessage.classList.add('hidden');
            processJsonBtn.disabled = true;
            processJsonBtn.textContent = 'Đang xử lý...';

            let cardsToProcess;
            try {
                const parsedData = JSON.parse(jsonString);
                if (Array.isArray(parsedData)) {
                    cardsToProcess = parsedData;
                } else if (typeof parsedData === 'object' && parsedData !== null) {
                    cardsToProcess = [parsedData]; 
                } else {
                    throw new Error("Cấu trúc JSON không hợp lệ. Cần một đối tượng thẻ hoặc một mảng các đối tượng thẻ.");
                }
            } catch (error) {
                console.error("Lỗi parse JSON:", error);
                jsonImportErrorMessage.textContent = `Lỗi parse JSON: ${error.message}`;
                jsonImportErrorMessage.classList.remove('hidden');
                processJsonBtn.disabled = false;
                processJsonBtn.textContent = 'Xử lý JSON & Tạo Thẻ';
                return;
            }

            let successCount = 0;
            let errorCount = 0;
            let errorMessages = [];

            for (const cardJson of cardsToProcess) {
                let mainTerm = cardJson.word || cardJson.phrasalVerb || cardJson.collocation || 'Thẻ không tên';
                if (!cardJson.category || 
                    !mainTerm || 
                    !Array.isArray(cardJson.meanings) || cardJson.meanings.length === 0 ||
                    !cardJson.meanings[0].text
                ) {
                    errorCount++;
                    errorMessages.push(`Thẻ "${mainTerm}" thiếu thông tin bắt buộc (category, từ/cụm từ, hoặc nghĩa chính).`);
                    continue;
                }

                const cardDataToSave = {
                    pronunciation: cardJson.pronunciation || '',
                    meanings: cardJson.meanings.map(m => ({
                        id: m.id || generateUniqueId('m_json_'),
                        text: m.text || '',
                        notes: m.notes || '',
                        examples: Array.isArray(m.examples) ? m.examples.map(ex => ({
                            id: ex.id || generateUniqueId('ex_json_'),
                            eng: ex.eng || '',
                            vie: ex.vie || '',
                            exampleNotes: ex.exampleNotes || ''
                        })) : []
                    })),
                    generalNotes: cardJson.generalNotes || '',
                    category: cardJson.category,
                    deckId: selectedDeckId,
                    status: 'new',
                    lastReviewed: null,
                    reviewCount: 0,
                    isUserCard: true,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp()
                };

                if (cardJson.category === 'phrasalVerbs') {
                    cardDataToSave.phrasalVerb = cardJson.phrasalVerb;
                    cardDataToSave.baseVerb = cardJson.baseVerb || null;
                    cardDataToSave.tags = Array.isArray(cardJson.tags) ? cardJson.tags.map(t => String(t).trim().toLowerCase()).filter(t => t) : [];
                } else if (cardJson.category === 'collocations') {
                    cardDataToSave.collocation = cardJson.collocation;
                    cardDataToSave.baseVerb = cardJson.baseVerb || null;
                    cardDataToSave.tags = Array.isArray(cardJson.tags) ? cardJson.tags.map(t => String(t).trim().toLowerCase()).filter(t => t) : [];
                } else { 
                    cardDataToSave.word = cardJson.word;
                     cardDataToSave.tags = Array.isArray(cardJson.tags) ? cardJson.tags.map(t => String(t).trim().toLowerCase()).filter(t => t) : [];
                }
                
                try {
                    const cardsCollectionRef = collection(db, 'users', currentUserId, 'decks', selectedDeckId, 'cards');
                    await addDoc(cardsCollectionRef, cardDataToSave);
                    successCount++;
                } catch (dbError) {
                    console.error("Lỗi lưu thẻ từ JSON vào Firestore:", dbError);
                    errorCount++;
                    errorMessages.push(`Lỗi lưu thẻ "${mainTerm}": ${dbError.message}`);
                }
            }

            processJsonBtn.disabled = false;
            processJsonBtn.textContent = 'Xử lý JSON & Tạo Thẻ';

            if (successCount > 0) {
                jsonImportSuccessMessage.textContent = `Đã thêm thành công ${successCount} thẻ.`;
                jsonImportSuccessMessage.classList.remove('hidden');
            }
            if (errorCount > 0) {
                jsonImportErrorMessage.textContent = `Không thể thêm ${errorCount} thẻ. Lỗi: ${errorMessages.join('; ')}`;
                jsonImportErrorMessage.classList.remove('hidden');
            }

            if (successCount > 0) {
                await loadVocabularyData(categorySelect.value); 
            }
        }
        
        function openCopyToDeckModal() {
            const currentCard = window.currentData[window.currentIndex];
            if (!currentCard || currentCard.isUserCard) {
                console.warn("Không thể sao chép thẻ này (không phải thẻ web hoặc không có thẻ).");
                return;
            }
            if (!window.authFunctions.getCurrentUserId()) {
                alert("Vui lòng đăng nhập để sao chép thẻ.");
                openAuthModal('login');
                return;
            }

            populateDeckSelects(); 
            copyNewDeckNameContainer.style.display = 'none';
            copyNewDeckNameInput.value = '';
            copyNewDeckError.classList.add('hidden');
            copyToDeckErrorMessage.classList.add('hidden');
            copyToDeckSuccessMessage.classList.add('hidden');
            copyToDeckSelect.value = ''; 

            copyToDeckModal.classList.remove('hidden', 'opacity-0');
            copyToDeckModal.querySelector('.modal-content').classList.remove('scale-95');
            copyToDeckModal.querySelector('.modal-content').classList.add('scale-100');
        }

        function closeCopyToDeckModal() {
            copyToDeckModal.classList.add('opacity-0');
            copyToDeckModal.querySelector('.modal-content').classList.add('scale-95');
            setTimeout(() => copyToDeckModal.classList.add('hidden'), 250);
        }

        async function handleConfirmCopyToDeck() {
            const currentCard = window.currentData[window.currentIndex];
            if (!currentCard || currentCard.isUserCard) {
                copyToDeckErrorMessage.textContent = "Thẻ hiện tại không phải là thẻ web để sao chép.";
                copyToDeckErrorMessage.classList.remove('hidden');
                return;
            }

            const currentUserId = window.authFunctions.getCurrentUserId();
            if (!currentUserId) {
                copyToDeckErrorMessage.textContent = "Vui lòng đăng nhập.";
                copyToDeckErrorMessage.classList.remove('hidden');
                openAuthModal('login');
                return;
            }

            let targetDeckId = copyToDeckSelect.value;
            let newDeckName = copyNewDeckNameInput.value.trim();

            copyToDeckErrorMessage.classList.add('hidden');
            copyToDeckSuccessMessage.classList.add('hidden');
            copyNewDeckError.classList.add('hidden');

            if (targetDeckId === "_create_new_deck_") {
                if (!newDeckName) {
                    copyNewDeckError.textContent = "Vui lòng nhập tên cho bộ thẻ mới.";
                    copyNewDeckError.classList.remove('hidden');
                    return;
                }
                const createdDeck = await createDeck(newDeckName); 
                if (createdDeck && createdDeck.id) {
                    targetDeckId = createdDeck.id;
                    await loadUserDecks(); 
                    copyToDeckSelect.value = targetDeckId; 
                    populateDeckSelects(); 
                } else {
                    copyNewDeckError.textContent = "Không thể tạo bộ thẻ mới. Vui lòng thử lại.";
                    copyNewDeckError.classList.remove('hidden');
                    return;
                }
            } else if (!targetDeckId) {
                copyToDeckErrorMessage.textContent = "Vui lòng chọn một bộ thẻ đích hoặc tạo bộ thẻ mới.";
                copyToDeckErrorMessage.classList.remove('hidden');
                return;
            }

            const cardToCopy = { ...currentCard }; 
            delete cardToCopy.id; 
            cardToCopy.isUserCard = true;
            cardToCopy.deckId = targetDeckId;
            cardToCopy.status = 'new';
            cardToCopy.lastReviewed = null;
            cardToCopy.reviewCount = 0;
            cardToCopy.createdAt = serverTimestamp();
            cardToCopy.updatedAt = serverTimestamp();

            delete cardToCopy.webCardGlobalId; 

            try {
                const cardsCollectionRef = collection(db, 'users', currentUserId, 'decks', targetDeckId, 'cards');
                const docRef = await addDoc(cardsCollectionRef, cardToCopy);
                console.log("Web card copied to user deck. New card ID:", docRef.id);
                copyToDeckSuccessMessage.textContent = `Đã sao chép thẻ "${cardToCopy.word || cardToCopy.phrasalVerb || cardToCopy.collocation}" vào bộ thẻ đã chọn!`;
                copyToDeckSuccessMessage.classList.remove('hidden');
                
                setTimeout(async () => { 
                    closeCopyToDeckModal();
                    if (cardSourceSelect.value === 'user' && userDeckSelect.value === targetDeckId) {
                        await loadVocabularyData(categorySelect.value); 
                    }
                }, 2000);

            } catch (error) {
                console.error("Error copying web card to user deck:", error);
                copyToDeckErrorMessage.textContent = "Lỗi khi sao chép thẻ. Vui lòng thử lại.";
                copyToDeckErrorMessage.classList.remove('hidden');
            }
        }


        function setupEventListeners() {
            if(hamburgerMenuBtn) hamburgerMenuBtn.addEventListener('click', openSidebar); 
            if(closeSidebarBtn) closeSidebarBtn.addEventListener('click', closeSidebar); 
            if(sidebarOverlay) sidebarOverlay.addEventListener('click', closeSidebar);
            
            if(cardSourceSelect) cardSourceSelect.addEventListener('change', async (e)=>{ 
                currentDatasetSource=e.target.value;
                const currentUserId = window.authFunctions.getCurrentUserId();
                if (currentDatasetSource === 'user' && !currentUserId) { 
                    if (typeof window.authFunctions !== 'undefined' && typeof window.authFunctions.openAuthModal === 'function') {
                        window.authFunctions.openAuthModal('login');
                    }
                    window.currentData = [];
                    window.updateFlashcard(); 
                    window.updateSidebarFilterVisibility(); 
                    return; 
                }
                if(practiceTypeSelect) practiceTypeSelect.value="off";
                practiceType="off";
                if(currentDatasetSource!=='user' && userDeckSelect)userDeckSelect.value='all_user_cards';
                await loadVocabularyData(categorySelect.value); 
                window.updateSidebarFilterVisibility(); 
                window.updateMainHeaderTitle();
            });

            if(userDeckSelect) userDeckSelect.addEventListener('change', async ()=>{ 
                const currentUserId = window.authFunctions.getCurrentUserId(); 
                if(!currentUserId) return; 
                const stateForCurrentCategory = getCategoryState(currentDatasetSource, categorySelect.value);
                stateForCurrentCategory.deckId = userDeckSelect.value;
                appState.lastSelectedDeckId = userDeckSelect.value; 
                saveAppState();
                activeMasterList = await loadUserCards(userDeckSelect.value);
                applyAllFilters(false); 
            });
            
            if(manageDecksBtn) manageDecksBtn.addEventListener('click', async ()=>{ 
                const currentUserId = window.authFunctions.getCurrentUserId(); 
                if(!currentUserId) { 
                    alert("Vui lòng đăng nhập để quản lý bộ thẻ."); 
                    if (typeof window.authFunctions !== 'undefined' && typeof window.authFunctions.openAuthModal === 'function') {
                        window.authFunctions.openAuthModal('login');
                    }
                    return; 
                } 
                await loadUserDecks(); 
                renderExistingDecksList();
                manageDecksModal.classList.remove('hidden','opacity-0');
                if (deckModalContent) deckModalContent.classList.remove('scale-95');
                if (deckModalContent) deckModalContent.classList.add('scale-100');
                newDeckNameInput.value='';
                newDeckNameInput.focus();
            });
            if(closeDeckModalBtn) closeDeckModalBtn.addEventListener('click', ()=>{
                manageDecksModal.classList.add('opacity-0');
                if (deckModalContent) deckModalContent.classList.add('scale-95');
                setTimeout(()=>manageDecksModal.classList.add('hidden'),250);
            });

            if(addNewDeckBtn) addNewDeckBtn.addEventListener('click', async ()=>{ 
                const currentUserId = window.authFunctions.getCurrentUserId();
                if(!currentUserId) {
                    alert("Vui lòng đăng nhập để tạo bộ thẻ.");
                     if (typeof window.authFunctions !== 'undefined' && typeof window.authFunctions.openAuthModal === 'function') {
                        window.authFunctions.openAuthModal('login');
                    }
                    return;
                }

                const deckName = newDeckNameInput.value.trim(); 

                if (!deckName) { 
                    alert("Tên bộ thẻ không được để trống.");
                    newDeckNameInput.focus();
                    return;
                }
                
                const createdDeck = await createDeck(deckName); 

                if(createdDeck){ 
                    newDeckNameInput.value = ''; 

                    if(currentDatasetSource === 'user'){
                        appState.lastSelectedDeckId = createdDeck.id; 
                        const stateForCurrentCategory = getCategoryState(currentDatasetSource, categorySelect.value);
                        stateForCurrentCategory.deckId = createdDeck.id; 
                        saveAppState(); 
                        userDeckSelect.value = createdDeck.id;
                        activeMasterList = await loadUserCards(createdDeck.id); 
                        applyAllFilters(false); 
                        updateMainHeaderTitle();
                    }
                }
            });

            if(openAddCardModalBtn) openAddCardModalBtn.addEventListener('click', async () => { 
                await openAddEditModal('add'); 
            });
            if(closeModalBtn) closeModalBtn.addEventListener('click', closeAddEditModal); 
            if(cancelCardBtn) cancelCardBtn.addEventListener('click', closeAddEditModal);
            if(addEditCardForm) addEditCardForm.addEventListener('submit', async (e)=>{ 
                e.preventDefault();
                await handleSaveCard(); 
            });

            if (manualInputModeBtn) {
                manualInputModeBtn.addEventListener('click', () => switchToInputMode('manual'));
            }
            if (jsonInputModeBtn) {
                jsonInputModeBtn.addEventListener('click', () => switchToInputMode('json'));
            }
            if (processJsonBtn) {
                processJsonBtn.addEventListener('click', processAndSaveJsonCards);
            }

            if (copyWebCardBtn) {
                copyWebCardBtn.addEventListener('click', openCopyToDeckModal);
            }
            if (closeCopyToDeckModalBtn) {
                closeCopyToDeckModalBtn.addEventListener('click', closeCopyToDeckModal);
            }
            if (cancelCopyToDeckBtn) {
                cancelCopyToDeckBtn.addEventListener('click', closeCopyToDeckModal);
            }
            if (confirmCopyToDeckBtn) {
                confirmCopyToDeckBtn.addEventListener('click', handleConfirmCopyToDeck);
            }
            if (copyToDeckSelect) {
                copyToDeckSelect.addEventListener('change', function() {
                    if (this.value === '_create_new_deck_') {
                        copyNewDeckNameContainer.style.display = 'block';
                        copyNewDeckNameInput.focus();
                    } else {
                        copyNewDeckNameContainer.style.display = 'none';
                        copyNewDeckNameInput.value = '';
                        copyNewDeckError.classList.add('hidden');
                    }
                });
            }


            if(practiceTypeSelect) practiceTypeSelect.addEventListener('change', (e)=>{clearLearningTimer();practiceType=e.target.value;const cat=categorySelect.value;const st=getCategoryState(currentDatasetSource,cat);searchInput.value='';if(cat==='phrasalVerbs' || cat === 'collocations'){st.tag='all';if(tagSelect)tagSelect.value='all';st.baseVerb='all';if(baseVerbSelect)baseVerbSelect.value='all';} const currentUserId = window.authFunctions.getCurrentUserId(); if(currentDatasetSource==='user' && currentUserId){st.deckId='all_user_cards';if(userDeckSelect)userDeckSelect.value='all_user_cards';}st.filterMarked='all_study';if(filterCardStatusSelect)filterCardStatusSelect.value='all_study';st.currentIndex=0;applyAllFilters();closeSidebar();});
            if(categorySelect) categorySelect.addEventListener('change', async (e)=>{ 
                clearLearningTimer();
                const selCat=e.target.value;
                if(practiceTypeSelect)practiceTypeSelect.value="off";
                practiceType="off";
                searchInput.value='';
                await loadVocabularyData(selCat); 
                window.updateMainHeaderTitle();
            });
            if(baseVerbSelect) baseVerbSelect.addEventListener('change', ()=>applyAllFilters(false)); 
            if(tagSelect) tagSelect.addEventListener('change', ()=>applyAllFilters(false));
            if(searchInput) searchInput.addEventListener('input', ()=>applyAllFilters(false)); 
            if(filterCardStatusSelect) filterCardStatusSelect.addEventListener('change', ()=>applyAllFilters(false));
            if(flipBtn) flipBtn.addEventListener('click', ()=>{if(practiceType==="off"&&window.currentData.length>0)flashcardElement.classList.toggle('flipped');});
            if(flashcardElement) flashcardElement.addEventListener('click', (e)=>{ if (practiceType === "off" && e.target.closest('.flashcard') === flashcardElement && !e.target.closest('button#speaker-btn') && !e.target.closest('button#speaker-example-btn') && !e.target.closest('#edit-card-on-back-btn') && !e.target.closest('#delete-card-on-back-btn') && !e.target.closest('.toggle-examples-btn') && !e.target.closest('.copy-example-btn') && !e.target.closest('#empty-state-add-card-btn-on-card') && !e.target.closest('#copy-web-card-btn') ) { flashcardElement.classList.toggle('flipped'); } });
            if(nextBtn) nextBtn.addEventListener('click', ()=>{if(isSpeakingExampleQueue){isSpeakingExampleQueue=false;window.speechSynthesis.cancel();speakerExampleBtn.disabled=!(window.currentData[window.currentIndex]&&window.currentData[window.currentIndex].meanings.some(m=>m.examples&&m.examples.length>0));}if(nextBtn.disabled)return;clearLearningTimer();if(window.currentIndex<window.currentData.length-1){window.currentIndex++;getCategoryState(currentDatasetSource,categorySelect.value).currentIndex=window.currentIndex;saveAppState();window.updateFlashcard();}else if(practiceType!=="off"&&currentAnswerChecked&&window.currentIndex>=window.currentData.length-1)applyAllFilters();});
            if(prevBtn) prevBtn.addEventListener('click', ()=>{if(isSpeakingExampleQueue){isSpeakingExampleQueue=false;window.speechSynthesis.cancel();speakerExampleBtn.disabled=!(window.currentData[window.currentIndex]&&window.currentData[window.currentIndex].meanings.some(m=>m.examples&&m.examples.length>0));}clearLearningTimer();if(window.currentIndex>0){window.currentIndex--;getCategoryState(currentDatasetSource,categorySelect.value).currentIndex=window.currentIndex;saveAppState();window.updateFlashcard();}});
            if(speakerBtn) speakerBtn.addEventListener('click', (e)=>{e.stopPropagation();if(isSpeakingExampleQueue){isSpeakingExampleQueue=false;window.speechSynthesis.cancel();speakerExampleBtn.disabled=!(window.currentData[window.currentIndex]&&window.currentData[window.currentIndex].meanings.some(m=>m.examples&&m.examples.length>0));}const txt=wordDisplay.dataset.ttsText;if(txt&&!speakerBtn.disabled)speakText(txt,currentWordSpansMeta);});
            if(speakerExampleBtn) speakerExampleBtn.addEventListener('click', (e)=>{e.stopPropagation();window.speechSynthesis.cancel();isSpeakingExampleQueue=false;currentExampleSpeechIndex=0;exampleSpeechQueue=[];const item=window.currentData[window.currentIndex];if(item&&item.meanings&&!speakerExampleBtn.disabled){item.meanings.forEach(m=>{if(m.examples){m.examples.forEach(ex=>{if(ex.eng&&ex.eng.trim())exampleSpeechQueue.push({text:ex.eng.trim(),spansMeta:[]});});}});if(exampleSpeechQueue.length>0){isSpeakingExampleQueue=true;speakerExampleBtn.disabled=true;playNextExampleInQueue();}}});
            if(statusBtnNew) statusBtnNew.addEventListener('click', ()=>setCardStatus('new')); 
            if(statusBtnLearning) statusBtnLearning.addEventListener('click', ()=>setCardStatus('learning')); 
            if(statusBtnLearned) statusBtnLearned.addEventListener('click', ()=>setCardStatus('learned'));
            
            function checkTypingAnswer(){if(window.currentData.length===0||!currentCorrectAnswerForPractice)return;currentAnswerChecked=true;feedbackMessage.classList.remove('hidden');typingInput.disabled=true;submitTypingAnswerBtn.disabled=true;const uA=typingInput.value.trim().toLowerCase();const cA=currentCorrectAnswerForPractice.trim().toLowerCase();const iC=uA===cA;if(iC){feedbackMessage.textContent='Đúng!';feedbackMessage.className='mt-3 p-3 rounded-md w-full text-center font-semibold bg-green-100 text-green-700 border border-green-300';}else{feedbackMessage.textContent=`Sai! Đáp án đúng: ${currentCorrectAnswerForPractice}`;feedbackMessage.className='mt-3 p-3 rounded-md w-full text-center font-semibold bg-red-100 text-red-700 border border-red-300';}flashcardElement.classList.remove('practice-mode-front-only');flashcardElement.classList.add('flipped');const i=window.currentData[window.currentIndex];const iCV=i.category;const id=getCardIdentifier(i,iCV);if(id)setCardStatus(iC?'learned':'learning');updateCardInfo();}
            
            if(submitTypingAnswerBtn) submitTypingAnswerBtn.addEventListener('click', checkTypingAnswer);
            if(typingInput) typingInput.addEventListener('keypress', (e)=>{if(e.key==='Enter'&&practiceType==='typing_practice'&&!submitTypingAnswerBtn.disabled)checkTypingAnswer();});
            
            if(addAnotherMeaningBlockAtEndBtn) addAnotherMeaningBlockAtEndBtn.addEventListener('click', () => addMeaningBlockToEnd());
            if(cardWordInput) cardWordInput.addEventListener('input', () => clearFieldError(cardWordInput, cardWordError));
            initializeClearButtonForSearch();
            if(cardBaseVerbInput) cardBaseVerbInput.addEventListener('input', () => { const inputValue = cardBaseVerbInput.value.toLowerCase(); if (inputValue.length === 0) { hideAutocompleteSuggestions(cardBaseVerbInput); return; } const filteredSuggestions = baseVerbSuggestions.filter(verb => verb.toLowerCase().includes(inputValue) ); showAutocompleteSuggestions(cardBaseVerbInput, filteredSuggestions); });
            if(cardBaseVerbInput) cardBaseVerbInput.addEventListener('focus', () => { const inputValue = cardBaseVerbInput.value.toLowerCase(); const filteredSuggestions = baseVerbSuggestions.filter(verb => verb.toLowerCase().includes(inputValue) ); if (filteredSuggestions.length > 0 || inputValue.length === 0) { showAutocompleteSuggestions(cardBaseVerbInput, filteredSuggestions.slice(0, 5)); } });
            if(cardTagsInput) cardTagsInput.addEventListener('input', () => { const fullInputValue = cardTagsInput.value; const lastCommaIndex = fullInputValue.lastIndexOf(','); const currentTagQuery = (lastCommaIndex === -1 ? fullInputValue : fullInputValue.substring(lastCommaIndex + 1)).trim().toLowerCase(); if (currentTagQuery.length === 0) { hideAutocompleteSuggestions(cardTagsInput); return; } const alreadyAddedTags = fullInputValue.substring(0, lastCommaIndex + 1).split(',').map(t => t.trim().toLowerCase()); const filteredSuggestions = tagSuggestions.filter(tag => tag.toLowerCase().includes(currentTagQuery) && !alreadyAddedTags.includes(tag.toLowerCase()) ); showAutocompleteSuggestions(cardTagsInput, filteredSuggestions, true); });
            if(cardTagsInput) cardTagsInput.addEventListener('focus', () => { const fullInputValue = cardTagsInput.value; const lastCommaIndex = fullInputValue.lastIndexOf(','); const currentTagQuery = (lastCommaIndex === -1 ? fullInputValue : fullInputValue.substring(lastCommaIndex + 1)).trim().toLowerCase(); const alreadyAddedTags = fullInputValue.substring(0, lastCommaIndex + 1).split(',').map(t => t.trim().toLowerCase()); const filteredSuggestions = tagSuggestions.filter(tag => tag.toLowerCase().includes(currentTagQuery) && !alreadyAddedTags.includes(tag.toLowerCase()) ); if (filteredSuggestions.length > 0 || currentTagQuery.length === 0) { showAutocompleteSuggestions(cardTagsInput, filteredSuggestions.slice(0, 5), true); } });
            document.addEventListener('click', function(event) { const activeSuggestionsList = document.querySelector('.autocomplete-suggestions-list'); if (activeSuggestionsList) { const inputId = activeSuggestionsList.id.replace('-suggestions', ''); const inputElement = document.getElementById(inputId); if (inputElement && !inputElement.contains(event.target) && !activeSuggestionsList.contains(event.target)) { hideAutocompleteSuggestions(inputElement); } } });
        }

        async function setupInitialCategoryAndSource() { 
            if (!window.authFunctions.getCurrentUserId()) { // Chỉ gọi loadAppState ở đây nếu user chưa đăng nhập
                await loadAppState(); 
            }
            // Nếu user đã đăng nhập, onAuthStateChanged sẽ gọi updateAuthUI, và updateAuthUI sẽ gọi loadAppState

            const urlParams = new URLSearchParams(window.location.search);
            const sourceFromUrl = urlParams.get('source');
            currentDatasetSource = sourceFromUrl || appState.lastSelectedSource || 'web';
            if(cardSourceSelect) cardSourceSelect.value = currentDatasetSource; 
            if(categorySelect) categorySelect.value = appState.lastSelectedCategory || 'phrasalVerbs';
            
            await loadVocabularyData(categorySelect.value); 
        }
        
    }); // END DOMContentLoaded
