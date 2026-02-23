// DOM Elements
const sessionList = document.getElementById('session-list');

// API Configuration
// This points to your local Django server
const API_URL = 'http://127.0.0.1:8000/api/focus/sessions/'; 

// Fetch Past Sessions
async function fetchSessions() {
    try {
        // Make the GET request to Django
        const response = await fetch(API_URL);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Clear the "Loading universe..." text
        sessionList.innerHTML = ''; 

        // Loop through the data and create HTML for each session
        data.forEach(session => {
            const li = document.createElement('li');
            
            // Format the date nicely
            const date = new Date(session.start_time).toLocaleDateString();
            
            li.innerHTML = `
                <strong>${session.stellar_object}</strong> <br>
                <small>${date} • ${session.duration_minutes} minutes • ${session.task_tag || 'Uncategorized'}</small>
            `;
            
            sessionList.appendChild(li);
        });

        // If no sessions exist yet
        if (data.length === 0) {
            sessionList.innerHTML = '<li>The universe is empty. Start focusing!</li>';
        }

    } catch (error) {
        console.error("Could not fetch sessions:", error);
        sessionList.innerHTML = '<li>Error connecting to the deep space network (Backend might be down).</li>';
    }
}

// Initialize
// Run this function as soon as the page loads
fetchSessions();

// grabbing the timer elements
const timeDisplay = document.getElementById('time-display');
const startBtn = document.getElementById('start-btn');
const abortBtn = document.getElementById('abort-btn');

let timerInterval;
let timeLeft = 25 * 60; // 25 minutes in seconds for standard pomodoro
let isRunning = false;

// formats the seconds into mm:ss
function formatTime(seconds) {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
}

// starts the countdown
function startTimer() {
    if (isRunning) return;
    isRunning = true;
    startBtn.disabled = true;
    abortBtn.disabled = false;

    timerInterval = setInterval(() => {
        timeLeft--;
        timeDisplay.textContent = formatTime(timeLeft);

        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            completeSession();
        }
    }, 1000);
}

// handles manual aborts (core collapse)
function abortTimer() {
    clearInterval(timerInterval);
    isRunning = false;
    startBtn.disabled = false;
    abortBtn.disabled = true;
    
    // reset visual timer
    timeDisplay.textContent = "25:00";
    timeLeft = 25 * 60;
    
    // log the failed star to the database
    saveSession('aborted', 0); 
}

// handles successful completion
function completeSession() {
    isRunning = false;
    startBtn.disabled = false;
    abortBtn.disabled = true;
    
    // reset visual timer
    timeDisplay.textContent = "25:00";
    timeLeft = 25 * 60;

    // log the successful 25 min star
    saveSession('completed', 25);
}

// sending the new session to django
async function saveSession(status, duration) {
    const sessionData = {
        user: 1, // hardcoded to your admin id for now
        duration_minutes: duration,
        status: status,
        task_tag: 'Research' // default tag for the mvp
    };

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(sessionData)
        });

        if (response.ok) {
            // refresh the dashboard to show the new object!
            fetchSessions();
        } else {
            console.error("failed to save session");
        }
    } catch (error) {
        console.error("network error while saving:", error);
    }
}

// hooking up the buttons
startBtn.addEventListener('click', startTimer);
abortBtn.addEventListener('click', abortTimer);

