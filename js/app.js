(function(){try{var V='20260529g';if(localStorage.getItem('_appv')!==V){localStorage.setItem('_appv',V);window.location.reload(true);}}catch(e){}})();

document.addEventListener('DOMContentLoaded', () => {
  Notifications.init(document.getElementById('notifications'));
  NotifList.init(document.getElementById('notif-list'));
  Timeline.init(document.getElementById('timeline'));
  applySettings();
  if (Storage.getPosts().length === 0) seedInitialPosts();
  catchUpWhileAway();
  // バージョン確認用：ホーム見出しに現在のコードバージョンを表示
  const _hdr = document.querySelector('#view-home .timeline-header h1');
  if (_hdr) _hdr.textContent = 'ホーム (g)';

  document.querySelectorAll('[data-view]').forEach(item => {
    item.addEventListener('click', e => {
      e.preventDefault();
      switchView(item.dataset.view);
    });
  });

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
    const buzzType = Reactions.isBuzzPost();
    const post = {
      id: `post_${Date.now()}`, type: 'post', parentId: null,
      text, timestamp: Date.now(),
      likes: 0, retweets: 0, replies: 0,
      isUserPost: true, isBuzz: buzzType, media: pendingMedia
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
    Notifications.show(
      buzzType === 'big'  ? '大バズの予感…！ 🔥🔥🔥' :
      buzzType === 'mini' ? 'バズり始めてる…！ 🔥' :
      '投稿しました！',
      buzzType ? 'buzz' : 'default'
    );
    Reactions.scheduleReactions(post.id, buzzType);
    Reactions.schedulePseudoReplies(post.id);
    Reactions.scheduleCharacterInteraction(post.id);
    // 投稿の1秒後に最初の謎ユーザー通知を確実に届ける
    const _previewText = text.slice(0, 60);
    setTimeout(() => {
      const u = Characters.getRandomPseudoReplier();
      NotifList.add({ type: 'like', actorName: u.name, isCharacter: null, actionText: 'あなたの投稿をいいねしました', postPreview: _previewText });
      // バッジを直接強制表示（NotifListをバイパス）
      ['notif-badge','notif-badge-mobile'].forEach(function(id){
        var el=document.getElementById(id);
        if(el){el.textContent=String(NotifList._unread||'?');el.removeAttribute('style');}
      });
      Notifications.show('🔔 unread='+NotifList._unread+' c='+(NotifList.container?'ok':'null'), 'default');
    }, 1000);
  });

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
  startLikeHeartbeat();
});

