document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('nameForm');
    const greeting = document.getElementById('greeting');
    
    form.addEventListener('submit', (event) => {
        event.preventDefault();
        const name = document.getElementById('name').value;
        greeting.textContent = `Hello, ${name}!`;
        form.reset();
    });
});
