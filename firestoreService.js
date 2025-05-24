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
        owner: userId // Lưu owner để có thể dùng cho rules sau này nếu cần
    };
    try {
        const decksCollectionRef = collection(dbInstance, 'users', userId, 'decks');
        const docRef = await addDoc(decksCollectionRef, newDeckData);
        console.log("FirestoreService: Deck created with ID:", docRef.id);
        return { id: docRef.id, ...newDeckData, createdAt: Date.now() }; // Trả về cả ID và dữ liệu (createdAt là client-side estimate)
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
    if (!userId || !dbInstance || !deckId) {
        console.error("FirestoreService: Missing data for loadUserCardsFromDeck");
        return [];
    }
    console.log(`FirestoreService: Loading cards for deck ID: ${deckId} for user ID: ${userId}`);
    const cardsCollectionRef = collection(dbInstance, 'users', userId, 'decks', deckId, 'cards');
    const qCards = query(cardsCollectionRef, orderBy('createdAt', 'asc')); 
    try {
        const querySnapshot = await getDocs(qCards);
        return querySnapshot.docs.map(docSnap => {
            const data = docSnap.data();
            return { 
                id: docSnap.id, 
                ...data, 
                isUserCard: true, 
                // Chuyển đổi Timestamp sang number (milliseconds) nếu có
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
    if (!userId || !dbInstance || !deckId || !cardData) {
        console.error("FirestoreService: Missing data for saveCardToFirestore");
        return null;
    }
    try {
        if (cardId) { // Update existing card
            cardData.updatedAt = serverTimestamp();
            const cardRef = doc(dbInstance, 'users', userId, 'decks', deckId, 'cards', cardId);
            await updateDoc(cardRef, cardData);
            console.log("FirestoreService: Card updated with ID:", cardId);
            return cardId;
        } else { // Add new card
            cardData.createdAt = serverTimestamp();
            const cardsCollectionRef = collection(dbInstance, 'users', userId, 'decks', deckId, 'cards');
            const docRef = await addDoc(cardsCollectionRef, cardData);
            console.log("FirestoreService: Card added with ID:", docRef.id);
            return docRef.id;
        }
    } catch (error) {
        console.error("FirestoreService: Error saving card:", error);
        alert("Đã xảy ra lỗi khi lưu thẻ. Vui lòng thử lại.");
        return null;
    }
}

export async function deleteCardFromFirestore(userId, deckId, cardId) {
    if (!userId || !dbInstance || !deckId || !cardId) {
        console.error("FirestoreService: Missing data for deleteCardFromFirestore");
        return false;
    }
    try {
        const cardRef = doc(dbInstance, 'users', userId, 'decks', deckId, 'cards', cardId);
        await deleteDoc(cardRef);
        console.log("FirestoreService: Card deleted:", cardId);
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
        // console.log("FirestoreService: Missing data for getWebCardStatusFromFirestore, returning default.");
        return null; // Trả về null nếu không có userId hoặc webCardGlobalId
    }
    const statusRef = doc(dbInstance, 'users', userId, 'webCardStatuses', webCardGlobalId);
    try {
        const docSnap = await getDoc(statusRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            return {
                ...data,
                lastReviewed: data.lastReviewed?.toDate ? data.lastReviewed.toDate().getTime() : (data.lastReviewed || null),
                nextReviewDate: data.nextReviewDate?.toDate ? data.nextReviewDate.toDate().getTime() : null,
            };
        }
        return null; // Không tìm thấy trạng thái
    } catch (error) {
        console.error("FirestoreService: Error fetching web card status for", webCardGlobalId, error);
        return null;
    }
}

export async function updateWebCardStatusInFirestore(userId, webCardGlobalId, cardData, srsDataToUpdate) {
    if (!userId || !dbInstance || !webCardGlobalId || !cardData || !srsDataToUpdate) {
        console.error("FirestoreService: Missing data for updateWebCardStatusInFirestore");
        return false;
    }
    const statusRef = doc(dbInstance, 'users', userId, 'webCardStatuses', webCardGlobalId);
    const dataToSet = {
        originalCategory: cardData.category,
        originalWordOrPhrase: cardData.category === 'phrasalVerbs' ? cardData.phrasalVerb : (cardData.category === 'collocations' ? cardData.collocation : cardData.word),
        ...srsDataToUpdate // status, lastReviewed, reviewCount, nextReviewDate, interval, easeFactor, repetitions
    };
    try {
        await setDoc(statusRef, dataToSet, { merge: true });
        console.log(`FirestoreService: Web card status SRS updated: ${webCardGlobalId}`, srsDataToUpdate);
        return true;
    } catch (error) {
        console.error("FirestoreService: Error updating web card status SRS:", error);
        alert("Lỗi cập nhật trạng thái thẻ web trên server. Vui lòng thử lại.");
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
        await setDoc(appStateRef, appStateData); // Ghi đè toàn bộ
        console.log("FirestoreService: AppState saved to Firestore for user:", userId);
        return true;
    } catch (error) {
        console.error("FirestoreService: Error saving appState to Firestore:", error);
        return false;
    }
}
