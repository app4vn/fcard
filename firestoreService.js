// Firebase Firestore imports
import {
  getFirestore, collection, addDoc, getDocs, doc, setDoc, updateDoc, deleteDoc, query, where, orderBy, serverTimestamp, getDoc, Timestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let dbInstance; // Sẽ được truyền vào từ script.js

export function initializeFirestoreService(firestoreInstance) {
    dbInstance = firestoreInstance;
}

// --- Deck Operations ---
export async function loadUserDecksFromFirestore(userId) {
    if (!userId || !dbInstance) {
        console.error("FirestoreService: Missing userId or dbInstance for loadUserDecks");
        return [];
    }
    console.log("FirestoreService: Loading decks for user ID:", userId);
    const decksCollectionRef = collection(dbInstance, 'users', userId, 'decks');
    const q = query(decksCollectionRef, orderBy('name', 'asc'));
    try {
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
    } catch (error) {
        console.error("FirestoreService: Error loading decks:", error);
        alert("Không thể tải danh sách bộ thẻ từ cơ sở dữ liệu. Vui lòng thử lại.");
        return [];
    }
}

export async function createDeckInFirestore(userId, deckName) {
    if (!userId || !dbInstance || !deckName || !deckName.trim()) {
        console.error("FirestoreService: Missing data for createDeck");
        return null;
    }
    const newDeckData = {
        name: deckName.trim(),
        createdAt: serverTimestamp(),
        owner: userId 
    };
    try {
        const decksCollectionRef = collection(dbInstance, 'users', userId, 'decks');
        const docRef = await addDoc(decksCollectionRef, newDeckData);
        console.log("FirestoreService: Deck created with ID:", docRef.id);
        return { id: docRef.id, ...newDeckData, createdAt: Date.now() }; 
    } catch (error) {
        console.error("FirestoreService: Error creating deck:", error);
        alert("Đã xảy ra lỗi khi tạo bộ thẻ. Vui lòng thử lại.");
        return null;
    }
}

export async function updateDeckNameInFirestore(userId, deckId, newName) {
    if (!userId || !dbInstance || !deckId || !newName || !newName.trim()) {
        console.error("FirestoreService: Missing data for updateDeckName");
        return false;
    }
    const deckRef = doc(dbInstance, 'users', userId, 'decks', deckId);
    try {
        await updateDoc(deckRef, { name: newName.trim() });
        console.log("FirestoreService: Deck name updated for ID:", deckId);
        return true;
    } catch (error) {
        console.error("FirestoreService: Error updating deck name:", error);
        alert("Đã xảy ra lỗi khi cập nhật tên bộ thẻ. Vui lòng thử lại.");
        return false;
    }
}

// --- Card Operations ---
export async function loadUserCardsFromFirestore(userId, deckId) {
    if (!userId || !dbInstance || (deckId !== null && !deckId)) { 
        console.error("FirestoreService: Missing data for loadUserCardsFromDeck (userId or dbInstance missing, or invalid deckId if not null)");
        return [];
    }

    let cardsCollectionRef;
    if (deckId === null) {
        // This case is for unassigned cards. If you decide to store them directly under a user's 'cards' collection:
        // cardsCollectionRef = collection(dbInstance, 'users', userId, 'cards');
        // For now, assuming unassigned cards are filtered client-side or not directly loaded this way.
        console.warn("FirestoreService: loadUserCardsFromFirestore called with deckId=null. This implies loading unassigned cards, which requires a specific query or client-side filtering based on cards without a deckId if all cards are in one global collection per user, or a dedicated 'unassigned' collection.");
        // If cards are always under a deck, and 'unassigned' is a virtual concept, this function might not be the right place to load them directly.
        // Let's assume for now that if deckId is null, we are trying to get cards that don't have a deckId field,
        // or this function is called specifically for a deck (not for 'all_user_cards' or 'unassigned_cards' which are handled in script.js by iterating).
        // For simplicity, if deckId is truly null (meaning a specific "unassigned" collection, which is not the current structure), return empty.
        // The current structure is users/{userId}/decks/{deckId}/cards
        // So, a null deckId here means an error or a different design path.
        // The main script.js handles 'all_user_cards' and 'unassigned_cards' by iterating or filtering.
        // This function is primarily for loading cards from a *specific* deck's subcollection.
        return []; 
    } else {
        console.log(`FirestoreService: Loading cards for deck ID: ${deckId} for user ID: ${userId}`);
        cardsCollectionRef = collection(dbInstance, 'users', userId, 'decks', deckId, 'cards');
    }

    const qCards = query(cardsCollectionRef, orderBy('createdAt', 'asc'));
    try {
        const querySnapshot = await getDocs(qCards);
        return querySnapshot.docs.map(docSnap => {
            const data = docSnap.data();
            return {
                id: docSnap.id,
                ...data,
                isUserCard: true,
                isFavorite: data.isFavorite || false, // Lấy trạng thái yêu thích, mặc định là false
                lastReviewed: data.lastReviewed?.toDate ? data.lastReviewed.toDate().getTime() : (data.lastReviewed || null),
                nextReviewDate: data.nextReviewDate?.toDate ? data.nextReviewDate.toDate().getTime() : null,
                createdAt: data.createdAt?.toDate ? data.createdAt.toDate().getTime() : (data.createdAt || null),
                updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().getTime() : (data.updatedAt || null)
            };
        });
    } catch (error) {
        console.error(`FirestoreService: Error loading cards for deck ${deckId}:`, error);
        alert("Không thể tải danh sách thẻ. Vui lòng thử lại.");
        return [];
    }
}

export async function saveCardToFirestore(userId, deckId, cardData, cardId = null) {
    if (!userId || !dbInstance || !cardData) {
        console.error("FirestoreService: Missing userId, dbInstance, or cardData for saveCardToFirestore");
        return null;
    }
    if (!deckId) {
        console.error("FirestoreService: deckId is required to save a user card.");
        // alert("Lỗi: Không thể lưu thẻ người dùng mà không có thông tin bộ thẻ."); // Consider if alert is needed here or handled by caller
        return null;
    }

    let collectionRefPath = collection(dbInstance, 'users', userId, 'decks', deckId, 'cards');
    
    // Đảm bảo isFavorite có giá trị boolean
    const dataToSave = { ...cardData };
    if (typeof dataToSave.isFavorite === 'undefined') {
        dataToSave.isFavorite = false; // Mặc định là false nếu không được cung cấp
    }


    try {
        if (cardId) { // Update existing card
            dataToSave.updatedAt = serverTimestamp();
            const cardRef = doc(collectionRefPath, cardId); 
            await updateDoc(cardRef, dataToSave); // Sử dụng dataToSave đã chuẩn hóa
            console.log("FirestoreService: Card updated with ID:", cardId, "in deck:", deckId);
            return cardId;
        } else { // Add new card
            dataToSave.createdAt = serverTimestamp();
            dataToSave.updatedAt = serverTimestamp(); // Cũng nên có updatedAt khi tạo mới
            const docRef = await addDoc(collectionRefPath, dataToSave); // Sử dụng dataToSave đã chuẩn hóa
            console.log("FirestoreService: Card added with ID:", docRef.id, "to deck:", deckId);
            return docRef.id;
        }
    } catch (error) {
        console.error("FirestoreService: Error saving card:", error, "Data attempted:", dataToSave);
        alert("Đã xảy ra lỗi khi lưu thẻ. Vui lòng thử lại.");
        return null;
    }
}

export async function deleteCardFromFirestore(userId, deckId, cardId) {
    if (!userId || !dbInstance || !deckId || !cardId) {
        console.error("FirestoreService: Missing data for deleteCardFromFirestore (userId, dbInstance, deckId, or cardId)");
        return false;
    }
    try {
        const cardRef = doc(dbInstance, 'users', userId, 'decks', deckId, 'cards', cardId);
        await deleteDoc(cardRef);
        console.log("FirestoreService: Card deleted:", cardId, "from deck:", deckId);
        return true;
    } catch (error) {
        console.error("FirestoreService: Error deleting card:", error);
        alert("Đã xảy ra lỗi khi xóa thẻ. Vui lòng thử lại.");
        return false;
    }
}

// --- Web Card Status Operations ---
export async function getWebCardStatusFromFirestore(userId, webCardGlobalId) {
    if (!userId || !dbInstance || !webCardGlobalId) {
        return null;
    }
    const statusRef = doc(dbInstance, 'users', userId, 'webCardStatuses', webCardGlobalId);
    try {
        const docSnap = await getDoc(statusRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            return {
                ...data,
                isFavorite: data.isFavorite || false, // Lấy trạng thái yêu thích, mặc định là false
                lastReviewed: data.lastReviewed?.toDate ? data.lastReviewed.toDate().getTime() : (data.lastReviewed || null),
                nextReviewDate: data.nextReviewDate?.toDate ? data.nextReviewDate.toDate().getTime() : null,
            };
        }
        return { isFavorite: false }; // Trả về trạng thái mặc định nếu document không tồn tại
    } catch (error) {
        console.error("FirestoreService: Error fetching web card status for", webCardGlobalId, error);
        return { isFavorite: false }; // Trả về trạng thái mặc định khi có lỗi
    }
}

export async function updateWebCardStatusInFirestore(userId, webCardGlobalId, cardData, srsDataToUpdate) {
    if (!userId || !dbInstance || !webCardGlobalId || !cardData || !srsDataToUpdate) {
        console.error("FirestoreService: Missing data for updateWebCardStatusInFirestore. Aborting.");
        return false;
    }
    const statusRef = doc(dbInstance, 'users', userId, 'webCardStatuses', webCardGlobalId);

    let originalTerm;
    if (cardData.category === 'phrasalVerbs') originalTerm = cardData.phrasalVerb;
    else if (cardData.category === 'collocations') originalTerm = cardData.collocation;
    else if (cardData.category === 'idioms') originalTerm = cardData.idiom;
    else originalTerm = cardData.word;

    if (originalTerm === undefined) {
        console.error("[FirestoreService] CRITICAL: originalTerm is undefined. cardData received:", cardData);
        return false;
    }

    const dataToSet = {
        originalCategory: cardData.category,
        originalWordOrPhrase: originalTerm,
        ...srsDataToUpdate // srsDataToUpdate có thể chứa isFavorite
    };
    
    // Đảm bảo isFavorite có giá trị boolean nếu được cung cấp
    if (typeof dataToSet.isFavorite === 'undefined' && srsDataToUpdate.hasOwnProperty('isFavorite')) {
        // Nếu isFavorite được truyền vào nhưng là undefined, đặt nó thành false
        // Hoặc nếu bạn muốn giữ nguyên giá trị cũ nếu isFavorite không được truyền, logic sẽ khác
    } else if (typeof dataToSet.isFavorite !== 'boolean' && dataToSet.hasOwnProperty('isFavorite')) {
        dataToSet.isFavorite = !!dataToSet.isFavorite; // Chuyển thành boolean
    }


    console.log("[FirestoreService] updateWebCardStatusInFirestore - Data to set in Firestore:", JSON.parse(JSON.stringify(dataToSet)));

    try {
        await setDoc(statusRef, dataToSet, { merge: true });
        console.log(`FirestoreService: Web card status updated for ${webCardGlobalId}:`, dataToSet);
        return true;
    } catch (error) {
        console.error("FirestoreService: Error updating web card status in setDoc:", error, "Data attempted:", dataToSet);
        return false;
    }
}


// --- AppState Operations ---
export async function loadAppStateFromFirestore(userId) {
    if (!userId || !dbInstance) {
        console.error("FirestoreService: Missing userId or dbInstance for loadAppStateFromFirestore");
        return null;
    }
    const appStateRef = doc(dbInstance, 'users', userId, 'userSettings', 'appStateDoc');
    try {
        const docSnap = await getDoc(appStateRef);
        if (docSnap.exists()) {
            console.log("FirestoreService: AppState loaded from Firestore.");
            return docSnap.data();
        }
        console.log("FirestoreService: No AppState in Firestore for this user.");
        return null;
    } catch (error) {
        console.error("FirestoreService: Error loading appState from Firestore:", error);
        return null;
    }
}

export async function saveAppStateToFirestoreService(userId, appStateData) {
    if (!userId || !dbInstance || !appStateData) {
        console.error("FirestoreService: Missing data for saveAppStateToFirestoreService");
        return false;
    }
    const appStateRef = doc(dbInstance, 'users', userId, 'userSettings', 'appStateDoc');
    try {
        await setDoc(appStateRef, appStateData); // Không cần merge ở đây vì ta lưu toàn bộ appState
        console.log("FirestoreService: AppState saved to Firestore for user:", userId);
        return true;
    } catch (error) {
        console.error("FirestoreService: Error saving appState to Firestore:", error);
        return false;
    }
}

// --- Lecture Content Operations ---
export async function getLectureContent(lectureId) {
    if (!dbInstance || !lectureId) {
        console.error("FirestoreService: Missing dbInstance or lectureId for getLectureContent");
        return null;
    }
    const lectureRef = doc(dbInstance, 'lectures', lectureId);
    try {
        const docSnap = await getDoc(lectureRef);
        if (docSnap.exists()) {
            console.log("FirestoreService: Lecture content loaded for ID:", lectureId);
            return docSnap.data();
        }
        console.log("FirestoreService: No lecture content found for ID:", lectureId);
        return null;
    } catch (error) {
        console.error("FirestoreService: Error loading lecture content:", error);
        return null;
    }
}

export async function saveLectureContent(lectureId, title, contentHTML) {
    if (!dbInstance || !lectureId || typeof title !== 'string' || typeof contentHTML !== 'string') {
        console.error("FirestoreService: Missing data or invalid type for saveLectureContent");
        return false;
    }
    const lectureRef = doc(dbInstance, 'lectures', lectureId);
    const dataToSave = {
        title: title,
        contentHTML: contentHTML,
        lastUpdatedAt: serverTimestamp()
    };
    try {
        await setDoc(lectureRef, dataToSave, { merge: true });
        console.log("FirestoreService: Lecture content saved for ID:", lectureId);
        return true;
    } catch (error) {
        console.error("FirestoreService: Error saving lecture content:", error);
        return false;
    }
}
