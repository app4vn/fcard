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
  getFirestore, collection, addDoc, getDocs, doc, setDoc, updateDoc, deleteDoc, query, where, orderBy, serverTimestamp, getDoc, Timestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Import từ các module tự tạo
import { initializeAuthModule, openAuthModal as openAuthModalFromAuth, getCurrentUserId, handleAuthAction as handleAuthActionFromAuth } from './auth.js';
import * as FirestoreService from './firestoreService.js';
import { initializeSrsModule, processSrsRatingWrapper } from './srs.js';

const firebaseConfig = {
  apiKey: "AIzaSyBcBpsCGt-eWyAvtNaqxG0QncqzYDJwG70", // Thay bằng API key của bạn
  authDomain: "fcard-84890.firebaseapp.com", // Thay bằng authDomain của bạn
  projectId: "fcard-84890", // Thay bằng projectId của bạn
  storageBucket: "fcard-84890.appspot.com", // Thay bằng storageBucket của bạn
  messagingSenderId: "195942452341", // Thay bằng messagingSenderId của bạn
  appId: "1:195942452341:web:b995a99ae0d1fbb47a7c3c" // Thay bằng appId của bạn
};

// Initialize Firebase
const fbApp = initializeApp(firebaseConfig);
const fbAuth = getAuth(fbApp);
const db = getFirestore(fbApp);

// KHAI BÁO CÁC BIẾN DOM SẼ ĐƯỢC SỬ DỤNG Ở PHẠM VI MODULE
let mainHeaderTitle, cardSourceSelect, categorySelect, flashcardElement, wordDisplay,
    pronunciationDisplay, meaningDisplayContainer, notesDisplay, prevBtn, flipBtn,
    nextBtn, currentCardIndexDisplay, totalCardsDisplay, speakerBtn, /* speakerExampleBtn, XÓA BIẾN NÀY */
    tagFilterContainer, tagSelect, searchInput, baseVerbFilterContainer, baseVerbSelect,
    practiceTypeSelect, practiceArea, multipleChoiceOptionsContainer, feedbackMessage,
    filterCardStatusSelect,
    btnSrsAgain, btnSrsHard, btnSrsGood, btnSrsEasy,
    hamburgerMenuBtn, filterSidebar, closeSidebarBtn, sidebarOverlay, tagsDisplayFront,
    typingInputContainer, typingInput, submitTypingAnswerBtn, openAddCardModalBtn,
    addEditCardModal, closeModalBtn, addEditCardForm, modalTitle, cardIdInput,
    cardWordInput, cardPronunciationInput, cardGeneralNotesInput, cardVideoUrlInput,
    meaningBlocksContainer, addAnotherMeaningBlockAtEndBtn, phrasalVerbSpecificFields,
    cardBaseVerbInput, cardTagsInput, cancelCardBtn, saveCardBtn, deckCreationHint,
    userDeckFilterContainer, userDeckSelect, manageDecksBtn, modalDeckAssignmentContainer,
    cardDeckAssignmentSelect, manageDecksModal, deckModalContent, closeDeckModalBtn,
    newDeckNameInput, addNewDeckBtn, existingDecksList, cardWordError, meaningBlocksGeneralError,
    manualInputModeBtn, jsonInputModeBtn, jsonInputArea, cardJsonInput, processJsonBtn,
    jsonImportErrorMessage, jsonImportSuccessMessage, jsonCardDeckAssignmentSelect,
    jsonDeckCreationHint,
    copyToDeckModal, closeCopyToDeckModalBtn,
    copyToDeckSelect, copyNewDeckNameContainer, copyNewDeckNameInput, copyNewDeckError,
    copyToDeckErrorMessage, copyToDeckSuccessMessage, cancelCopyToDeckBtn, confirmCopyToDeckBtn,
    bottomSheetOverlay, bottomSheet, bottomSheetTitle, closeBottomSheetBtn, bottomSheetContent,
    cardOptionsMenuBtn, cardOptionsMenuBtnBack,
    authActionButtonMain, userEmailDisplayMain,
    srsFeedbackToastEl,
    actionBtnNotes, actionBtnMedia, actionBtnPracticeCard,
    exitSingleCardPracticeBtn,
    bottomSheetTabsContainer, tabBtnYouglish, tabBtnYouTube,
    flipIconFront, flipIconBack;


// KHAI BÁO CÁC BIẾN TRẠNG THÁI ỨNG DỤNG Ở PHẠM VI MODULE
let baseVerbSuggestions = [];
let tagSuggestions = [];
let currentDatasetSource = 'web';
window.currentData = [];
window.currentIndex = 0;
let currentWordSpansMeta = []; // Metadata cho từ/cụm từ chính
let activeMasterList = [];
let practiceType = "off";
let currentInputMode = 'manual';
let currentAnswerChecked = false;
let currentCorrectAnswerForPractice = '';
let userDecks = [];
let learningCardNextButtonTimer = null;
let learningCardCountdownInterval = null;
// XÓA CÁC BIẾN LIÊN QUAN ĐẾN HÀNG ĐỢI PHÁT VÍ DỤ
// let exampleSpeechQueue = [];
// let currentExampleSpeechIndex = 0;
// let isSpeakingExampleQueue = false;
let currentEditingCardId = null;
let currentEditingDeckId = null;
let isSingleCardPracticeMode = false;
let originalCurrentData = [];
let originalCurrentIndex = 0;
let currentYouglishWidget = null;
let isYouglishApiReady = false;

window.onYouglishAPIReady = function() {
    console.log("Youglish API is ready.");
    isYouglishApiReady = true;
    if (typeof window.processPendingYouglishWidget === 'function') {
        window.processPendingYouglishWidget();
        window.processPendingYouglishWidget = null;
    }
};


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
let appState = JSON.parse(JSON.stringify(defaultAppState));

const appStateStorageKey = 'flashcardAppState_v4_firestore_sync_v2';

async function loadAppState() {
    const userId = getCurrentUserId();
    console.log("Attempting to load AppState. Current user ID:", userId);
    if (userId) {
        const firestoreState = await FirestoreService.loadAppStateFromFirestore(userId);
        if (firestoreState) {
            appState = {
                ...defaultAppState,
                ...firestoreState,
                categoryStates: firestoreState.categoryStates ? { ...firestoreState.categoryStates } : {}
            };
            Object.keys(appState.categoryStates).forEach(k => {
                appState.categoryStates[k] = {
                    ...defaultCategoryState,
                    ...(appState.categoryStates[k] || {}),
                    searchTerm: appState.categoryStates[k]?.searchTerm || ''
                };
            });
            console.log("AppState loaded from Firestore and merged with defaults:", JSON.parse(JSON.stringify(appState)));
            localStorage.setItem(appStateStorageKey, JSON.stringify(appState));
            return;
        } else {
            console.log("No AppState in Firestore for this user, trying localStorage or defaults.");
        }
    }

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
            if (userId) {
                await FirestoreService.saveAppStateToFirestoreService(userId, appState);
            }
        } else {
            console.log("No AppState in localStorage, using defaults.");
            appState = JSON.parse(JSON.stringify(defaultAppState));
             if (userId) {
                await FirestoreService.saveAppStateToFirestoreService(userId, appState);
            } else {
                localStorage.setItem(appStateStorageKey, JSON.stringify(appState));
            }
        }
    } catch (e) {
        console.error("Lỗi load appState từ localStorage, using defaults:", e);
        appState = JSON.parse(JSON.stringify(defaultAppState));
        if (userId) {
            await FirestoreService.saveAppStateToFirestoreService(userId, appState);
        }
    }
}

async function saveAppState(){
    if (!categorySelect || !filterCardStatusSelect || !userDeckSelect || !baseVerbSelect || !tagSelect) {
        // console.warn("saveAppState: DOM elements for select not ready yet. Skipping save or using potentially old appState values.");
    } else {
        const currentCategoryValue = categorySelect.value;
        const stateForCategory = getCategoryState(currentDatasetSource, currentCategoryValue);

        stateForCategory.currentIndex = window.currentIndex;
        stateForCategory.filterMarked = filterCardStatusSelect.value;
        if (currentDatasetSource === 'user') {
            stateForCategory.deckId = userDeckSelect.value;
        }
        if (currentCategoryValue === 'phrasalVerbs' || currentCategoryValue === 'collocations') {
            stateForCategory.baseVerb = baseVerbSelect.value;
            stateForCategory.tag = tagSelect.value;
        }
        appState.lastSelectedCategory = currentCategoryValue;
        appState.lastSelectedSource = currentDatasetSource;
        appState.lastSelectedDeckId = (currentDatasetSource === 'user') ? userDeckSelect.value : 'all_user_cards';
    }

    try{
        localStorage.setItem(appStateStorageKey,JSON.stringify(appState));
        console.log("AppState saved to localStorage.");
    }catch(e){
        console.error("Lỗi save appState vào localStorage:", e);
    }
    const userId = getCurrentUserId();
    if (userId) {
        await FirestoreService.saveAppStateToFirestoreService(userId, appState);
    }
}

function getCategoryState(src, cat) {
    const key = `${src}_${cat}`;
    if (!appState.categoryStates[key]) {
        appState.categoryStates[key] = JSON.parse(JSON.stringify(defaultCategoryState));
    } else {
        appState.categoryStates[key] = {
            ...defaultCategoryState,
            ...appState.categoryStates[key],
            searchTerm: appState.categoryStates[key].searchTerm || ''
        };
    }
    return appState.categoryStates[key];
}

async function handleAuthStateChangedInApp(user) {
    const userIdFromAuth = getCurrentUserId();

    await loadAppState();

    if (user) {
        if(userEmailDisplayMain) userEmailDisplayMain.textContent = user.email ? user.email : (userIdFromAuth && !user.isAnonymous ? "Người dùng" : "Khách");
        if(userEmailDisplayMain) userEmailDisplayMain.classList.remove('hidden');

        if(authActionButtonMain) {
            authActionButtonMain.classList.remove('bg-indigo-500', 'hover:bg-indigo-600');
            authActionButtonMain.classList.add('bg-red-500', 'hover:bg-red-600');
            authActionButtonMain.innerHTML = `
                <i class="fas fa-sign-out-alt"></i>
                <span class="hidden sm:inline ml-1 sm:ml-2">Đăng xuất</span>
            `;
            authActionButtonMain.title = "Đăng xuất";
        }
    } else {
        if(userEmailDisplayMain) userEmailDisplayMain.classList.add('hidden');
        if(userEmailDisplayMain) userEmailDisplayMain.textContent = '';

        if(authActionButtonMain) {
            authActionButtonMain.classList.remove('bg-red-500', 'hover:bg-red-600');
            authActionButtonMain.classList.add('bg-indigo-500', 'hover:bg-indigo-600');
            authActionButtonMain.innerHTML = `
                <i class="fas fa-sign-in-alt"></i>
                <span class="hidden sm:inline ml-1 sm:ml-2">Đăng nhập</span>
            `;
            authActionButtonMain.title = "Đăng nhập";
        }
        console.log("User logged out. AppState reset to defaults if not found in localStorage.");
    }

    if (typeof setupInitialCategoryAndSource === 'function') {
        await setupInitialCategoryAndSource();
    }
    if (typeof updateSidebarFilterVisibility === 'function') {
        updateSidebarFilterVisibility();
    }
    if (typeof updateMainHeaderTitle === 'function') {
       updateMainHeaderTitle();
    }
}

