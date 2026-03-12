// Slider Elements
const timeSlider = document.getElementById('time-slider');
const sliderLabel = document.getElementById('slider-label');

// This variable will hold the time you actually pass to your countdown function
let selectedFocusMinutes = 25;

// Function to calculate the color based on the slider value
function updateStellarColor(minutes) {
    let hue;
    // Map 15-67 mins from Blue (200) to Yellow (60)
    if (minutes <= 67) {
        const t = (minutes - 15) / (67 - 15);
        hue = 200 - (t * 140);
    }
    // Map 68-120 mins from Yellow (60) to Deep Violet/Red (340)
    else {
        const t = (minutes - 67) / (120 - 67);
        hue = 60 - (t * 80);
        if (hue < 0) hue += 360;
    }

    // Construct the HSL color and push it to the CSS variable
    const glowColor = `hsl(${hue}, 100%, 65%)`;
    document.documentElement.style.setProperty('--slider-color', glowColor);
}

// Set the initial color on page load
updateStellarColor(timeSlider.value);

// grabbing the dom elements
const starCore = document.getElementById('star-core');
const starCorona = document.getElementById('star-corona');
const sessionList = document.getElementById('session-list');
const timeDisplay = document.getElementById('time-display');
const startBtn = document.getElementById('start-btn');
const abortBtn = document.getElementById('abort-btn');
const taskInput = document.getElementById('task-input');

// auth and ui elements
const signupSection = document.getElementById('signup-section');
const signupForm = document.getElementById('signup-form');
const signupUsername = document.getElementById('signup-username');
const signupEmail = document.getElementById('signup-email');
const signupPassword = document.getElementById('signup-password');
const signupMsg = document.getElementById('signup-msg');
const showSignupBtn = document.getElementById('show-signup');
const showLoginBtn = document.getElementById('show-login');
const loginSection = document.getElementById('login-section');
const appSection = document.getElementById('app-section');
const loginForm = document.getElementById('login-form');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const loginError = document.getElementById('login-error');
const logoutBtn = document.getElementById('logout-btn');
const topBar = document.getElementById('top-bar');
const topBarUsername = document.getElementById('top-bar-username');

// api endpoints
// const API_URL = 'http://127.0.0.1:8000/api/focus/sessions/';
// const TOKEN_URL = 'http://127.0.0.1:8000/api/token/';
const API_URL = 'https://bool-handheld-coverage-references.trycloudflare.com/api/focus/sessions/';
const TOKEN_URL = 'https://bool-handheld-coverage-references.trycloudflare.com/api/token/';
const REGISTER_URL = 'https://bool-handheld-coverage-references.trycloudflare.com/api/auth/users/';

let timerInterval;
let timeLeft = 25 * 60;
let isRunning = false;

// Listen for the drag event
timeSlider.addEventListener('input', (e) => {
    selectedFocusMinutes = parseInt(e.target.value);
    sliderLabel.textContent = `Orbit Duration: ${selectedFocusMinutes} minutes`;
    updateStellarColor(selectedFocusMinutes);

    // FIX: Actually update the main clock and engine if the timer isn't running
    if (!isRunning) {
        timeLeft = selectedFocusMinutes * 60;
        // Pad with zeros so 9 minutes shows as "09:00"
        timeDisplay.textContent = `${selectedFocusMinutes.toString().padStart(2, '0')}:00`;
    }
});

// --- authentication functions ---

// checks if we already have a token when the page loads
function checkAuth() {
    const token = localStorage.getItem('accessToken');
    if (token) {
        showApp();
        fetchSessions();
        checkActiveTimer(); // added this line
    } else {
        showLogin();
    }
}

// handles the login form submission
async function login(e) {
    e.preventDefault(); // prevents the page from reloading
    loginError.style.display = 'none';

    const credentials = {
        username: usernameInput.value,
        password: passwordInput.value
    };

    try {
        const response = await fetch(TOKEN_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(credentials)
        });

        if (response.ok) {
            const data = await response.json();
            // save the tokens to the browser
            localStorage.setItem('accessToken', data.access);
            localStorage.setItem('refreshToken', data.refresh);
            localStorage.setItem('username', usernameInput.value);

            // clear inputs and enter the app
            usernameInput.value = '';
            passwordInput.value = '';
            showApp();
            fetchSessions();
            checkActiveTimer();
        } else {
            loginError.style.display = 'block';
        }
    } catch (error) {
        console.error("login error:", error);
        loginError.textContent = "Cannot connect to the server.";
        loginError.style.display = 'block';
    }
}

