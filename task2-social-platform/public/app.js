const $ = (s, p = document) => p.querySelector(s);
const $$ = (s, p = document) => [...p.querySelectorAll(s)];
const state = { token: localStorage.getItem("pulse_token"), user: null, posts: [], users: [] };

const api = async (url, options = {}) => {
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (state.token) headers.Authorization = `Bearer ${state.token}`;
  const res = await fetch(url, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Something went wrong.");
  return data;
};

function toast(message) {
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = message;
  $("#toast-root").appendChild(el);
  setTimeout(() => el.remove(), 2800);
}

function initials(user) {
  return (user?.name || user?.username || "P").slice(0, 1).toUpperCase();
}

function avatarHTML(user, cls = "avatar") {
  return user?.avatar
    ? `<div class="${cls}"><img src="${escapeHtml(user.avatar)}" alt=""></div>`
    : `<div class="${cls}">${escapeHtml(initials(user))}</div>`;
}

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;" }[c]));
}

function timeAgo(date) {
  const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
  return new Date(date).toLocaleDateString();
}

async function bootstrap() {
  if (!state.token) return showAuth();
  try {
    const data = await api("/api/auth/me");
    state.user = data.user;
    showApp();
    await Promise.all([loadFeed(), loadStats()]);
  } catch {
    localStorage.removeItem("pulse_token");
    state.token = null;
    showAuth();
  }
}

function showAuth() {
  $("#auth-screen").classList.remove("hidden");
  $("#app").classList.add("hidden");
}
function showApp() {
  $("#auth-screen").classList.add("hidden");
  $("#app").classList.remove("hidden");
  renderTopUser();
}

function renderTopUser() {
  $("#top-user").innerHTML = `${avatarHTML(state.user)} <span>${escapeHtml(state.user.name)}</span>`;
  $("#composer-avatar").outerHTML = avatarHTML(state.user, "avatar");
}

$$(".tab").forEach(btn => btn.addEventListener("click", () => {
  $$(".tab").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  const login = btn.dataset.auth === "login";
  $("#login-form").classList.toggle("hidden", !login);
  $("#register-form").classList.toggle("hidden", login);
}));

$("#login-form").addEventListener("submit", async e => {
  e.preventDefault();
  try {
    const data = await api("/api/auth/login", { method:"POST", body:JSON.stringify(Object.fromEntries(new FormData(e.target))) });
    state.token = data.token; state.user = data.user; localStorage.setItem("pulse_token", state.token);
    showApp(); await Promise.all([loadFeed(), loadStats()]);
    toast("Welcome back.");
  } catch (err) { toast(err.message); }
});

$("#register-form").addEventListener("submit", async e => {
  e.preventDefault();
  try {
    const data = await api("/api/auth/register", { method:"POST", body:JSON.stringify(Object.fromEntries(new FormData(e.target))) });
    state.token = data.token; state.user = data.user; localStorage.setItem("pulse_token", state.token);
    showApp(); await Promise.all([loadFeed(), loadStats()]);
    toast("Account created. Welcome to Pulse.");
  } catch (err) { toast(err.message); }
});

$$(".nav-item[data-view]").forEach(btn => btn.addEventListener("click", () => switchView(btn.dataset.view)));
$("#refresh-btn").addEventListener("click", async () => { await loadFeed(); toast("Feed refreshed."); });
$("#logout-btn").addEventListener("click", () => {
  localStorage.removeItem("pulse_token"); state.token = null; state.user = null; showAuth(); toast("Signed out.");
});
$("#top-user").addEventListener("click", () => switchView("profile"));
$("#edit-profile-btn").addEventListener("click", openEditModal);

function switchView(view) {
  $$(".nav-item[data-view]").forEach(b => b.classList.toggle("active", b.dataset.view === view));
  $$(".view").forEach(v => v.classList.add("hidden"));
  $(`#${view}-view`).classList.remove("hidden");
  const meta = { home:["YOUR FEED","Home"], explore:["DISCOVER","Explore"], profile:["YOUR SPACE","Profile"] }[view];
  $("#page-kicker").textContent = meta[0]; $("#page-title").textContent = meta[1];
  if (view === "explore") loadUsers();
  if (view === "profile") loadProfile(state.user.username);
}

$("#post-content").addEventListener("input", e => $("#char-count").textContent = `${e.target.value.length} / 1000`);
$("#publish-btn").addEventListener("click", createPost);

