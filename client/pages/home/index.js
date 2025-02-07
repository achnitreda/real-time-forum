let currentOffset = 0;
let isLoading = false;
let hasMorePosts = true;
let currentFilter = '';

export async function loadHomePage(container) {
    try {
        // 1 Load HTML & CSS
        const htmlResponse = await fetch('/client/pages/home/home.html');
        const html = await htmlResponse.text();

        const cssResponse = await fetch('/client/pages/home/home.css');
        const css = await cssResponse.text();

        const styleSheet = document.createElement('style');
        styleSheet.textContent = css;
        document.head.appendChild(styleSheet);

        container.innerHTML = html;

        // 2 Initialize the home page
        await initializeHome();

        // Add scroll listener
        window.addEventListener('scroll', debounce(handleScroll, 250));

        // 3 Initialize filter handlers
        initializeFilters();

        // 4 like/dislike functionality
        initializeLikeDislike();

    } catch (error) {
        console.error('Error loading home page:', error);
        container.innerHTML = `<div class="error">Error: ${error.message}</div>`;
    }
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

    filterContainer.addEventListener('change', async (e) => {
        if (e.target.classList.contains('filteraction')) {
            // Reset state for new filter
            currentOffset = 0;
            hasMorePosts = true;
            currentFilter = e.target.value;

            // Load filtered posts
            await loadPosts(false, true);
        }
    });
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
                window.location.href = '/login';
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

function resetFilter() {
    currentFilter = '';
    currentOffset = 0;
    hasMorePosts = true;
    const radioButtons = document.querySelectorAll('.filteraction');
    radioButtons.forEach(radio => radio.checked = false);
    loadPosts(false, true);
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
        ${post.ImgBase64 ? `<img src="data:image/jpeg;base64,${post.ImgBase64}" alt="Post image" class="post-image"/>` : ''}
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
                    data-type="post"
                    ${!isLoggedIn ? 'disabled' : ''}>
                <i class="fas fa-thumbs-up"></i>
                <span id="like_post-${post.ID}">${post.Likes}</span>
            </button>
            <button class="action-btn ${post.UserInteraction === -1 ? 'liked-btn' : ''}"
                    data-id="${post.ID}"
                    data-action="dislike"
                    data-type="post"
                    ${!isLoggedIn ? 'disabled' : ''}>
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
        categorySpan.addEventListener('click', () => {
            const category = categorySpan.dataset.category;
            handleCategoryClick(category);
        });
    });

    const commentBtn = postDiv.querySelector('.comment-btn');
    commentBtn.addEventListener('click', () => {
        if (!isLoggedIn) {
            window.location.href = '/login';
        } else {
            window.location.href = `/comment?post_id=${post.ID}`;
        }
    });

    return postDiv;
}

function updateCategories(categories, isLoggedIn) {
    const filterContainer = document.getElementById('filterContainer');
    let html = '<div class="filter">';

    // Add "All Posts" option as the first filter
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

    // Add click handler for the "All Posts" option
    const allPostsRadio = filterContainer.querySelector('input[value=""]');
    allPostsRadio.addEventListener('change', resetFilter);
}

function handleScroll() {
    console.log('Scroll handler running');
    if (isLoading || !hasMorePosts) return;

    const scrollPosition = window.innerHeight + window.scrollY;
    const documentHeight = document.documentElement.scrollHeight;

    if (scrollPosition >= documentHeight - 500) {
        loadPosts(true);
    }
}

function handleCategoryClick(category) {
    const radioButton = document.querySelector(`.filteraction[value="${category}"]`);
    if (radioButton) {
        radioButton.checked = true;
        currentFilter = category;
        currentOffset = 0;
        hasMorePosts = true;
        loadPosts(false, true);
    }
}

function initializeLikeDislike() {
    document.addEventListener('click', async (e) => {
        const button = e.target.closest('.action-btn');
        if (!button || button.disabled) return;

        const id = button.dataset.id;
        const action = button.dataset.action;
        const type = button.dataset.type;

        try {
            const response = await fetch(`/api/like-dislike?action=${action}&commentid=${id}&type=${type}`);

            if (response.status === 401) {
                window.location.href = '/login';
                return;
            }

            if (!response.ok) {
                throw new Error('Failed to update like/dislike');
            }

            // Update UI
            updateLikeDislikeUI(id, action);

        } catch (error) {
            console.error('Error:', error);
        }
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

const debounce = (func, wait = 0) => {
    let timeoutID
    return (...args) => {
        if (timeoutID) {
            clearTimeout(timeoutID);
        }
        timeoutID = setTimeout(() => {
            func(...args)
        }, wait)
    }
}