// logs the user out
function logout() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('username');
    showLogin();
}

// ui toggles
function showApp() {
    loginSection.style.display = 'none';
    appSection.style.display = 'block';
    topBar.style.display = 'flex';
    topBarUsername.textContent = localStorage.getItem('username') || 'Observer';
}

function showLogin() {
    loginSection.style.display = 'block';
    appSection.style.display = 'none';
    topBar.style.display = 'none';
}

showSignupBtn.addEventListener('click', (e) => {
    e.preventDefault();
    loginSection.style.display = 'none';
    signupSection.style.display = 'block';
});

showLoginBtn.addEventListener('click', (e) => {
    e.preventDefault();
    signupSection.style.display = 'none';
    loginSection.style.display = 'block';
});

async function registerUser(e) {
    e.preventDefault();
    signupMsg.style.display = 'none';
    signupMsg.className = ''; // reset classes

    const userData = {
        username: signupUsername.value,
        email: signupEmail.value,
        password: signupPassword.value
    };

    try {
        const response = await fetch(REGISTER_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData)
        });

        const data = await response.json();

        if (response.ok) {
            signupMsg.textContent = "Success! A verification link has been sent to your email.";
            signupMsg.style.color = "var(--accent-blue)";
            signupMsg.style.display = 'block';
            signupForm.reset();
        } else {
            // Djoser sends back specific errors (e.g. "username already exists")
            let errorText = "Registration failed: ";
            for (const key in data) {
                errorText += `${data[key]} `;
            }
            signupMsg.textContent = errorText;
            signupMsg.style.color = "var(--danger)";
            signupMsg.style.display = 'block';
        }
    } catch (error) {
        console.error("Signup error:", error);
        signupMsg.textContent = "Network error. Is the server running?";
        signupMsg.style.color = "var(--danger)";
        signupMsg.style.display = 'block';
    }
}

// Hook it up to the form submission
signupForm.addEventListener('submit', registerUser);

// --- api functions (now with auth headers) ---

// gets the token for our requests
function getAuthHeaders() {
    const token = localStorage.getItem('accessToken');
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
}

async function fetchSessions() {
    try {
        const response = await fetch(API_URL, {
            headers: getAuthHeaders()
        });

        if (response.status === 401) {
            // token expired or invalid
            logout();
            return;
        }

        const data = await response.json();
        sessionList.innerHTML = '';

        data.forEach(session => {
            const li = document.createElement('li');
            const date = new Date(session.start_time).toLocaleDateString();
            li.innerHTML = `
                <strong>${session.stellar_object}</strong> <br>
                <small>${date} • ${session.duration_minutes} minutes • ${session.task_tag || 'Uncategorized'}</small>
            `;
            sessionList.appendChild(li);
        });

        if (data.length === 0) {
            sessionList.innerHTML = '<li>Your universe is empty. Start focusing!</li>';
        }
    } catch (error) {
        console.error("fetch error:", error);
    }
}

async function saveSession(status, duration) {
    const sessionData = {
        duration_minutes: duration,
        status: status,
        task_tag: taskInput.value.trim() || 'Deep Work'
    };

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(sessionData)
        });

        if (response.ok) {
            fetchSessions();
        } else if (response.status === 401) {
            logout();
        }
    } catch (error) {
        console.error("save error:", error);
    }
}

// timer functions

function formatTime(seconds) {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
}