let toastTimeout;
function showToast(message, duration = 3000, type = 'info') {
    if (!srsFeedbackToastEl) return;

    srsFeedbackToastEl.textContent = message;
    srsFeedbackToastEl.classList.remove('bg-slate-700', 'bg-red-600', 'bg-green-600', 'opacity-0', 'hidden');
    srsFeedbackToastEl.classList.add('show');

    if (type === 'error') {
        srsFeedbackToastEl.classList.add('bg-red-600');
    } else if (type === 'success') {
        srsFeedbackToastEl.classList.add('bg-green-600');
    } else {
        srsFeedbackToastEl.classList.add('bg-slate-700');
    }

    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
        srsFeedbackToastEl.classList.remove('show');
    }, duration);
}


// Logic chính của ứng dụng
document.addEventListener('DOMContentLoaded', async () => {
    mainHeaderTitle = document.getElementById('main-header-title');
    cardSourceSelect = document.getElementById('card-source-select');
    categorySelect = document.getElementById('category');
    flashcardElement = document.getElementById('flashcard');
    wordDisplay = document.getElementById('word-display');
    pronunciationDisplay = document.getElementById('pronunciation-display');
    meaningDisplayContainer = document.getElementById('meaning-display-container');
    notesDisplay = document.getElementById('notes-display');
    prevBtn = document.getElementById('prev-btn');
    flipBtn = document.getElementById('flip-btn');
    nextBtn = document.getElementById('next-btn');
    currentCardIndexDisplay = document.getElementById('current-card-index');
    totalCardsDisplay = document.getElementById('total-cards');
    speakerBtn = document.getElementById('speaker-btn');
    // speakerExampleBtn = document.getElementById('speaker-example-btn'); // XÓA DÒNG NÀY
    tagFilterContainer = document.getElementById('tag-filter-container');
    tagSelect = document.getElementById('tags');
    searchInput = document.getElementById('search-input');
    baseVerbFilterContainer = document.getElementById('base-verb-filter-container');
    baseVerbSelect = document.getElementById('base-verb-filter');
    practiceTypeSelect = document.getElementById('practice-type-select');
    practiceArea = document.getElementById('practice-area');
    multipleChoiceOptionsContainer = document.getElementById('multiple-choice-options');
    feedbackMessage = document.getElementById('feedback-message');
    filterCardStatusSelect = document.getElementById('filter-card-status');
    btnSrsAgain = document.getElementById('btn-srs-again');
    btnSrsHard = document.getElementById('btn-srs-hard');
    btnSrsGood = document.getElementById('btn-srs-good');
    btnSrsEasy = document.getElementById('btn-srs-easy');
    hamburgerMenuBtn = document.getElementById('hamburger-menu-btn');
    filterSidebar = document.getElementById('filter-sidebar');
    closeSidebarBtn = document.getElementById('close-sidebar-btn');
    sidebarOverlay = document.getElementById('sidebar-overlay');
    tagsDisplayFront = document.getElementById('tags-display-front');
    typingInputContainer = document.getElementById('typing-input-container');
    typingInput = document.getElementById('typing-input');
    submitTypingAnswerBtn = document.getElementById('submit-typing-answer-btn');
    openAddCardModalBtn = document.getElementById('open-add-card-modal-btn');
    addEditCardModal = document.getElementById('add-edit-card-modal');
    closeModalBtn = document.getElementById('close-modal-btn');
    addEditCardForm = document.getElementById('add-edit-card-form');
    modalTitle = document.getElementById('modal-title');
    cardIdInput = document.getElementById('card-id-input');
    cardWordInput = document.getElementById('card-word-input');
    cardPronunciationInput = document.getElementById('card-pronunciation-input');
    cardGeneralNotesInput = document.getElementById('card-general-notes-input');
    cardVideoUrlInput = document.getElementById('card-video-url-input');
    meaningBlocksContainer = document.getElementById('meaning-blocks-container');
    addAnotherMeaningBlockAtEndBtn = document.getElementById('add-another-meaning-block-at-end-btn');
    phrasalVerbSpecificFields = document.getElementById('phrasal-verb-specific-fields');
    cardBaseVerbInput = document.getElementById('card-base-verb-input');
    cardTagsInput = document.getElementById('card-tags-input');
    cancelCardBtn = document.getElementById('cancel-card-btn');
    saveCardBtn = document.getElementById('save-card-btn');
    deckCreationHint = document.getElementById('deck-creation-hint');
    userDeckFilterContainer = document.getElementById('user-deck-filter-container');
    userDeckSelect = document.getElementById('user-deck-select');
    manageDecksBtn = document.getElementById('manage-decks-btn');
    modalDeckAssignmentContainer = document.getElementById('modal-deck-assignment-container');
    cardDeckAssignmentSelect = document.getElementById('card-deck-assignment-select');
    manageDecksModal = document.getElementById('manage-decks-modal');
    deckModalContent = manageDecksModal.querySelector('.modal-content');
    closeDeckModalBtn = document.getElementById('close-deck-modal-btn');
    newDeckNameInput = document.getElementById('new-deck-name-input');
    addNewDeckBtn = document.getElementById('add-new-deck-btn');
    existingDecksList = document.getElementById('existing-decks-list');
    cardWordError = document.getElementById('card-word-error');
    meaningBlocksGeneralError = document.getElementById('meaning-blocks-general-error');
    manualInputModeBtn = document.getElementById('manual-input-mode-btn');
    jsonInputModeBtn = document.getElementById('json-input-mode-btn');
    jsonInputArea = document.getElementById('json-input-area');
    cardJsonInput = document.getElementById('card-json-input');
    processJsonBtn = document.getElementById('process-json-btn');
    jsonImportErrorMessage = document.getElementById('json-import-error-message');
    jsonImportSuccessMessage = document.getElementById('json-import-success-message');
    jsonCardDeckAssignmentSelect = document.getElementById('json-card-deck-assignment-select');
    jsonDeckCreationHint = document.getElementById('json-deck-creation-hint');
    copyToDeckModal = document.getElementById('copy-to-deck-modal');
    closeCopyToDeckModalBtn = document.getElementById('close-copy-to-deck-modal-btn');
    copyToDeckSelect = document.getElementById('copy-to-deck-select');
    copyNewDeckNameContainer = document.getElementById('copy-new-deck-name-container');
    copyNewDeckNameInput = document.getElementById('copy-new-deck-name-input');
    copyNewDeckError = document.getElementById('copy-new-deck-error');
    copyToDeckErrorMessage = document.getElementById('copy-to-deck-error-message');
    copyToDeckSuccessMessage = document.getElementById('copy-to-deck-success-message');
    cancelCopyToDeckBtn = document.getElementById('cancel-copy-to-deck-btn');
    confirmCopyToDeckBtn = document.getElementById('confirm-copy-to-deck-btn');
    bottomSheetOverlay = document.getElementById('bottom-sheet-overlay');
    bottomSheet = document.getElementById('bottom-sheet');
    bottomSheetTitle = document.getElementById('bottom-sheet-title');
    closeBottomSheetBtn = document.getElementById('close-bottom-sheet-btn');
    bottomSheetContent = document.getElementById('bottom-sheet-content');
    cardOptionsMenuBtn = document.getElementById('card-options-menu-btn');
    cardOptionsMenuBtnBack = document.getElementById('card-options-menu-btn-back');
    authActionButtonMain = document.getElementById('auth-action-btn');
    userEmailDisplayMain = document.getElementById('user-email-display');
    srsFeedbackToastEl = document.getElementById('srs-feedback-toast');
    actionBtnNotes = document.getElementById('action-btn-notes');
    actionBtnMedia = document.getElementById('action-btn-media');
    actionBtnPracticeCard = document.getElementById('action-btn-practice-card');
    exitSingleCardPracticeBtn = document.getElementById('exit-single-card-practice-btn');
    bottomSheetTabsContainer = document.getElementById('bottom-sheet-tabs');
    tabBtnYouglish = document.getElementById('tab-btn-youglish');
    tabBtnYouTube = document.getElementById('tab-btn-youtube');
    flipIconFront = document.getElementById('flip-icon-front');
    flipIconBack = document.getElementById('flip-icon-back');

    window.wordDisplay = wordDisplay;
    window.updateSidebarFilterVisibility = updateSidebarFilterVisibility;
    window.updateMainHeaderTitle = updateMainHeaderTitle;
    window.loadVocabularyData = loadVocabularyData;
    window.updateFlashcard = updateFlashcard;

    initializeAuthModule(fbAuth, handleAuthStateChangedInApp);
    FirestoreService.initializeFirestoreService(db);
        initializeSrsModule({
        firestoreServiceModule: FirestoreService,
        authGetCurrentUserIdFunc: getCurrentUserId,
        utilGetWebCardGlobalIdFunc: getWebCardGlobalId,
        uiUpdateStatusButtonsFunc: updateStatusButtonsUI,
        uiUpdateFlashcardFunc: updateFlashcard,
        uiNextBtnElement: nextBtn,
        dataGetCurrentCardFunc: () => window.currentData[window.currentIndex],
        dataGetWindowCurrentDataFunc: () => window.currentData,
        dataGetCurrentIndexFunc: () => window.currentIndex,
        uiShowToastFunc: showToast
    });


    if (!getCurrentUserId()) {
        await loadAppState();
    }

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
    function initializeClearButtonsForModal() { const inputsWithClear = [ cardWordInput, cardPronunciationInput, cardBaseVerbInput, cardTagsInput, cardGeneralNotesInput, cardVideoUrlInput ]; inputsWithClear.forEach(inputEl => { if (inputEl && inputEl.parentNode.classList.contains('relative')) { createClearButtonForInput(inputEl); } }); meaningBlocksContainer.querySelectorAll('.card-meaning-text-input, .card-meaning-notes-input').forEach(input => { if (input && input.parentNode.classList.contains('relative')) createClearButtonForInput(input); }); }
    function initializeClearButtonForSearch() { if (searchInput && searchInput.parentNode.classList.contains('relative')) { createClearButtonForInput(searchInput); } }

    function createExampleEntryElement(exampleData = { id: generateUniqueId('ex'), eng: '', vie: '', exampleNotes: '' }) { const exampleEntryDiv = document.createElement('div'); exampleEntryDiv.className = 'example-entry space-y-1'; exampleEntryDiv.dataset.exampleId = exampleData.id || generateUniqueId('ex'); exampleEntryDiv.innerHTML = `<div class="flex justify-between items-center"><label class="block text-xs font-medium text-slate-500">Ví dụ Tiếng Anh</label><button type="button" class="remove-example-entry-btn text-red-400 hover:text-red-600 text-xs remove-entry-btn" title="Xóa ví dụ này"><i class="fas fa-times-circle"></i> Xóa</button></div><textarea rows="2" class="card-example-eng-input block w-full p-1.5 border border-slate-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm" placeholder="Câu ví dụ (Tiếng Anh)">${exampleData.eng}</textarea><label class="block text-xs font-medium text-slate-500 mt-1">Nghĩa ví dụ (Tiếng Việt - tùy chọn)</label><textarea rows="1" class="card-example-vie-input block w-full p-1.5 border border-slate-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm" placeholder="Nghĩa tiếng Việt của ví dụ">${exampleData.vie}</textarea><label class="block text-xs font-medium text-slate-500 mt-1">Ghi chú cho ví dụ này (tùy chọn)</label><textarea rows="1" class="card-example-notes-input block w-full p-1.5 border border-slate-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm" placeholder="Ghi chú cho ví dụ">${exampleData.exampleNotes || ''}</textarea>`; exampleEntryDiv.querySelector('.remove-example-entry-btn').addEventListener('click', function() { this.closest('.example-entry').remove(); }); return exampleEntryDiv; }
    function createMeaningBlockElement(meaningBlockData = { id: generateUniqueId('meaning'), text: '', notes: '', examples: [] }) { const meaningBlockDiv = document.createElement('div'); meaningBlockDiv.className = 'meaning-block'; meaningBlockDiv.dataset.meaningId = meaningBlockData.id || generateUniqueId('meaning'); meaningBlockDiv.innerHTML = `<div class="flex justify-between items-center mb-2"><label class="block text-sm font-medium text-slate-700">Nghĩa (Tiếng Việt) <span class="text-red-500">*</span></label><button type="button" class="remove-meaning-block-btn text-red-500 hover:text-red-700 text-sm remove-entry-btn" title="Xóa khối nghĩa này"><i class="fas fa-trash-alt"></i> Xóa Khối</button></div><div class="relative"><input type="text" class="card-meaning-text-input block w-full p-2 pr-8 border border-slate-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500" value="${meaningBlockData.text}" placeholder="Nội dung nghĩa..." required></div><p class="meaning-text-error form-error-message hidden"></p><label class="block text-xs font-medium text-slate-500 mt-2">Ghi chú cho nghĩa này (tùy chọn)</label><div class="relative"><textarea rows="1" class="card-meaning-notes-input block w-full p-1.5 pr-8 border border-slate-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm" placeholder="Ghi chú cho nghĩa...">${meaningBlockData.notes}</textarea></div><div class="mt-3 border-t pt-3"><h4 class="text-xs font-semibold text-slate-600 mb-2">Các ví dụ cho nghĩa này:</h4><div class="examples-for-meaning-container space-y-2"></div><button type="button" class="add-example-to-meaning-btn text-xs bg-sky-500 hover:bg-sky-600 text-white font-semibold py-1.5 px-3 rounded-md shadow-sm mt-3 w-full"><i class="fas fa-plus mr-1"></i>Thêm Ví dụ</button></div>`; const examplesContainerDiv = meaningBlockDiv.querySelector('.examples-for-meaning-container'); if (meaningBlockData.examples && meaningBlockData.examples.length > 0) { meaningBlockData.examples.forEach(ex => examplesContainerDiv.appendChild(createExampleEntryElement(ex))); } meaningBlockDiv.querySelector('.remove-meaning-block-btn').addEventListener('click', function() { this.closest('.meaning-block').remove(); updateRemoveMeaningBlockButtonsState(); }); meaningBlockDiv.querySelector('.add-example-to-meaning-btn').addEventListener('click', function() { this.closest('.meaning-block').querySelector('.examples-for-meaning-container').appendChild(createExampleEntryElement()); }); const meaningTextInput = meaningBlockDiv.querySelector('.card-meaning-text-input'); const meaningTextError = meaningBlockDiv.querySelector('.meaning-text-error'); meaningTextInput.addEventListener('input', () => clearFieldError(meaningTextInput, meaningTextError)); if (meaningTextInput.parentNode.classList.contains('relative')) { createClearButtonForInput(meaningTextInput); } const meaningNotesInput = meaningBlockDiv.querySelector('.card-meaning-notes-input'); if (meaningNotesInput.parentNode.classList.contains('relative')) { createClearButtonForInput(meaningNotesInput); } return meaningBlockDiv; }
    function addMeaningBlockToEnd(meaningBlockData) { meaningBlocksContainer.appendChild(createMeaningBlockElement(meaningBlockData)); updateRemoveMeaningBlockButtonsState(); }
    function updateRemoveMeaningBlockButtonsState() { const meaningBlocks = meaningBlocksContainer.querySelectorAll('.meaning-block'); meaningBlocks.forEach(block => { const removeBtn = block.querySelector('.remove-meaning-block-btn'); if (removeBtn) removeBtn.disabled = meaningBlocks.length <= 1; }); }

    async function loadUserDecks() {
        const userId = getCurrentUserId();
        if (!userId) {
            userDecks = [];
            populateDeckSelects();
            renderExistingDecksList();
            return;
        }
        userDecks = await FirestoreService.loadUserDecksFromFirestore(userId);
        populateDeckSelects();
        renderExistingDecksList();
    }

    async function createDeck(name) {
        const userId = getCurrentUserId();
        if (!userId) {
            alert("Vui lòng đăng nhập để tạo bộ thẻ.");
            openAuthModalFromAuth('login');
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

        const createdDeck = await FirestoreService.createDeckInFirestore(userId, name);
        if (createdDeck) {
            userDecks.push(createdDeck);
            userDecks.sort((a,b)=>a.name.localeCompare(b.name,'vi'));
            populateDeckSelects();
            renderExistingDecksList();
        }
        return createdDeck;
    }

    async function updateDeckName(id, newName) {
        const userId = getCurrentUserId();
        if (!userId) { alert("Vui lòng đăng nhập."); return false; }
        if (!newName || !newName.trim()) { alert("Tên bộ thẻ không được để trống!"); return false; }

        if (!Array.isArray(userDecks)) userDecks =[];
        if (userDecks.some(d => d.id !== id && d.name.toLowerCase() === newName.trim().toLowerCase())) {
            alert("Tên bộ thẻ đã tồn tại!");
            return false;
        }

        const success = await FirestoreService.updateDeckNameInFirestore(userId, id, newName);
        if (success) {
            const idx = userDecks.findIndex(d => d.id === id);
            if (idx > -1) {
                userDecks[idx].name = newName.trim();
                userDecks.sort((a,b)=>a.name.localeCompare(b.name,'vi'));
            }
            populateDeckSelects();
            renderExistingDecksList();
            updateMainHeaderTitle();
        }
        return success;
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
        const userId = getCurrentUserId();
        const isLoggedIn = !!userId;

        userDeckFilterContainer.style.display = isUserSource ? 'block' : 'none';
        manageDecksBtn.style.display = isUserSource ? 'block' : 'none';

        if (userDeckSelect) userDeckSelect.disabled = !isUserSource || !isLoggedIn;
        if (manageDecksBtn) manageDecksBtn.disabled = !isUserSource || !isLoggedIn;
        if (openAddCardModalBtn) openAddCardModalBtn.disabled = !isUserSource || !isLoggedIn;
    }

    function updateMainHeaderTitle() {
        const userId = getCurrentUserId();
        const sourceText = currentDatasetSource === 'web' ? "Thẻ của Web" : (userId ? "Thẻ của Tôi" : "Thẻ của Web (Chưa đăng nhập)");
        let deckText = "";
        if (currentDatasetSource === 'user' && userId && userDeckSelect.value && userDeckSelect.value !== 'all_user_cards' && userDeckSelect.value !== 'unassigned_cards') {
            const selectedDeck = Array.isArray(userDecks) ? userDecks.find(d => d.id === userDeckSelect.value) : null;
            if (selectedDeck) deckText = ` - ${selectedDeck.name}`;
        } else if (currentDatasetSource === 'user' && userId && userDeckSelect.value === 'unassigned_cards') {
            deckText = " - Thẻ chưa có bộ";
        }
        const categoryText = categorySelect.options[categorySelect.selectedIndex].text;
        mainHeaderTitle.textContent = `${sourceText}${deckText} - ${categoryText}`;
    }

    async function openAddEditModal(mode = 'add', cardData = null) {
        const userId = getCurrentUserId();
        if (cardSourceSelect.value === 'user' && !userId && mode !== 'json_import') {
            alert("Vui lòng đăng nhập để thêm hoặc sửa thẻ của bạn.");
            openAuthModalFromAuth('login');
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
            cardVideoUrlInput.value = cardData.videoUrl || '';
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
            cardVideoUrlInput.value = '';
        }
        updateRemoveMeaningBlockButtonsState();
        [cardWordInput, cardPronunciationInput, cardBaseVerbInput, cardTagsInput, cardGeneralNotesInput, cardVideoUrlInput].forEach(input => { if (input) input.dispatchEvent(new Event('input', { bubbles: true })); });
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
        if (!cardItem) return {status:'new',lastReviewed:null,reviewCount:0, nextReviewDate: null, interval: 0, easeFactor: 2.5, repetitions: 0, isSuspended: false};
        const userId = getCurrentUserId();

        if (cardItem.isUserCard) {
            return {
                status: cardItem.status || 'new',
                lastReviewed: cardItem.lastReviewed || null,
                reviewCount: cardItem.reviewCount || 0,
                nextReviewDate: cardItem.nextReviewDate || null,
                interval: cardItem.interval || 0,
                easeFactor: cardItem.easeFactor || 2.5,
                repetitions: cardItem.repetitions || 0,
                isSuspended: cardItem.isSuspended || false
            };
        } else {
            if (userId) {
                const firestoreStatus = await FirestoreService.getWebCardStatusFromFirestore(userId, getWebCardGlobalId(cardItem));
                if (firestoreStatus) {
                    return {
                        ...defaultCategoryState,
                        ...firestoreStatus,
                        status: firestoreStatus.status || 'new',
                        isSuspended: firestoreStatus.isSuspended || false
                    };
                }
            }
            const webCardGlobalId = getWebCardGlobalId(cardItem);
            const defaultStatus = {status:'new',lastReviewed:null,reviewCount:0, nextReviewDate: null, interval: 0, easeFactor: 2.5, repetitions: 0, isSuspended: false};
            if (!webCardGlobalId) return defaultStatus;
            try {
                const legacyStatuses = JSON.parse(localStorage.getItem('flashcardCardStatuses_v4_nested_linked_ui_fixed_v2') || '{}');
                const statusKey = webCardGlobalId;
                if (!legacyStatuses[statusKey]) return defaultStatus;
                const s = legacyStatuses[statusKey];
                return {
                    status:s.status||'new',
                    lastReviewed:s.lastReviewed||null,
                    reviewCount:s.reviewCount||0,
                    nextReviewDate: s.nextReviewDate || null,
                    interval: s.interval || 0,
                    easeFactor: s.easeFactor || 2.5,
                    repetitions: s.repetitions || 0,
                    isSuspended: s.isSuspended || false
                };
            } catch (e) {
                console.error("Error parsing legacy card statuses from localStorage", e);
                return defaultStatus;
            }
        }
    }

    async function updateStatusButtonsUI(){
        const srsButtons = [btnSrsAgain, btnSrsHard, btnSrsGood, btnSrsEasy];
        const currentCardItem = window.currentData.length > 0 ? window.currentData[window.currentIndex] : null;

        const enableSrsButtons = currentCardItem &&
                                 practiceType === 'off' &&
                                 (currentCardItem.isUserCard || getCurrentUserId());

        srsButtons.forEach(btn => {
            if(btn) btn.disabled = !enableSrsButtons;
        });
    }

    async function loadUserCards(deckIdToLoad = null) {
        const userId = getCurrentUserId();
        if (!userId) {
            console.log("loadUserCards: No user logged in.");
            return [];
        }

        let cards = [];
        const selectedDeckId = deckIdToLoad || (userDeckSelect ? userDeckSelect.value : 'all_user_cards');

        if (selectedDeckId && selectedDeckId !== 'all_user_cards' && selectedDeckId !== 'unassigned_cards') {
            cards = await FirestoreService.loadUserCardsFromFirestore(userId, selectedDeckId);
        } else if (selectedDeckId === 'all_user_cards') {
            if (Array.isArray(userDecks)) {
                for (const deck of userDecks) {
                    const deckCards = await FirestoreService.loadUserCardsFromFirestore(userId, deck.id);
                    cards.push(...deckCards);
                }
            }
             console.log(`All cards loaded for user ${userId}:`, cards);
        }
        return cards.map(card => ({ ...card, isSuspended: card.isSuspended || false, videoUrl: card.videoUrl || null }));
    }

    async function handleSaveCard() {
        const userId = getCurrentUserId();
        if (!userId && cardSourceSelect.value === 'user') {
            alert("Vui lòng đăng nhập để lưu thẻ.");
            openAuthModalFromAuth('login');
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
            videoUrl: cardVideoUrlInput.value.trim() || null,
            category: cardCategory,
            deckId: assignedDeckId,
            status: 'new',
            lastReviewed: null,
            reviewCount: 0,
            nextReviewDate: serverTimestamp(),
            interval: 0,
            easeFactor: 2.5,
            repetitions: 0,
            isSuspended: false,
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
        const savedCardId = await FirestoreService.saveCardToFirestore(userId, assignedDeckId, cardDataToSave, editingCardId);

        if (savedCardId) {
            alert(editingCardId ? "Đã cập nhật thẻ!" : "Đã thêm thẻ mới!");
            closeAddEditModal();
            if (currentDatasetSource === 'user') {
                await loadVocabularyData(categorySelect.value);
            }
        }
        currentEditingCardId = null;
    }

    async function handleDeleteCard(){
        const userId = getCurrentUserId();
        if (!userId) {
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

        const success = await FirestoreService.deleteCardFromFirestore(userId, deckIdOfCard, cardIdToDelete);

        if (success) {
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
        }
    }
    function shuffleArray(arr){const nA=[...arr];for(let i=nA.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[nA[i],nA[j]]=[nA[j],nA[i]];}return nA;}
   

    function speakText(txt, meta = [], cb = null) {
        if (!txt || !txt.trim()) {
            if (cb) cb();
            return;
        }
        if ('speechSynthesis' in window) {
            const u = new SpeechSynthesisUtterance(txt);
            u.lang = 'en-US';
            u.rate = 0.9;
            u.pitch = 1;
            window.speechSynthesis.cancel(); // Luôn hủy phát âm hiện tại trước khi phát mới

            if (meta.length > 0) {
                u.onstart = () => meta.forEach(m => m.element.classList.remove('highlighted-word'));
                u.onboundary = e => {
                    meta.forEach(m => m.element.classList.remove('highlighted-word'));
                    let found = false;
                    for (const m of meta) {
                        if (e.charIndex >= m.start && e.charIndex < m.start + m.length) {
                            m.element.classList.add('highlighted-word');
                            found = true;
                            break;
                        }
                    }
                    // Fallback nếu không tìm thấy chính xác (ví dụ: do khác biệt nhỏ trong cách trình duyệt tính charIndex)
                    if (!found && meta.length > 0) {
                        for (let i = meta.length - 1; i >= 0; i--) {
                            const m = meta[i];
                            if (e.charIndex >= m.start) {
                                if ((i === meta.length - 1) || (e.charIndex < meta[i+1].start)) {
                                    m.element.classList.add('highlighted-word');
                                    break;
                                }
                            }
                        }
                    }
                };
                u.onend = () => {
                    meta.forEach(m => m.element.classList.remove('highlighted-word'));
                    if (cb) cb();
                };
                u.onerror = e => {
                    meta.forEach(m => m.element.classList.remove('highlighted-word'));
                    console.error("Lỗi phát âm:", e);
                    if (cb) cb();
                };
            } else {
                u.onend = () => { if (cb) cb(); };
                u.onerror = e => { console.error("Lỗi phát âm:", e); if (cb) cb(); };
            }
            window.speechSynthesis.speak(u);
        } else {
            console.warn("Trình duyệt không hỗ trợ Speech Synthesis.");
            if (cb) cb();
        }
    }

    // XÓA HÀM playNextExampleInQueue()
    // function playNextExampleInQueue(){ ... }

    function populateBaseVerbFilter(arr){ /* ... Giữ nguyên ... */ }
    function populateTagFilter(arr){ /* ... Giữ nguyên ... */ }
    async function applyAllFilters(fromLoad=false){ /* ... Giữ nguyên ... */ }
    async function loadVocabularyData (category) { /* ... Giữ nguyên ... */ }

    function updateFlashcard() {
        const userId = getCurrentUserId();
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

        const oldOriginalTermOnBack = flashcardElement.querySelector('.original-term-on-back');
        if (oldOriginalTermOnBack) oldOriginalTermOnBack.remove();

        if (cardOptionsMenuBtn) cardOptionsMenuBtn.style.display = 'none';
        if (cardOptionsMenuBtnBack) cardOptionsMenuBtnBack.style.display = 'none';
        if (actionBtnMedia) actionBtnMedia.style.display = 'flex';
        if (exitSingleCardPracticeBtn) exitSingleCardPracticeBtn.style.display = 'none';

        // XÓA LOGIC LIÊN QUAN ĐẾN speakerExampleBtn
        // if(speakerExampleBtn) speakerExampleBtn.style.display = 'none'; // Hoặc xóa hẳn nếu không còn


        if (practiceType !== "off") {
            if(flipBtn) flipBtn.style.display = 'none';
            if(practiceArea) practiceArea.style.display = 'block';
            if(flashcardElement) flashcardElement.classList.add('practice-mode-front-only');
            if (practiceType === 'typing_practice') { /* ... Giữ nguyên ... */ }
            else { /* ... Giữ nguyên ... */ }
            if (practiceType === 'word_quiz') { /* ... Giữ nguyên ... */ }
            else { /* ... Giữ nguyên ... */ }
            if (isSingleCardPracticeMode && exitSingleCardPracticeBtn) { /* ... Giữ nguyên ... */ }
            else { /* ... Giữ nguyên ... */ }
        } else { /* ... Giữ nguyên ... */ }

        const item = window.currentData.length > 0 ? window.currentData[window.currentIndex] : null;

        if (!item) {
            if(wordDisplay) { /* ... Giữ nguyên ... */ }
            if(pronunciationDisplay) pronunciationDisplay.style.display = 'none';
            if(tagsDisplayFront) tagsDisplayFront.style.display = 'none';
            if(speakerBtn) speakerBtn.style.display = 'none';
            // if(speakerExampleBtn) speakerExampleBtn.style.display = 'none'; // XÓA DÒNG NÀY
            if(flipBtn) flipBtn.disabled = true;
            if(flipIconFront) flipIconFront.style.display = 'none';
            if(flipIconBack) flipIconBack.style.display = 'none';
            updateStatusButtonsUI();
        } else {
            if(pronunciationDisplay) pronunciationDisplay.style.display = 'block';
            if(tagsDisplayFront) tagsDisplayFront.style.display = 'block';
            if(speakerBtn) speakerBtn.style.display = 'block';
            // if(speakerExampleBtn) speakerExampleBtn.style.display = 'block'; // XÓA DÒNG NÀY
            if(flipBtn) flipBtn.disabled = (practiceType !== "off");
            if(flipIconFront) flipIconFront.style.display = (practiceType === "off") ? 'block' : 'none';
            if(flipIconBack) flipIconBack.style.display = (practiceType === "off") ? 'block' : 'none';

            currentWordSpansMeta = []; // Reset cho từ chính
            let accMainTermChars = 0; // Bộ đếm ký tự cho từ chính
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
                let currentWordQuizCharIndex = 0;
                segs.forEach(s => {
                    if (s.trim() !== '') {
                        const wS = document.createElement('span');
                        wS.textContent = s;
                        mTSp.appendChild(wS);
                        currentWordSpansMeta.push({ element: wS, start: currentWordQuizCharIndex, length: s.length });
                    } else {
                        mTSp.appendChild(document.createTextNode(s));
                    }
                    currentWordQuizCharIndex += s.length;
                });
                if(wordDisplay) wordDisplay.appendChild(mTSp);
                /* ... phần còn lại của word_quiz ... */
            } else {
                let bTFM = ""; // Build Text For Main term
                const pts = mainTermToDisplay.split(/(\([^)]+\))/g).filter(p => p); // Tách phần trong ngoặc
                pts.forEach((p, pI) => {
                    const iD = p.startsWith('(') && p.endsWith(')'); // isDetail (phần trong ngoặc)
                    const cS = document.createElement('span'); // containerSpan for this part
                    cS.className = iD ? 'text-xl opacity-80 ml-1' : 'text-3xl sm:text-4xl font-bold';
                    const segs = p.split(/(\s+)/); // Tách từ và khoảng trắng
                    segs.forEach(s => {
                        bTFM += s;
                        if (s.trim() !== '') {
                            const wS = document.createElement('span'); // wordSpan
                            wS.textContent = s;
                            cS.appendChild(wS);
                            // Chỉ thêm vào currentWordSpansMeta nếu không phải là phần chi tiết trong ngoặc
                            if (!iD) {
                                currentWordSpansMeta.push({ element: wS, start: accMainTermChars, length: s.length });
                            }
                        } else {
                            cS.appendChild(document.createTextNode(s));
                        }
                        if (!iD) accMainTermChars += s.length; // Chỉ đếm ký tự cho phần chính
                    });
                    if(wordDisplay) wordDisplay.appendChild(cS);
                    if (pI < pts.length - 1) {
                        const nPID = pts[pI + 1].startsWith('(') && pts[pI + 1].endsWith(')');
                        if (!p.endsWith(' ') && !pts[pI + 1].startsWith(' ') && !(iD && nPID)) {
                            if(wordDisplay) wordDisplay.appendChild(document.createTextNode(' '));
                            bTFM += ' ';
                            if (!iD) accMainTermChars += 1;
                        }
                    }
                });
                textForTTS = mainTermToDisplay; // TTS vẫn đọc cả câu đầy đủ
            }

            if(wordDisplay) wordDisplay.dataset.ttsText = textForTTS; // Dùng cho nút speakerBtn
            if(pronunciationDisplay) pronunciationDisplay.textContent = item.pronunciation || '';
            /* ... phần tagsDisplayFront ... */

            const cardBackScrollableContent = flashcardElement.querySelector('.card-back .card-scrollable-content');
            /* ... phần originalTermOnBack ... */

            const hasActionsForBottomSheet = (item.isUserCard && userId) || (!item.isUserCard && userId);
            /* ... phần cardOptionsMenuBtn ... */

            if (item.meanings && item.meanings.length > 0) {
                item.meanings.forEach((mObj, idx) => {
                    const meaningBlockDiv = document.createElement('div');
                    /* ... class cho meaningBlockDiv ... */
                    const meaningTextP = document.createElement('p');
                    /* ... class và text cho meaningTextP ... */
                    meaningBlockDiv.appendChild(meaningTextP);
                    if (mObj.notes) { /* ... */ }

                    if (mObj.examples && mObj.examples.length > 0) {
                        const examplesContainer = document.createElement('div');
                        examplesContainer.className = "ml-3 mt-3";
                        const examplesListDiv = document.createElement('div');
                        examplesListDiv.className = "space-y-1.5";
                        examplesListDiv.dataset.meaningId = mObj.id;
                        const maxVisibleExamples = 1;
                        const totalExamples = mObj.examples.length;

                        mObj.examples.forEach((ex, exIdx) => {
                            const exD = document.createElement('div');
                            exD.className="example-item-on-card";
                            if (exIdx >= maxVisibleExamples) { exD.classList.add('hidden'); }

                            const eP = document.createElement('p');
                            eP.className = "example-eng-on-card flex items-center justify-between";

                            const exampleTextContentSpan = document.createElement('span');
                            exampleTextContentSpan.className = "example-text-content mr-2";

                            const enLabel = document.createElement('span');
                            enLabel.className = 'example-label';
                            enLabel.textContent = 'EN: ';
                            exampleTextContentSpan.appendChild(enLabel);

                            const exampleWordSpansMeta = []; // Metadata cho karaoke của ví dụ này
                            let currentExampleCharIndex = 0;
                            const exampleWords = ex.eng.split(/(\s+)/);
                            exampleWords.forEach(wordPart => {
                                if (wordPart.trim() !== '') {
                                    const wordSpan = document.createElement('span');
                                    wordSpan.textContent = wordPart;
                                    exampleTextContentSpan.appendChild(wordSpan);
                                    exampleWordSpansMeta.push({ element: wordSpan, start: currentExampleCharIndex, length: wordPart.length });
                                } else {
                                    exampleTextContentSpan.appendChild(document.createTextNode(wordPart));
                                }
                                currentExampleCharIndex += wordPart.length;
                            });
                            eP.appendChild(exampleTextContentSpan);

                            const exampleControlsSpan = document.createElement('span');
                            exampleControlsSpan.className = 'example-controls flex items-center flex-shrink-0';

                            const playSingleExampleBtn = document.createElement('button');
                            playSingleExampleBtn.className = 'play-single-example-btn text-indigo-200 hover:text-indigo-100 p-1 rounded-full hover:bg-black hover:bg-opacity-25 transition-colors duration-150 ease-in-out';
                            playSingleExampleBtn.title = 'Phát âm ví dụ này';
                            playSingleExampleBtn.innerHTML = '<i class="fas fa-play text-xs"></i>';
                            // Lưu trữ dữ liệu cần thiết trực tiếp vào nút
                            playSingleExampleBtn.dataset.exampleText = ex.eng;
                            // Để lưu trữ mảng metadata, chúng ta cần một cách khác vì dataset chỉ lưu string
                            // Một cách là lưu trữ nó trong một đối tượng tạm thời và truy cập bằng một ID duy nhất,
                            // hoặc gắn trực tiếp vào element (không khuyến khích cho object phức tạp).
                            // Tạm thời, chúng ta sẽ truy xuất lại các span con khi click.
                            // Hoặc tốt hơn: Gắn mảng metadata trực tiếp vào element (nếu trình duyệt hỗ trợ tốt)
                            playSingleExampleBtn._karaokeMeta = exampleWordSpansMeta;


                            playSingleExampleBtn.addEventListener('click', (event) => {
                                event.stopPropagation();
                                window.speechSynthesis.cancel();
                                const textToSpeak = event.currentTarget.dataset.exampleText;
                                const karaokeMetadata = event.currentTarget._karaokeMeta; // Lấy metadata
                                if (textToSpeak && karaokeMetadata) {
                                    speakText(textToSpeak, karaokeMetadata);
                                } else {
                                    // Fallback nếu metadata không được gắn đúng cách
                                    console.warn("Karaoke metadata not found for this example, playing without highlighting.");
                                    speakText(textToSpeak);
                                }
                            });
                            exampleControlsSpan.appendChild(playSingleExampleBtn);

                            const copyBtn = document.createElement('button');
                            /* ... code nút copy như cũ ... */
                            exampleControlsSpan.appendChild(copyBtn);
                            eP.appendChild(exampleControlsSpan);
                            exD.appendChild(eP);

                            if(ex.vie){ /* ... */ }
                            if(ex.exampleNotes){ /* ... */ }
                            examplesListDiv.appendChild(exD);
                        });
                        examplesContainer.appendChild(examplesListDiv);
                        if (totalExamples > maxVisibleExamples) { /* ... nút toggle examples ... */ }
                        meaningBlockDiv.appendChild(examplesContainer);
                    }
                    if(meaningDisplayContainer) meaningDisplayContainer.appendChild(meaningBlockDiv);
                });
            }
            else if(meaningDisplayContainer) meaningDisplayContainer.innerHTML = '<p class="text-slate-400 italic">Chưa có nghĩa.</p>';

            const notesSectionEl = document.getElementById('notes-section');
            /* ... phần notesDisplay ... */

            if(speakerBtn) speakerBtn.disabled = !textForTTS.trim() || (practiceType === 'word_quiz');
            // const hasExamplesToSpeak = item.meanings && item.meanings.some(m => m.examples && m.examples.some(ex => ex.eng.trim())); // KHÔNG CẦN NỮA
            // if(speakerExampleBtn) speakerExampleBtn.disabled = !hasExamplesToSpeak; // XÓA DÒNG NÀY
            updateStatusButtonsUI();
        }
        updateCardInfo();
        if (practiceType === 'off' && !isSingleCardPracticeMode) startLearningTimer();
    };

        function updateCardInfo(){
            if(currentCardIndexDisplay) currentCardIndexDisplay.textContent = window.currentData.length > 0 ? window.currentIndex + 1 : 0;
            if(totalCardsDisplay) totalCardsDisplay.textContent = window.currentData.length;

            if (isSingleCardPracticeMode) {
                if(prevBtn) prevBtn.style.display = 'none';
                if(nextBtn) nextBtn.style.display = 'none';
                if(flipBtn) flipBtn.style.display = 'none';
                if(exitSingleCardPracticeBtn) exitSingleCardPracticeBtn.style.display = 'inline-flex';
            } else {
                if(prevBtn) prevBtn.style.display = 'inline-flex';
                if(nextBtn) nextBtn.style.display = 'inline-flex';
                if(flipBtn) flipBtn.style.display = 'inline-flex';
                if(exitSingleCardPracticeBtn) exitSingleCardPracticeBtn.style.display = 'none';

                if(prevBtn) prevBtn.disabled = window.currentIndex === 0 || window.currentData.length === 0;
                let nextDisabled = (window.currentIndex >= window.currentData.length - 1 || window.currentData.length === 0);
                if (practiceType !== "off") nextDisabled = nextDisabled || (!currentAnswerChecked && window.currentData.length > 0) || (window.currentData.length > 0 && window.currentIndex >= window.currentData.length - 1 && !currentAnswerChecked);
                if (!learningCardNextButtonTimer && nextBtn) nextBtn.disabled = nextDisabled;
                if (flipBtn) flipBtn.disabled = window.currentData.length === 0 || (practiceType !== "off");
            }
        }

        function displayMultipleChoiceOptions() {
            multipleChoiceOptionsContainer.innerHTML = '';
            const sourceCard = isSingleCardPracticeMode ? originalCurrentData[originalCurrentIndex] : window.currentData[window.currentIndex];

            if (!sourceCard) {
                multipleChoiceOptionsContainer.innerHTML = '<p class="text-slate-500 italic col-span-full">Không có thẻ để luyện tập.</p>';
                return;
            }

            let questionText = '';
            let correctAnswerText = '';
            let options = [];
            const numberOfOptions = 4;

            if (practiceType === 'meaning_quiz') {
                questionText = sourceCard.category === 'phrasalVerbs' ? sourceCard.phrasalVerb : (sourceCard.category === 'collocations' ? sourceCard.collocation : sourceCard.word);
                correctAnswerText = sourceCard.meanings[0].text;
                options.push(correctAnswerText);

                let wrongOptionsCount = 0;
                const otherCards = activeMasterList.filter(card =>
                    card.category === sourceCard.category &&
                    getCardIdentifier(card) !== getCardIdentifier(sourceCard) &&
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
                questionText = sourceCard.meanings[0].text;
                correctAnswerText = sourceCard.category === 'phrasalVerbs' ? sourceCard.phrasalVerb : (sourceCard.category === 'collocations' ? sourceCard.collocation : sourceCard.word);
                options.push(correctAnswerText);

                let wrongOptionsCount = 0;
                const otherCards = activeMasterList.filter(card =>
                    card.category === sourceCard.category &&
                    getCardIdentifier(card) !== getCardIdentifier(sourceCard)
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
            while (options.length < Math.min(numberOfOptions, activeMasterList.filter(c => c.category === sourceCard.category).length) && options.length > 0 && options.length < numberOfOptions) {
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

            processSrsRatingWrapper(isCorrect ? 'easy' : 'again');
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
            const userId = getCurrentUserId();
            if (!userId) {
                jsonImportErrorMessage.textContent = "Vui lòng đăng nhập để tạo thẻ từ JSON.";
                jsonImportErrorMessage.classList.remove('hidden');
                openAuthModalFromAuth('login');
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
                    videoUrl: cardJson.videoUrl || null,
                    category: cardJson.category,
                    deckId: selectedDeckId,
                    status: 'new',
                    lastReviewed: null,
                    reviewCount: 0,
                    nextReviewDate: serverTimestamp(),
                    interval: 0,
                    easeFactor: 2.5,
                    repetitions: 0,
                    isSuspended: false,
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

                const savedCardId = await FirestoreService.saveCardToFirestore(userId, selectedDeckId, cardDataToSave);
                if (savedCardId) {
                    successCount++;
                } else {
                    errorCount++;
                    errorMessages.push(`Lỗi lưu thẻ "${mainTerm}" vào Firestore.`);
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
            if (!getCurrentUserId()) {
                alert("Vui lòng đăng nhập để sao chép thẻ.");
                openAuthModalFromAuth('login');
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

            const userId = getCurrentUserId();
            if (!userId) {
                copyToDeckErrorMessage.textContent = "Vui lòng đăng nhập.";
                copyToDeckErrorMessage.classList.remove('hidden');
                openAuthModalFromAuth('login');
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
            cardToCopy.nextReviewDate = serverTimestamp();
            cardToCopy.interval = 0;
            cardToCopy.easeFactor = 2.5;
            cardToCopy.repetitions = 0;
            cardToCopy.isSuspended = false;
            cardToCopy.videoUrl = currentCard.videoUrl || null;
            cardToCopy.createdAt = serverTimestamp();
            cardToCopy.updatedAt = serverTimestamp();

            delete cardToCopy.webCardGlobalId;

            const newCardId = await FirestoreService.saveCardToFirestore(userId, targetDeckId, cardToCopy);

            if (newCardId) {
                console.log("Web card copied to user deck. New card ID:", newCardId);
                copyToDeckSuccessMessage.textContent = `Đã sao chép thẻ "${cardToCopy.word || cardToCopy.phrasalVerb || cardToCopy.collocation}" vào bộ thẻ đã chọn!`;
                copyToDeckSuccessMessage.classList.remove('hidden');

                setTimeout(async () => {
                    closeCopyToDeckModal();
                    if (cardSourceSelect.value === 'user' && userDeckSelect.value === targetDeckId) {
                        await loadVocabularyData(categorySelect.value);
                    }
                }, 2000);
            } else {
                copyToDeckErrorMessage.textContent = "Lỗi khi sao chép thẻ. Vui lòng thử lại.";
                copyToDeckErrorMessage.classList.remove('hidden');
            }
        }

        // *** SỬA LỖI: Đảm bảo tham số thứ ba là 'subView' ***
        function openBottomSheet(cardItem, viewType = 'default', subView = 'youglish') {
            if (!cardItem || !bottomSheetContent || !bottomSheetTitle || !bottomSheetOverlay || !bottomSheet) return;

            let hasActions = false;
            bottomSheetContent.innerHTML = '';
            const loggedIn = getCurrentUserId();
            let cardTerm = cardItem.word || cardItem.phrasalVerb || cardItem.collocation || "Thẻ";

            bottomSheet.classList.remove('bottom-sheet-video-mode', 'bottom-sheet-notes-mode', 'bottom-sheet-media-mode');
            bottomSheet.style.paddingBottom = '';
            if(bottomSheetTabsContainer) bottomSheetTabsContainer.style.display = 'none';


            if (viewType === 'default') {
                bottomSheetTitle.textContent = `Tùy chọn cho: ${cardTerm.length > 20 ? cardTerm.substring(0,17) + '...' : cardTerm}`;

                if (loggedIn && (cardItem.isUserCard || (cardItem.nextReviewDate || (cardItem.repetitions && cardItem.repetitions > 0) ))) {
                    const srsInfoDiv = document.createElement('div');
                    srsInfoDiv.className = 'text-xs text-slate-600 dark:text-slate-300 mb-3 p-3 border border-slate-200 dark:border-slate-700 rounded-md bg-slate-50 dark:bg-slate-700/50';
                    let srsInfoHtml = '<h4 class="font-semibold text-sm mb-1 text-slate-700 dark:text-slate-100">Thông tin Ôn tập:</h4><ul class="list-inside space-y-0.5">';
                    if (cardItem.nextReviewDate) {
                        const nextReview = new Date(cardItem.nextReviewDate);
                        const today = new Date(); today.setHours(0,0,0,0);
                        const reviewDay = new Date(nextReview.getTime()); reviewDay.setHours(0,0,0,0);
                        let reviewText = `Lần ôn tiếp theo: ${nextReview.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}`;
                        if (reviewDay <= today) reviewText += ' <span class="font-semibold text-amber-600 dark:text-amber-400">(Đến hạn)</span>';
                        srsInfoHtml += `<li>${reviewText}</li>`;
                    } else {
                        srsInfoHtml += `<li>Lần ôn tiếp theo: Chưa có (thẻ mới)</li>`;
                    }
                    srsInfoHtml += `<li>Khoảng cách: ${cardItem.interval || 0} ngày</li>`;
                    srsInfoHtml += `<li>Độ dễ: ${((cardItem.easeFactor || 2.5) * 100).toFixed(0)}%</li>`;
                    srsInfoHtml += `<li>Ôn đúng liên tiếp: ${cardItem.repetitions || 0}</li>`;
                    if (cardItem.isSuspended) {
                        srsInfoHtml += `<li class="text-orange-500 font-semibold">Trạng thái: Đang tạm ngưng</li>`;
                    }
                    srsInfoHtml += '</ul>';
                    srsInfoDiv.innerHTML = srsInfoHtml;
                    bottomSheetContent.appendChild(srsInfoDiv);
                    hasActions = true;
                }

                if (!cardItem.isUserCard && loggedIn) {
                    const copyBtnEl = document.createElement('button');
                    copyBtnEl.innerHTML = `<i class="fas fa-copy w-5 mr-3 text-sky-500"></i> Sao chép vào Thẻ của Tôi`;
                    copyBtnEl.onclick = () => { openCopyToDeckModal(); closeBottomSheet(); };
                    bottomSheetContent.appendChild(copyBtnEl);
                    hasActions = true;
                }
                if (cardItem.isUserCard && loggedIn) {
                    const editBtnEl = document.createElement('button');
                    editBtnEl.innerHTML = `<i class="fas fa-edit w-5 mr-3 text-blue-500"></i> Sửa thẻ`;
                    editBtnEl.onclick = async () => { await openAddEditModal('edit', cardItem); closeBottomSheet(); };
                    bottomSheetContent.appendChild(editBtnEl);
                    hasActions = true;
                }
                if (loggedIn && (cardItem.isUserCard || (cardItem.nextReviewDate || (cardItem.repetitions && cardItem.repetitions > 0) ))) {
                    const resetSrsBtn = document.createElement('button');
                    resetSrsBtn.innerHTML = `<i class="fas fa-undo-alt w-5 mr-3 text-amber-500"></i> Đặt lại Tiến độ Học`;
                    resetSrsBtn.onclick = async () => {
                        if (confirm("Bạn có chắc muốn đặt lại tiến độ học cho thẻ này? Thẻ sẽ được coi như mới học.")) {
                            const srsResetData = {
                                status: 'new', lastReviewed: serverTimestamp(), reviewCount: 0,
                                nextReviewDate: serverTimestamp(), interval: 0, easeFactor: 2.5, repetitions: 0, isSuspended: false
                            };
                            let updateSuccess = false;
                            if (cardItem.isUserCard) {
                                updateSuccess = !!await FirestoreService.saveCardToFirestore(loggedIn, cardItem.deckId, srsResetData, cardItem.id);
                            } else {
                                const webCardGlobalId = getWebCardGlobalId(cardItem);
                                if (webCardGlobalId) updateSuccess = await FirestoreService.updateWebCardStatusInFirestore(loggedIn, webCardGlobalId, cardItem, srsResetData);
                            }
                            if (updateSuccess) {
                                Object.assign(cardItem, { ...srsResetData, nextReviewDate: Date.now(), lastReviewed: Date.now() });
                                alert("Đã đặt lại tiến độ học cho thẻ."); updateFlashcard(); applyAllFilters();
                            }
                            closeBottomSheet();
                        }
                    };
                    bottomSheetContent.appendChild(resetSrsBtn);
                    hasActions = true;
                }
                if (loggedIn && (cardItem.isUserCard || (cardItem.nextReviewDate || (cardItem.repetitions && cardItem.repetitions > 0) ))) {
                    const suspendBtn = document.createElement('button');
                    suspendBtn.innerHTML = cardItem.isSuspended
                        ? `<i class="fas fa-play-circle w-5 mr-3 text-green-500"></i> Tiếp tục Ôn tập`
                        : `<i class="fas fa-pause-circle w-5 mr-3 text-yellow-500"></i> Tạm ngưng Ôn tập`;
                    suspendBtn.onclick = async () => {
                        const newSuspendedState = !cardItem.isSuspended;
                        const dataToUpdate = { isSuspended: newSuspendedState, updatedAt: serverTimestamp() };
                        let updateSuccess = false;
                        if (cardItem.isUserCard) {
                            updateSuccess = !!await FirestoreService.saveCardToFirestore(loggedIn, cardItem.deckId, dataToUpdate, cardItem.id);
                        } else {
                            const webCardGlobalId = getWebCardGlobalId(cardItem);
                            if (webCardGlobalId) {
                                const existingWebStatus = await FirestoreService.getWebCardStatusFromFirestore(loggedIn, webCardGlobalId) || {};
                                const fullDataToSet = { ...existingWebStatus, originalCategory: cardItem.category, originalWordOrPhrase: cardTerm, isSuspended: newSuspendedState, updatedAt: serverTimestamp() };
                                for (const key in fullDataToSet) { if (fullDataToSet[key] === undefined) delete fullDataToSet[key]; }
                                updateSuccess = await FirestoreService.updateWebCardStatusInFirestore(loggedIn, webCardGlobalId, cardItem, fullDataToSet);
                            }
                        }
                        if (updateSuccess) {
                            cardItem.isSuspended = newSuspendedState; cardItem.updatedAt = Date.now();
                            alert(newSuspendedState ? "Đã tạm ngưng thẻ này." : "Đã tiếp tục ôn tập thẻ này.");
                            updateFlashcard(); applyAllFilters();
                        }
                        closeBottomSheet();
                    };
                    bottomSheetContent.appendChild(suspendBtn);
                    hasActions = true;
                }
                if (cardItem.isUserCard && loggedIn) {
                    const deleteBtnEl = document.createElement('button');
                    deleteBtnEl.classList.add('text-red-600', 'dark:text-red-400');
                    deleteBtnEl.innerHTML = `<i class="fas fa-trash-alt w-5 mr-3"></i> Xóa thẻ`;
                    deleteBtnEl.onclick = async () => { await handleDeleteCard(); closeBottomSheet(); };
                    bottomSheetContent.appendChild(deleteBtnEl);
                    hasActions = true;
                }
            } else if (viewType === 'notes') {
                bottomSheet.classList.add('bottom-sheet-notes-mode');
                bottomSheetTitle.textContent = `Ghi chú cho: ${cardTerm.length > 20 ? cardTerm.substring(0,17) + '...' : cardTerm}`;
                const notesTextarea = document.createElement('textarea');
                notesTextarea.id = 'bottom-sheet-notes-textarea';
                notesTextarea.value = cardItem.generalNotes || '';
                notesTextarea.rows = 8;
                notesTextarea.placeholder = "Nhập ghi chú chung, mẹo ghi nhớ (ví dụ: Mẹo: ...), hoặc ví dụ của bạn (ví dụ: VD: ...)";
                bottomSheetContent.appendChild(notesTextarea);

                const saveNotesBtn = document.createElement('button');
                saveNotesBtn.innerHTML = `<i class="fas fa-save w-5 mr-3 text-indigo-500"></i> Lưu Nội dung`;
                saveNotesBtn.classList.add('mt-2', 'bg-indigo-500', 'text-white', 'hover:bg-indigo-600', 'dark:bg-indigo-600', 'dark:hover:bg-indigo-700', 'py-2', 'px-4', 'rounded-md', 'w-full', 'flex', 'items-center', 'justify-center');
                saveNotesBtn.onclick = async () => {
                    const newNotes = notesTextarea.value;
                    const dataToUpdate = { generalNotes: newNotes, updatedAt: serverTimestamp() };
                    let updateSuccess = false;
                    if (cardItem.isUserCard && loggedIn) {
                        updateSuccess = !!await FirestoreService.saveCardToFirestore(loggedIn, cardItem.deckId, dataToUpdate, cardItem.id);
                    } else if (loggedIn) {
                        const webCardGlobalId = getWebCardGlobalId(cardItem);
                         if (webCardGlobalId) {
                            const existingWebStatus = await FirestoreService.getWebCardStatusFromFirestore(loggedIn, webCardGlobalId) || {};
                            const fullDataToSet = { ...existingWebStatus, generalNotes: newNotes, updatedAt: serverTimestamp() };
                            updateSuccess = await FirestoreService.updateWebCardStatusInFirestore(loggedIn, webCardGlobalId, cardItem, fullDataToSet);
                        }
                    }
                    if (updateSuccess) {
                        cardItem.generalNotes = newNotes;
                        alert("Đã lưu ghi chú.");
                        updateFlashcard();
                    } else if (loggedIn) {
                        alert("Lỗi lưu ghi chú.");
                    }
                    closeBottomSheet();
                };
                bottomSheetContent.appendChild(saveNotesBtn);
                hasActions = true;
            } else if (viewType === 'media') {
                bottomSheet.classList.add('bottom-sheet-media-mode');
                bottomSheetTitle.textContent = `Nghe/Xem: ${cardTerm.length > 20 ? cardTerm.substring(0,17) + '...' : cardTerm}`;
                if (bottomSheetTabsContainer) bottomSheetTabsContainer.style.display = 'flex';

                let youglishContainer = document.getElementById('youglish-tab-content');
                if (!youglishContainer) {
                    youglishContainer = document.createElement('div');
                    youglishContainer.id = 'youglish-tab-content';
                    youglishContainer.className = 'bottom-sheet-tab-content';
                    bottomSheetContent.appendChild(youglishContainer);
                }
                let youtubeContainer = document.getElementById('youtube-tab-content');
                if (!youtubeContainer) {
                    youtubeContainer = document.createElement('div');
                    youtubeContainer.id = 'youtube-tab-content';
                    youtubeContainer.className = 'bottom-sheet-tab-content hidden';
                    bottomSheetContent.appendChild(youtubeContainer);
                }

                setActiveMediaTab(subView, cardItem); // *** SỬA Ở ĐÂY: Dùng subView thay vì initialSubView ***
                hasActions = true;
            } else if (viewType === 'practice_options') {
                 bottomSheetTitle.textContent = `Luyện tập: ${cardTerm.length > 20 ? cardTerm.substring(0,17) + '...' : cardTerm}`;
                 const practiceMeaningBtn = document.createElement('button');
                 practiceMeaningBtn.innerHTML = `<i class="fas fa-list-alt w-5 mr-3 text-purple-500"></i> Luyện Nghĩa (Thẻ này)`;
                 practiceMeaningBtn.onclick = () => {
                    startSingleCardPractice(cardItem, 'meaning_quiz');
                    closeBottomSheet();
                };
                 bottomSheetContent.appendChild(practiceMeaningBtn);

                 const practiceTypingBtn = document.createElement('button');
                 practiceTypingBtn.innerHTML = `<i class="fas fa-keyboard w-5 mr-3 text-teal-500"></i> Luyện Gõ Từ (Thẻ này)`;
                 practiceTypingBtn.onclick = () => {
                    startSingleCardPractice(cardItem, 'typing_practice');
                    closeBottomSheet();
                };
                 bottomSheetContent.appendChild(practiceTypingBtn);
                 hasActions = true;
            }

            if (!hasActions && viewType === 'default') {
                 console.log("Không có hành động nào cho thẻ này trong bottom sheet (default view).");
                 if (cardOptionsMenuBtn) cardOptionsMenuBtn.style.display = 'none';
                 if (cardOptionsMenuBtnBack) cardOptionsMenuBtnBack.style.display = 'none';
                 return;
            }

            bottomSheetOverlay.classList.remove('hidden');
            bottomSheet.classList.remove('translate-y-full');
            requestAnimationFrame(() => {
                bottomSheetOverlay.classList.add('active');
                bottomSheet.classList.add('active');
            });
        }

        function setActiveMediaTab(tabName, cardItem) {
            const youglishContent = document.getElementById('youglish-tab-content');
            const youtubeContent = document.getElementById('youtube-tab-content');
            let cardTerm = cardItem.word || cardItem.phrasalVerb || cardItem.collocation || "Thẻ";

            if (currentYouglishWidget) {
                try { currentYouglishWidget.destroy(); } catch(e) { console.warn("Error destroying Youglish widget", e); }
                currentYouglishWidget = null;
            }
            if (youglishContent) youglishContent.innerHTML = '';
            if (youtubeContent) youtubeContent.innerHTML = '';

            if (tabName === 'youglish') {
                if (tabBtnYouglish) tabBtnYouglish.classList.add('active');
                if (tabBtnYouTube) tabBtnYouTube.classList.remove('active');
                if (youglishContent) youglishContent.classList.remove('hidden');
                if (youtubeContent) youtubeContent.classList.add('hidden');

                const widgetContainerId = 'youglish-widget-dynamic-' + Date.now();
                const widgetDiv = document.createElement('div');
                widgetDiv.id = widgetContainerId;
                widgetDiv.className = 'video-iframe-container';
                if (youglishContent) youglishContent.appendChild(widgetDiv);

                const createWidget = () => {
                    if (document.getElementById(widgetContainerId)) {
                         currentYouglishWidget = new YG.Widget(widgetContainerId, {
                            width: "100%",
                            components: 0,
                            events: {
                                'onFetchDone': function(event) {
                                    if (event.totalResults === 0 && document.getElementById(widgetContainerId)) {
                                        document.getElementById(widgetContainerId).innerHTML = '<p class="text-slate-500 dark:text-slate-400 p-4 text-center">Không tìm thấy kết quả cho từ này trên Youglish.</p>';
                                    }
                                },
                                'onError': function(event) {
                                    if (document.getElementById(widgetContainerId)) {
                                        document.getElementById(widgetContainerId).innerHTML = '<p class="text-red-500 dark:text-red-400 p-4 text-center">Lỗi tải Youglish widget.</p>';
                                    }
                                }
                            }
                        });
                        currentYouglishWidget.fetch(cardTerm, "english", "us");
                    }
                };

                if (isYouglishApiReady && typeof YG !== "undefined" && YG.Widget) {
                    createWidget();
                } else {
                    console.log("Youglish API not ready, queuing widget creation for:", cardTerm);
                    window.processPendingYouglishWidget = createWidget;
                }

            } else if (tabName === 'youtube_custom') {
                if (tabBtnYouTube) tabBtnYouTube.classList.add('active');
                if (tabBtnYouglish) tabBtnYouglish.classList.remove('active');
                if (youtubeContent) youtubeContent.classList.remove('hidden');
                if (youglishContent) youglishContent.classList.add('hidden');

                if (cardItem.videoUrl) {
                    const videoId = extractYouTubeVideoId(cardItem.videoUrl);
                    if (videoId) {
                        const iframeContainer = document.createElement('div');
                        iframeContainer.className = 'video-iframe-container w-full';
                        const iframe = document.createElement('iframe');
                        iframe.src = `https://www.youtube.com/embed/$${videoId}`;
                        iframe.title = "YouTube video player";
                        iframe.frameBorder = "0";
                        iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
                        iframe.allowFullscreen = true;
                        iframeContainer.appendChild(iframe);
                        if (youtubeContent) youtubeContent.appendChild(iframeContainer);
                    } else {
                        if (youtubeContent) youtubeContent.innerHTML = '<p class="text-slate-500 dark:text-slate-400 p-4 text-center">Link video YouTube không hợp lệ.</p>';
                    }
                } else {
                    if (youtubeContent) youtubeContent.innerHTML = '<p class="text-slate-500 dark:text-slate-400 p-4 text-center">Chưa có video YouTube nào được gán cho thẻ này. Bạn có thể thêm link trong phần sửa thẻ.</p>';
                }
            }
        }


        function closeBottomSheet() {
            if (!bottomSheet || !bottomSheetOverlay) return;

            if (currentYouglishWidget) {
                try { currentYouglishWidget.destroy(); } catch(e) { console.warn("Error destroying Youglish widget during close", e); }
                currentYouglishWidget = null;
            }

            bottomSheet.classList.remove('active', 'bottom-sheet-video-mode', 'bottom-sheet-notes-mode', 'bottom-sheet-media-mode');
            bottomSheetOverlay.classList.remove('active');
            bottomSheet.style.paddingBottom = '';
            if(bottomSheetTabsContainer) bottomSheetTabsContainer.style.display = 'none';

            setTimeout(() => {
                bottomSheet.classList.add('translate-y-full');
                bottomSheetOverlay.classList.add('hidden');
                const videoIframe = bottomSheetContent.querySelector('iframe');
                if (videoIframe) {
                    videoIframe.src = '';
                }
                bottomSheetContent.innerHTML = '';
            }, 300);
        }

        function extractYouTubeVideoId(url) {
            if (!url) return null;
            const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
            const match = url.match(regExp);
            return (match && match[2] && match[2].length === 11) ? match[2] : null;
        }

        function startSingleCardPractice(cardItem, practiceMode) {
            if (!cardItem) return;
            console.log(`Starting single card practice for: ${cardItem.word || cardItem.phrasalVerb || cardItem.collocation}, Mode: ${practiceMode}`);

            isSingleCardPracticeMode = true;
            originalCurrentData = [...window.currentData];
            originalCurrentIndex = window.currentIndex;

            window.currentData = [cardItem];
            window.currentIndex = 0;

            practiceType = practiceMode;

            updateFlashcard();
            showToast(`Bắt đầu luyện tập thẻ: ${cardItem.word || cardItem.phrasalVerb || cardItem.collocation}`, 3000);
        }

        function exitSingleCardPractice() {
            if (!isSingleCardPracticeMode) return;
            console.log("Exiting single card practice mode.");

            isSingleCardPracticeMode = false;
            window.currentData = [...originalCurrentData];
            window.currentIndex = originalCurrentIndex;

            practiceType = 'off';
            if (practiceTypeSelect) practiceTypeSelect.value = 'off';

            updateFlashcard();
            showToast("Đã thoát chế độ luyện tập thẻ.", 2000);
        }




    function setupEventListeners() {
        if(hamburgerMenuBtn) hamburgerMenuBtn.addEventListener('click', openSidebar);
        if(closeSidebarBtn) closeSidebarBtn.addEventListener('click', closeSidebar);
        if(sidebarOverlay) sidebarOverlay.addEventListener('click', closeSidebar);

           if(cardSourceSelect) cardSourceSelect.addEventListener('change', async (e)=>{
                currentDatasetSource=e.target.value;
                const userId = getCurrentUserId();
                if (currentDatasetSource === 'user' && !userId) {
                    openAuthModalFromAuth('login');
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
                const userId = getCurrentUserId();
                if(!userId) return;
                const stateForCurrentCategory = getCategoryState(currentDatasetSource, categorySelect.value);
                stateForCurrentCategory.deckId = userDeckSelect.value;
                appState.lastSelectedDeckId = userDeckSelect.value;
                saveAppState();
                activeMasterList = await loadUserCards(userDeckSelect.value);
                applyAllFilters(false);
            });

            if(manageDecksBtn) manageDecksBtn.addEventListener('click', async ()=>{
                const userId = getCurrentUserId();
                if(!userId) {
                    alert("Vui lòng đăng nhập để quản lý bộ thẻ.");
                    openAuthModalFromAuth('login');
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
                const userId = getCurrentUserId();
                if(!userId) {
                    alert("Vui lòng đăng nhập để tạo bộ thẻ.");
                    openAuthModalFromAuth('login');
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

            if (cardOptionsMenuBtn) {
                cardOptionsMenuBtn.addEventListener('click', () => {
                    const currentCard = window.currentData[window.currentIndex];
                    if (currentCard) openBottomSheet(currentCard, 'default');
                });
            }
            if (cardOptionsMenuBtnBack) {
                 cardOptionsMenuBtnBack.addEventListener('click', () => {
                    const currentCard = window.currentData[window.currentIndex];
                    if (currentCard) openBottomSheet(currentCard, 'default');
                });
            }
            if (closeBottomSheetBtn) {
                closeBottomSheetBtn.addEventListener('click', closeBottomSheet);
            }
            if (bottomSheetOverlay) {
                bottomSheetOverlay.addEventListener('click', closeBottomSheet);
            }

            if(actionBtnNotes) actionBtnNotes.addEventListener('click', () => {
                const currentCard = window.currentData[window.currentIndex];
                if (currentCard) openBottomSheet(currentCard, 'notes');
            });
            if(actionBtnMedia) actionBtnMedia.addEventListener('click', () => {
                const currentCard = window.currentData[window.currentIndex];
                if (currentCard) openBottomSheet(currentCard, 'media', 'youglish');
            });
            if(actionBtnPracticeCard) actionBtnPracticeCard.addEventListener('click', () => {
                const currentCard = window.currentData[window.currentIndex];
                if (currentCard) openBottomSheet(currentCard, 'practice_options');
            });
            if(exitSingleCardPracticeBtn) exitSingleCardPracticeBtn.addEventListener('click', exitSingleCardPractice);

            if(tabBtnYouglish) tabBtnYouglish.addEventListener('click', () => {
                const currentCard = window.currentData[window.currentIndex];
                if(currentCard) setActiveMediaTab('youglish', currentCard);
            });
            if(tabBtnYouTube) tabBtnYouTube.addEventListener('click', () => {
                const currentCard = window.currentData[window.currentIndex];
                if(currentCard) setActiveMediaTab('youtube_custom', currentCard);
            });


            if(practiceTypeSelect) practiceTypeSelect.addEventListener('change', (e)=>{clearLearningTimer();practiceType=e.target.value;const cat=categorySelect.value;const st=getCategoryState(currentDatasetSource,cat);searchInput.value='';if(cat==='phrasalVerbs' || cat === 'collocations'){st.tag='all';if(tagSelect)tagSelect.value='all';st.baseVerb='all';if(baseVerbSelect)baseVerbSelect.value='all';} const userId = getCurrentUserId(); if(currentDatasetSource==='user' && userId){st.deckId='all_user_cards';if(userDeckSelect)userDeckSelect.value='all_user_cards';}st.filterMarked='all_study';if(filterCardStatusSelect)filterCardStatusSelect.value='all_study';st.currentIndex=0;applyAllFilters();closeSidebar();});
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

            // Xóa hoặc comment out event listener cũ cho việc lật thẻ bằng cách click vào flashcardElement
            /*
            if(flashcardElement) flashcardElement.addEventListener('click', (e)=>{
                if (practiceType === "off" &&
                    e.target.closest('.flashcard') === flashcardElement &&
                    !e.target.closest('button#speaker-btn') &&
                    !e.target.closest('button#speaker-example-btn') &&
                    !e.target.closest('#card-options-menu-btn') &&
                    !e.target.closest('#card-options-menu-btn-back') &&
                    !e.target.closest('.toggle-examples-btn') &&
                    !e.target.closest('.copy-example-btn') &&
                    !e.target.closest('#empty-state-add-card-btn-on-card') &&
                    !e.target.closest('#flip-icon-front') && // Đảm bảo không lật khi click vào icon mới
                    !e.target.closest('#flip-icon-back')     // Đảm bảo không lật khi click vào icon mới
                   ) {
                    // flashcardElement.classList.toggle('flipped'); // Logic lật thẻ cũ bị vô hiệu hóa
                }
            });
            */

            // Thêm event listener cho nút lật thẻ bằng icon trên thẻ (nút chung)
            if(flipBtn) flipBtn.addEventListener('click', ()=>{
                if(practiceType==="off" && window.currentData.length>0) {
                    flashcardElement.classList.toggle('flipped');
                }
            });

            // Thêm event listener cho icon lật thẻ ở mặt trước
            if (flipIconFront) {
                flipIconFront.addEventListener('click', (e) => {
                    e.stopPropagation(); // Ngăn sự kiện lan truyền
                    if (practiceType === "off" && window.currentData.length > 0) {
                        flashcardElement.classList.toggle('flipped');
                    }
                });
            }

            // Thêm event listener cho icon lật thẻ ở mặt sau
            if (flipIconBack) {
                flipIconBack.addEventListener('click', (e) => {
                    e.stopPropagation(); // Ngăn sự kiện lan truyền
                    if (practiceType === "off" && window.currentData.length > 0) {
                        flashcardElement.classList.toggle('flipped');
                    }
                });
            }


            if(nextBtn) nextBtn.addEventListener('click', ()=>{if(isSpeakingExampleQueue){isSpeakingExampleQueue=false;window.speechSynthesis.cancel();speakerExampleBtn.disabled=!(window.currentData[window.currentIndex]&&window.currentData[window.currentIndex].meanings.some(m=>m.examples&&m.examples.length>0));}if(nextBtn.disabled)return;clearLearningTimer();if(window.currentIndex<window.currentData.length-1){window.currentIndex++;getCategoryState(currentDatasetSource,categorySelect.value).currentIndex=window.currentIndex;saveAppState();window.updateFlashcard();}else if(practiceType!=="off"&&currentAnswerChecked&&window.currentIndex>=window.currentData.length-1)applyAllFilters();});
            if(prevBtn) prevBtn.addEventListener('click', ()=>{if(isSpeakingExampleQueue){isSpeakingExampleQueue=false;window.speechSynthesis.cancel();speakerExampleBtn.disabled=!(window.currentData[window.currentIndex]&&window.currentData[window.currentIndex].meanings.some(m=>m.examples&&m.examples.length>0));}clearLearningTimer();if(window.currentIndex>0){window.currentIndex--;getCategoryState(currentDatasetSource,categorySelect.value).currentIndex=window.currentIndex;saveAppState();window.updateFlashcard();}});
         
        if(speakerBtn) speakerBtn.addEventListener('click', (e)=>{
            e.stopPropagation();
            // XÓA LOGIC LIÊN QUAN ĐẾN isSpeakingExampleQueue
            const txt=wordDisplay.dataset.ttsText;
            if(txt&&!speakerBtn.disabled)speakText(txt,currentWordSpansMeta);
        });

        // XÓA EVENT LISTENER CỦA speakerExampleBtn
        // if(speakerExampleBtn) speakerExampleBtn.addEventListener('click', (e)=>{ ... });

        /* ... các event listener còn lại giữ nguyên ... */

        // Xóa hoặc comment out event listener cũ cho việc lật thẻ bằng cách click vào flashcardElement
        /*
        if(flashcardElement) flashcardElement.addEventListener('click', (e)=>{
            // ... (code cũ đã được comment out ở lần cập nhật trước) ...
        });
        */

        // Event listener cho nút lật thẻ bằng icon trên thẻ (nút chung ở thanh điều hướng)
        if(flipBtn) flipBtn.addEventListener('click', ()=>{
            if(practiceType==="off" && window.currentData.length>0) {
                flashcardElement.classList.toggle('flipped');
            }
        });

        // Event listener cho icon lật thẻ ở mặt trước
        if (flipIconFront) {
            flipIconFront.addEventListener('click', (e) => {
                e.stopPropagation();
                if (practiceType === "off" && window.currentData.length > 0) {
                    flashcardElement.classList.toggle('flipped');
                }
            });
        }

        // Event listener cho icon lật thẻ ở mặt sau
        if (flipIconBack) {
            flipIconBack.addEventListener('click', (e) => {
                e.stopPropagation();
                if (practiceType === "off" && window.currentData.length > 0) {
                    flashcardElement.classList.toggle('flipped');
                }
            });
        }


        if(nextBtn) nextBtn.addEventListener('click', ()=>{
            // XÓA LOGIC LIÊN QUAN ĐẾN isSpeakingExampleQueue
            if(nextBtn.disabled)return;
            clearLearningTimer();
            if(window.currentIndex<window.currentData.length-1){window.currentIndex++;getCategoryState(currentDatasetSource,categorySelect.value).currentIndex=window.currentIndex;saveAppState();window.updateFlashcard();}
            else if(practiceType!=="off"&&currentAnswerChecked&&window.currentIndex>=window.currentData.length-1)applyAllFilters();
        });
        if(prevBtn) prevBtn.addEventListener('click', ()=>{
            // XÓA LOGIC LIÊN QUAN ĐẾN isSpeakingExampleQueue
            clearLearningTimer();
            if(window.currentIndex>0){window.currentIndex--;getCategoryState(currentDatasetSource,categorySelect.value).currentIndex=window.currentIndex;saveAppState();window.updateFlashcard();}
        });

 if(speakerBtn) speakerBtn.addEventListener('click', (e)=>{e.stopPropagation();if(isSpeakingExampleQueue){isSpeakingExampleQueue=false;window.speechSynthesis.cancel();speakerExampleBtn.disabled=!(window.currentData[window.currentIndex]&&window.currentData[window.currentIndex].meanings.some(m=>m.examples&&m.examples.length>0));}const txt=wordDisplay.dataset.ttsText;if(txt&&!speakerBtn.disabled)speakText(txt,currentWordSpansMeta);});
            if(speakerExampleBtn) speakerExampleBtn.addEventListener('click', (e)=>{e.stopPropagation();window.speechSynthesis.cancel();isSpeakingExampleQueue=false;currentExampleSpeechIndex=0;exampleSpeechQueue=[];const item=window.currentData[window.currentIndex];if(item&&item.meanings&&!speakerExampleBtn.disabled){item.meanings.forEach(m=>{if(m.examples){m.examples.forEach(ex=>{if(ex.eng&&ex.eng.trim())exampleSpeechQueue.push({text:ex.eng.trim(),spansMeta:[]});});}});if(exampleSpeechQueue.length>0){isSpeakingExampleQueue=true;speakerExampleBtn.disabled=true;playNextExampleInQueue();}}});

            if(btnSrsAgain) btnSrsAgain.addEventListener('click', () => processSrsRatingWrapper('again'));
            if(btnSrsHard) btnSrsHard.addEventListener('click', () => processSrsRatingWrapper('hard'));
            if(btnSrsGood) btnSrsGood.addEventListener('click', () => processSrsRatingWrapper('good'));
            if(btnSrsEasy) btnSrsEasy.addEventListener('click', () => processSrsRatingWrapper('easy'));

            function checkTypingAnswer(){if(window.currentData.length===0||!currentCorrectAnswerForPractice)return;currentAnswerChecked=true;feedbackMessage.classList.remove('hidden');typingInput.disabled=true;submitTypingAnswerBtn.disabled=true;const uA=typingInput.value.trim().toLowerCase();const cA=currentCorrectAnswerForPractice.trim().toLowerCase();const iC=uA===cA;if(iC){feedbackMessage.textContent='Đúng!';feedbackMessage.className='mt-3 p-3 rounded-md w-full text-center font-semibold bg-green-100 text-green-700 border border-green-300';}else{feedbackMessage.textContent=`Sai! Đáp án đúng: ${currentCorrectAnswerForPractice}`;feedbackMessage.className='mt-3 p-3 rounded-md w-full text-center font-semibold bg-red-100 text-red-700 border border-red-300';}flashcardElement.classList.remove('practice-mode-front-only');flashcardElement.classList.add('flipped');const i=window.currentData[window.currentIndex];const iCV=i.category;const id=getCardIdentifier(i,iCV);if(id)processSrsRatingWrapper(iC?'easy':'again');updateCardInfo();}

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
    }

        async function setupInitialCategoryAndSource() {
            if (!getCurrentUserId()) {
                await loadAppState();
            }

            const urlParams = new URLSearchParams(window.location.search);
            const sourceFromUrl = urlParams.get('source');
            currentDatasetSource = sourceFromUrl || appState.lastSelectedSource || 'web';
            if(cardSourceSelect) cardSourceSelect.value = currentDatasetSource;
            if(categorySelect) categorySelect.value = appState.lastSelectedCategory || 'phrasalVerbs';

            await loadVocabularyData(categorySelect.value);
        }

}); // END DOMContentLoaded
