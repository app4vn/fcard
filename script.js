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
  apiKey: "AIzaSyBcBpsCGt-eWyAvtNaqxG0QncqzYDJwG70",
  authDomain: "fcard-84890.firebaseapp.com",
  projectId: "fcard-84890",
  storageBucket: "fcard-84890.appspot.com",
  messagingSenderId: "195942452341",
  appId: "1:195942452341:web:b995a99ae0d1fbb47a7c3c"
};

// Initialize Firebase
const fbApp = initializeApp(firebaseConfig);
const fbAuth = getAuth(fbApp);
const db = getFirestore(fbApp);

// KHAI BÁO CÁC BIẾN DOM SẼ ĐƯỢC SỬ DỤNG Ở PHẠM VI MODULE
let mainHeaderTitle, cardSourceSelect, categorySelect, flashcardElement, wordDisplay,
    pronunciationDisplay, meaningDisplayContainer, notesDisplay, prevBtn, flipBtn,
    nextBtn, currentCardIndexDisplay, totalCardsDisplay, speakerBtn, speakerExampleBtn,
    tagFilterContainer, tagSelect, searchInput, baseVerbFilterContainer, baseVerbSelect,
    practiceTypeSelect, practiceArea, multipleChoiceOptionsContainer, feedbackMessage,
    filterCardStatusSelect,
    btnSrsAgain, btnSrsHard, btnSrsGood, btnSrsEasy,
    hamburgerMenuBtn, filterSidebar, closeSidebarBtn, sidebarOverlay, tagsDisplayFront,
    typingInputContainer, typingInput, submitTypingAnswerBtn, openAddCardModalBtn,
    addEditCardModal, closeModalBtn, addEditCardForm, modalTitle, cardIdInput,
    cardWordInput, cardPronunciationInput, cardGeneralNotesInput, cardVideoUrlInput,
    meaningBlocksContainer, addAnotherMeaningBlockAtEndBtn, phrasalVerbSpecificFields, // This will be reused/controlled for idioms too
    cardBaseVerbInput, cardTagsInput, cardWordLabel, // Added cardWordLabel
    cancelCardBtn, saveCardBtn, deckCreationHint,
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
    bottomSheetTabsContainer, tabBtnYouTube,
    flipIconFront, flipIconBack, cardFrontElement,
    recentlyViewedListElement, noRecentCardsMessageElement; // Added for Recently Viewed


// KHAI BÁO CÁC BIẾN TRẠNG THÁI ỨNG DỤNG Ở PHẠM VI MODULE
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
let currentEditingCardId = null;
let currentEditingDeckId = null;
let isSingleCardPracticeMode = false;
let originalCurrentData = [];
let originalCurrentIndex = 0;

// Biến cho chức năng vuốt thẻ
let touchStartX = 0;
let touchEndX = 0;
let touchStartY = 0;
let touchEndY = 0;
const swipeThreshold = 50;
const swipeMaxVerticalOffset = 75;

// Biến và key cho tốc độ phát âm ví dụ
let currentExampleSpeechRate = 1.0;
const EXAMPLE_SPEECH_RATE_KEY = 'flashcardAppExampleSpeechRate';
const MAX_RECENTLY_VIEWED_CARDS = 10; // Max number of recently viewed cards to store

// UID Admin - QUAN TRỌNG: BẠN CẦN THAY THẾ BẰNG UID THỰC CỦA TÀI KHOẢN ADMIN FIREBASE CỦA BẠN
const ADMIN_UID = "xPLCuTRXnvNb9Uqa2ezFpOcyQmz2"; // Ví dụ: "abcdef123456xyz7890ghijk"


const tagDisplayNames = {"all": "Tất cả chủ đề", "actions_general": "Hành động chung", "actions_tasks": "Hành động & Nhiệm vụ", "movement_travel": "Di chuyển & Du lịch", "communication": "Giao tiếp", "relationships_social": "Quan hệ & Xã hội", "emotions_feelings": "Cảm xúc & Cảm giác", "problems_solutions": "Vấn đề & Giải pháp", "work_business": "Công việc & Kinh doanh", "learning_information": "Học tập & Thông tin", "daily_routine": "Thói quen hàng ngày", "health_wellbeing": "Sức khỏe & Tinh thần", "objects_possession": "Đồ vật & Sở hữu", "time_planning": "Thời gian & Kế hoạch", "money_finance": "Tiền bạc & Tài chính", "behavior_attitude": "Hành vi & Thái độ", "begin_end_change": "Bắt đầu, Kết thúc & Thay đổi", "food_drink": "Ăn uống", "home_living": "Nhà cửa & Đời sống", "rules_systems": "Quy tắc & Hệ thống", "effort_achievement": "Nỗ lực & Thành tựu", "safety_danger": "An toàn & Nguy hiểm", "technology": "Công nghệ", "nature": "Thiên nhiên & Thời tiết", "art_creation": "Nghệ thuật & Sáng tạo" };

