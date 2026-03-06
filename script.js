// This script adds interactive functionality to the landing page.

document.addEventListener('DOMContentLoaded', () => {

    // Select the buttons from the HTML file
    const getStartedButton = document.querySelector('.get-started-button');
    const moreInfoButton = document.querySelector('.more-info-button');

    // Add a click event listener to the "Get Started" button
    getStartedButton.addEventListener('click', () => {
        // You can add functionality here, for example, redirecting to a new page.
        console.log('Get Started button was clicked!');
        
        // A simple way to show a message to the user
        // Note: In a real application, you would use a modal or a custom UI element
        // instead of the browser's default alert.
        alert('Welcome! We are now redirecting you to the sign-up page.');
    });

    // Add a click event listener to the "More Info" button
    moreInfoButton.addEventListener('click', () => {
        // You can add more complex functionality here, like scrolling to a section
        // or showing more content.
        console.log('More Info button was clicked!');
        
        // A simple way to show a message
        alert('More information is coming soon!');
    });
});
