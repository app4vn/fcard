import { Timestamp, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js"; 

let fsService; 
let authGetCurrentUserId;
let utilGetWebCardGlobalId;
let uiUpdateStatusButtons;
let uiUpdateFlashcard;
let uiNextBtn;
let dataGetCurrentCard; 
let dataGetCurrentDataArray; 
let dataGetCurrentIndex; 
let uiShowToast; // Dependency mới cho hàm hiển thị toast

export function initializeSrsModule(dependencies) {
    fsService = dependencies.firestoreServiceModule;
    authGetCurrentUserId = dependencies.authGetCurrentUserIdFunc;
    utilGetWebCardGlobalId = dependencies.utilGetWebCardGlobalIdFunc;
    uiUpdateStatusButtons = dependencies.uiUpdateStatusButtonsFunc;
    uiUpdateFlashcard = dependencies.uiUpdateFlashcardFunc;
    uiNextBtn = dependencies.uiNextBtnElement;
    dataGetCurrentCard = dependencies.dataGetCurrentCardFunc;
    dataGetCurrentDataArray = dependencies.dataGetWindowCurrentDataFunc;
    dataGetCurrentIndex = dependencies.dataGetCurrentIndexFunc;
    uiShowToast = dependencies.uiShowToastFunc; // Gán hàm hiển thị toast
}

function calculateSrsParameters(card, ratingQuality) {
    let interval = Number(card.interval) || 0;
    let easeFactor = Number(card.easeFactor) || 2.5;
    let repetitions = Number(card.repetitions) || 0;

    if (ratingQuality < 2) { 
        repetitions = 0;
        interval = 1; 
        if (ratingQuality === 1) { // Hard
            easeFactor = Math.max(1.3, easeFactor - 0.15);
        }
    } else { 
        repetitions++;
        if (repetitions === 1) {
            interval = 1;
        } else if (repetitions === 2) {
            interval = 6;
        } else {
            interval = Math.ceil((interval > 0 ? interval : 1) * easeFactor);
        }
        
        let q_sm2;
        if (ratingQuality === 0) q_sm2 = 0; 
        else if (ratingQuality === 1) q_sm2 = 2; 
        else if (ratingQuality === 2) q_sm2 = 4; 
        else q_sm2 = 5; 

        if (q_sm2 >= 3) { 
             easeFactor = easeFactor + (0.1 - (5 - q_sm2) * (0.08 + (5 - q_sm2) * 0.02));
             if (easeFactor < 1.3) easeFactor = 1.3;
        }
    }
    
    const MAX_INTERVAL_DAYS = 365 * 2; 
    interval = Math.min(interval, MAX_INTERVAL_DAYS);
    interval = Math.max(1, interval); 

    const now = new Date();
    const nextReviewDateObj = new Date(now.getTime()); 
    nextReviewDateObj.setDate(now.getDate() + interval);
    
    return {
        newInterval: interval,
        newEaseFactor: parseFloat(easeFactor.toFixed(2)),
        newRepetitions: repetitions,
        nextReviewDate: Timestamp.fromDate(nextReviewDateObj) 
    };
}

async function updateCardSrsDataInternal(cardItem, ratingQuality) {
    if (!cardItem) return;
    const currentUserId = authGetCurrentUserId();
    if (!currentUserId && !cardItem.isUserCard) { 
        console.log("SRS Module: User not logged in, cannot update SRS for web card.");
        if (uiShowToast) uiShowToast("Vui lòng đăng nhập để lưu tiến độ học thẻ web.", 3000, 'error');
        return;
    }

    const srsParams = calculateSrsParameters(cardItem, ratingQuality);
    
    let newStatus = 'learning'; 
    if (srsParams.newInterval >= 21) { 
        newStatus = 'learned';
    }
    if (ratingQuality < 2) { 
         newStatus = 'learning'; 
    }

    const srsDataToUpdate = {
        status: newStatus, 
        lastReviewed: serverTimestamp(),
        reviewCount: (cardItem.reviewCount || 0) + 1,
        nextReviewDate: srsParams.nextReviewDate, 
        interval: srsParams.newInterval,
        easeFactor: srsParams.newEaseFactor,
        repetitions: srsParams.newRepetitions,
        isSuspended: cardItem.isSuspended || false // Giữ nguyên trạng thái isSuspended nếu có
    };

    let success = false;
    try {
        if (cardItem.isUserCard) {
            if (!currentUserId || !cardItem.deckId || !cardItem.id) {
                console.error("SRS Module: Missing info to update user card SRS.");
                if (uiShowToast) uiShowToast("Lỗi: Không tìm thấy thông tin thẻ để cập nhật SRS.", 3000, 'error');
                return;
            }
            success = await fsService.saveCardToFirestore(currentUserId, cardItem.deckId, srsDataToUpdate, cardItem.id);
             if (success) console.log(`SRS Module: User card SRS updated: ${cardItem.id}`, srsDataToUpdate);

        } else if (currentUserId) { 
            const webCardGlobalId = utilGetWebCardGlobalId(cardItem);
            if (!webCardGlobalId) {
                console.error("SRS Module: Cannot create ID for web card to update SRS.");
                if (uiShowToast) uiShowToast("Lỗi: Không thể xác định thẻ web để cập nhật SRS.", 3000, 'error');
                return;
            }
            success = await fsService.updateWebCardStatusInFirestore(currentUserId, webCardGlobalId, cardItem, srsDataToUpdate);
            if (success) console.log(`SRS Module: Web card status SRS updated: ${webCardGlobalId}`, srsDataToUpdate);
        }

        if (success) {
            cardItem.status = srsDataToUpdate.status;
            cardItem.lastReviewed = Date.now(); 
            cardItem.reviewCount = srsDataToUpdate.reviewCount;
            const nextReviewDateClient = srsDataToUpdate.nextReviewDate.toDate();
            cardItem.nextReviewDate = nextReviewDateClient.getTime(); 
            cardItem.interval = srsDataToUpdate.interval;
            cardItem.easeFactor = srsDataToUpdate.easeFactor;
            cardItem.repetitions = srsDataToUpdate.repetitions;

            // *** THÊM MỚI: Hiển thị Toast Notification ***
            if (uiShowToast) {
                let toastMessage = "";
                if (srsParams.newInterval === 1) {
                    toastMessage = "Sẽ ôn lại vào ngày mai.";
                } else if (srsParams.newInterval > 1) {
                    toastMessage = `Sẽ ôn lại sau ${srsParams.newInterval} ngày.`;
                } else { // Trường hợp interval là 0 hoặc không xác định (dù đã cố gắng đặt là 1)
                    toastMessage = `Ôn lại vào: ${nextReviewDateClient.toLocaleDateString('vi-VN')}`;
                }
                uiShowToast(toastMessage, 3000);
            }
            // *** KẾT THÚC THÊM MỚI ***

        } else {
            console.error("SRS Module: Failed to update SRS data in Firestore for card:", cardItem.id || utilGetWebCardGlobalId(cardItem));
            if (uiShowToast) uiShowToast("Lỗi cập nhật dữ liệu ôn tập.", 3000, 'error');
        }

    } catch (error) {
        console.error("SRS Module: Error updating SRS data to Firestore:", error);
        if (uiShowToast) uiShowToast("Lỗi cập nhật dữ liệu ôn tập. Vui lòng thử lại.", 3000, 'error');
    }
    if(uiUpdateStatusButtons) uiUpdateStatusButtons(); 
}

export async function processSrsRatingWrapper(ratingString) {
    const currentDataArray = dataGetCurrentDataArray();
    const currentIndex = dataGetCurrentIndex();

    if (!currentDataArray || currentDataArray.length === 0) return;
    const cardItem = currentDataArray[currentIndex];
    if (!cardItem) return;

    console.log(`SRS Module: Rating selected: ${ratingString} for card:`, cardItem.word || cardItem.phrasalVerb || cardItem.collocation);

    let ratingQuality;
    switch (ratingString) {
        case 'again': ratingQuality = 0; break;
        case 'hard': ratingQuality = 1; break; 
        case 'good': ratingQuality = 2; break; 
        case 'easy': ratingQuality = 3; break; 
        default: 
            console.error("SRS Module: Invalid SRS rating:", ratingString);
            return;
    }
    
    await updateCardSrsDataInternal(cardItem, ratingQuality);

    // Chuyển thẻ sau một khoảng delay nhỏ để người dùng kịp đọc toast
    setTimeout(() => {
        if (currentIndex < currentDataArray.length - 1) {
            if(uiNextBtn && typeof uiNextBtn.click === 'function') uiNextBtn.click(); 
        } else {
            console.log("SRS Module: All cards in the current list have been reviewed.");
            if(uiUpdateFlashcard) uiUpdateFlashcard(); 
        }
    }, 500); // Delay 0.5 giây trước khi chuyển thẻ
}