function switchView(name) {
  document.querySelectorAll('.nav-item, .bottom-item').forEach(n => n.classList.remove('active'));
  document.querySelectorAll(`[data-view="${name}"]`).forEach(n => n.classList.add('active'));
  document.querySelectorAll('.view').forEach(v => { v.hidden = true; });
  document.getElementById(`view-${name}`).hidden = false;
  if (name === 'notifs') { NotifList._render(); NotifList.clearBadge(); }
}

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
    av2.style.background = 'transparent'; av2.style.fontSize = '0';
  } else {
    av2.innerHTML = '👤'; av2.style.background = ''; av2.style.fontSize = '';
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

function setupAvatarUpload(inputId, previewId, removeId, key) {
  document.getElementById(inputId).addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      _compressAvatar(ev.target.result, compressed => {
        const s = Storage.getUserSettings();
        s[key] = compressed;
        const ok = Storage.saveUserSettings(s);
        if (!ok) { Notifications.show('画像が大きすぎて保存できませんでした', 'default'); return; }
        applySettings();
        if (Storage.getPosts().length > 0) Timeline.render(Storage.getPosts());
      });
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
  el.style.background = 'transparent'; el.style.fontSize = '0';
}
function _clearPreview(id, key) {
  const el = document.getElementById(id);
  if (!el) return;
  const fb = { userAvatar: '👤', kaoruAvatar: '🌸', kasumiAvatar: '❄️' };
  el.innerHTML = fb[key] || '👤';
  el.style.background = ''; el.style.fontSize = '';
}
function applySettings() {
  const s = Storage.getUserSettings();
  const nameInput = document.getElementById('user-display-name');
  if (nameInput) nameInput.value = s.userName || '';
  _applyAv(document.getElementById('compose-avatar'), s.userAvatar, '👤');
  _applyAv(document.getElementById('reply-avatar'),   s.userAvatar, '👤');
  s.userAvatar   ? _setPreview('user-avatar-preview',   s.userAvatar)   : _clearPreview('user-avatar-preview',   'userAvatar');
  s.kaoruAvatar  ? _setPreview('kaoru-avatar-preview',  s.kaoruAvatar)  : _clearPreview('kaoru-avatar-preview',  'kaoruAvatar');
  s.kasumiAvatar ? _setPreview('kasumi-avatar-preview', s.kasumiAvatar) : _clearPreview('kasumi-avatar-preview', 'kasumiAvatar');
  _applyAv(document.getElementById('sidebar-kaoru'),  s.kaoruAvatar,  '🌸');
  _applyAv(document.getElementById('sidebar-kasumi'), s.kasumiAvatar, '❄️');
}
function _applyAv(el, src, fallback) {
  if (!el) return;
  if (src) {
    el.innerHTML = `<img src="${src}" class="avatar-img" alt="">`;
    el.style.background = 'transparent'; el.style.fontSize = '0';
  } else {
    el.innerHTML = fallback; el.style.background = ''; el.style.fontSize = '';
  }
}
function _compressAvatar(dataUrl, callback) {
  const img = new Image();
  img.onload = () => {
    const MAX = 300;
    const ratio = Math.min(MAX / img.width, MAX / img.height, 1);
    const canvas = document.createElement('canvas');
    canvas.width  = Math.round(img.width  * ratio);
    canvas.height = Math.round(img.height * ratio);
    canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
    callback(canvas.toDataURL('image/jpeg', 0.75));
  };
  img.onerror = () => callback(dataUrl);
  img.src = dataUrl;
}

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
      const pd = Characters.getRandomKaoruPost();
      const post = {
        id: `kaoru_${Date.now()}`, type: 'post', parentId: null,
        text: pd.text,
        media: pd.image ? { type: 'image', data: pd.image } : null,
        timestamp: Date.now(),
        likes: Math.floor(Math.random() * 4) + 1, retweets: Math.floor(Math.random() * 2),
        replies: 0, isUserPost: false, isCharacterPost: true,
        author: { name: '薫', handle: '@kaoru_here', isCharacter: 'kaoru' }
      };
      Storage.addPost(post); Timeline.addPost(post);
      Notifications.show('薫が投稿しました 🌸', 'character');
      nextKaoru();
    }, 9000000 + Math.random() * 3600000);
  }
  function nextKasumi() {
    setTimeout(() => {
      const pd = Characters.getRandomKasumiPost();
      const post = {
        id: `kasumi_${Date.now()}`, type: 'post', parentId: null,
        text: pd.text,
        media: pd.image ? { type: 'image', data: pd.image } : null,
        timestamp: Date.now(),
        likes: Math.floor(Math.random() * 3), retweets: Math.floor(Math.random() * 2),
        replies: 0, isUserPost: false, isCharacterPost: true,
        author: { name: '霞', handle: '@kasumi_watch', isCharacter: 'kasumi' }
      };
      Storage.addPost(post); Timeline.addPost(post);
      Notifications.show('霞が投稿しました ❄️', 'character');
      nextKasumi();
    }, 10800000 + Math.random() * 3600000);
  }
  nextKaoru();
  nextKasumi();
}

