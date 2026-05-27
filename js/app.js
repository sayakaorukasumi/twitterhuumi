document.addEventListener('DOMContentLoaded', () => {
  Notifications.init(document.getElementById('notifications'));
  NotifList.init(document.getElementById('notif-list'));
  Timeline.init(document.getElementById('timeline'));
  applySettings();
  if (Storage.getPosts().length === 0) seedInitialPosts();

  // ===== TAB NAVIGATION =====
  document.querySelectorAll('[data-view]').forEach(item => {
    item.addEventListener('click', e => {
      e.preventDefault();
      switchView(item.dataset.view);
    });
  });

  // ===== COMPOSE =====
  const form         = document.getElementById('post-form');
  const textarea     = document.getElementById('post-textarea');
  const submitBtn    = document.getElementById('post-submit');
  const charCount    = document.getElementById('char-count');
  const mediaInput   = document.getElementById('media-input');
  const mediaPreview = document.getElementById('media-preview');
  let pendingMedia   = null;

  textarea.addEventListener('input', () => {
    const len = textarea.value.length;
    charCount.textContent = `${len}/280`;
    charCount.style.color = len > 260 ? (len > 280 ? '#f44336' : '#ff9800') : '';
    submitBtn.disabled = len === 0 || len > 280;
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
  });

  mediaInput.addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const isVideo = file.type.startsWith('video/');
    const reader = new FileReader();
    reader.onload = ev => {
      pendingMedia = { type: isVideo ? 'video' : 'image', data: ev.target.result };
      mediaPreview.innerHTML = isVideo
        ? `<div class="preview-wrap"><video src="${ev.target.result}" class="preview-media" controls></video></div>`
        : `<div class="preview-wrap"><img src="${ev.target.result}" class="preview-media" alt="プレビュー"></div>`;
      const btn = document.createElement('button');
      btn.className = 'remove-media';
      btn.type = 'button';
      btn.textContent = '✕';
      btn.onclick = () => { pendingMedia = null; mediaPreview.innerHTML = ''; mediaInput.value = ''; };
      mediaPreview.querySelector('.preview-wrap').appendChild(btn);
    };
    reader.readAsDataURL(file);
  });

  form.addEventListener('submit', e => {
    e.preventDefault();
    const text = textarea.value.trim();
    if (!text) return;
    const isBuzz = Reactions.isBuzzPost();
    const post = {
      id: `post_${Date.now()}`, type: 'post', parentId: null,
      text, timestamp: Date.now(),
      likes: 0, retweets: 0, replies: 0,
      isUserPost: true, isBuzz, media: pendingMedia
    };
    Storage.addPost(post);
    Timeline.addPost(post);
    textarea.value = '';
    textarea.style.height = 'auto';
    charCount.textContent = '0/280';
    submitBtn.disabled = true;
    pendingMedia = null;
    mediaPreview.innerHTML = '';
    mediaInput.value = '';
    Notifications.show(isBuzz ? 'バズ投稿の予感…！ 🔥' : '投稿しました！', isBuzz ? 'buzz' : 'default');
    Reactions.scheduleReactions(post.id, isBuzz);
    Reactions.schedulePseudoReplies(post.id);
    Reactions.scheduleCharacterInteraction(post.id);
  });

  // ===== TIMELINE CLICKS =====
  document.getElementById('timeline').addEventListener('click', e => {
    const likeBtn  = e.target.closest('.like-btn');
    const rtBtn    = e.target.closest('.rt-btn');
    const replyBtn = e.target.closest('.reply-btn');

    if (likeBtn && !likeBtn.classList.contains('liked')) {
      const id = likeBtn.dataset.postId;
      const post = Storage.getPost(id);
      if (post) {
        const updated = Storage.updatePost(id, { likes: post.likes + 1 });
        if (updated) {
          Timeline.updatePostReactions(id, updated.likes);
          likeBtn.querySelector('.action-icon').textContent = '❤️';
          likeBtn.classList.add('liked');
        }
      }
    }
    if (rtBtn && !rtBtn.classList.contains('retweeted')) {
      const id = rtBtn.dataset.postId;
      const post = Storage.getPost(id);
      if (post) {
        const updated = Storage.updatePost(id, { retweets: post.retweets + 1 });
        if (updated) {
          Timeline.updatePostReactions(id, undefined, updated.retweets);
          rtBtn.querySelector('.action-icon').textContent = '🔄';
          rtBtn.classList.add('retweeted');
        }
      }
    }
    if (replyBtn) openReplyModal(replyBtn.dataset.postId);
  });

  // ===== REPLY MODAL =====
  const replyTextarea = document.getElementById('reply-textarea');
  const replySubmit   = document.getElementById('reply-submit');
  const replyCC       = document.getElementById('reply-char-count');

  replyTextarea.addEventListener('input', () => {
    const len = replyTextarea.value.length;
    replyCC.textContent = `${len}/280`;
    replySubmit.disabled = len === 0 || len > 280;
  });

  document.getElementById('reply-close').addEventListener('click', closeReplyModal);
  document.getElementById('reply-backdrop').addEventListener('click', closeReplyModal);

  replySubmit.addEventListener('click', () => {
    const text = replyTextarea.value.trim();
    if (!text || !window._replyTargetId) return;
    const targetId = window._replyTargetId;
    const reply = {
      id: `user_reply_${Date.now()}`, type: 'reply',
      parentId: targetId, author: null,
      text, timestamp: Date.now(),
      likes: 0, retweets: 0, replies: 0, isUserPost: true
    };
    Storage.addPost(reply);
    Timeline.addReply(reply);
    const parent = Storage.getPost(targetId);
    if (parent) {
      const updated = Storage.updatePost(targetId, { replies: (parent.replies || 0) + 1 });
      if (updated) Timeline.updatePostReactions(targetId, undefined, undefined, updated.replies);
    }
    closeReplyModal();
    Reactions.scheduleCharacterInteraction(reply.id);
  });

  // ===== SETTINGS =====
  setupAvatarUpload('user-avatar-input',   'user-avatar-preview',   'user-avatar-remove',   'userAvatar');
  setupAvatarUpload('kaoru-avatar-input',  'kaoru-avatar-preview',  'kaoru-avatar-remove',  'kaoruAvatar');
  setupAvatarUpload('kasumi-avatar-input', 'kasumi-avatar-preview',  'kasumi-avatar-remove', 'kasumiAvatar');

  document.getElementById('settings-save').addEventListener('click', () => {
    const settings = Storage.getUserSettings();
    settings.userName = document.getElementById('user-display-name').value.trim() || 'あなた';
    Storage.saveUserSettings(settings);
    applySettings();
    if (Storage.getPosts().length > 0) Timeline.render(Storage.getPosts());
    Notifications.show('設定を保存しました ✓', 'default');
  });

  scheduleCharacterPosts();
  reactivateRecentPosts();
});