const sampleData = {
    "phrasalVerbs": [
        { "phrasalVerb": "Look up", "baseVerb": "look", "category": "phrasalVerbs", "pronunciation": "/lʊk ʌp/", "meanings": [ { "id": "m_pv_sample_1_1", "text": "Tra cứu (thông tin)", "notes": "Trong từ điển, danh bạ...", "examples": [ { "id": "ex_pv_sample_1_1_1", "eng": "I need to look up this word in the dictionary.", "vie": "Tôi cần tra từ này trong từ điển." }, { "id": "ex_pv_sample_1_1_2", "eng": "Can you look up the train times for me?", "vie": "Bạn có thể tra giờ tàu cho tôi được không?" } ]}], "tags": ["learning_information", "actions_tasks"], "generalNotes": "Một cụm động từ phổ biến." },
    ],
    "nouns": [ { "word": "Solution", "category": "nouns", "pronunciation": "/səˈluːʃən/", "meanings": [ { "id": "m_noun_sample_1_1", "text": "Giải pháp cho một vấn đề."}], "generalNotes": "Danh từ đếm được." } ],
    "verbs": [ { "word": "Set", "category": "verbs", "pronunciation": "/set/", "meanings": [ { "id": "m_verb_sample_1_1", "text": "Đặt, để một cái gì đó ở một vị trí cụ thể."}], "generalNotes": "Một động từ có nhiều nghĩa." } ],
    "adjectives": [ { "word": "Happy", "category": "adjectives", "pronunciation": "/ˈhæpi/", "meanings": [ { "id": "m_adj_sample_1_1", "text": "Cảm thấy hoặc thể hiện sự vui vẻ, hài lòng."}], "generalNotes": "" } ],
    "collocations": [
        { "collocation": "take a break", "baseVerb": "take", "category": "collocations", "pronunciation": "/teɪk ə breɪk/", "meanings": [ { "id": "m_col_sample_1_1", "text": "Nghỉ giải lao, nghỉ ngơi một lát", "notes": "Thường dùng trong công việc hoặc học tập", "examples": [ { "id": "ex_col_sample_1_1_1", "eng": "Let's take a break for 10 minutes.", "vie": "Chúng ta hãy nghỉ giải lao 10 phút." }, { "id": "ex_col_sample_1_1_2", "eng": "She's been working all day, she needs to take a break.", "vie": "Cô ấy đã làm việc cả ngày, cô ấy cần nghỉ ngơi." } ]}], "tags": ["daily_routine", "work_business"], "generalNotes": "Một collocation phổ biến với động từ 'take'." },
    ],
    "idioms": [ // Added sample data for idioms
        { "idiom": "Kick the bucket", "category": "idioms", "pronunciation": "/kɪk ðə ˈbʌkɪt/", "meanings": [ { "id": "m_idiom_sample_1_1", "text": "Chết (nghĩa lóng)", "notes": "Thường dùng không trang trọng", "examples": [ { "id": "ex_idiom_sample_1_1_1", "eng": "The old man finally kicked the bucket after a long illness.", "vie": "Ông lão cuối cùng cũng qua đời sau một thời gian dài bệnh tật." } ]}], "tags": ["death", "informal"], "generalNotes": "Một thành ngữ phổ biến." },
        { "idiom": "Break a leg", "category": "idioms", "pronunciation": "/breɪk ə lɛg/", "meanings": [ { "id": "m_idiom_sample_2_1", "text": "Chúc may mắn (đặc biệt trong biểu diễn)", "notes": "", "examples": [ { "id": "ex_idiom_sample_2_1_1", "eng": "Break a leg in your performance tonight!", "vie": "Chúc bạn may mắn trong buổi biểu diễn tối nay!" } ]}], "tags": ["luck", "performance"], "generalNotes": "" }
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
    categoryStates: {},
    recentlyViewedCards: [] // Added for Recently Viewed
};
let appState = JSON.parse(JSON.stringify(defaultAppState));

const appStateStorageKey = 'flashcardAppState_v4_firestore_sync_v2'; // Consider versioning if making breaking changes

// --- START: Utility Functions (Moved outside DOMContentLoaded) ---
function generateUniqueId(prefix = 'id') {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 7)}`;
}

function getCardIdentifier(item){
    if(!item) return null;
    let keyPart;
    const category = item.category || 'unknown';

    switch(category) {
        case 'phrasalVerbs':
            keyPart = item.phrasalVerb;
            break;
        case 'collocations':
            keyPart = item.collocation;
            break;
        case 'idioms': // Added idioms
            keyPart = item.idiom;
            break;
        default:
            keyPart = item.word;
    }
    if (!keyPart) return `${category}-unknown-${generateUniqueId('cardkey')}`;

    const sanitizedKeyPart = String(keyPart).toLowerCase()
                            .replace(/\s+/g, '-')
                            .replace(/[().,/?!"':]/g, '')
                            .replace(/[^a-z0-9-]/g, '');
    return `${category}-${sanitizedKeyPart}`;
}

function closeSidebar(){
    if (filterSidebar) filterSidebar.classList.add('-translate-x-full');
    if (filterSidebar) filterSidebar.classList.remove('translate-x-0');
    if (sidebarOverlay) sidebarOverlay.classList.add('hidden');
}
// --- END: Utility Functions ---


async function loadAppState() {
    const userId = getCurrentUserId();
    console.log("Attempting to load AppState. Current user ID:", userId);
    if (userId) {
        const firestoreState = await FirestoreService.loadAppStateFromFirestore(userId);
        if (firestoreState) {
            appState = {
                ...defaultAppState,
                ...firestoreState,
                categoryStates: firestoreState.categoryStates ? { ...firestoreState.categoryStates } : {},
                recentlyViewedCards: Array.isArray(firestoreState.recentlyViewedCards) ? firestoreState.recentlyViewedCards : [] // Load recently viewed
            };
            Object.keys(appState.categoryStates).forEach(k => {
                appState.categoryStates[k] = {
                    ...defaultCategoryState,
                    ...(appState.categoryStates[k] || {}),
                    searchTerm: appState.categoryStates[k]?.searchTerm || ''
                };
            });
            if (appState.userPreferences && typeof appState.userPreferences.exampleSpeechRate === 'number') {
                currentExampleSpeechRate = appState.userPreferences.exampleSpeechRate;
            }
            console.log("AppState loaded from Firestore and merged with defaults:", JSON.parse(JSON.stringify(appState)));
            localStorage.setItem(appStateStorageKey, JSON.stringify(appState)); // Sync to localStorage
            return;
        } else {
            console.log("No AppState in Firestore for this user, trying localStorage or defaults.");
        }
    }

    // Fallback to localStorage or defaults if no Firestore state or no user
    try {
        const s = localStorage.getItem(appStateStorageKey);
        if (s) {
            const p = JSON.parse(s);
            appState = {
                ...defaultAppState,
                lastSelectedCategory: p.lastSelectedCategory || defaultAppState.lastSelectedCategory,
                lastSelectedSource: p.lastSelectedSource || defaultAppState.lastSelectedSource,
                lastSelectedDeckId: p.lastSelectedDeckId || defaultAppState.lastSelectedDeckId,
                categoryStates: p.categoryStates ? { ...p.categoryStates } : {},
                recentlyViewedCards: Array.isArray(p.recentlyViewedCards) ? p.recentlyViewedCards : [] // Load recently viewed
            };
            Object.keys(appState.categoryStates).forEach(k => {
                 appState.categoryStates[k] = {
                    ...defaultCategoryState,
                    ...(appState.categoryStates[k] || {}),
                    searchTerm: appState.categoryStates[k]?.searchTerm || ''
                };
            });
            if (appState.userPreferences && typeof appState.userPreferences.exampleSpeechRate === 'number') {
                currentExampleSpeechRate = appState.userPreferences.exampleSpeechRate;
            } else {
                loadExampleSpeechRate(); // Load from its own localStorage if not in appState
            }
            console.log("AppState loaded from localStorage and merged with defaults:", JSON.parse(JSON.stringify(appState)));
            if (userId) { // If user logged in now, save the merged state to Firestore
                await FirestoreService.saveAppStateToFirestoreService(userId, appState);
            }
        } else {
            console.log("No AppState in localStorage, using defaults.");
            appState = JSON.parse(JSON.stringify(defaultAppState));
            loadExampleSpeechRate();
             if (userId) { // If user logged in, save default state to Firestore
                await FirestoreService.saveAppStateToFirestoreService(userId, appState);
            } else { // No user, just save defaults to localStorage
                localStorage.setItem(appStateStorageKey, JSON.stringify(appState));
            }
        }
    } catch (e) {
        console.error("Lỗi load appState từ localStorage, using defaults:", e);
        appState = JSON.parse(JSON.stringify(defaultAppState));
        loadExampleSpeechRate();
        if (userId) { // If user logged in, save default state to Firestore
            await FirestoreService.saveAppStateToFirestoreService(userId, appState);
        }
    }
}

async function saveAppState(){
    if (!categorySelect || !filterCardStatusSelect || !userDeckSelect || !baseVerbSelect || !tagSelect) {
        // DOM elements might not be ready yet, especially during initial load
    } else {
        const currentCategoryValue = categorySelect.value;
        const stateForCategory = getCategoryState(currentDatasetSource, currentCategoryValue);

        stateForCategory.currentIndex = window.currentIndex;
        stateForCategory.filterMarked = filterCardStatusSelect.value;
        if (currentDatasetSource === 'user') {
            stateForCategory.deckId = userDeckSelect.value;
        }
        if (currentCategoryValue === 'phrasalVerbs' || currentCategoryValue === 'collocations' || currentCategoryValue === 'idioms') { // Added idioms
            if (currentCategoryValue === 'phrasalVerbs' || currentCategoryValue === 'collocations') { // Base verb only for PV and Collocations
                 stateForCategory.baseVerb = baseVerbSelect.value;
            } else {
                stateForCategory.baseVerb = 'all'; // Reset for idioms
            }
            stateForCategory.tag = tagSelect.value; // Tags for PV, Collocations, Idioms
        }
        appState.lastSelectedCategory = currentCategoryValue;
        appState.lastSelectedSource = currentDatasetSource;
        appState.lastSelectedDeckId = (currentDatasetSource === 'user') ? userDeckSelect.value : 'all_user_cards';

        appState.userPreferences = appState.userPreferences || {};
        appState.userPreferences.exampleSpeechRate = currentExampleSpeechRate;
        // appState.recentlyViewedCards is managed directly when a card is viewed
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
    await loadAppState(); // Load app state first, which might depend on user ID for Firestore
    renderRecentlyViewedList(); // Then render recently viewed list

    if (user) {
        if(userEmailDisplayMain) userEmailDisplayMain.textContent = user.email || "Người dùng";
        if(userEmailDisplayMain) userEmailDisplayMain.classList.remove('hidden');
        if(authActionButtonMain) {
            authActionButtonMain.innerHTML = `<i class="fas fa-sign-out-alt"></i><span class="hidden sm:inline ml-1 sm:ml-2">Đăng xuất</span>`;
            authActionButtonMain.title = "Đăng xuất";
            authActionButtonMain.classList.replace('bg-indigo-500', 'bg-red-500');
            authActionButtonMain.classList.replace('hover:bg-indigo-600', 'hover:bg-red-600');
        }
    } else {
        if(userEmailDisplayMain) userEmailDisplayMain.classList.add('hidden');
        if(userEmailDisplayMain) userEmailDisplayMain.textContent = '';
        if(authActionButtonMain) {
            authActionButtonMain.innerHTML = `<i class="fas fa-sign-in-alt"></i><span class="hidden sm:inline ml-1 sm:ml-2">Đăng nhập</span>`;
            authActionButtonMain.title = "Đăng nhập";
            authActionButtonMain.classList.replace('bg-red-500', 'bg-indigo-500');
            authActionButtonMain.classList.replace('hover:bg-red-600', 'hover:bg-indigo-600');
        }
        console.log("User signed out. AppState loaded from localStorage or defaults.");
    }

    if (typeof setupInitialCategoryAndSource === 'function') {
        await setupInitialCategoryAndSource(); // This will call loadVocabularyData -> updateFlashcard

        // updateFlashcard is now called within loadVocabularyData or applyAllFilters
        // No need for RAF here as updateFlashcard will eventually be called by setupInitialCategoryAndSource
    }

    if (typeof updateSidebarFilterVisibility === 'function') updateSidebarFilterVisibility();
    if (typeof updateMainHeaderTitle === 'function') updateMainHeaderTitle();
}

let toastTimeout;
function showToast(message, duration = 3000, type = 'info') {
    if (!srsFeedbackToastEl) return;
    srsFeedbackToastEl.textContent = message;
    srsFeedbackToastEl.className = 'fixed bottom-5 right-5 text-white text-sm py-3 px-5 rounded-lg shadow-md opacity-0 transition-opacity duration-500 ease-in-out z-[1010]'; // Reset classes
    srsFeedbackToastEl.classList.add('show');

    if (type === 'error') srsFeedbackToastEl.classList.add('bg-red-600');
    else if (type === 'success') srsFeedbackToastEl.classList.add('bg-green-600');
    else srsFeedbackToastEl.classList.add('bg-slate-700');

    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => { srsFeedbackToastEl.classList.remove('show'); }, duration);
}

// --- START: Speech Rate Functions for Examples ---
function loadExampleSpeechRate() {
    const savedRate = localStorage.getItem(EXAMPLE_SPEECH_RATE_KEY);
    if (savedRate) {
        const rate = parseFloat(savedRate);
        if (!isNaN(rate) && rate >= 0.5 && rate <= 2.0) {
             currentExampleSpeechRate = rate;
        }
    }
}

function saveExampleSpeechRate() {
    localStorage.setItem(EXAMPLE_SPEECH_RATE_KEY, currentExampleSpeechRate.toString());
    if (getCurrentUserId() && appState) { // Ensure appState is initialized
        appState.userPreferences = appState.userPreferences || {};
        appState.userPreferences.exampleSpeechRate = currentExampleSpeechRate;
        saveAppState(); // This will save the entire appState including userPreferences
    }
}

function updateAllExampleSpeechRateDropdownsUI() {
    const allDropdowns = document.querySelectorAll('.example-speech-rate-select');
    allDropdowns.forEach(dropdown => {
        if (dropdown) {
            dropdown.value = currentExampleSpeechRate.toString();
        }
    });
}
// --- END: Speech Rate Functions for Examples ---

// --- START: Speech Synthesis Functions ---
function speakText(txt, meta = [], cb = null) {
    if (!txt || !txt.trim()) { if (cb) cb(); return; }
    if ('speechSynthesis' in window) {
        const u = new SpeechSynthesisUtterance(txt);
        u.lang = 'en-US';
        u.rate = 1.0; // Default rate for main word/phrase
        u.pitch = 1;
        window.speechSynthesis.cancel();
        if (meta.length > 0) {
            u.onstart = () => meta.forEach(m => m.element.classList.remove('highlighted-word'));
            u.onboundary = e => {
                meta.forEach(m => m.element.classList.remove('highlighted-word'));
                let f = false;
                for (const m of meta) { if (e.charIndex >= m.start && e.charIndex < m.start + m.length) { m.element.classList.add('highlighted-word'); f = true; break; } }
                if (!f && meta.length > 0) { for (let i = meta.length - 1; i >= 0; i--) { const m = meta[i]; if (e.charIndex >= m.start) { if ((i === meta.length - 1) || (e.charIndex < meta[i + 1].start)) { m.element.classList.add('highlighted-word'); break; } } } }
            };
            u.onend = () => { meta.forEach(m => m.element.classList.remove('highlighted-word')); if (cb) cb(); };
            u.onerror = e => { meta.forEach(m => m.element.classList.remove('highlighted-word')); console.error("Lỗi phát âm:", e); if (cb) cb(); };
        } else {
            u.onend = () => { if (cb) cb(); };
            u.onerror = e => { console.error("Lỗi phát âm:", e); if (cb) cb(); };
        }
        window.speechSynthesis.speak(u);
    } else { console.warn("Trình duyệt không hỗ trợ Speech Synthesis."); if (cb) cb(); }
}

function speakExample(text, spansMeta) {
    if (!text || !text.trim()) return;
    if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US';
        utterance.rate = currentExampleSpeechRate; // Use specific rate for examples
        utterance.pitch = 1.0;
        window.speechSynthesis.cancel();

        if (spansMeta && spansMeta.length > 0) {
            utterance.onstart = () => spansMeta.forEach(m => m.element.classList.remove('highlighted-word'));
            utterance.onboundary = event => {
                spansMeta.forEach(m => m.element.classList.remove('highlighted-word'));
                let found = false;
                for (const metaItem of spansMeta) {
                    if (event.charIndex >= metaItem.start && event.charIndex < metaItem.start + metaItem.length) {
                        metaItem.element.classList.add('highlighted-word');
                        found = true;
                        break;
                    }
                }
                if (!found && spansMeta.length > 0) {
                     for (let i = spansMeta.length - 1; i >= 0; i--) {
                        const metaItem = spansMeta[i];
                        if (event.charIndex >= metaItem.start) {
                            if ((i === spansMeta.length - 1) || (event.charIndex < spansMeta[i+1].start)) {
                                metaItem.element.classList.add('highlighted-word');
                                break;
                            }
                        }
                    }
                }
            };
            utterance.onend = () => spansMeta.forEach(m => m.element.classList.remove('highlighted-word'));
            utterance.onerror = e => {
                spansMeta.forEach(m => m.element.classList.remove('highlighted-word'));
                console.error("Lỗi phát âm ví dụ:", e);
            };
        }
        window.speechSynthesis.speak(utterance);
    } else {
        console.warn("Trình duyệt không hỗ trợ Speech Synthesis.");
    }
}
// --- END: Speech Synthesis Functions ---

// --- START: Lecture Functions ---
function generateCardLectureId(cardItem) {
    if (!cardItem) return `unknown-lecture-${generateUniqueId('uid')}`;
    let keyPart;
    const category = cardItem.category || 'unknown';

    switch(category) {
        case 'phrasalVerbs':
            keyPart = cardItem.phrasalVerb;
            break;
        case 'collocations':
            keyPart = cardItem.collocation;
            break;
        case 'idioms': // Added idioms
            keyPart = cardItem.idiom;
            break;
        default:
            keyPart = cardItem.word;
    }
    if (!keyPart) return `${category}-unknown-${generateUniqueId('lecturekey')}`;

    const sanitizedKeyPart = String(keyPart).toLowerCase()
                                .replace(/\s+/g, '-')
                                .replace(/[().,/?!"':]/g, '')
                                .replace(/[^a-z0-9-]/g, '');
    return `${category}-${sanitizedKeyPart}`;
}
// --- END: Lecture Functions ---

// --- START: Recently Viewed Functions ---
function renderRecentlyViewedList() {
    if (!recentlyViewedListElement || !noRecentCardsMessageElement) {
        console.warn("renderRecentlyViewedList: DOM elements for recently viewed list not found."); // Thêm cảnh báo
        return;
    }

    recentlyViewedListElement.innerHTML = ''; // Clear existing items

    if (!appState.recentlyViewedCards || appState.recentlyViewedCards.length === 0) {
        noRecentCardsMessageElement.style.display = 'block';
        return;
    }

    noRecentCardsMessageElement.style.display = 'none';

    appState.recentlyViewedCards.forEach(recentCard => {
        const listItem = document.createElement('li');
        listItem.className = 'recent-card-item group'; // Added group for potential hover effects on children
        listItem.setAttribute('role', 'button');
        listItem.tabIndex = 0; // Make it focusable

        // Store all necessary data to navigate back to the card
        listItem.dataset.cardIdentifier = recentCard.identifier;
        listItem.dataset.cardCategory = recentCard.category;
        listItem.dataset.cardSource = recentCard.source;
        listItem.dataset.cardDeckId = recentCard.deckId || ''; // Store deckId, even if null/empty

        const termSpan = document.createElement('span');
        termSpan.className = 'recent-card-term';
        termSpan.textContent = recentCard.term.length > 25 ? recentCard.term.substring(0, 22) + '...' : recentCard.term; // Truncate if too long
        termSpan.title = recentCard.term; // Show full term on hover

        const metaSpan = document.createElement('span');
        metaSpan.className = 'recent-card-meta';
        let categoryDisplay = recentCard.category;
        if (recentCard.category === 'phrasalVerbs') categoryDisplay = 'PV';
        else if (recentCard.category === 'collocations') categoryDisplay = 'Collo';
        else if (recentCard.category === 'idioms') categoryDisplay = 'Idiom';
        else if (recentCard.category === 'verbs') categoryDisplay = 'Verb';
        else if (recentCard.category === 'nouns') categoryDisplay = 'Noun';
        else if (recentCard.category === 'adjectives') categoryDisplay = 'Adj';
        metaSpan.textContent = `(${categoryDisplay})`;

        listItem.appendChild(termSpan);
        listItem.appendChild(metaSpan);

        listItem.addEventListener('click', async () => {
            await navigateToRecentCard(recentCard);
        });
        listItem.addEventListener('keydown', async (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                await navigateToRecentCard(recentCard);
            }
        });

        recentlyViewedListElement.appendChild(listItem);
    });
}

async function navigateToRecentCard(recentCardInfo) {
    if (!recentCardInfo) return;
    console.log("Navigating to recent card:", recentCardInfo);
    closeSidebar(); // This function was moved to module scope

    // 1. Set source and category
    if (cardSourceSelect) cardSourceSelect.value = recentCardInfo.source;
    currentDatasetSource = recentCardInfo.source; // Update global state

    if (categorySelect) categorySelect.value = recentCardInfo.category;

    // 2. Set deck if it's a user card from a specific deck
    if (recentCardInfo.source === 'user' && userDeckSelect) {
        if (recentCardInfo.deckId) {
            userDeckSelect.value = recentCardInfo.deckId;
        } else {
            userDeckSelect.value = recentCardInfo.deckId || 'all_user_cards';
        }
    }
    
    // 3. Update sidebar visibility and header (important after changing selects)
    updateSidebarFilterVisibility();
    updateMainHeaderTitle();

    // 4. Load vocabulary data for the card's category and source (and deck if applicable)
    const originalSearchTerm = searchInput.value;
    const originalBaseVerb = baseVerbSelect ? baseVerbSelect.value : 'all';
    const originalTag = tagSelect ? tagSelect.value : 'all';
    const originalFilterMarked = filterCardStatusSelect.value;

    searchInput.value = ''; // Clear search
    if (baseVerbSelect) baseVerbSelect.value = 'all';
    if (tagSelect) tagSelect.value = 'all';

    await loadVocabularyData(recentCardInfo.category); 

    let foundIndex = -1;
    if (window.currentData && window.currentData.length > 0) {
        foundIndex = window.currentData.findIndex(card => {
            const cardId = card.isUserCard ? card.id : getCardIdentifier(card); // getCardIdentifier was moved
            return cardId === recentCardInfo.identifier && card.category === recentCardInfo.category;
        });
    }

    if (foundIndex !== -1) {
        window.currentIndex = foundIndex;
        const stateForCategory = getCategoryState(currentDatasetSource, recentCardInfo.category);
        stateForCategory.currentIndex = window.currentIndex;
        console.log(`Recent card found at index: ${window.currentIndex}. Calling updateFlashcard.`);
        updateFlashcard(); 
    } else {
        console.warn("Recent card not found in current dataset after loading. Displaying first card or empty state.");
        window.currentIndex = 0; 
        const stateForCategory = getCategoryState(currentDatasetSource, recentCardInfo.category);
        stateForCategory.currentIndex = window.currentIndex;
        updateFlashcard();
    }

    searchInput.value = originalSearchTerm;
    if (baseVerbSelect) baseVerbSelect.value = originalBaseVerb;
    if (tagSelect) tagSelect.value = originalTag;
    filterCardStatusSelect.value = originalFilterMarked;
}


function addCardToRecentlyViewed(cardItem) {
    if (!cardItem) return;

    const term = cardItem.phrasalVerb || cardItem.collocation || cardItem.idiom || cardItem.word || 'N/A';
    const identifier = cardItem.isUserCard ? cardItem.id : getCardIdentifier(cardItem); // getCardIdentifier was moved

    if (!identifier) {
        console.warn("Could not generate identifier for recently viewed card:", cardItem);
        return;
    }

    const recentEntry = {
        identifier: identifier,
        term: term,
        category: cardItem.category,
        source: currentDatasetSource, 
        deckId: cardItem.isUserCard ? (cardItem.deckId || null) : null
    };

    appState.recentlyViewedCards = appState.recentlyViewedCards.filter(rc => rc.identifier !== recentEntry.identifier);
    appState.recentlyViewedCards.unshift(recentEntry);

    if (appState.recentlyViewedCards.length > MAX_RECENTLY_VIEWED_CARDS) {
        appState.recentlyViewedCards.pop();
    }

    renderRecentlyViewedList(); 
    saveAppState(); 
}
// --- END: Recently Viewed Functions ---


// Logic chính của ứng dụng
document.addEventListener('DOMContentLoaded', async () => {
    mainHeaderTitle = document.getElementById('main-header-title');
    cardSourceSelect = document.getElementById('card-source-select');
    categorySelect = document.getElementById('category');
    flashcardElement = document.getElementById('flashcard');
    cardFrontElement = flashcardElement.querySelector('.card-front');
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
    speakerExampleBtn = document.getElementById('speaker-example-btn');
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
    closeSidebarBtn = document.getElementById('close-sidebar-btn'); // DOM element for close button
    sidebarOverlay = document.getElementById('sidebar-overlay'); // DOM element for overlay
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
    cardWordLabel = document.querySelector('label[for="card-word-input"]'); 
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
    tabBtnYouTube = document.getElementById('tab-btn-youtube');
    flipIconFront = document.getElementById('flip-icon-front');
    flipIconBack = document.getElementById('flip-icon-back');
    recentlyViewedListElement = document.getElementById('recently-viewed-list'); 
    noRecentCardsMessageElement = document.getElementById('no-recent-cards-message'); 


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
        utilGetWebCardGlobalIdFunc: getCardIdentifier, // Now accessible
        uiUpdateStatusButtonsFunc: updateStatusButtonsUI,
        uiUpdateFlashcardFunc: updateFlashcard,
        uiNextBtnElement: nextBtn,
        dataGetCurrentCardFunc: () => window.currentData[window.currentIndex],
        dataGetWindowCurrentDataFunc: () => window.currentData,
        dataGetCurrentIndexFunc: () => window.currentIndex,
        uiShowToastFunc: showToast
    });

    loadExampleSpeechRate(); 

    await setupInitialCategoryAndSource(); 
    setupEventListeners();
    renderRecentlyViewedList(); 


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
        input.className='editing-deck-input w-full border border-slate-300 rounded px-2 py-1 focus:ring-indigo-500 focus:border-indigo-500'; 

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
        const categoriesWithTags = ['phrasalVerbs', 'collocations', 'idioms'];

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

    function openSidebar(){
        if (filterSidebar) filterSidebar.classList.remove('-translate-x-full');
        if (filterSidebar) filterSidebar.classList.add('translate-x-0');
        if (sidebarOverlay) sidebarOverlay.classList.remove('hidden');
        updateSidebarFilterVisibility();
    }
    
    function updateSidebarFilterVisibility (){
        const cat=categorySelect.value;
        const isPVOrCollocation = cat === 'phrasalVerbs' || cat === 'collocations';
        const isIdiom = cat === 'idioms';

        baseVerbFilterContainer.style.display = isPVOrCollocation ? 'block' : 'none';
        tagFilterContainer.style.display = (isPVOrCollocation || isIdiom) ? 'block' : 'none';

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

        if (cardWordLabel) {
            if (currentCategoryForForm === 'idioms') {
                cardWordLabel.innerHTML = 'Thành ngữ (Idiom) <span class="text-red-500">*</span>';
            } else if (currentCategoryForForm === 'phrasalVerbs' || currentCategoryForForm === 'collocations') {
                cardWordLabel.innerHTML = 'Cụm từ (Tiếng Anh) <span class="text-red-500">*</span>';
            } else {
                cardWordLabel.innerHTML = 'Từ (Tiếng Anh) <span class="text-red-500">*</span>';
            }
        }


        const isPVOrCollocation = currentCategoryForForm === 'phrasalVerbs' || currentCategoryForForm === 'collocations';
        const isIdiom = currentCategoryForForm === 'idioms';

        const baseVerbField = phrasalVerbSpecificFields.querySelector('#card-base-verb-input').closest('.relative'); 
        if (baseVerbField) baseVerbField.style.display = isPVOrCollocation ? 'block' : 'none';

        const tagsField = phrasalVerbSpecificFields.querySelector('#card-tags-input').closest('.relative'); 
        if (tagsField) tagsField.style.display = (isPVOrCollocation || isIdiom) ? 'block' : 'none';

        phrasalVerbSpecificFields.style.display = (isPVOrCollocation || isIdiom) ? 'block' : 'none';


        if (isPVOrCollocation || isIdiom) { 
            if (isPVOrCollocation) baseVerbSuggestions = await getAllUniqueBaseVerbs();
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
            else if (cardData.category === 'idioms') wordOrPhrase = cardData.idiom; 
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
            } else if (cardData.category === 'idioms') {
                cardBaseVerbInput.value = ''; 
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
                const firestoreStatus = await FirestoreService.getWebCardStatusFromFirestore(userId, getCardIdentifier(cardItem));
                if (firestoreStatus) {
                    return {
                        ...defaultCategoryState, 
                        ...firestoreStatus,
                        status: firestoreStatus.status || 'new',
                        isSuspended: firestoreStatus.isSuspended || false
                    };
                }
            }
            const webCardGlobalId = getCardIdentifier(cardItem);
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
        } else if (selectedDeckId === 'unassigned_cards') {
            cards = await FirestoreService.loadUserCardsFromFirestore(userId, null); 
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
        if (!wordValue) { displayFieldError(cardWordInput, cardWordError, "Từ/Cụm từ/Thành ngữ không được để trống."); isValid = false; }

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
        if (cardSourceSelect.value === 'user') {
            cardDataToSave.deckId = assignedDeckId || null; 
        }


        if (cardCategory === 'phrasalVerbs' || cardCategory === 'collocations') {
            if (cardCategory === 'phrasalVerbs') cardDataToSave.phrasalVerb = wordValue;
            if (cardCategory === 'collocations') cardDataToSave.collocation = wordValue;
            cardDataToSave.baseVerb = cardBaseVerbInput.value.trim() || null;
            cardDataToSave.tags = cardTagsInput.value.trim().split(',').map(t => t.trim().toLowerCase()).filter(t => t && t !== 'all' && !t.startsWith('particle_'));
        } else if (cardCategory === 'idioms') { 
            cardDataToSave.idiom = wordValue;
            cardDataToSave.baseVerb = null; 
            cardDataToSave.tags = cardTagsInput.value.trim().split(',').map(t => t.trim().toLowerCase()).filter(t => t && t !== 'all' && !t.startsWith('particle_'));
        } else {
            cardDataToSave.word = wordValue;
        }

        const editingCardId = cardIdInput.value;
        const deckIdForSave = cardSourceSelect.value === 'user' ? (assignedDeckId || null) : null; 
        
        const savedCardId = await FirestoreService.saveCardToFirestore(userId, deckIdForSave, cardDataToSave, editingCardId);


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

        if (!cardIdToDelete) {
            alert("Không thể xác định thẻ để xóa. Thiếu ID thẻ.");
            return;
        }
        const cardIdentifierText = cardToDelete.word || cardToDelete.phrasalVerb || cardToDelete.collocation || cardToDelete.idiom || "Thẻ không tên";
        if(!confirm(`Bạn có chắc chắn muốn xóa thẻ "${cardIdentifierText}"? Hành động này không thể hoàn tác.`))return;

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
    function populateBaseVerbFilter(arr){const bV=new Set();arr.forEach(i=>{if(i.baseVerb)bV.add(i.baseVerb);});baseVerbSelect.innerHTML='';const oA=document.createElement('option');oA.value='all';oA.textContent='Tất cả từ gốc';baseVerbSelect.appendChild(oA);const sBV=Array.from(bV).sort((a,b)=>a.localeCompare(b,'en'));sBV.forEach(v=>{const o=document.createElement('option');o.value=v;o.textContent=v.charAt(0).toUpperCase()+v.slice(1);baseVerbSelect.appendChild(o);});}
    function populateTagFilter(arr){const tT=new Set();arr.forEach(i=>{if(i.tags&&Array.isArray(i.tags)){i.tags.forEach(t=>{if(tagDisplayNames[t]&&t!=='all'&&!t.startsWith('particle_'))tT.add(t);});}});tagSelect.innerHTML='';const oA=document.createElement('option');oA.value='all';oA.textContent=tagDisplayNames["all"]||'Tất cả chủ đề';tagSelect.appendChild(oA);const sTK=Array.from(tT).sort((a,b)=>(tagDisplayNames[a]||a).localeCompare(tagDisplayNames[b]||b,'vi'));sTK.forEach(tK=>{const o=document.createElement('option');o.value=tK;o.textContent=tagDisplayNames[tK]||(tK.charAt(0).toUpperCase()+tK.slice(1));tagSelect.appendChild(o);});}

    async function applyAllFilters(fromLoad=false){
        const userId = getCurrentUserId();
        clearLearningTimer();const cCV=categorySelect.value;const sFCSC=getCategoryState(currentDatasetSource,cCV);let cST=searchInput.value.trim().toLowerCase();if(!fromLoad){if(cCV==='phrasalVerbs' || cCV === 'collocations' || cCV === 'idioms'){ 
            if (cCV === 'phrasalVerbs' || cCV === 'collocations') {
                sFCSC.baseVerb=baseVerbSelect.value;
            } else {
                sFCSC.baseVerb = 'all'; 
            }
            sFCSC.tag=tagSelect.value;
        }if(currentDatasetSource==='user' && userId)sFCSC.deckId=userDeckSelect.value;sFCSC.filterMarked=filterCardStatusSelect.value;sFCSC.currentIndex=0;}let lTP=[...activeMasterList];if(currentDatasetSource==='user' && userId){const sDI=sFCSC.deckId||userDeckSelect.value;if(sDI&&sDI!=='all_user_cards'){if(sDI==='unassigned_cards')lTP=lTP.filter(i=>!i.deckId);else lTP=lTP.filter(i=>i.deckId===sDI);}}if(currentDatasetSource==='user' && userId)lTP=lTP.filter(i=>i.category===cCV);
        if(cCV==='phrasalVerbs' || cCV === 'collocations'){ 
            if(sFCSC.baseVerb&&sFCSC.baseVerb!=='all')lTP=lTP.filter(i=>i.baseVerb===sFCSC.baseVerb);
        }
        if(cCV==='phrasalVerbs' || cCV === 'collocations' || cCV === 'idioms'){ 
            if(sFCSC.tag&&sFCSC.tag!=='all')lTP=lTP.filter(i=>i.tags&&i.tags.includes(sFCSC.tag));
        }
        if(cST){lTP=lTP.filter(i=>{const wOP=(i.category==='phrasalVerbs'?i.phrasalVerb:(i.category === 'collocations' ? i.collocation : (i.category === 'idioms' ? i.idiom : i.word)))||'';if(wOP.toLowerCase().includes(cST))return true;if(i.meanings&&i.meanings.some(m=>m.text.toLowerCase().includes(cST)))return true;if(i.meanings){for(const meaning of i.meanings){if(meaning.examples && meaning.examples.some(ex => ex.eng.toLowerCase().includes(cST) || (ex.vie && ex.vie.toLowerCase().includes(cST)) )) return true;}}return false;});}

        const sFV = sFCSC.filterMarked;
        if (sFV === 'review_today') {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const reviewTodayCards = [];
            for (const item of lTP) {
                if (item.isSuspended) continue; 

                if (item.nextReviewDate && typeof item.nextReviewDate === 'number') {
                    const reviewDate = new Date(item.nextReviewDate);
                    reviewDate.setHours(0,0,0,0);
                    if (reviewDate <= today) {
                        reviewTodayCards.push(item);
                    }
                } else if (item.status === 'new' && item.nextReviewDate === null) { 
                    reviewTodayCards.push(item);
                }
            }
            lTP = reviewTodayCards;
            console.log(`Filtered for 'review_today': ${lTP.length} cards`);
        } else if (sFV !== 'all_visible') { 
            const filteredByStatus = [];
            for (const item of lTP) {
                if (item.isSuspended && sFV !== 'all_visible') continue; 
                const sV = item.status || 'new';
                if(sFV==='all_study' && (sV==='new'||sV==='learning')) filteredByStatus.push(item);
                else if(sFV==='new' && sV==='new') filteredByStatus.push(item);
                else if(sFV==='learning' && sV==='learning') filteredByStatus.push(item);
                else if(sFV==='learned' && sV==='learned') filteredByStatus.push(item);
            }
            lTP = filteredByStatus;
            console.log(`Filtered by status '${sFV}': ${lTP.length} cards`);
        } else if (sFV === 'all_visible') { 
            
        }


        window.currentData=lTP;if(fromLoad){let nI=sFCSC.currentIndex||0;if(window.currentData.length===0)nI=0;else{nI=Math.min(nI,window.currentData.length-1);nI=Math.max(0,nI);}window.currentIndex=nI;}else window.currentIndex=0;sFCSC.currentIndex=window.currentIndex;saveAppState();window.updateFlashcard();window.updateMainHeaderTitle();}

    async function loadVocabularyData (category) {
        const userId = getCurrentUserId();
        clearLearningTimer();
        wordDisplay.innerHTML = '<span class="text-slate-400 text-xl">Đang tải dữ liệu...</span>';
        currentWordSpansMeta = []; pronunciationDisplay.textContent = ''; tagsDisplayFront.textContent = ''; meaningDisplayContainer.innerHTML = ''; notesDisplay.innerHTML = '';
        window.currentData = []; activeMasterList = []; speakerBtn.disabled = true;
        if (speakerExampleBtn) speakerExampleBtn.style.display = 'none'; 

        const stateForCurrentSourceCategory = getCategoryState(currentDatasetSource, category);
        filterCardStatusSelect.value = stateForCurrentSourceCategory.filterMarked;

        if (currentDatasetSource === 'user') {
            if (!userId) {
                wordDisplay.classList.add('word-display-empty-state');
                wordDisplay.innerHTML = `<p>Vui lòng đăng nhập để xem hoặc tạo thẻ của bạn.</p><button id="login-prompt-btn" class="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-md mt-2">Đăng nhập ngay</button>`;
                const loginPromptBtn = document.getElementById('login-prompt-btn');
                if(loginPromptBtn) loginPromptBtn.onclick = () => {
                    openAuthModalFromAuth('login');
                };
                pronunciationDisplay.style.display = 'none'; tagsDisplayFront.style.display = 'none'; speakerBtn.style.display = 'none';
                updateStatusButtonsUI(null, null); updateCardInfo(); window.updateMainHeaderTitle(); window.updateSidebarFilterVisibility();
                return;
            }
            await loadUserDecks(); 
            userDeckSelect.value = stateForCurrentSourceCategory.deckId || appState.lastSelectedDeckId || 'all_user_cards';
            activeMasterList = await loadUserCards(userDeckSelect.value);
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
                            id: getCardIdentifier(card), 
                            isUserCard: false,
                            category: category, 
                            meanings: meaningsArray,
                            generalNotes: card.generalNotes || card.notes || '', 
                            videoUrl: card.videoUrl || null,
                            
                            status: 'new',
                            lastReviewed: null,
                            reviewCount: 0,
                            nextReviewDate: null,
                            interval: 0,
                            easeFactor: 2.5,
                            repetitions: 0,
                            isSuspended: false
                        };
                    });

                    
                    if (userId && webCards.length > 0) {
                        const statusPromises = webCards.map(async (card) => {
                            const webId = card.id; 
                            if (webId) {
                                const firestoreStatus = await FirestoreService.getWebCardStatusFromFirestore(userId, webId);
                                if (firestoreStatus) {
                                    
                                    card.status = firestoreStatus.status || 'new';
                                    card.lastReviewed = firestoreStatus.lastReviewed; 
                                    card.reviewCount = firestoreStatus.reviewCount || 0;
                                    card.nextReviewDate = firestoreStatus.nextReviewDate; 
                                    card.interval = firestoreStatus.interval || 0;
                                    card.easeFactor = firestoreStatus.easeFactor || 2.5;
                                    card.repetitions = firestoreStatus.repetitions || 0;
                                    card.isSuspended = firestoreStatus.isSuspended || false;
                                    card.videoUrl = firestoreStatus.videoUrl || card.videoUrl || null; 
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
                        id: getCardIdentifier({category: category, word: card.word, phrasalVerb: card.phrasalVerb, collocation: card.collocation, idiom: card.idiom}), 
                        isUserCard: false,
                        category: category,
                        status: 'new', lastReviewed: null, reviewCount: 0, nextReviewDate: null, interval: 0, easeFactor: 2.5, repetitions: 0, isSuspended: false,
                        videoUrl: card.videoUrl || null
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
        if (category !== 'phrasalVerbs' && category !== 'collocations' && category !== 'idioms') { 
            stateForCurrentSourceCategory.baseVerb = 'all';
            stateForCurrentSourceCategory.tag = 'all';
        }

        activeMasterList = shuffleArray(activeMasterList);
        const relevantCardsForFilters = (currentDatasetSource === 'web' || !userId) ? activeMasterList : activeMasterList.filter(card => card.category === category);

        if ((category === 'phrasalVerbs' || category === 'collocations') && relevantCardsForFilters.length > 0) { 
            populateBaseVerbFilter(relevantCardsForFilters);
            baseVerbSelect.value = stateForCurrentSourceCategory.baseVerb || 'all';
        }
        if ((category === 'phrasalVerbs' || category === 'collocations' || category === 'idioms') && relevantCardsForFilters.length > 0) { 
            populateTagFilter(relevantCardsForFilters);
            tagSelect.value = stateForCurrentSourceCategory.tag || 'all';
        }
        applyAllFilters(true); 
    }

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

        const notesSectionOnCard = document.getElementById('notes-section');
        if (notesSectionOnCard) notesSectionOnCard.style.display = 'none';
        if (notesDisplay) notesDisplay.innerHTML = '';


        if(flashcardElement) flashcardElement.classList.remove('flipped');

        const oldOriginalTermOnBack = flashcardElement.querySelector('.original-term-on-back');
        if (oldOriginalTermOnBack) oldOriginalTermOnBack.remove();

        if (cardOptionsMenuBtn) cardOptionsMenuBtn.style.display = 'none';
        if (cardOptionsMenuBtnBack) cardOptionsMenuBtnBack.style.display = 'none';
        if (actionBtnMedia) actionBtnMedia.style.display = 'flex';
        if (exitSingleCardPracticeBtn) exitSingleCardPracticeBtn.style.display = 'none';
        if (speakerExampleBtn) speakerExampleBtn.style.display = 'none';


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
                    else if (cI.category === 'idioms') currentCorrectAnswerForPractice = cI.idiom || ''; 
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
            if (isSingleCardPracticeMode && exitSingleCardPracticeBtn) {
                exitSingleCardPracticeBtn.style.display = 'inline-flex';
                if(prevBtn) prevBtn.style.display = 'none';
                if(nextBtn) nextBtn.style.display = 'none';
                if(flipBtn) flipBtn.style.display = 'none';
            } else {
                 if(prevBtn) prevBtn.style.display = 'inline-flex';
                 if(nextBtn) nextBtn.style.display = 'inline-flex';
                 if(flipBtn) flipBtn.style.display = 'inline-flex';
            }

        } else {
            if(practiceArea) practiceArea.style.display = 'none';
            if(flashcardElement) flashcardElement.classList.remove('practice-mode-front-only');
            if(pronunciationDisplay) pronunciationDisplay.style.display = 'block';
            if(tagsDisplayFront) tagsDisplayFront.style.display = 'block';
            if(speakerBtn) speakerBtn.style.display = 'block';
            if(flipBtn) flipBtn.style.display = 'inline-flex';
            if(prevBtn) prevBtn.style.display = 'inline-flex';
            if(nextBtn) nextBtn.style.display = 'inline-flex';
        }

        const item = window.currentData.length > 0 ? window.currentData[window.currentIndex] : null;
        console.log('[updateFlashcard] Rendering card. Item:', JSON.parse(JSON.stringify(item)));

        if (item) { 
            addCardToRecentlyViewed(item);
        }


        if (!item) {
            if(wordDisplay) {
                wordDisplay.classList.add('word-display-empty-state');
                if (currentDatasetSource === 'user' && !userId) {
                     wordDisplay.innerHTML = `<p>Vui lòng đăng nhập để xem hoặc tạo thẻ của bạn.</p><button id="login-prompt-btn" class="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-md mt-2">Đăng nhập ngay</button>`;
                     const loginPromptBtn = document.getElementById('login-prompt-btn');
                     if(loginPromptBtn) loginPromptBtn.onclick = () => {
                         openAuthModalFromAuth('login');
                     };
                } else if (currentDatasetSource === 'user' && userId && (!userDecks || userDecks.length === 0) && activeMasterList.length === 0) {
                    wordDisplay.innerHTML = `<p>Bạn chưa có thẻ nào và chưa có bộ thẻ nào. Hãy bắt đầu bằng cách tạo một bộ thẻ từ menu <i class='fas fa-bars'></i>, sau đó thêm thẻ mới!</p>`;
                } else if (currentDatasetSource === 'user' && userId && activeMasterList.length === 0) {
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
            if(flipBtn) flipBtn.disabled = true;
            if(flipIconFront) flipIconFront.style.display = 'none';
            if(flipIconBack) flipIconBack.style.display = 'none';
            updateStatusButtonsUI();
        } else {
            if(pronunciationDisplay) pronunciationDisplay.style.display = 'block';
            if(tagsDisplayFront) tagsDisplayFront.style.display = 'block';
            if(speakerBtn) speakerBtn.style.display = 'block';
            if(flipBtn) flipBtn.disabled = (practiceType !== "off");
            if(flipIconFront) flipIconFront.style.display = (practiceType === "off") ? 'block' : 'none';
            if(flipIconBack) flipIconBack.style.display = (practiceType === "off") ? 'block' : 'none';


            currentWordSpansMeta = []; let accCC = 0;
            const iCV = item.category;
            const firstMeaningText = (item.meanings && item.meanings.length > 0) ? item.meanings[0].text : '';
            let textForTTS;
            let mainTermToDisplay = '';

            if (iCV === 'phrasalVerbs') mainTermToDisplay = item.phrasalVerb || '';
            else if (iCV === 'collocations') mainTermToDisplay = item.collocation || '';
            else if (iCV === 'idioms') mainTermToDisplay = item.idiom || ''; 
            else mainTermToDisplay = item.word || '';

            if (practiceType === 'word_quiz') {
                textForTTS = firstMeaningText;
                const mTSp = document.createElement('span');
                mTSp.className = 'text-3xl sm:text-4xl font-bold';
                mTSp.textContent = firstMeaningText;
                if(wordDisplay) wordDisplay.appendChild(mTSp);

                if(pronunciationDisplay) pronunciationDisplay.style.display = 'none';
                if(tagsDisplayFront) tagsDisplayFront.style.display = 'none';
                if(speakerBtn) speakerBtn.style.display = 'none';
            } else {
                let bTFM = "";
                const pts = mainTermToDisplay.split(/(\([^)]+\))/g).filter(p => p);
                pts.forEach((p, pI) => {
                    const iD = p.startsWith('(') && p.endsWith(')');
                    const cS = document.createElement('span');
                    cS.className = iD ? 'text-xl opacity-80 ml-1' : 'text-3xl sm:text-4xl font-bold';
                    const segs = p.split(/(\s+)/);
                    segs.forEach(s => {
                        bTFM += s;
                        if (s.trim() !== '') {
                            const wS = document.createElement('span');
                            wS.textContent = s;
                            cS.appendChild(wS);
                            currentWordSpansMeta.push({ element: wS, start: bTFM.length - s.length, length: s.length });
                        } else {
                            cS.appendChild(document.createTextNode(s));
                        }
                    });
                    if(wordDisplay) wordDisplay.appendChild(cS);
                    if (pI < pts.length - 1) {
                        const nPID = pts[pI+1].startsWith('(') && pts[pI+1].endsWith(')');
                        if (!p.endsWith(' ') && !pts[pI+1].startsWith(' ') && !(iD && nPID) ) {
                             if(wordDisplay) wordDisplay.appendChild(document.createTextNode(' '));
                             bTFM += ' ';
                        }
                    }
                });
                textForTTS = bTFM;
            }
            if(wordDisplay) wordDisplay.dataset.ttsText = textForTTS;
            if(pronunciationDisplay) pronunciationDisplay.textContent = item.pronunciation || '';
            if ((iCV === 'phrasalVerbs' || iCV === 'collocations' || iCV === 'idioms') && item.tags && practiceType !== 'word_quiz') { 
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

            const hasActionsForBottomSheet = (item.isUserCard && userId) || (!item.isUserCard && userId);
            if (cardOptionsMenuBtn) cardOptionsMenuBtn.style.display = hasActionsForBottomSheet ? 'block' : 'none';
            if (cardOptionsMenuBtnBack) cardOptionsMenuBtnBack.style.display = hasActionsForBottomSheet ? 'block' : 'none';
            if (actionBtnMedia && item) actionBtnMedia.style.display = 'flex'; else if (actionBtnMedia) actionBtnMedia.style.display = 'none';


            if (item.meanings && item.meanings.length > 0) {
                item.meanings.forEach((mObj, idx) => {
                    const meaningBlockDiv = document.createElement('div');
                    meaningBlockDiv.className = `meaning-block-on-card ${idx > 0 ? "mt-4 pt-3 border-t border-blue-400 border-opacity-50" : (item.meanings.length > 1 ? "bg-black bg-opacity-10 p-3 rounded-lg" : "") }`;
                    const meaningTextP = document.createElement('p');
                    meaningTextP.className = "meaning-text-on-card";
                    if (item.meanings.length > 1) {
                        meaningTextP.textContent = `${idx + 1}. ${mObj.text}`;
                    } else {
                        meaningTextP.textContent = mObj.text;
                    }
                    meaningBlockDiv.appendChild(meaningTextP);

                    if (mObj.notes) {
                        const meaningNotesP = document.createElement('p');
                        meaningNotesP.className = "meaning-notes-on-card";
                        meaningNotesP.textContent = mObj.notes;
                        meaningBlockDiv.appendChild(meaningNotesP);
                    }

                    
                    const rateControlContainer = document.createElement('div');
                    rateControlContainer.className = 'example-speech-rate-dropdown-container flex items-center space-x-2 mb-2 ml-3';

                    const rateLabel = document.createElement('span');
                    rateLabel.className = 'text-xs text-sky-200';
                    rateLabel.textContent = 'Tốc độ VD:';
                    rateControlContainer.appendChild(rateLabel);

                    const rateSelect = document.createElement('select');
                    rateSelect.className = 'example-speech-rate-select bg-sky-700 text-white text-xs p-1 rounded-md border border-sky-500 focus:ring-sky-400 focus:border-sky-400';
                    const rates = [
                        { value: 0.75, text: 'Chậm' },
                        { value: 1.0, text: 'Thường' },
                        { value: 1.25, text: 'Nhanh' }
                    ];
                    rates.forEach(r => {
                        const option = document.createElement('option');
                        option.value = r.value.toString();
                        option.textContent = r.text;
                        if (parseFloat(option.value) === currentExampleSpeechRate) {
                            option.selected = true;
                        }
                        rateSelect.appendChild(option);
                    });
                    rateControlContainer.appendChild(rateSelect);
                    meaningBlockDiv.appendChild(rateControlContainer);
                    


                    if (mObj.examples && mObj.examples.length > 0) {
                        const examplesContainer = document.createElement('div');
                        examplesContainer.className = "ml-3 mt-1";
                        const examplesListDiv = document.createElement('div');
                        examplesListDiv.className = "space-y-1.5";
                        examplesListDiv.dataset.meaningId = mObj.id;

                        const maxVisibleExamples = 2;
                        const totalExamples = mObj.examples.length;

                        mObj.examples.forEach((ex, exIdx) => {
                            const exD = document.createElement('div');
                            exD.className="example-item-on-card";
                            if (exIdx >= maxVisibleExamples) {
                                exD.classList.add('hidden');
                            }

                            const eP = document.createElement('p');
                            eP.className="example-eng-on-card";

                            const textContentDiv = document.createElement('div');
                            textContentDiv.className = 'text-content flex-grow';

                            const enLabel = document.createElement('span');
                            enLabel.className = 'example-label';
                            enLabel.textContent = 'EN: ';
                            textContentDiv.appendChild(enLabel);

                            const exampleText = ex.eng.trim();
                            let exampleAccCC = 0;
                            if (exampleText) {
                                const exampleWords = exampleText.split(/(\s+)/);
                                exampleWords.forEach(wordPart => {
                                    if (wordPart.trim() !== '') {
                                        const wordSpan = document.createElement('span');
                                        wordSpan.textContent = wordPart;
                                        textContentDiv.appendChild(wordSpan);
                                    } else {
                                        textContentDiv.appendChild(document.createTextNode(wordPart));
                                    }
                                    exampleAccCC += wordPart.length;
                                });
                            } else {
                                textContentDiv.appendChild(document.createTextNode(exampleText));
                            }
                            eP.appendChild(textContentDiv);

                            const controlsDiv = document.createElement('div');
                            controlsDiv.className = 'flex items-center ml-2 flex-shrink-0';

                            if (ex.eng && ex.eng.trim()) {
                                const playSingleExBtn = document.createElement('button');
                                playSingleExBtn.className = 'speak-single-example-btn text-sky-300 hover:text-sky-100 p-1 transition-colors duration-150';
                                playSingleExBtn.innerHTML = '<i class="fas fa-play"></i>';
                                playSingleExBtn.title = 'Phát âm ví dụ này';
                                playSingleExBtn.dataset.textToSpeak = ex.eng.trim();

                                playSingleExBtn.addEventListener('click', (e) => {
                                    e.stopPropagation();
                                    const text = e.currentTarget.dataset.textToSpeak;
                                    const clickedExampleTextContentDiv = e.currentTarget.closest('.example-eng-on-card').querySelector('.text-content');
                                    const localExampleSpansMeta = [];
                                    let localAccCC = 0;

                                    if (clickedExampleTextContentDiv && text) {
                                        const childNodes = Array.from(clickedExampleTextContentDiv.childNodes);
                                        childNodes.forEach(node => {
                                            if (node.nodeType === Node.TEXT_NODE) {
                                                localAccCC += node.textContent.length;
                                            } else if (node.nodeType === Node.ELEMENT_NODE && node.tagName === 'SPAN' && !node.classList.contains('example-label')) {
                                                localExampleSpansMeta.push({element: node, start: localAccCC, length: node.textContent.length});
                                                localAccCC += node.textContent.length;
                                            }
                                        });
                                    }
                                    if (text) {
                                        speakExample(text, localExampleSpansMeta);
                                    }
                                });
                                controlsDiv.appendChild(playSingleExBtn);
                            }

                            const copyBtn = document.createElement('button');
                            copyBtn.className = 'copy-example-btn';
                            copyBtn.title = 'Sao chép ví dụ';
                            const initialCopySvg = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.75" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184" /></svg>`;
                            const copiedSvg = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.75" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>`;
                            copyBtn.innerHTML = initialCopySvg;
                            copyBtn.onclick = (e) => {
                                e.stopPropagation();
                                navigator.clipboard.writeText(ex.eng).then(() => {
                                    copyBtn.innerHTML = copiedSvg;
                                    setTimeout(() => { copyBtn.innerHTML = initialCopySvg; }, 1500);
                                }).catch(err => {
                                    console.error('Không thể sao chép: ', err);
                                    showToast('Lỗi sao chép vào clipboard!', 2000, 'error');
                                });
                            };
                            controlsDiv.appendChild(copyBtn);
                            eP.appendChild(controlsDiv);
                            exD.appendChild(eP);


                            if(ex.vie){
                                const vP = document.createElement('p');
                                vP.className="example-vie-on-card";
                                const vnLabel = document.createElement('span');
                                vnLabel.className = 'example-label';
                                vnLabel.textContent = 'VN: ';
                                vP.appendChild(vnLabel);
                                vP.appendChild(document.createTextNode(`(${ex.vie})`));
                                exD.appendChild(vP);
                            }
                            if(ex.exampleNotes){
                                const nP=document.createElement('p');
                                nP.className="example-notes-on-card";
                                nP.textContent=`Ghi chú VD: ${ex.exampleNotes}`;
                                exD.appendChild(nP);
                            }
                            examplesListDiv.appendChild(exD);
                        });
                        examplesContainer.appendChild(examplesListDiv);

                        if (totalExamples > maxVisibleExamples) {
                            const toggleExamplesBtn = document.createElement('button');
                            toggleExamplesBtn.className = "toggle-examples-btn";
                            let hiddenCount = totalExamples - maxVisibleExamples;
                            toggleExamplesBtn.textContent = `Xem thêm ${hiddenCount} ví dụ...`;
                            toggleExamplesBtn.dataset.expanded = "false";
                            toggleExamplesBtn.onclick = (e) => {
                                e.stopPropagation();
                                const isExpanded = toggleExamplesBtn.dataset.expanded === "true";
                                const exampleItems = examplesListDiv.querySelectorAll('.example-item-on-card');
                                exampleItems.forEach((item, itemIdx) => {
                                    if (itemIdx >= maxVisibleExamples) {
                                        item.classList.toggle('hidden', isExpanded);
                                    }
                                });
                                if (isExpanded) {
                                    toggleExamplesBtn.textContent = `Xem thêm ${hiddenCount} ví dụ...`;
                                    toggleExamplesBtn.dataset.expanded = "false";
                                } else {
                                    toggleExamplesBtn.textContent = "Ẩn bớt ví dụ";
                                    toggleExamplesBtn.dataset.expanded = "true";
                                }
                            };
                            examplesContainer.appendChild(toggleExamplesBtn);
                        }
                        meaningBlockDiv.appendChild(examplesContainer);
                    }
                    if(meaningDisplayContainer) meaningDisplayContainer.appendChild(meaningBlockDiv);
                });
            }
            else if(meaningDisplayContainer) meaningDisplayContainer.innerHTML = '<p class="text-slate-400 italic">Chưa có nghĩa.</p>';

            const notesSectionEl = document.getElementById('notes-section');
            if (notesSectionEl) notesSectionEl.style.display = 'none';
            if (notesDisplay) notesDisplay.innerHTML = '';


            if(speakerBtn) speakerBtn.disabled = !textForTTS.trim() || (practiceType === 'word_quiz');
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
            questionText = sourceCard.category === 'phrasalVerbs' ? sourceCard.phrasalVerb : (sourceCard.category === 'collocations' ? sourceCard.collocation : (sourceCard.category === 'idioms' ? sourceCard.idiom : sourceCard.word)); 
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
            correctAnswerText = sourceCard.category === 'phrasalVerbs' ? sourceCard.phrasalVerb : (sourceCard.category === 'collocations' ? sourceCard.collocation : (sourceCard.category === 'idioms' ? sourceCard.idiom : sourceCard.word)); 
            options.push(correctAnswerText);

            let wrongOptionsCount = 0;
            const otherCards = activeMasterList.filter(card =>
                card.category === sourceCard.category &&
                getCardIdentifier(card) !== getCardIdentifier(sourceCard)
            );
            shuffleArray(otherCards);
            for (const otherCard of otherCards) {
                const wrongOption = otherCard.category === 'phrasalVerbs' ? otherCard.phrasalVerb : (otherCard.category === 'collocations' ? otherCard.collocation : (otherCard.category === 'idioms' ? otherCard.idiom : otherCard.word)); 
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
            let mainTerm = cardJson.word || cardJson.phrasalVerb || cardJson.collocation || cardJson.idiom || 'Thẻ không tên'; 
            if (!cardJson.category ||
                !mainTerm ||
                !Array.isArray(cardJson.meanings) || cardJson.meanings.length === 0 ||
                !cardJson.meanings[0].text
            ) {
                errorCount++;
                errorMessages.push(`Thẻ "${mainTerm}" thiếu thông tin bắt buộc (category, từ/cụm từ/thành ngữ, hoặc nghĩa chính).`);
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
            } else if (cardJson.category === 'idioms') { 
                cardDataToSave.idiom = cardJson.idiom;
                cardDataToSave.baseVerb = null; 
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

        
        if (currentCard.category === 'phrasalVerbs') cardToCopy.phrasalVerb = currentCard.phrasalVerb;
        else if (currentCard.category === 'collocations') cardToCopy.collocation = currentCard.collocation;
        else if (currentCard.category === 'idioms') cardToCopy.idiom = currentCard.idiom;
        else cardToCopy.word = currentCard.word;


        const newCardId = await FirestoreService.saveCardToFirestore(userId, targetDeckId, cardToCopy);

        if (newCardId) {
            console.log("Web card copied to user deck. New card ID:", newCardId);
            copyToDeckSuccessMessage.textContent = `Đã sao chép thẻ "${cardToCopy.word || cardToCopy.phrasalVerb || cardToCopy.collocation || cardToCopy.idiom}" vào bộ thẻ đã chọn!`;
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

    async function openBottomSheet(cardItem, viewType = 'default', subView = 'youtube_custom') {
        if (!cardItem || !bottomSheetContent || !bottomSheetTitle || !bottomSheetOverlay || !bottomSheet) return;

        let hasActions = false;
        bottomSheetContent.innerHTML = '';
        const loggedInUserId = getCurrentUserId();
        const isAdmin = loggedInUserId === ADMIN_UID;
        let cardTerm = cardItem.word || cardItem.phrasalVerb || cardItem.collocation || cardItem.idiom || "Thẻ"; 

        bottomSheet.classList.remove('bottom-sheet-video-mode', 'bottom-sheet-notes-mode', 'bottom-sheet-media-mode', 'bottom-sheet-lecture-mode');
        bottomSheet.style.paddingBottom = '';

        if (bottomSheetTabsContainer) bottomSheetTabsContainer.style.display = 'none';


        if (viewType === 'default') {
            bottomSheetTitle.textContent = `Tùy chọn cho: ${cardTerm.length > 20 ? cardTerm.substring(0,17) + '...' : cardTerm}`;
            
             if (loggedInUserId && (cardItem.isUserCard || (cardItem.nextReviewDate || (cardItem.repetitions && cardItem.repetitions > 0) ))) {
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

            if (!cardItem.isUserCard && loggedInUserId) {
                const copyBtnEl = document.createElement('button');
                copyBtnEl.innerHTML = `<i class="fas fa-copy w-5 mr-3 text-sky-500"></i> Sao chép vào Thẻ của Tôi`;
                copyBtnEl.onclick = () => { openCopyToDeckModal(); closeBottomSheet(); };
                bottomSheetContent.appendChild(copyBtnEl);
                hasActions = true;
            }
            if (cardItem.isUserCard && loggedInUserId) {
                const editBtnEl = document.createElement('button');
                editBtnEl.innerHTML = `<i class="fas fa-edit w-5 mr-3 text-blue-500"></i> Sửa thẻ`;
                editBtnEl.onclick = async () => { await openAddEditModal('edit', cardItem); closeBottomSheet(); };
                bottomSheetContent.appendChild(editBtnEl);
                hasActions = true;
            }
            if (loggedInUserId && (cardItem.isUserCard || (cardItem.nextReviewDate || (cardItem.repetitions && cardItem.repetitions > 0) ))) {
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
                            updateSuccess = !!await FirestoreService.saveCardToFirestore(loggedInUserId, cardItem.deckId, srsResetData, cardItem.id);
                        } else {
                            const webCardGlobalId = getCardIdentifier(cardItem);
                            if (webCardGlobalId) updateSuccess = await FirestoreService.updateWebCardStatusInFirestore(loggedInUserId, webCardGlobalId, cardItem, srsResetData);
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
            if (loggedInUserId && (cardItem.isUserCard || (cardItem.nextReviewDate || (cardItem.repetitions && cardItem.repetitions > 0) ))) {
                const suspendBtn = document.createElement('button');
                suspendBtn.innerHTML = cardItem.isSuspended
                    ? `<i class="fas fa-play-circle w-5 mr-3 text-green-500"></i> Tiếp tục Ôn tập`
                    : `<i class="fas fa-pause-circle w-5 mr-3 text-yellow-500"></i> Tạm ngưng Ôn tập`;
                suspendBtn.onclick = async () => {
                    const newSuspendedState = !cardItem.isSuspended;
                    const dataToUpdate = { isSuspended: newSuspendedState, updatedAt: serverTimestamp() };
                    let updateSuccess = false;
                    if (cardItem.isUserCard) {
                        updateSuccess = !!await FirestoreService.saveCardToFirestore(loggedInUserId, cardItem.deckId, dataToUpdate, cardItem.id);
                    } else {
                        const webCardGlobalId = getCardIdentifier(cardItem);
                        if (webCardGlobalId) {
                            const existingWebStatus = await FirestoreService.getWebCardStatusFromFirestore(loggedInUserId, webCardGlobalId) || {};
                            const fullDataToSet = { ...existingWebStatus, originalCategory: cardItem.category, originalWordOrPhrase: cardTerm, isSuspended: newSuspendedState, updatedAt: serverTimestamp() };
                            for (const key in fullDataToSet) { if (fullDataToSet[key] === undefined) delete fullDataToSet[key]; } 
                            updateSuccess = await FirestoreService.updateWebCardStatusInFirestore(loggedInUserId, webCardGlobalId, cardItem, fullDataToSet);
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
            if (cardItem.isUserCard && loggedInUserId) {
                const deleteBtnEl = document.createElement('button');
                deleteBtnEl.classList.add('text-red-600', 'dark:text-red-400');
                deleteBtnEl.innerHTML = `<i class="fas fa-trash-alt w-5 mr-3"></i> Xóa thẻ`;
                deleteBtnEl.onclick = async () => { await handleDeleteCard(); closeBottomSheet(); };
                bottomSheetContent.appendChild(deleteBtnEl);
                hasActions = true;
            }

        } else if (viewType === 'lecture') {
            bottomSheet.classList.add('bottom-sheet-lecture-mode');

            const cardLectureId = generateCardLectureId(cardItem);
            const lectureTitlePrefix = "Bài giảng: ";
            bottomSheetTitle.textContent = `${lectureTitlePrefix}${cardTerm.length > 20 ? cardTerm.substring(0,17) + '...' : cardTerm}`;
            bottomSheetContent.innerHTML = '<p class="text-slate-400 dark:text-slate-300 p-4 text-center">Đang tải bài giảng...</p>';

            FirestoreService.getLectureContent(cardLectureId)
                .then(lectureData => {
                    if (isAdmin) {
                        bottomSheetContent.innerHTML = ''; 

                        const titleLabel = document.createElement('label');
                        titleLabel.htmlFor = 'lecture-title-input';
                        titleLabel.textContent = 'Tiêu đề Bài giảng:';
                        titleLabel.className = 'block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1';
                        bottomSheetContent.appendChild(titleLabel);

                        const titleInput = document.createElement('input');
                        titleInput.type = 'text';
                        titleInput.id = 'lecture-title-input';
                        titleInput.className = 'w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-slate-700 dark:text-white mb-3';
                        titleInput.value = lectureData?.title || `${lectureTitlePrefix}${cardTerm}`;
                        bottomSheetContent.appendChild(titleInput);

                        const contentLabel = document.createElement('label');
                        contentLabel.htmlFor = 'lecture-content-html-input';
                        contentLabel.textContent = 'Nội dung HTML Bài giảng:';
                        contentLabel.className = 'block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1';
                        bottomSheetContent.appendChild(contentLabel);

                        const contentTextarea = document.createElement('textarea');
                        contentTextarea.id = 'lecture-content-html-input';
                        contentTextarea.rows = 15;
                        contentTextarea.className = 'w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-slate-700 dark:text-white mb-3 min-h-[250px]';
                        contentTextarea.placeholder = 'Dán hoặc nhập mã HTML của bài giảng vào đây...';
                        contentTextarea.value = lectureData?.contentHTML || '';
                        bottomSheetContent.appendChild(contentTextarea);

                        const saveLectureBtn = document.createElement('button');
                        saveLectureBtn.id = 'save-lecture-btn';
                        saveLectureBtn.textContent = 'Lưu Bài Giảng';
                        saveLectureBtn.className = 'w-full py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-md shadow-sm';
                        saveLectureBtn.onclick = async () => {
                            const newTitle = titleInput.value.trim();
                            const newContentHTML = contentTextarea.value; 
                            if (!newTitle) {
                                alert("Tiêu đề bài giảng không được để trống.");
                                return;
                            }
                            saveLectureBtn.disabled = true;
                            saveLectureBtn.textContent = 'Đang lưu...';
                            const success = await FirestoreService.saveLectureContent(cardLectureId, newTitle, newContentHTML);
                            if (success) {
                                showToast("Đã lưu bài giảng!", 2000, 'success');
                                closeBottomSheet();
                            } else {
                                showToast("Lỗi: Không thể lưu bài giảng.", 3000, 'error');
                            }
                            saveLectureBtn.disabled = false;
                            saveLectureBtn.textContent = 'Lưu Bài Giảng';
                        };
                        bottomSheetContent.appendChild(saveLectureBtn);

                    } else { 
                        if (lectureData && lectureData.contentHTML) {
                            bottomSheetTitle.textContent = lectureData.title || `${lectureTitlePrefix}${cardTerm}`;
                            bottomSheetContent.innerHTML = `<div class="lecture-html-content p-2 prose dark:prose-invert max-w-none">${lectureData.contentHTML}</div>`;
                        } else {
                            bottomSheetContent.innerHTML = '<p class="text-slate-500 dark:text-slate-400 p-4 text-center">Hiện chưa có bài giảng chi tiết cho từ này.</p>';
                        }
                    }
                })
                .catch(error => { 
                    console.error("Lỗi khi tải bài giảng:", error);
                    bottomSheetContent.innerHTML = '<p class="text-red-500 dark:text-red-400 p-4 text-center">Lỗi tải bài giảng. Vui lòng thử lại.</p>';
                });
            hasActions = true; 
        } else if (viewType === 'media') {
            bottomSheet.classList.add('bottom-sheet-media-mode');
            bottomSheetTitle.textContent = `Nghe/Xem: ${cardTerm.length > 20 ? cardTerm.substring(0,17) + '...' : cardTerm}`;

            if (bottomSheetTabsContainer) bottomSheetTabsContainer.style.display = 'none'; 

            let youtubeContentDiv = document.getElementById('youtube-tab-content');
            if (!youtubeContentDiv) { 
                youtubeContentDiv = document.createElement('div');
                youtubeContentDiv.id = 'youtube-tab-content';
                youtubeContentDiv.className = 'bottom-sheet-tab-content'; 
                bottomSheetContent.appendChild(youtubeContentDiv);
            }
            setActiveMediaTab('youtube_custom', cardItem); 
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
        const youtubeContentDiv = document.getElementById('youtube-tab-content');
        let cardTerm = cardItem.word || cardItem.phrasalVerb || cardItem.collocation || cardItem.idiom || ""; 

        if (youtubeContentDiv) youtubeContentDiv.classList.add('hidden'); 
        if (tabBtnYouTube) tabBtnYouTube.classList.remove('active'); 

        if (tabName === 'youtube_custom') {
            if (youtubeContentDiv) {
                youtubeContentDiv.classList.remove('hidden'); 
                youtubeContentDiv.innerHTML = ''; 

                if (cardItem.videoUrl) {
                    const videoId = extractYouTubeVideoId(cardItem.videoUrl);
                    if (videoId) {
                        const iframeContainer = document.createElement('div');
                        iframeContainer.className = 'video-iframe-container w-full'; 
                        const iframe = document.createElement('iframe');
                        iframe.src = `https://www.youtube.com/embed/${videoId}`;
                        iframe.title = "YouTube video player";
                        iframe.frameBorder = "0";
                        iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
                        iframe.allowFullscreen = true;
                        iframeContainer.appendChild(iframe);
                        youtubeContentDiv.appendChild(iframeContainer);
                    } else {
                        youtubeContentDiv.innerHTML = '<p class="text-slate-500 dark:text-slate-400 p-4 text-center">Link video YouTube không hợp lệ.</p>';
                    }
                } else {
                     
                     const searchButtonContainer = document.createElement('div');
                     searchButtonContainer.className = 'p-4 text-center';

                     const pMessage = document.createElement('p');
                     pMessage.className = 'text-slate-500 dark:text-slate-400 mb-3';
                     pMessage.textContent = 'Chưa có video YouTube nào được gán. Bạn có thể thêm link khi sửa thẻ, hoặc:';
                     searchButtonContainer.appendChild(pMessage);

                     const searchButton = document.createElement('button');
                     searchButton.className = 'py-2 px-4 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-md shadow-sm flex items-center justify-center mx-auto';
                     const baseSearchTerm = cardItem.word || cardItem.phrasalVerb || cardItem.collocation || cardItem.idiom || ""; 
                     const youtubeSearchTerm = `học từ ${baseSearchTerm}`; 
                     searchButton.innerHTML = `<i class="fab fa-youtube mr-2"></i> Tìm trên YouTube với từ khóa "${baseSearchTerm}"`;
                     searchButton.onclick = () => {
                         window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(youtubeSearchTerm)}`, '_blank');
                     };
                     searchButtonContainer.appendChild(searchButton);
                     youtubeContentDiv.appendChild(searchButtonContainer);
                }
            }
            if (tabBtnYouTube) tabBtnYouTube.classList.add('active'); 
        }
    }


    function closeBottomSheet() {
        if (!bottomSheet || !bottomSheetOverlay) return;
        bottomSheet.classList.remove('active', 'bottom-sheet-video-mode', 'bottom-sheet-notes-mode', 'bottom-sheet-media-mode', 'bottom-sheet-lecture-mode');
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
        console.log(`Starting single card practice for: ${cardItem.word || cardItem.phrasalVerb || cardItem.collocation || cardItem.idiom}, Mode: ${practiceMode}`); 

        isSingleCardPracticeMode = true;
        originalCurrentData = [...window.currentData]; 
        originalCurrentIndex = window.currentIndex;

        window.currentData = [cardItem]; 
        window.currentIndex = 0;

        practiceType = practiceMode; 

        updateFlashcard(); 
        showToast(`Bắt đầu luyện tập thẻ: ${cardItem.word || cardItem.phrasalVerb || cardItem.collocation || cardItem.idiom}`, 3000); 
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

    
    function handleTouchStart(event) {
        if (flashcardElement.classList.contains('flipped') || practiceType !== "off" || window.currentData.length === 0) {
            return;
        }
        touchStartX = event.touches[0].clientX;
        touchStartY = event.touches[0].clientY;
        touchEndX = touchStartX; 
        touchEndY = touchStartY;
    }

    function handleTouchMove(event) {
        if (flashcardElement.classList.contains('flipped') || practiceType !== "off" || window.currentData.length === 0) {
            return;
        }
        touchEndX = event.touches[0].clientX;
        touchEndY = event.touches[0].clientY;
    }

    function handleTouchEnd(event) {
        if (flashcardElement.classList.contains('flipped') || practiceType !== "off" || window.currentData.length === 0) {
            return;
        }

        const horizontalDiff = touchEndX - touchStartX;
        const verticalDiff = touchEndY - touchStartY;

        
        if (Math.abs(horizontalDiff) > Math.abs(verticalDiff) && Math.abs(horizontalDiff) > swipeThreshold) {
            event.preventDefault(); 
            if (horizontalDiff > 0) { 
                if (prevBtn && !prevBtn.disabled) {
                    prevBtn.click();
                }
            } else { 
                if (nextBtn && !nextBtn.disabled) {
                    nextBtn.click();
                }
            }
        }
        
        touchStartX = 0;
        touchEndX = 0;
        touchStartY = 0;
        touchEndY = 0;
    }
    


    function setupEventListeners() {
        if(hamburgerMenuBtn) hamburgerMenuBtn.addEventListener('click', openSidebar);
        if(closeSidebarBtn) closeSidebarBtn.addEventListener('click', closeSidebar);
        if(sidebarOverlay) sidebarOverlay.addEventListener('click', closeSidebar);

        
        if (cardFrontElement) { 
            cardFrontElement.addEventListener('touchstart', handleTouchStart, { passive: true }); 
            cardFrontElement.addEventListener('touchmove', handleTouchMove, { passive: true });
            cardFrontElement.addEventListener('touchend', handleTouchEnd, false); 
        }

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
            if (currentCard) openBottomSheet(currentCard, 'lecture');
        });
        if(actionBtnMedia) actionBtnMedia.addEventListener('click', () => {
            const currentCard = window.currentData[window.currentIndex];
            if (currentCard) openBottomSheet(currentCard, 'media', 'youtube_custom');
        });
        if(actionBtnPracticeCard) actionBtnPracticeCard.addEventListener('click', () => {
            const currentCard = window.currentData[window.currentIndex];
            if (currentCard) openBottomSheet(currentCard, 'practice_options');
        });
        if(exitSingleCardPracticeBtn) exitSingleCardPracticeBtn.addEventListener('click', exitSingleCardPractice);

        if(tabBtnYouTube) tabBtnYouTube.addEventListener('click', () => {
            const currentCard = window.currentData[window.currentIndex];
            if(currentCard) setActiveMediaTab('youtube_custom', currentCard);
        });


        if(practiceTypeSelect) practiceTypeSelect.addEventListener('change', (e)=>{clearLearningTimer();practiceType=e.target.value;const cat=categorySelect.value;const st=getCategoryState(currentDatasetSource,cat);searchInput.value='';
            if(cat==='phrasalVerbs' || cat === 'collocations' || cat === 'idioms'){ 
                if (cat === 'phrasalVerbs' || cat === 'collocations') { 
                    st.baseVerb='all';if(baseVerbSelect)baseVerbSelect.value='all';
                }
                st.tag='all';if(tagSelect)tagSelect.value='all';
            } const userId = getCurrentUserId(); if(currentDatasetSource==='user' && userId){st.deckId='all_user_cards';if(userDeckSelect)userDeckSelect.value='all_user_cards';}st.filterMarked='all_study';if(filterCardStatusSelect)filterCardStatusSelect.value='all_study';st.currentIndex=0;applyAllFilters();closeSidebar();});
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


        if(flipBtn) flipBtn.addEventListener('click', ()=>{
            if(practiceType==="off" && window.currentData.length>0) {
                flashcardElement.classList.toggle('flipped');
            }
        });

        if (flipIconFront) {
            flipIconFront.addEventListener('click', (e) => {
                e.stopPropagation(); 
                if (practiceType === "off" && window.currentData.length > 0) {
                    flashcardElement.classList.toggle('flipped');
                }
            });
        }

        if (flipIconBack) {
            flipIconBack.addEventListener('click', (e) => {
                e.stopPropagation(); 
                if (practiceType === "off" && window.currentData.length > 0) {
                    flashcardElement.classList.toggle('flipped');
                }
            });
        }


        if(nextBtn) nextBtn.addEventListener('click', ()=>{
            window.speechSynthesis.cancel(); 
            if(nextBtn.disabled)return;clearLearningTimer();if(window.currentIndex<window.currentData.length-1){window.currentIndex++;getCategoryState(currentDatasetSource,categorySelect.value).currentIndex=window.currentIndex;saveAppState();window.updateFlashcard();}else if(practiceType!=="off"&&currentAnswerChecked&&window.currentIndex>=window.currentData.length-1)applyAllFilters();});
        if(prevBtn) prevBtn.addEventListener('click', ()=>{
            window.speechSynthesis.cancel(); 
            clearLearningTimer();if(window.currentIndex>0){window.currentIndex--;getCategoryState(currentDatasetSource,categorySelect.value).currentIndex=window.currentIndex;saveAppState();window.updateFlashcard();}});
        if(speakerBtn) speakerBtn.addEventListener('click', (e)=>{
            e.stopPropagation(); 
            window.speechSynthesis.cancel(); 
            const txt=wordDisplay.dataset.ttsText;
            if(txt&&!speakerBtn.disabled)speakText(txt,currentWordSpansMeta);});


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

        
        if (meaningDisplayContainer) {
            meaningDisplayContainer.addEventListener('change', function(event) {
                const targetSelect = event.target.closest('.example-speech-rate-select');
                if (targetSelect) {
                    currentExampleSpeechRate = parseFloat(targetSelect.value);
                    saveExampleSpeechRate();
                    updateAllExampleSpeechRateDropdownsUI();
                }
            });
        }
    }

    async function setupInitialCategoryAndSource() {
        
        await loadAppState();
        renderRecentlyViewedList(); 

        const urlParams = new URLSearchParams(window.location.search);
        const sourceFromUrl = urlParams.get('source');
        currentDatasetSource = sourceFromUrl || appState.lastSelectedSource || 'web';
        if(cardSourceSelect) cardSourceSelect.value = currentDatasetSource;
        if(categorySelect) categorySelect.value = appState.lastSelectedCategory || 'phrasalVerbs';

        await loadVocabularyData(categorySelect.value); 
    }

}); // END DOMContentLoaded