// ===== 留守中キャッチアップ =====
// このアプリはサーバーを持たないため、閉じている間は薫・霞のタイマーが止まる。
// そこで「前回開いてから経過した時間」を元に、留守中に投稿・反応があったかのように
// 過去の時刻付きでまとめて生成する。これで久しぶりに開いても新着が溜まって見える。
function catchUpWhileAway() {
  const KEY = 'twitterhuumi_last_visit';
  const now = Date.now();
  const stored = parseInt(localStorage.getItem(KEY), 10);
  localStorage.setItem(KEY, String(now));

  // 初回訪問は記録だけ。25分未満ならライブのタイマーに任せる
  if (!stored || isNaN(stored)) return;
  const elapsed = now - stored;
  if (elapsed < 1500000) return;

  // 経過時間内のランダムな時刻（i番目のスロット内）を返す
  const slotTs = (i, count) => {
    const start = stored + (elapsed * i / count);
    const end   = stored + (elapsed * (i + 1) / count);
    return Math.floor(start + Math.random() * (end - start));
  };

  // 留守中に溜める通知（自前のタイムスタンプ付きで後でまとめて反映）
  const pendingNotifs = [];
  const pushNotif = (n, ts) => pendingNotifs.push({
    ...n, id: `nf_${ts}_${Math.random().toString(36).slice(2)}`, timestamp: ts
  });

  // ---- 薫・霞の留守中投稿（薫:約3h / 霞:約3.5h ごと・各最大4件）----
  const kaoruCount  = Math.min(Math.floor(elapsed / 10800000), 4);
  const kasumiCount = Math.min(Math.floor(elapsed / 12600000), 4);

  for (let i = 0; i < kaoruCount; i++) {
    const ts = slotTs(i, kaoruCount);
    const pd = Characters.getRandomKaoruPost();
    Storage.addPost({
      id: `kaoru_away_${ts}_${i}`, type: 'post', parentId: null,
      text: pd.text, media: pd.image ? { type: 'image', data: pd.image } : null,
      timestamp: ts,
      likes: Math.floor(Math.random() * 4) + 1, retweets: Math.floor(Math.random() * 2),
      replies: 0, isUserPost: false, isCharacterPost: true,
      author: { name: '薫', handle: '@kaoru_here', isCharacter: 'kaoru' }
    });
  }
  for (let i = 0; i < kasumiCount; i++) {
    const ts = slotTs(i, kasumiCount);
    const pd = Characters.getRandomKasumiPost();
    Storage.addPost({
      id: `kasumi_away_${ts}_${i}`, type: 'post', parentId: null,
      text: pd.text, media: pd.image ? { type: 'image', data: pd.image } : null,
      timestamp: ts,
      likes: Math.floor(Math.random() * 3), retweets: Math.floor(Math.random() * 2),
      replies: 0, isUserPost: false, isCharacterPost: true,
      author: { name: '霞', handle: '@kasumi_watch', isCharacter: 'kasumi' }
    });
  }

  // ---- 留守中、ユーザーの最近(24h以内)の投稿に届いた反応 ----
  const recentUserPosts = Storage.getPosts()
    .filter(p => p.isUserPost && !p.parentId && (now - p.timestamp) < 86400000)
    .slice(0, 3);

  recentUserPosts.forEach((p, idx) => {
    const preview = p.text ? p.text.slice(0, 60) : '';
    const fresh0 = Storage.getPost(p.id) || p;
    let likeAdd = 0, rtAdd = 0, addedReplies = 0;
    let flagKaoru = false, flagKasumi = false;

    // --- 謎ユーザーからのいいね（30分あたり2〜5・最大50）---
    const pseudoLikes = Math.min((Math.floor(elapsed / 1800000) + 1) * (Math.floor(Math.random() * 4) + 2), 50);
    likeAdd += pseudoLikes;
    // 通知は4いいねごとに1件・最大6件、それぞれ別の謎ユーザー名義
    const likeNotifCount = Math.min(Math.ceil(pseudoLikes / 4), 6);
    for (let n = 0; n < likeNotifCount; n++) {
      const u = Characters.getRandomPseudoReplier();
      const ts = stored + Math.floor(Math.random() * elapsed);
      pushNotif({ type: 'like', actorName: u.name, isCharacter: null, actionText: 'あなたの投稿をいいねしました', postPreview: preview }, ts);
    }

    // --- 謎ユーザーからのRT（0〜3件）---
    const pseudoRts = Math.min(Math.floor(elapsed / 5400000), 2) + (Math.random() < 0.5 ? 1 : 0);
    rtAdd += pseudoRts;
    for (let n = 0; n < pseudoRts; n++) {
      const u = Characters.getRandomPseudoReplier();
      const ts = stored + Math.floor(Math.random() * elapsed);
      pushNotif({ type: 'retweet', actorName: u.name, isCharacter: null, actionText: 'あなたの投稿をリツイートしました', postPreview: preview }, ts);
    }

    // --- 薫のいいね（1投稿1回まで）---
    if (!fresh0.likedByKaoru && Math.random() < 0.8) {
      likeAdd += 1; flagKaoru = true;
      const ts = stored + Math.floor(Math.random() * elapsed);
      pushNotif({ type: 'like', actorName: '薫', isCharacter: 'kaoru', actionText: 'あなたの投稿をいいねしました', postPreview: preview }, ts);
    }
    // --- 霞のいいね（1投稿1回まで）---
    if (!fresh0.likedByKasumi && Math.random() < 0.6) {
      likeAdd += 1; flagKasumi = true;
      const ts = stored + Math.floor(Math.random() * elapsed);
      pushNotif({ type: 'like', actorName: '霞', isCharacter: 'kasumi', actionText: 'あなたの投稿をいいねしました', postPreview: preview }, ts);
    }

    // --- 薫のリプライ ---
    if (Math.random() < 0.55) {
      const ts = stored + Math.floor(Math.random() * elapsed);
      Storage.addPost({
        id: `kaoru_away_reply_${ts}_${idx}`, type: 'reply', parentId: p.id,
        author: { name: '薫', handle: '@kaoru_here', isCharacter: 'kaoru' },
        text: Characters.getRandomKaoruReply(), timestamp: ts,
        likes: 0, retweets: 0, replies: 0, isCharacterPost: true
      });
      addedReplies++;
      pushNotif({ type: 'reply', actorName: '薫', isCharacter: 'kaoru', actionText: 'あなたの投稿に返信しました', postPreview: preview }, ts);
    }
    // --- 霞のリプライ ---
    if (Math.random() < 0.4) {
      const ts = stored + Math.floor(Math.random() * elapsed);
      Storage.addPost({
        id: `kasumi_away_reply_${ts}_${idx}`, type: 'reply', parentId: p.id,
        author: { name: '霞', handle: '@kasumi_watch', isCharacter: 'kasumi' },
        text: Characters.getRandomKasumiReply(), timestamp: ts,
        likes: 0, retweets: 0, replies: 0, isCharacterPost: true
      });
      addedReplies++;
      pushNotif({ type: 'reply', actorName: '霞', isCharacter: 'kasumi', actionText: 'あなたの投稿に返信しました', postPreview: preview }, ts);
    }
    // --- 謎ユーザーのリプライ（1〜2件）---
    const pseudoReplyCount = Math.random() < 0.6 ? (Math.floor(Math.random() * 2) + 1) : 0;
    for (let j = 0; j < pseudoReplyCount; j++) {
      const u = Characters.getRandomPseudoReplier();
      const ts = stored + Math.floor(Math.random() * elapsed);
      Storage.addPost({
        id: `pseudo_away_reply_${ts}_${idx}_${j}`, type: 'reply', parentId: p.id,
        author: u, text: Characters.getRandomPseudoReply(), timestamp: ts,
        likes: 0, retweets: 0, replies: 0, isUserPost: false, isCharacterPost: false
      });
      addedReplies++;
      pushNotif({ type: 'reply', actorName: u.name, isCharacter: null, actionText: 'あなたの投稿に返信しました', postPreview: preview }, ts);
    }

    // 投稿のカウントをまとめて更新
    const fresh = Storage.getPost(p.id);
    if (fresh) {
      const patch = {
        likes:    (fresh.likes || 0) + likeAdd,
        retweets: (fresh.retweets || 0) + rtAdd,
        replies:  (fresh.replies || 0) + addedReplies
      };
      if (flagKaoru)  patch.likedByKaoru  = true;
      if (flagKasumi) patch.likedByKasumi = true;
      Storage.updatePost(p.id, patch);
    }
  });

  // タイムラインと通知を更新（通知は古い順に入れて新しい順に並ぶよう）
  Timeline.render(Storage.getPosts());
  if (pendingNotifs.length) {
    pendingNotifs.sort((a, b) => a.timestamp - b.timestamp).forEach(n => Storage.addNotification(n));
    NotifList.refresh(pendingNotifs.length);
  }
}