async function createPost() {
  const content = $("#post-content").value.trim();
  const image = $("#post-image").value.trim();
  if (!content) return toast("Write something before publishing.");
  try {
    const data = await api("/api/posts", { method:"POST", body:JSON.stringify({ content, image }) });
    state.posts.unshift(data.post);
    $("#post-content").value = ""; $("#post-image").value = ""; $("#char-count").textContent = "0 / 1000";
    renderFeed(); loadStats(); toast("Post published.");
  } catch (err) { toast(err.message); }
}

async function loadFeed() {
  $("#feed").innerHTML = `<div class="loading">Loading your feed…</div>`;
  try {
    const data = await api("/api/posts");
    state.posts = data.posts;
    renderFeed();
  } catch (err) { $("#feed").innerHTML = `<div class="empty">${escapeHtml(err.message)}</div>`; }
}

function renderFeed() {
  if (!state.posts.length) {
    $("#feed").innerHTML = `<div class="empty"><strong>No posts yet.</strong><br>Be the first person to share something.</div>`;
    return;
  }
  $("#feed").innerHTML = state.posts.map(post => postHTML(post)).join("");
  $$(".like-btn").forEach(btn => btn.addEventListener("click", () => likePost(btn.dataset.id)));
  $$(".comment-form").forEach(form => form.addEventListener("submit", e => addComment(e, form.dataset.id)));
  $$(".delete-post").forEach(btn => btn.addEventListener("click", () => deletePost(btn.dataset.id)));
  $$(".author-link").forEach(btn => btn.addEventListener("click", () => { switchView("profile"); loadProfile(btn.dataset.username); }));
}

function postHTML(post) {
  return `<article class="post card">
    <div class="post-head">
      ${avatarHTML(post.author)}
      <button class="post-author author-link" data-username="${escapeHtml(post.author.username)}" style="text-align:left;border:0;background:none;padding:0">
        <strong>${escapeHtml(post.author.name)}</strong><span>@${escapeHtml(post.author.username)} · ${timeAgo(post.createdAt)}</span>
      </button>
      ${post.author.id === state.user.id ? `<button class="post-menu delete-post" data-id="${post.id}" title="Delete">⋯</button>` : ""}
    </div>
    <div class="post-content">${escapeHtml(post.content)}</div>
    ${post.image ? `<img class="post-image" src="${escapeHtml(post.image)}" alt="Post attachment" onerror="this.style.display='none'">` : ""}
    <div class="post-actions">
      <button class="action-btn like-btn ${post.liked ? "liked" : ""}" data-id="${post.id}">♡ ${post.likes}</button>
      <button class="action-btn" onclick="document.getElementById('comment-${post.id}').focus()">◌ ${post.comments.length} comments</button>
    </div>
    <div class="comments">
      ${post.comments.map(c => `<div class="comment">${avatarHTML(c.author)}<div class="comment-body"><strong>${escapeHtml(c.author.name)}</strong><p>${escapeHtml(c.content)}</p></div></div>`).join("")}
      <form class="comment-form" data-id="${post.id}">
        <input id="comment-${post.id}" placeholder="Write a comment…" maxlength="500">
        <button class="primary-btn small">Send</button>
      </form>
    </div>
  </article>`;
}

async function likePost(id) {
  try {
    const data = await api(`/api/posts/${id}/like`, { method:"POST" });
    const post = state.posts.find(p => p.id === id);
    post.liked = data.liked; post.likes = data.likes;
    renderFeed();
  } catch (err) { toast(err.message); }
}

async function addComment(e, id) {
  e.preventDefault();
  const input = e.target.querySelector("input");
  if (!input.value.trim()) return;
  try {
    const data = await api(`/api/posts/${id}/comments`, { method:"POST", body:JSON.stringify({ content:input.value }) });
    const post = state.posts.find(p => p.id === id);
    post.comments.push(data.comment);
    renderFeed();
  } catch (err) { toast(err.message); }
}

async function deletePost(id) {
  if (!confirm("Delete this post?")) return;
  try {
    await api(`/api/posts/${id}`, { method:"DELETE" });
    state.posts = state.posts.filter(p => p.id !== id);
    renderFeed(); loadStats(); toast("Post deleted.");
  } catch (err) { toast(err.message); }
}

