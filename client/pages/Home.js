let currentOffset = 0;
let isLoading = false;
let hasMorePosts = true;
let currentFilter = '';
let cleanupFunctions = [];

export async function loadHomePage(container) {
    try {
        // 0 Clean up previous event listeners
        cleanupAllListeners();

        // 1 Create and insert HTML structure
        container.innerHTML = `
            <div class="container">
                <div class="scrollmenu" id="filterContainer">
                    <div class="filter" id="categoryFilter"></div>
                </div>
                <main class="main-content">
                    <div class="Posts" id="postsContainer"></div>
                    <div class="loading" id="loadingContainer">
                        <div class="spinner"></div>
                        Loading more posts...
                    </div>
                </main>
            </div>
        `;

        // 2 Initialize the home page
        await initializeHome();

        // Add scroll listener
        const debouncedScroll = debounce(handleScroll, 250);
        window.addEventListener('scroll', debouncedScroll);
        cleanupFunctions.push(() =>
            window.removeEventListener('scroll', debouncedScroll)
        );

        // 3 Initialize filter handlers
        initializeFilters();

        // 4 like/dislike functionality
        initializeLikeDislike();

        // Return cleanup function
        return () => cleanupAllListeners();

    } catch (error) {
        console.error('Error loading home page:', error);
        container.innerHTML = `<div class="error">Error: ${error.message}</div>`;
        return () => cleanupAllListeners();
    }
}

function cleanupAllListeners() {
    cleanupFunctions.forEach(cleanup => cleanup())
    cleanupFunctions = [];
}

async function initializeHome() {
    // Reset state
    isLoading = false;
    currentOffset = 0;
    hasMorePosts = true;
    currentFilter = '';

    const postsContainer = document.getElementById('postsContainer');
    const loadingContainer = document.getElementById('loadingContainer');
    if (postsContainer) postsContainer.innerHTML = '';
    if (loadingContainer) loadingContainer.style.display = 'block';

    await loadPosts();
}

function initializeFilters() {
    const filterContainer = document.getElementById('filterContainer');

    const filterChangeHandler = async (e) => {
        if (e.target.classList.contains('filteraction')) {
            currentOffset = 0;
            hasMorePosts = true;
            currentFilter = e.target.value;
            await loadPosts(false, true);
        }
    };

    filterContainer.addEventListener('change', filterChangeHandler);
    cleanupFunctions.push(() =>
        filterContainer.removeEventListener('change', filterChangeHandler)
    );
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
    cleanupFunctions.push(() => {
        document.removeEventListener('click', likeDislikeHandler);
    });
}

function updateLikeDislikeUI(id, action) {
    const likeSpan = document.querySelector(`#like_post-${id}`);
    const dislikeSpan = document.querySelector(`#dislike_post-${id}`);
    const likeBtn = likeSpan.parentElement;
    const dislikeBtn = dislikeSpan.parentElement;

    if (action === "like") {
        if (!likeBtn.classList.contains("liked-btn")) {
            // Add like
            likeSpan.textContent = Number(likeSpan.textContent) + 1;
            likeBtn.classList.add("liked-btn");

            // Remove dislike if exists
            if (dislikeBtn.classList.contains("liked-btn")) {
                dislikeSpan.textContent = Number(dislikeSpan.textContent) - 1;
                dislikeBtn.classList.remove("liked-btn");
            }
        } else {
            // Remove like
            likeSpan.textContent = Number(likeSpan.textContent) - 1;
            likeBtn.classList.remove("liked-btn");
        }
    } else {
        if (!dislikeBtn.classList.contains("liked-btn")) {
            // Add dislike
            dislikeSpan.textContent = Number(dislikeSpan.textContent) + 1;
            dislikeBtn.classList.add("liked-btn");

            // Remove like if exists
            if (likeBtn.classList.contains("liked-btn")) {
                likeSpan.textContent = Number(likeSpan.textContent) - 1;
                likeBtn.classList.remove("liked-btn");
            }
        } else {
            // Remove dislike
            dislikeSpan.textContent = Number(dislikeSpan.textContent) - 1;
            dislikeBtn.classList.remove("liked-btn");
        }
    }
}

async function loadPosts(append = false, isFilter = false) {
    if (isLoading || (!append && !isFilter && !hasMorePosts)) return;

    try {
        isLoading = true;
        const loadingContainer = document.getElementById('loadingContainer');
        loadingContainer.style.display = 'block';

        // Determine which endpoint to use
        const endpoint = currentFilter ?
            `/api/filter?type=${currentFilter}&offset=${currentOffset}` :
            `/api/home?offset=${currentOffset}`;

        const response = await fetch(endpoint);

        if (!response.ok) {
            if (response.status === 401) {
                window.dispatchEvent(new CustomEvent('navigate', {
                    detail: { path: '/login' }
                }));
                return;
            }
            throw new Error('Failed to fetch posts');
        }

        const data = await response.json();
        const postsContainer = document.getElementById('postsContainer');

        // Clear container if not appending
        if (!append) {
            postsContainer.innerHTML = '';
        }

        // Handle no posts
        if (!data.posts || data.posts.length === 0) {
            hasMorePosts = false;
            if (!append) {
                postsContainer.innerHTML = `
                    <div class="no-posts">
                        <i class="fas fa-inbox fa-2x"></i>
                        <p>No posts found</p>
                    </div>`;
            }
            loadingContainer.style.display = 'none';
            return;
        }

        // Add posts
        data.posts.forEach(post => {
            postsContainer.appendChild(createPostElement(post, data.isLoggedIn));
        });

        // Update categories only on initial unfiltered load
        if (!append && !isFilter && data.categories) {
            updateCategories(data.categories, data.isLoggedIn);
        }

        // Update state
        if (data.posts.length > 0) {
            currentOffset += data.posts.length;
        }
        hasMorePosts = data.posts.length === 4; // If we got less than 4 posts, there are no more

        // Update loading visibility
        loadingContainer.style.display = hasMorePosts ? 'block' : 'none';
    } catch (error) {
        console.error('Error loading posts:', error);
        const postsContainer = document.getElementById('postsContainer');
        if (!append) {
            postsContainer.innerHTML = `
                <div class="error">
                    <i class="fas fa-exclamation-circle"></i>
                    <p>${error.message}</p>
                </div>`;
        }
    } finally {
        isLoading = false;
    }
}

