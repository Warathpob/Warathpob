document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const loginError = document.getElementById('loginError');
    const welcomeDiv = document.getElementById('welcome');
    const loginDiv = document.getElementById('login');
    const userNameSpan = document.getElementById('userName');
    const logoutButton = document.getElementById('logoutButton');

    // Check if user is already logged in
    if (localStorage.getItem('username')) {
        showWelcomePage(localStorage.getItem('username'));
    } else {
        loginDiv.classList.remove('hidden');
        welcomeDiv.classList.add('hidden');
    }

    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const username = document.getElementById('username').value;

        if (username) {
            localStorage.setItem('username', username);
            showWelcomePage(username);
        } else {
            loginError.classList.remove('hidden');
        }
    });

    logoutButton.addEventListener('click', () => {
        localStorage.removeItem('username');
        loginDiv.classList.remove('hidden');
        welcomeDiv.classList.add('hidden');
    });

    function showWelcomePage(username) {
        loginDiv.classList.add('hidden');
        welcomeDiv.classList.remove('hidden');
        userNameSpan.textContent = username;
    }
});