async function loadUsers() {
  try {
    const data = await api("/api/users"); state.users = data.users; renderPeople();
  } catch (err) { toast(err.message); }
}
function renderPeople() {
  const q = ($("#user-search").value || "").toLowerCase();
  const users = state.users.filter(u => `${u.name} ${u.username}`.toLowerCase().includes(q));
  $("#people-grid").innerHTML = users.length ? users.map(user => {
    const following = false; // updated after profile interaction
    return `<div class="person-card card">${avatarHTML(user)}<div class="person-main"><strong>${escapeHtml(user.name)}</strong><p>@${escapeHtml(user.username)} · ${user.followers} followers</p></div><button class="follow-btn" data-id="${user.id}">Follow</button></div>`;
  }).join("") : `<div class="empty">No people found.</div>`;
  $$(".follow-btn").forEach(btn => btn.addEventListener("click", async () => {
    try {
      const data = await api(`/api/users/${btn.dataset.id}/follow`, { method:"POST" });
      btn.textContent = data.following ? "Following" : "Follow";
      btn.classList.toggle("following", data.following);
      loadUsers();
    } catch (err) { toast(err.message); }
  }));
}
$("#user-search").addEventListener("input", renderPeople);

async function loadProfile(username) {
  $("#profile-content").innerHTML = `<div class="loading">Loading profile…</div>`;
  try {
    const data = await api(`/api/users/${encodeURIComponent(username)}`);
    const u = data.user;
    const isMe = u.id === state.user.id;
    const posts = data.posts;
    $("#profile-content").innerHTML = `
      <div class="profile-hero">
        <div class="profile-top">${avatarHTML(u)}
          <div class="profile-info"><h3>${escapeHtml(u.name)}</h3><p>@${escapeHtml(u.username)}${u.location ? " · " + escapeHtml(u.location) : ""}</p></div>
        </div>
        <p class="profile-bio">${escapeHtml(u.bio || "No bio yet.")}</p>
        <div class="profile-stats">
          <div><strong>${u.followers}</strong><span>followers</span></div>
          <div><strong>${u.following}</strong><span>following</span></div>
          <div><strong>${posts.length}</strong><span>recent posts</span></div>
        </div>
        ${isMe ? `<button class="primary-btn small" style="margin-top:20px" onclick="openEditModal()">Edit profile</button>` : ""}
      </div>
      <div class="profile-posts-title">Recent posts</div>
      <div class="feed">${posts.length ? posts.map(p => postHTML({...p, comments:[]})).join("") : `<div class="empty">No posts yet.</div>`}</div>`;
    $$("#profile-content .like-btn").forEach(btn => btn.addEventListener("click", () => likePost(btn.dataset.id)));
  } catch (err) { $("#profile-content").innerHTML = `<div class="empty">${escapeHtml(err.message)}</div>`; }
}

async function loadStats() {
  try {
    const s = await api("/api/stats");
    $("#stat-users").textContent = s.users; $("#stat-posts").textContent = s.posts; $("#stat-comments").textContent = s.comments;
  } catch {}
}

function openEditModal() {
  $("#modal-root").innerHTML = `<div class="modal-backdrop" id="modal-backdrop">
    <div class="modal">
      <div class="modal-head"><h3>Edit profile</h3><button class="close-btn" id="close-modal">×</button></div>
      <form class="edit-form" id="edit-form">
        <div><label>FULL NAME</label><input name="name" value="${escapeHtml(state.user.name)}" required></div>
        <div><label>BIO</label><textarea name="bio" maxlength="300">${escapeHtml(state.user.bio || "")}</textarea></div>
        <div><label>LOCATION</label><input name="location" value="${escapeHtml(state.user.location || "")}"></div>
        <div><label>AVATAR URL</label><input name="avatar" value="${escapeHtml(state.user.avatar || "")}" placeholder="https://…"></div>
        <div><label>WEBSITE</label><input name="website" value="${escapeHtml(state.user.website || "")}" placeholder="https://…"></div>
        <button class="primary-btn">Save changes <span>→</span></button>
      </form>
    </div>
  </div>`;
  $("#close-modal").onclick = () => $("#modal-root").innerHTML = "";
  $("#modal-backdrop").addEventListener("click", e => { if (e.target.id === "modal-backdrop") $("#modal-root").innerHTML = ""; });
  $("#edit-form").addEventListener("submit", saveProfile);
}

async function saveProfile(e) {
  e.preventDefault();
  try {
    const data = await api("/api/users/me", { method:"PATCH", body:JSON.stringify(Object.fromEntries(new FormData(e.target))) });
    state.user = data.user; $("#modal-root").innerHTML = ""; renderTopUser(); loadProfile(state.user.username); toast("Profile updated.");
  } catch (err) { toast(err.message); }
}

bootstrap();