function createPostElement(post, isLoggedIn) {
    const postDiv = document.createElement('div');
    postDiv.className = 'post';
    postDiv.innerHTML = `
        <div class="profilInfo">
            <img src="client/images/profil.png" class="profileImg" />
            <div class="profile-details">
                <span>${post.Name}</span>
                <span class="time">${post.CreatedAt}</span>
            </div>
        </div>
        <h4>${post.Title}</h4>
        <p class="content">${post.Content}</p>
        ${post.ImgBase64 ? `<img src="data:image/*;base64,${post.ImgBase64}" alt="Post image" class="post-image"/>` : ''}
        <div class="categories">
            ${post.Category.map(cat => `
                <span class="category" data-category="${cat}">
                    <i class="fas fa-tag"></i>${cat}
                </span>
            `).join(' ')}
        </div>
        <div class="post-actions">
            <button class="action-btn ${post.UserInteraction === 1 ? 'liked-btn' : ''}"
                    data-id="${post.ID}"
                    data-action="like"
                    data-type="post">
                <i class="fas fa-thumbs-up"></i>
                <span id="like_post-${post.ID}">${post.Likes}</span>
            </button>
            <button class="action-btn ${post.UserInteraction === -1 ? 'liked-btn' : ''}"
                    data-id="${post.ID}"
                    data-action="dislike"
                    data-type="post">
                <i class="fas fa-thumbs-down"></i>
                <span id="dislike_post-${post.ID}">${post.Dislikes}</span>
            </button>
            <button class="comment-btn" data-post-id="${post.ID}">
                <i class="fas fa-comment"></i>
                <span>${post.NbComment}</span>
            </button>
        </div>
    `;

    const categories = postDiv.querySelectorAll('.category');
    categories.forEach(categorySpan => {
        const categoryClickHandler = () => {
            const category = categorySpan.dataset.category;
            handleCategoryClick(category);
        };
        categorySpan.addEventListener('click', categoryClickHandler);
        cleanupFunctions.push(() =>
            categorySpan.removeEventListener('click', categoryClickHandler)
        );
    });

    const commentBtn = postDiv.querySelector('.comment-btn');
    const commentClickHandler = () => {
        if (!isLoggedIn) {
            window.dispatchEvent(new CustomEvent('navigate', {
                detail: { path: '/login' }
            }));
        } else {
            window.dispatchEvent(new CustomEvent('navigate', {
                detail: { path: `/comment?post_id=${post.ID}` }
            }));
        }
    };
    commentBtn.addEventListener('click', commentClickHandler);
    cleanupFunctions.push(() =>
        commentBtn.removeEventListener('click', commentClickHandler)
    );

    return postDiv;
}

function updateCategories(categories, isLoggedIn) {
    const filterContainer = document.getElementById('filterContainer');
    let html = '<div class="filter">';

    // Add "All Posts" option
    html += `
        <label>
            <input type="radio" class="filteraction" name="filter" value="" checked />
            <span>All Posts</span>
        </label>
    `;

    if (isLoggedIn) {
        html += `
            <label>
                <input type="radio" class="filteraction" name="filter" value="Created" />
                <span>My Posts</span>
            </label>
            <label>
                <input type="radio" class="filteraction" name="filter" value="Liked" />
                <span>Liked</span>
            </label>
        `;
    }

    categories.forEach(category => {
        html += `
            <label>
                <input type="radio" class="filteraction" name="filter" value="${category}" />
                <span>${category}</span>
            </label>
        `;
    });

    html += '</div>';
    filterContainer.innerHTML = html;
}

function handleCategoryClick(category) {
    const radioButton = document.querySelector(`.filteraction[value="${category}"]`);
    if (radioButton) {
        radioButton.checked = true;
        currentFilter = category;
        currentOffset = 0;
        hasMorePosts = true;
        window.scrollTo({ top: 0, behavior: 'smooth' });
        loadPosts(false, true);
    }
}

function handleScroll() {
    // console.log('Scroll handler running');
    if (isLoading || !hasMorePosts) return;

    const scrollPosition = window.innerHeight + window.scrollY;
    const documentHeight = document.documentElement.scrollHeight;

    if (scrollPosition >= documentHeight - 500) {
        loadPosts(true);
    }
}

const debounce = (func, wait = 0) => {
    let timeoutID;
    return (...args) => {
        if (timeoutID) {
            clearTimeout(timeoutID);
        }
        timeoutID = setTimeout(() => {
            func(...args);
        }, wait);
    };
};