const _repliedThisSession = new Set();

function reactivateRecentPosts() {
  const now = Date.now();
  const userPosts = Storage.getPosts()
    .filter(p => p.isUserPost && !p.parentId && (now - p.timestamp) < 5400000);
  userPosts.forEach((p, i) => {
    Reactions.scheduleReactions(p.id, p.isBuzz);
    setTimeout(() => Reactions.scheduleCharacterInteraction(p.id), i * 8000 + Math.random() * 5000);
    // セッションごとに1回だけ謎ユーザーリプライをスケジュール（storage件数に依存しない）
    if (!_repliedThisSession.has(p.id)) {
      _repliedThisSession.add(p.id);
      setTimeout(() => Reactions.schedulePseudoReplies(p.id), i * 3000 + 1000);
    }
  });
}

function startLikeHeartbeat() {
  setInterval(() => {
    const posts = Storage.getPosts().filter(p => p.isUserPost && !p.parentId);
    if (!posts.length) return;
    const post = posts[Math.floor(Math.random() * Math.min(posts.length, 5))];
    const preview = post.text ? post.text.slice(0, 60) : '';
    const r = Math.random();

    if (r < 0.05) {
      // 薫いいね（未いいね時のみ）
      if (post.likedByKaoru) return;
      const updated = Storage.updatePost(post.id, { likes: post.likes + 1, likedByKaoru: true });
      if (updated) {
        Timeline.updatePostReactions(post.id, updated.likes);
        Notifications.show('薫がいいねしました 🌸', 'like');
        NotifList.add({ type: 'like', actorName: '薫', isCharacter: 'kaoru', actionText: 'あなたの投稿をいいねしました', postPreview: preview });
      }
    } else if (r < 0.10) {
      // 霞いいね（未いいね時のみ）
      if (post.likedByKasumi) return;
      const updated = Storage.updatePost(post.id, { likes: post.likes + 1, likedByKasumi: true });
      if (updated) {
        Timeline.updatePostReactions(post.id, updated.likes);
        Notifications.show('霞がいいねしました ❄️', 'like');
        NotifList.add({ type: 'like', actorName: '霞', isCharacter: 'kasumi', actionText: 'あなたの投稿をいいねしました', postPreview: preview });
      }
    } else if (r < 0.75) {
      // 謎ユーザーからのいいね（2〜6件まとめて）
      const likeInc = Math.floor(Math.random() * 5) + 2;
      const updated = Storage.updatePost(post.id, { likes: post.likes + likeInc });
      if (updated) {
        Timeline.updatePostReactions(post.id, updated.likes);
        const u = Characters.getRandomPseudoReplier();
        NotifList.add({ type: 'like', actorName: u.name, isCharacter: null, actionText: 'あなたの投稿をいいねしました', postPreview: preview });
        if (updated.likes > 0 && updated.likes % 10 === 0) {
          Notifications.show('いいねが増えています ✨', 'reaction');
        }
      }
    } else if (r < 0.88) {
      // 謎ユーザーからのRT
      const rtInc = Math.random() < 0.6 ? 1 : 2;
      const updated = Storage.updatePost(post.id, { retweets: post.retweets + rtInc });
      if (updated) {
        Timeline.updatePostReactions(post.id, undefined, updated.retweets);
        const u = Characters.getRandomPseudoReplier();
        NotifList.add({ type: 'retweet', actorName: u.name, isCharacter: null, actionText: 'あなたの投稿をリツイートしました', postPreview: preview });
      }
    }
    // r >= 0.88 → 何もなし（静かな時間帯）
  }, 180000);
}