// ===== VIEW SWITCHING =====
function switchView(name) {
  document.querySelectorAll('.nav-item, .bottom-item').forEach(n => n.classList.remove('active'));
  document.querySelectorAll(`[data-view="${name}"]`).forEach(n => n.classList.add('active'));
  document.querySelectorAll('.view').forEach(v => { v.hidden = true; });
  document.getElementById(`view-${name}`).hidden = false;
  if (name === 'notifs') NotifList.clearBadge();
}

// ===== REPLY MODAL =====
function openReplyModal(postId) {
  window._replyTargetId = postId;
  const post = Storage.getPost(postId);
  if (!post) return;

  const { av, name, handle, cls } = Timeline._authorInfo(post);
  const time = Timeline._formatTime(post.timestamp);
  document.getElementById('reply-parent').innerHTML = `
    <div class="reply-parent-inner">
      <div class="reply-parent-av-col">
        <div class="${cls}">${av}</div>
        <div class="reply-thread-line"></div>
      </div>
      <div class="reply-parent-body">
        <div class="post-meta">
          <span class="author-name">${Timeline._escape(name)}</span>
          <span class="author-handle">${handle}</span>
          <span class="post-time">${time}</span>
        </div>
        <div class="post-content">${Timeline._escape(post.text)}</div>
        <div class="reply-hint">返信先: <span class="reply-hint-name">${Timeline._escape(name)}</span></div>
      </div>
    </div>`;

  const s = Storage.getUserSettings();
  const av2 = document.getElementById('reply-avatar');
  if (s.userAvatar) {
    av2.innerHTML = `<img src="${s.userAvatar}" class="avatar-img" alt="">`;
    av2.style.background = 'transparent';
    av2.style.fontSize = '0';
  } else {
    av2.innerHTML = '👤';
    av2.style.background = '';
    av2.style.fontSize = '';
  }

  document.getElementById('reply-modal').classList.remove('hidden');
  setTimeout(() => document.getElementById('reply-textarea').focus(), 100);
}

function closeReplyModal() {
  document.getElementById('reply-modal').classList.add('hidden');
  document.getElementById('reply-textarea').value = '';
  document.getElementById('reply-submit').disabled = true;
  document.getElementById('reply-char-count').textContent = '0/280';
  window._replyTargetId = null;
}

// ===== SETTINGS HELPERS =====
function setupAvatarUpload(inputId, previewId, removeId, key) {
  document.getElementById(inputId).addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const s = Storage.getUserSettings();
      s[key] = ev.target.result;
      Storage.saveUserSettings(s);
      _setPreview(previewId, ev.target.result);
      applySettings();
    };
    reader.readAsDataURL(file);
  });
  document.getElementById(removeId).addEventListener('click', () => {
    const s = Storage.getUserSettings();
    delete s[key];
    Storage.saveUserSettings(s);
    document.getElementById(inputId).value = '';
    _clearPreview(previewId, key);
    applySettings();
    if (Storage.getPosts().length > 0) Timeline.render(Storage.getPosts());
  });
}

