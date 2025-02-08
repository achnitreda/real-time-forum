import { styleManager } from "../../api/style-manager.js";

export async function loadPostingPage(container) {
    try {
        // 1. Load HTML & CSS
        const htmlResponse = await fetch('/client/pages/posting/posting.html');
        const html = await htmlResponse.text();

        // Load styles using style manager
        await styleManager.loadStyles(
            'posting',
            '/client/pages/posting/posting.css'
        );

        container.innerHTML = html;

        // 2. Initialize form
        await initializePostingForm();

    } catch (error) {
        console.error('Error loading posting page:', error);
        container.innerHTML = `<div class="error">Error: ${error.message}</div>`;
    }
}

async function initializePostingForm() {
    try {
        // Get categories
        const response = await fetch('/api/posting');
        const data = await response.json();
        console.log('Categories response:', data);

        // Populate categories
        const categoriesContainer = document.getElementById('categoriesContainer');
        data.categories.forEach(category => {
            const label = document.createElement('label');
            label.innerHTML = `
                <input type="checkbox" name="categories" value="${category}" />
                ${category}
            `;
            categoriesContainer.appendChild(label);
        });

        // Initialize form handlers
        const postingForm = document.getElementById('postingForm');
        const errorContainer = document.getElementById('errorContainer');
        const fileInput = document.getElementById('file');

        // Add file preview
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                const preview = document.createElement('img');
                preview.id = 'imagePreview';
                preview.className = 'image-preview';

                reader.onload = (e) => {
                    preview.src = e.target.result;
                    const existingPreview = document.getElementById('imagePreview');
                    if (existingPreview) {
                        existingPreview.remove();
                    }
                    fileInput.parentNode.insertBefore(preview, fileInput.nextSibling);
                };

                reader.readAsDataURL(file);
            }
        });

        // Handle form submission
        postingForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            errorContainer.textContent = '';

            try {
                const formData = new FormData(postingForm);

                // Check if at least one category is selected
                if (!formData.getAll('categories').length) {
                    throw new Error('Please select at least one category');
                }

                const response = await fetch('/api/posting', {
                    method: 'POST',
                    body: formData
                });

                const result = await response.json();

                if (!response.ok) {
                    throw new Error(result.error || 'Failed to create post');
                }

                // Redirect to home page on success
                const nagivationEvent = new CustomEvent('navigate', {
                    detail: { path: '/' }
                })
                window.dispatchEvent(nagivationEvent)

            } catch (error) {
                errorContainer.textContent = error.message;
                errorContainer.style.color = 'red';
            }
        });

    } catch (error) {
        console.error('Error initializing posting form:', error);
        const errorContainer = document.getElementById('errorContainer');
        errorContainer.textContent = 'Failed to load categories';
        errorContainer.style.color = 'red';
    }
}