function updateStarVisual(timeLeft, totalTime) {
    // calculate how far along we are (from 0.0 to 1.0)
    const progress = 1 - (timeLeft / totalTime);

    // scale the star from 1x to roughly 10x its original size
    const scale = 1 + (progress * 9);

    starCore.style.transform = `scale(${scale})`;

    // Corona ring grows and brightens with progress
    const coronaSize = 20 + (progress * 100);
    const coronaOpacity = progress * 0.7;
    starCorona.style.width = `${coronaSize}px`;
    starCorona.style.height = `${coronaSize}px`;
    starCorona.style.opacity = coronaOpacity;


    // make it hotter (whiter/bluer) as it grows
    if (progress > 0.8) {
        starCore.style.backgroundColor = '#66fcf1'; // blue giant phase
        starCore.style.boxShadow = '0 0 30px #66fcf1';
        starCorona.style.borderColor = '#66fcf1';
        starCorona.style.boxShadow = '0 0 18px #66fcf1, inset 0 0 12px rgba(102,252,241,0.2)';
    } else if (progress > 0.4) {
        starCore.style.backgroundColor = '#ffd700'; // yellow sun phase
        starCore.style.boxShadow = '0 0 20px #ffd700';
        starCorona.style.borderColor = '#ffd700';
        starCorona.style.boxShadow = '0 0 14px #ffd700, inset 0 0 8px rgba(255,215,0,0.2)';
    } else {
        starCore.style.backgroundColor = '#ff4c4c'; // red dwarf phase
        starCore.style.boxShadow = '0 0 10px #ff4c4c';
        starCorona.style.borderColor = '#ff4c4c';
        starCorona.style.boxShadow = '0 0 10px #ff4c4c, inset 0 0 6px rgba(255,76,76,0.2)';
    }
}

function startTimer() {
    if (isRunning) return;
    isRunning = true;
    starCore.classList.remove('star-idle');
    startBtn.disabled = true;
    abortBtn.disabled = false;
    timeSlider.disabled = true;

    let targetTime = localStorage.getItem('targetTime');
    if (!targetTime) {
        targetTime = Date.now() + (timeLeft * 1000);
        localStorage.setItem('targetTime', targetTime);
    }

    timerInterval = setInterval(() => {
        const now = Date.now();
        timeLeft = Math.round((targetTime - now) / 1000);

        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            completeSession();
        } else {
            timeDisplay.textContent = formatTime(timeLeft);
            // Use the dynamic time for the visual star calculation
            updateStarVisual(timeLeft, selectedFocusMinutes * 60);
        }
    }, 1000);
}

function abortTimer() {
    clearInterval(timerInterval);
    isRunning = false;
    starCore.classList.add('star-idle');
    starCorona.style.opacity = '0';
    starCorona.style.width = '20px';
    starCorona.style.height = '20px';
    startBtn.disabled = false;
    abortBtn.disabled = true;
    timeSlider.disabled = false;

    // Reset variables to the dynamic slider time
    timeLeft = selectedFocusMinutes * 60;
    timeDisplay.textContent = `${selectedFocusMinutes.toString().padStart(2, '0')}:00`;
    taskInput.value = '';

    localStorage.removeItem('targetTime');

    // Reset visual star to dynamic time
    updateStarVisual(selectedFocusMinutes * 60, selectedFocusMinutes * 60);

    saveSession('aborted', 0);
}

function completeSession() {
    isRunning = false;
    starCore.classList.add('star-idle');
    starCorona.style.opacity = '0';
    starCorona.style.width = '20px';
    starCorona.style.height = '20px';
    startBtn.disabled = false;
    abortBtn.disabled = true;
    timeSlider.disabled = false;

    // Reset variables to the dynamic slider time
    timeLeft = selectedFocusMinutes * 60;
    timeDisplay.textContent = `${selectedFocusMinutes.toString().padStart(2, '0')}:00`;
    taskInput.value = '';

    localStorage.removeItem('targetTime');

    // Reset visual star to dynamic time
    updateStarVisual(selectedFocusMinutes * 60, selectedFocusMinutes * 60);

    // Save the actual dynamic time to your database!
    saveSession('completed', selectedFocusMinutes);
}

function checkActiveTimer() {
    const targetTime = localStorage.getItem('targetTime');

    if (targetTime) {
        const now = Date.now();
        timeLeft = Math.round((targetTime - now) / 1000);

        if (timeLeft > 0) {
            // the session is still active, start the visual countdown again
            startTimer();
        } else {
            // the session finished while the user had the tab closed!
            completeSession();
        }
    }
}
// --- event listeners and initialization ---

loginForm.addEventListener('submit', login);
logoutBtn.addEventListener('click', logout);
startBtn.addEventListener('click', startTimer);
abortBtn.addEventListener('click', abortTimer);

// start the app by checking auth
checkAuth();

