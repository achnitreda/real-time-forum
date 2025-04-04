import { sanitizeInput } from "../services/utils.js";

let postingCleanupFunctions = [];

export async function loadPostingPage(container) {
    try {
        container.innerHTML = `
            <div class="form-container-post">
                <form class="myform-post" id="postingForm">
                    <h1>Create a New Post</h1>
                    <div id="errorContainer"></div>

                    <input
                        class="input-post"
                        type="text"
                        name="title"
                        placeholder="Title"
                        required
                    />

                    <div class="categorie" id="categoriesContainer">
                    </div>

                    <textarea
                        name="content"
                        placeholder="Write your content here..."
                        required
                    ></textarea>

                    <input type="file" id="file" name="file" accept="image/*" />

                    <button class="input btn" type="submit">Post</button>
                </form>
            </div>
        `;

        await initializePostingForm();
    } catch (error) {
        console.error('Error loading posting page:', error);
        container.innerHTML = `<div class="error">Error: ${error.message}</div>`;
    } finally {
        return () => cleanupPostingListeners();
    }
}

function cleanupPostingListeners() {
    postingCleanupFunctions.forEach(cleanup => cleanup());
    postingCleanupFunctions = [];
}


async function initializePostingForm() {
    try {
        // Get categories
        const response = await fetch('/api/posting');
        const data = await response.json();

        // Populate categories
        const categoriesContainer = document.getElementById('categoriesContainer');
        if (!data.categories || !data.categories.length) {
            throw new Error('No categories available');
        }
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

        // Add file preview handler
        const fileChangeHandler = (e) => {
            // Get the first file from the selected files 
            // because we can select a lot of files
            const file = e.target.files[0];
            if (file) {

                const maxSize = 5 * 1024 * 1024; // 5MB
                if (file.size > maxSize) {
                    errorContainer.textContent = 'File size must be less than 5MB';
                    errorContainer.style.color = 'red';
                    fileInput.value = '';
                    return;
                }

                const reader = new FileReader();
                const preview = document.createElement('img');
                preview.id = 'imagePreview';
                preview.className = 'image-preview';

                // When file is loaded into memory
                reader.onload = (e) => {
                    // e.target.result contains the base64 data URL
                    preview.src = e.target.result;

                    const oldPreview = document.getElementById('imagePreview');
                    if (oldPreview) oldPreview.remove();
                    fileInput.parentNode.insertBefore(preview, fileInput.nextSibling);
                };
                // Converts file to base64 data URL
                reader.readAsDataURL(file);
            }
        }

        fileInput.addEventListener('change', fileChangeHandler);

        // Handle form submission
        const formSubmitHandler = async (e) => {
            e.preventDefault();
            errorContainer.textContent = '';

            try {
                const formData = new FormData(postingForm);
                const sanitizedFormData = new FormData()

                sanitizedFormData.append('title', sanitizeInput(formData.get('title')));
                sanitizedFormData.append('content', sanitizeInput(formData.get('content')));

                const file = formData.get('file');
                if (file instanceof File) {
                    sanitizedFormData.append('file', file);
                }

                // Validate categories
                formData.getAll('categories').forEach(category => {
                    sanitizedFormData.append('categories', sanitizeInput(category));
                });

                const response = await fetch('/api/posting', {
                    method: 'POST',
                    body: sanitizedFormData
                });

                if (response.status === 401) {
                    window.dispatchEvent(new CustomEvent('navigate', {
                        detail: { path: '/login' }
                    }));
                    return;
                }

                const result = await response.json();

                if (!response.ok) {
                    throw new Error(result.error || 'Failed to create post');
                }

                // Redirect to home page on success
                window.dispatchEvent(new CustomEvent('navigate', {
                    detail: { path: '/' }
                }));

            } catch (error) {
                errorContainer.textContent = error.message;
                errorContainer.style.color = 'red';
            }
        };

        postingForm.addEventListener('submit', formSubmitHandler);

        postingCleanupFunctions.push(
            () => fileInput.removeEventListener('change', fileChangeHandler),
            () => postingForm.removeEventListener('submit', formSubmitHandler)
        );

    } catch (error) {
        console.error('Error initializing posting form:', error);
        const errorContainer = document.getElementById('errorContainer');
        errorContainer.textContent = 'Failed to load categories';
        errorContainer.style.color = 'red';
    }
}