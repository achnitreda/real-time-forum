let offset = 3;
let isLoading = false;
let hasMoreComments = true;

export async function loadCommentPage(container) {
    try {
        // 1. Load HTML & CSS
        const htmlResponse = await fetch('/client/pages/comment/comment.html');
        const html = await htmlResponse.text();

        const cssResponse = await fetch('/client/pages/comment/comment.css');
        const css = await cssResponse.text();

        const styleSheet = document.createElement('style');
        styleSheet.textContent = css;
        document.head.appendChild(styleSheet);

        container.innerHTML = html;

        // 2. Get post_id from URL
        const urlParams = new URLSearchParams(window.location.search);
        const postId = urlParams.get('post_id');

        if (!postId) {
            throw new Error('Post ID is required');
        }

        // 3. Initialize the comment page
        await initializeCommentPage(postId);

        // 4. Initialize infinite scroll
        initializeInfiniteScroll();

    } catch (error) {
        console.error('Error loading comment page:', error);
        container.innerHTML = `<div class="error">Error: ${error.message}</div>`;
    }
}

async function initializeCommentPage(postId) {
    // Reset state
    offset = 3;
    isLoading = false;
    hasMoreComments = true;

    // Load initial data
    const response = await fetch(`/api/comment?post_id=${postId}`);
    if (!response.ok) {
        if (response.status === 401) {
            window.location.href = '/login';
            return;
        }
        throw new Error('Failed to fetch post and comments');
    }

    const data = await response.json();

    // Render post details
    renderPost(data.post);

    // Render comments
    renderComments(data.comments);

    // Initialize comment form
    initializeCommentForm(postId);
}

function renderPost(post) {
    const postDetails = document.getElementById('postDetails');
    postDetails.className = "post"
    postDetails.innerHTML = `
        <div class="profilInfo">
            <img src="client/images/profil.png" class="profileImg" />
            <div class="profile-details">
                <span>${post.Name}</span>
                <span class="time">${post.CreatedAt}</span>
            </div>
        </div>
        <h4>${post.Title}</h4>
        <p class="content">${post.Content}</p>
        ${post.ImgBase64 ? `<img src="data:image/jpeg;base64,${post.ImgBase64}" alt="Post image" class="post-image"/>` : ''}
    `;
}

function renderComments(comments, append = false) {
    const commentsContainer = document.getElementById('commentsContainer');

    if (!append) {
        commentsContainer.innerHTML = '';
    }

    if (comments) {
        comments.forEach(comment => {
            commentsContainer.appendChild(createCommentElement(comment));
        });
    }
}

function createCommentElement(comment) {
    const div = document.createElement('div');
    div.className = 'comment';
    div.innerHTML = `
        <h3>${comment.Uname}</h3>
        <p>${comment.Content}</p>
        <button class="action-btn ${comment.UserInteraction === 1 ? 'liked-btn' : ''}"
                data-id="${comment.Id}"
                data-action="like"
                data-type="comment">
            <i class="fas fa-thumbs-up"></i>
            <span id="like_post-${comment.Id}">${comment.Likes || 0}</span>
        </button>
        <button class="action-btn ${comment.UserInteraction === -1 ? 'liked-btn' : ''}"
                data-id="${comment.Id}"
                data-action="dislike"
                data-type="comment">
            <i class="fas fa-thumbs-down"></i>
            <span id="dislike_post-${comment.Id}">${comment.Dislikes || 0}</span>
        </button>
    `;
    return div;
}

function initializeCommentForm(postId) {
    const commentForm = document.getElementById('commentForm');

    commentForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const formData = new FormData(commentForm);
        formData.append('post_id', postId);

        try {
            const response = await fetch('/api/comment', {
                method: 'POST',
                body: formData
            });

            if (response.status === 401) {
                window.location.href = '/login';
                return;
            }

            const data = await response.json();

            if (data.error) {
                const errorMsg = document.createElement('div');
                errorMsg.className = 'error-message';
                errorMsg.style.color = 'red';
                errorMsg.textContent = data.error;

                const existingError = commentForm.querySelector('.error-message');
                if (existingError) {
                    existingError.remove();
                }

                commentForm.insertBefore(errorMsg, commentForm.firstChild);
                return;
            }

            // Add new comment to the top
            const commentElement = createCommentElement(data);
            const commentsContainer = document.getElementById('commentsContainer');
            commentsContainer.insertBefore(commentElement, commentsContainer.firstChild);

            // Update offset and reset form
            offset += 1;
            commentForm.reset();

        } catch (error) {
            console.error('Error posting comment:', error);
        }
    });
}

function initializeInfiniteScroll() {
    const loadingContainer = document.getElementById('loadingContainer');
    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting && !isLoading && hasMoreComments) {
                loadMoreComments();
            }
        });
    });

    observer.observe(loadingContainer);
}

async function loadMoreComments() {
    if (isLoading || !hasMoreComments) return;

    try {
        isLoading = true;
        const loadingContainer = document.getElementById('loadingContainer');
        loadingContainer.style.visibility = 'visible';

        const postId = new URLSearchParams(window.location.search).get('post_id');
        const response = await fetch(`/api/comment/more?post_id=${postId}&offset=${offset}`);
        const comments = await response.json();

        if (!comments || comments.length === 0) {
            hasMoreComments = false;
            loadingContainer.textContent = 'No more comments to load';
            return;
        }

        renderComments(comments, true);
        offset += comments.length;

    } catch (error) {
        console.error('Error loading more comments:', error);
    } finally {
        isLoading = false;
        const loadingContainer = document.getElementById('loadingContainer');
        loadingContainer.style.visibility = 'hidden';
    }
}