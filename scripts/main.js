// This file contains JavaScript code for the homepage. 
// It may include functionality for interactive elements, such as event listeners or dynamic content updates.

document.addEventListener('DOMContentLoaded', () => {
    const toggleButton = document.getElementById('toggle-menu');
    const menu = document.getElementById('menu');

    if (toggleButton) {
        toggleButton.addEventListener('click', () => {
            menu.classList.toggle('active');
        });
    }

    const posts = document.querySelectorAll('.post');
    posts.forEach(post => {
        post.addEventListener('click', () => {
            alert(`You clicked on ${post.querySelector('h2').innerText}`);
        });
    });

    // Smooth scrolling for navigation links
    document.querySelectorAll('nav a').forEach(anchor => {
        // Only prevent default if it's an in-page anchor (#)
        if (anchor.getAttribute('href').startsWith('#')) {
            anchor.addEventListener('click', function(e) {
                e.preventDefault();
                const section = document.querySelector(this.getAttribute('href'));
                if (section) {
                    section.scrollIntoView({ behavior: 'smooth' });
                }
            });
        }
    });
});