function _setPreview(id, src) {
  const el = document.getElementById(id);
  if (!el) return;
  el.innerHTML = `<img src="${src}" class="avatar-img" alt="">`;
  el.style.background = 'transparent';
  el.style.fontSize = '0';
}

function _clearPreview(id, key) {
  const el = document.getElementById(id);
  if (!el) return;
  const fb = { userAvatar: '👤', kaoruAvatar: '🌸', kasumiAvatar: '❄️' };
  el.innerHTML = fb[key] || '👤';
  el.style.background = '';
  el.style.fontSize = '';
}

function applySettings() {
  const s = Storage.getUserSettings();
  // display name input
  const nameInput = document.getElementById('user-display-name');
  if (nameInput) nameInput.value = s.userName || '';
  // compose avatar
  _applyAv(document.getElementById('compose-avatar'), s.userAvatar, '👤');
  // reply avatar
  _applyAv(document.getElementById('reply-avatar'), s.userAvatar, '👤');
  // settings previews
  s.userAvatar   ? _setPreview('user-avatar-preview',   s.userAvatar)   : _clearPreview('user-avatar-preview',   'userAvatar');
  s.kaoruAvatar  ? _setPreview('kaoru-avatar-preview',  s.kaoruAvatar)  : _clearPreview('kaoru-avatar-preview',  'kaoruAvatar');
  s.kasumiAvatar ? _setPreview('kasumi-avatar-preview', s.kasumiAvatar) : _clearPreview('kasumi-avatar-preview', 'kasumiAvatar');
  // sidebar chars
  _applyAv(document.getElementById('sidebar-kaoru'),  s.kaoruAvatar,  '🌸');
  _applyAv(document.getElementById('sidebar-kasumi'), s.kasumiAvatar, '❄️');
}

function _applyAv(el, src, fallback) {
  if (!el) return;
  if (src) {
    el.innerHTML = `<img src="${src}" class="avatar-img" alt="">`;
    el.style.background = 'transparent';
    el.style.fontSize = '0';
  } else {
    el.innerHTML = fallback;
    el.style.background = '';
    el.style.fontSize = '';
  }
}

// ===== SEED + SCHEDULE =====
function seedInitialPosts() {
  const now = Date.now();
  [
    {
      id: 'kaoru_init_1', type: 'post', parentId: null,
      text: 'ここに来てくれてありがとう～！✨ここはあなただけのプライベートな場所やで。安心して呟いてな🌸',
      timestamp: now - 600000, likes: 3, retweets: 1, replies: 0,
      isUserPost: false, isCharacterPost: true,
      author: { name: '薫', handle: '@kaoru_here', isCharacter: 'kaoru' }
    },
    {
      id: 'kasumi_init_1', type: 'post', parentId: null,
      text: '…別に、大したことじゃないけど。ここには誰も来ないから、何でも言っていいわよ。',
      timestamp: now - 300000, likes: 2, retweets: 0, replies: 0,
      isUserPost: false, isCharacterPost: true,
      author: { name: '霞', handle: '@kasumi_watch', isCharacter: 'kasumi' }
    }
  ].forEach(p => Storage.addPost(p));
  Timeline.render(Storage.getPosts());
}

function scheduleCharacterPosts() {
  function nextKaoru() {
    setTimeout(() => {
      const post = {
        id: `kaoru_${Date.now()}`, type: 'post', parentId: null,
        text: Characters.getRandomKaoruPost(), timestamp: Date.now(),
        likes: Math.floor(Math.random() * 4) + 1, retweets: Math.floor(Math.random() * 2),
        replies: 0, isUserPost: false, isCharacterPost: true,
        author: { name: '薫', handle: '@kaoru_here', isCharacter: 'kaoru' }
      };
      Storage.addPost(post); Timeline.addPost(post);
      Notifications.show('薫が投稿しました 🌸', 'character');
      nextKaoru();
    }, 300000 + Math.random() * 300000);
  }
  function nextKasumi() {
    setTimeout(() => {
      const post = {
        id: `kasumi_${Date.now()}`, type: 'post', parentId: null,
        text: Characters.getRandomKasumiPost(), timestamp: Date.now(),
        likes: Math.floor(Math.random() * 3), retweets: Math.floor(Math.random() * 2),
        replies: 0, isUserPost: false, isCharacterPost: true,
        author: { name: '霞', handle: '@kasumi_watch', isCharacter: 'kasumi' }
      };
      Storage.addPost(post); Timeline.addPost(post);
      Notifications.show('霞が投稿しました ❄️', 'character');
      nextKasumi();
    }, 480000 + Math.random() * 420000);
  }
  nextKaoru();
  nextKasumi();
}

function reactivateRecentPosts() {
  const now = Date.now();
  Storage.getPosts()
    .filter(p => p.isUserPost && !p.parentId && (now - p.timestamp) < 300000)
    .forEach(p => Reactions.scheduleReactions(p.id, p.isBuzz));
}
