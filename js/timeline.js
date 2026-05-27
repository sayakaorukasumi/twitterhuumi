const Timeline = {
  container: null,

  init(container) {
    this.container = container;
    const posts = Storage.getPosts();
    if (posts.length === 0) {
      this.showEmpty();
    } else {
      this.render(posts);
    }
  },

  showEmpty() {
    this.container.innerHTML = '<div class="timeline-empty">まだ投稿がありません。最初の一言を呟いてみよう！</div>';
  },

  render(posts) {
    this.container.innerHTML = '';
    const topLevel = posts.filter(p => !p.parentId);
    if (topLevel.length === 0) { this.showEmpty(); return; }
    const replies = posts.filter(p => p.parentId);
    topLevel.forEach(post => {
      const postReplies = replies.filter(r => r.parentId === post.id);
      this.container.appendChild(this.createPostEl(post, postReplies));
    });
  },

  createPostEl(post, replies = []) {
    const el = document.createElement('article');
    el.className = 'post-card';
    el.dataset.postId = post.id;
    if (post.isCharacterPost) {
      el.classList.add(post.author?.isCharacter === 'kaoru' ? 'kaoru-post' : 'kasumi-post');
    }

    const { av, name, handle, cls } = this._authorInfo(post);
    const time = this._formatTime(post.timestamp);

    let mediaHTML = '';
    if (post.media) {
      if (post.media.type === 'image') {
        mediaHTML = `<div class="post-media"><img src="${post.media.data}" alt="添付画像" loading="lazy"></div>`;
      } else if (post.media.type === 'video') {
        mediaHTML = `<div class="post-media"><video src="${post.media.data}" controls preload="metadata"></video></div>`;
      }
    }

    const repliesHTML = replies.length > 0
      ? `<div class="replies-thread">${replies.map(r => this._replyHTML(r)).join('')}</div>`
      : '<div class="replies-thread" style="display:none"></div>';

    el.innerHTML = `
      <div class="post-header">
        <div class="${cls}">${av}</div>
        <div class="post-meta">
          <span class="author-name">${name}</span>
          <span class="author-handle">${handle}</span>
          <span class="post-time">${time}</span>
        </div>
      </div>
      <div class="post-content">${this._escape(post.text)}</div>
      ${mediaHTML}
      <div class="post-actions">
        <button class="action-btn reply-btn" data-post-id="${post.id}">
          <span class="action-icon">💬</span>
          <span class="action-count reply-count">${post.replies || 0}</span>
        </button>
        <button class="action-btn rt-btn" data-post-id="${post.id}">
          <span class="action-icon">🔁</span>
          <span class="action-count rt-count">${post.retweets || 0}</span>
        </button>
        <button class="action-btn like-btn" data-post-id="${post.id}">
          <span class="action-icon">🤍</span>
          <span class="action-count like-count">${post.likes || 0}</span>
        </button>
      </div>
      ${repliesHTML}
    `;
    return el;
  },

  _replyHTML(reply) {
    const { av, name, handle, cls } = this._authorInfo(reply);
    const time = this._formatTime(reply.timestamp);
    return `
      <div class="reply-card" data-post-id="${reply.id}">
        <div class="post-header">
          <div class="${cls} small">${av}</div>
          <div class="post-meta">
            <span class="author-name">${name}</span>
            <span class="author-handle">${handle}</span>
            <span class="post-time">${time}</span>
          </div>
        </div>
        <div class="post-content reply-content">${this._escape(reply.text)}</div>
        <div class="post-actions reply-actions">
          <button class="action-btn like-btn" data-post-id="${reply.id}">
            <span class="action-icon">🤍</span>
            <span class="action-count like-count">${reply.likes || 0}</span>
          </button>
        </div>
      </div>`;
  },

  _authorInfo(post) {
    if (post.isUserPost) {
      return { av: '👤', name: 'あなた', handle: '@you', cls: 'avatar user-avatar' };
    }
    const ch = post.author?.isCharacter;
    if (ch === 'kaoru')  return { av: '🌸', name: '薫',  handle: '@kaoru_here',    cls: 'avatar kaoru-avatar' };
    if (ch === 'kasumi') return { av: '❄️', name: '霞',  handle: '@kasumi_watch', cls: 'avatar kasumi-avatar' };
    const n = post.author?.name || '?';
    return { av: n[0], name: n, handle: post.author?.handle || '@unknown', cls: 'avatar pseudo-avatar' };
  },

  addPost(post) {
    const empty = this.container.querySelector('.timeline-empty');
    if (empty) empty.remove();
    const el = this.createPostEl(post);
    this.container.insertBefore(el, this.container.firstChild);
  },

  addReply(reply) {
    const parentCard = this.container.querySelector(`.post-card[data-post-id="${reply.parentId}"]`);
    if (!parentCard) return;
    let thread = parentCard.querySelector('.replies-thread');
    if (!thread) {
      thread = document.createElement('div');
      thread.className = 'replies-thread';
      parentCard.appendChild(thread);
    }
    thread.style.display = '';
    thread.insertAdjacentHTML('beforeend', this._replyHTML(reply));
    setTimeout(() => {
      const last = thread.lastElementChild;
      if (last) last.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 100);
  },

  updatePostReactions(postId, likes, retweets, replies) {
    const card = this.container.querySelector(`[data-post-id="${postId}"]`);
    if (!card) return;
    const get = sel => card.querySelector(`:scope > .post-actions ${sel}`) ||
                       card.querySelector(`:scope > .post-actions.reply-actions ${sel}`);
    if (likes    !== undefined) { const e = get('.like-count');  if (e) e.textContent = likes; }
    if (retweets !== undefined) { const e = get('.rt-count');    if (e) e.textContent = retweets; }
    if (replies  !== undefined) { const e = get('.reply-count'); if (e) e.textContent = replies; }
  },

  _formatTime(ts) {
    const d = Date.now() - ts;
    if (d < 60000)    return 'たった今';
    if (d < 3600000)  return `${Math.floor(d / 60000)}分前`;
    if (d < 86400000) return `${Math.floor(d / 3600000)}時間前`;
    return `${Math.floor(d / 86400000)}日前`;
  },

  _escape(str) {
    const d = document.createElement('div');
    d.appendChild(document.createTextNode(String(str)));
    return d.innerHTML;
  }
};
