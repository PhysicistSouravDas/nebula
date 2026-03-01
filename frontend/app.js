// grabbing the dom elements
const starCore = document.getElementById('star-core');
const sessionList = document.getElementById('session-list');
const timeDisplay = document.getElementById('time-display');
const startBtn = document.getElementById('start-btn');
const abortBtn = document.getElementById('abort-btn');
const taskInput = document.getElementById('task-input');

// auth and ui elements
const loginSection = document.getElementById('login-section');
const appSection = document.getElementById('app-section');
const loginForm = document.getElementById('login-form');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const loginError = document.getElementById('login-error');
const logoutBtn = document.getElementById('logout-btn');

// api endpoints
// const API_URL = 'http://127.0.0.1:8000/api/focus/sessions/';
// const TOKEN_URL = 'http://127.0.0.1:8000/api/token/';
const API_URL = 'https://registration-birth-convenience-genre.trycloudflare.com/api/focus';
const TOKEN_URL = 'https://registration-birth-convenience-genre.trycloudflare.com/api/token/';

let timerInterval;
let timeLeft = 25 * 60;
let isRunning = false;

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
    showLogin();
}

// ui toggles
function showApp() {
    loginSection.style.display = 'none';
    appSection.style.display = 'block';
}

function showLogin() {
    loginSection.style.display = 'block';
    appSection.style.display = 'none';
}

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

// --- timer functions ---

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

    // optionally, make it hotter (whiter/bluer) as it grows
    if (progress > 0.8) {
        starCore.style.backgroundColor = '#66fcf1'; // blue giant phase
        starCore.style.boxShadow = '0 0 30px #66fcf1';
    } else if (progress > 0.4) {
        starCore.style.backgroundColor = '#ffd700'; // yellow sun phase
        starCore.style.boxShadow = '0 0 20px #ffd700';
    } else {
        starCore.style.backgroundColor = '#ff4c4c'; // red dwarf phase
        starCore.style.boxShadow = '0 0 10px #ff4c4c';
    }
}

function startTimer() {
    if (isRunning) return;
    isRunning = true;
    startBtn.disabled = true;
    abortBtn.disabled = false;

    // if there isn't a target time saved yet, set one for the future
    let targetTime = localStorage.getItem('targetTime');
    if (!targetTime) {
        targetTime = Date.now() + (timeLeft * 1000);
        localStorage.setItem('targetTime', targetTime);
    }

    timerInterval = setInterval(() => {
        // calculate time left based on the actual system clock
        const now = Date.now();
        timeLeft = Math.round((targetTime - now) / 1000);

        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            completeSession();
        } else {
            timeDisplay.textContent = formatTime(timeLeft);
            // total time is 25 * 60. update the visual!
            updateStarVisual(timeLeft, 25 * 60);
        }
    }, 1000);
}

function abortTimer() {
    clearInterval(timerInterval);
    isRunning = false;
    startBtn.disabled = false;
    abortBtn.disabled = true;
    timeDisplay.textContent = "25:00";
    taskInput.value = '';
    timeLeft = 25 * 60;

    // clear the saved time so it doesn't resume on refresh
    localStorage.removeItem('targetTime');

    // reset the visual star back to a tiny red dwarf
    updateStarVisual(25 * 60, 25 * 60);

    saveSession('aborted', 0);
}

function completeSession() {
    isRunning = false;
    startBtn.disabled = false;
    abortBtn.disabled = true;
    timeDisplay.textContent = "25:00";
    taskInput.value = '';
    timeLeft = 25 * 60;

    // clear the saved time
    localStorage.removeItem('targetTime');
    
    // reset the visual star back to a tiny red dwarf
    updateStarVisual(25 * 60, 25 * 60);

    saveSession('completed', 25);
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

