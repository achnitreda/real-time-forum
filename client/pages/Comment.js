import { sanitizeInput } from "../services/utils.js";

let offset = 3;
let isLoading = false;
let hasMoreComments = true;
let commentCleanupFunctions = [];

export async function loadCommentPage(container) {
    try {
        container.innerHTML = `
            <div class="container">
                <div class="post-container">
                    <div class="post" id="postDetails"></div>

                    <form class="myform" id="commentForm">
                        <textarea
                            name="Content"
                            placeholder="Enter your comment..."
                            required
                        ></textarea>
                        <button class="input-comment btn" type="submit">Comment</button>
                    </form>

                    <div class="comments-section">
                        <h2>Comments</h2>
                        <div id="commentsContainer"></div>
                        <div class="loading" id="loadingContainer">
                            <div class="spinner"></div>
                            Loading more comments...
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Get post_id from URL
        // Example URL: http://yoursite.com/comment?post_id=123
        // 1. window.location.search returns everything after '?' in URL
        // In this case: "?post_id=123"
        const urlParams = new URLSearchParams(window.location.search);
        const postId = urlParams.get('post_id');

        if (!postId) {
            throw new Error('Post ID is required');
        }

        await initializeCommentPage(postId);

        initializeInfiniteScroll();

        initializeLikeDislike();

    } catch (error) {
        console.error('Error loading comment page:', error);
        container.innerHTML = `<div class="error">Error: ${error.message}</div>`;
    } finally {
        return () => cleanupCommentListeners();
    }
} 

function cleanupCommentListeners() {
    commentCleanupFunctions.forEach(cleanup => cleanup());
    commentCleanupFunctions = [];
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
            window.dispatchEvent(new CustomEvent('navigate', {
                detail: { path: '/login' }
            }));
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
    postDetails.className = "post";
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

    const formSubmitHandler = async (e) => {
        e.preventDefault();

        const formData = new FormData(commentForm);
        const sanitizedFormData = new FormData();

        sanitizedFormData.append('Content', sanitizeInput(formData.get('Content')));
        sanitizedFormData.append('post_id', postId);

        try {
            const response = await fetch('/api/comment', {
                method: 'POST',
                body: sanitizedFormData
            });

            if (response.status === 401) {
                window.dispatchEvent(new CustomEvent('navigate', {
                    detail: { path: '/login' }
                }));
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
    };

    commentForm.addEventListener('submit', formSubmitHandler);
    commentCleanupFunctions.push(() =>
        commentForm.removeEventListener('submit', formSubmitHandler)
    );
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
    commentCleanupFunctions.push(() => {
        observer.disconnect();
        observer.unobserve(loadingContainer);
    });
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

function initializeLikeDislike() {
    const likeDislikeHandler = async (e) => {
        const button = e.target.closest('.action-btn');
        if (!button || button.disabled) return;

        const id = button.dataset.id;
        const action = button.dataset.action;
        const type = button.dataset.type;

        try {
            const response = await fetch(`/api/like-dislike?action=${action}&commentid=${id}&type=${type}`);

            if (response.status === 401) {
                window.dispatchEvent(new CustomEvent('navigate', {
                    detail: { path: '/login' }
                }));
                return;
            }

            if (!response.ok) {
                throw new Error('Failed to update like/dislike');
            }

            updateLikeDislikeUI(id, action);

        } catch (error) {
            console.error('Error:', error);
        }
    };

    document.addEventListener('click', likeDislikeHandler);
    commentCleanupFunctions.push(() =>
        document.removeEventListener('click', likeDislikeHandler)
    );
}

function updateLikeDislikeUI(id, action) {
    const likeSpan = document.querySelector(`#like_post-${id}`);
    const dislikeSpan = document.querySelector(`#dislike_post-${id}`);
    const likeBtn = likeSpan.parentElement;
    const dislikeBtn = dislikeSpan.parentElement;

    if (action === "like") {
        if (!likeBtn.classList.contains("liked-btn")) {
            likeSpan.textContent = Number(likeSpan.textContent) + 1;
            likeBtn.classList.add("liked-btn");
            if (dislikeBtn.classList.contains("liked-btn")) {
                dislikeSpan.textContent = Number(dislikeSpan.textContent) - 1;
                dislikeBtn.classList.remove("liked-btn");
            }
        } else {
            likeSpan.textContent = Number(likeSpan.textContent) - 1;
            likeBtn.classList.remove("liked-btn");
        }
    } else {
        if (!dislikeBtn.classList.contains("liked-btn")) {
            dislikeSpan.textContent = Number(dislikeSpan.textContent) + 1;
            dislikeBtn.classList.add("liked-btn");
            if (likeBtn.classList.contains("liked-btn")) {
                likeSpan.textContent = Number(likeSpan.textContent) - 1;
                likeBtn.classList.remove("liked-btn");
            }
        } else {
            dislikeSpan.textContent = Number(dislikeSpan.textContent) - 1;
            dislikeBtn.classList.remove("liked-btn");
        }
    }
}