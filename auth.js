// Firebase imports (chỉ cần cho Authentication)
import { 
  onAuthStateChanged, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

let fbAuthInstance; // Sẽ được truyền vào từ script.js
let currentUserId = null;
let isUserAnonymous = true;
let onAuthStateChangeCallback = null; // Callback để thông báo cho script.js

// DOM Elements cho Auth Modal (sẽ được lấy khi DOM sẵn sàng, nhưng khai báo ở đây)
let authModal, authModalContent, authModalTitle, closeAuthModalBtn, 
    loginForm, registerForm, loginErrorMessage, registerErrorMessage, 
    toggleAuthModeBtn, authActionButton, userEmailDisplay;


// Hàm này sẽ được gọi từ script.js sau khi DOMContentLoaded
export function initializeAuthModule(authInstance, callback) {
    fbAuthInstance = authInstance;
    onAuthStateChangeCallback = callback;

    // Lấy các DOM elements sau khi DOM đã sẵn sàng
    authModal = document.getElementById('auth-modal');
    authModalContent = document.getElementById('auth-modal-content');
    authModalTitle = document.getElementById('auth-modal-title');
    closeAuthModalBtn = document.getElementById('close-auth-modal-btn');
    loginForm = document.getElementById('login-form');
    registerForm = document.getElementById('register-form');
    loginErrorMessage = document.getElementById('login-error-message');
    registerErrorMessage = document.getElementById('register-error-message');
    toggleAuthModeBtn = document.getElementById('toggle-auth-mode-btn');
    authActionButton = document.getElementById('auth-action-btn'); // Nút Đăng nhập/Đăng xuất chính
    userEmailDisplay = document.getElementById('user-email-display');


    // Setup event listeners cho modal xác thực
    if (closeAuthModalBtn) closeAuthModalBtn.addEventListener('click', closeAuthModalInternal);
    if (authModal) authModal.addEventListener('click', (e) => { 
        if (e.target === authModal) closeAuthModalInternal();
    });
    if (toggleAuthModeBtn) toggleAuthModeBtn.addEventListener('click', () => {
        if (loginForm.classList.contains('hidden')) { 
            openAuthModal('login');
        } else { 
            openAuthModal('register');
        }
    });

    if (loginForm) loginForm.addEventListener('submit', handleLoginSubmit);
    if (registerForm) registerForm.addEventListener('submit', handleRegisterSubmit);
    if (authActionButton) authActionButton.addEventListener('click', handleAuthAction);


    // Lắng nghe thay đổi trạng thái xác thực
    onAuthStateChanged(fbAuthInstance, (user) => {
        if (user) {
            currentUserId = user.uid;
            isUserAnonymous = user.isAnonymous;
            console.log("Auth Module: User signed in - UID:", currentUserId, "Anonymous:", isUserAnonymous);
        } else {
            currentUserId = null;
            isUserAnonymous = true;
            console.log("Auth Module: User signed out.");
        }
        // Gọi callback để script.js có thể cập nhật UI và tải dữ liệu
        if (onAuthStateChangeCallback) {
            onAuthStateChangeCallback(user); 
        }
    });
}

export function getCurrentUserId() {
    return currentUserId;
}

export function isUserLoggedIn() {
    return !!currentUserId;
}

export function openAuthModal(mode = 'login') {
    if (!authModal || !loginForm || !registerForm || !authModalTitle || !toggleAuthModeBtn || !loginErrorMessage || !registerErrorMessage) {
        console.error("Auth modal elements not initialized yet.");
        return;
    }
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
    if(authModalContent) authModalContent.classList.remove('scale-95');
    if(authModalContent) authModalContent.classList.add('scale-100');
    
    if (mode === 'login' && document.getElementById('login-email')) {
      document.getElementById('login-email').focus();
    } else if (document.getElementById('register-email')) {
      document.getElementById('register-email').focus();
    }
}

function closeAuthModalInternal() {
    if (!authModal || !authModalContent) return;
    authModal.classList.add('opacity-0');
    authModalContent.classList.add('scale-95');
    setTimeout(() => authModal.classList.add('hidden'), 250);
}

function handleLoginSubmit(e) {
    e.preventDefault();
    const email = loginForm.email.value;
    const password = loginForm.password.value;
    loginErrorMessage.classList.add('hidden'); 
    signInWithEmailAndPassword(fbAuthInstance, email, password)
        .then((userCredential) => {
            console.log("Auth Module: Login successful", userCredential.user);
            closeAuthModalInternal();
        })
        .catch((error) => {
            console.error("Auth Module: Login error", error.code, error.message);
            loginErrorMessage.textContent = mapAuthErrorCodeToMessage(error.code);
            loginErrorMessage.classList.remove('hidden');
        });
}

function handleRegisterSubmit(e) {
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

    createUserWithEmailAndPassword(fbAuthInstance, email, password)
        .then((userCredential) => {
            console.log("Auth Module: Registration successful", userCredential.user);
            closeAuthModalInternal();
            // Thường thì onAuthStateChanged sẽ tự động xử lý việc cập nhật UI
        })
        .catch((error) => {
            console.error("Auth Module: Registration error", error.code, error.message);
            registerErrorMessage.textContent = mapAuthErrorCodeToMessage(error.code);
            registerErrorMessage.classList.remove('hidden');
        });
}

export function handleAuthAction() {
    if (currentUserId) { 
        signOut(fbAuthInstance).catch(error => {
            console.error("Auth Module: Sign out error:", error);
        });
    } else {
        openAuthModal('login');
    }
}

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
