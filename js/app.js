document.addEventListener('DOMContentLoaded', () => {
  Notifications.init(document.getElementById('notifications'));
  Timeline.init(document.getElementById('timeline'));

  if (Storage.getPosts().length === 0) seedInitialPosts();

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
    submitBtn.disabled = (len === 0 || len > 280);
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
      const wrap = mediaPreview.querySelector('.preview-wrap');
      const btn = document.createElement('button');
      btn.className = 'remove-media';
      btn.type = 'button';
      btn.textContent = '✕';
      btn.onclick = () => { pendingMedia = null; mediaPreview.innerHTML = ''; mediaInput.value = ''; };
      wrap.appendChild(btn);
    };
    reader.readAsDataURL(file);
  });

  form.addEventListener('submit', e => {
    e.preventDefault();
    const text = textarea.value.trim();
    if (!text) return;

    const isBuzz = Reactions.isBuzzPost();
    const post = {
      id: `post_${Date.now()}`,
      type: 'post', parentId: null,
      text, timestamp: Date.now(),
      likes: 0, retweets: 0, replies: 0,
      isUserPost: true, isBuzz,
      media: pendingMedia
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

  document.getElementById('timeline').addEventListener('click', e => {
    const likeBtn = e.target.closest('.like-btn');
    const rtBtn   = e.target.closest('.rt-btn');

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
  });

  scheduleCharacterPosts();
  reactivateRecentPosts();
});

function seedInitialPosts() {
  const now = Date.now();
  const posts = [
    {
      id: 'kaoru_init_1', type: 'post', parentId: null,
      text: 'ここに来てくれてありがとう～！✨ここはあなただけのプライベートな場所やで。安心して呟いてな🌸',
      timestamp: now - 600000,
      likes: 3, retweets: 1, replies: 0,
      isUserPost: false, isCharacterPost: true,
      author: { name: '薫', handle: '@kaoru_here', isCharacter: 'kaoru' }
    },
    {
      id: 'kasumi_init_1', type: 'post', parentId: null,
      text: '…別に、大したことじゃないけど。ここには誰も来ないから、何でも言っていいわよ。',
      timestamp: now - 300000,
      likes: 2, retweets: 0, replies: 0,
      isUserPost: false, isCharacterPost: true,
      author: { name: '霞', handle: '@kasumi_watch', isCharacter: 'kasumi' }
    }
  ];
  posts.forEach(p => Storage.addPost(p));
  Timeline.render(Storage.getPosts());
}

function scheduleCharacterPosts() {
  function nextKaoru() {
    setTimeout(() => {
      const post = {
        id: `kaoru_${Date.now()}`,
        type: 'post', parentId: null,
        text: Characters.getRandomKaoruPost(),
        timestamp: Date.now(),
        likes: Math.floor(Math.random() * 4) + 1,
        retweets: Math.floor(Math.random() * 2),
        replies: 0,
        isUserPost: false, isCharacterPost: true,
        author: { name: '薫', handle: '@kaoru_here', isCharacter: 'kaoru' }
      };
      Storage.addPost(post);
      Timeline.addPost(post);
      Notifications.show('薫が投稿しました 🌸', 'character');
      nextKaoru();
    }, 300000 + Math.random() * 300000);
  }

  function nextKasumi() {
    setTimeout(() => {
      const post = {
        id: `kasumi_${Date.now()}`,
        type: 'post', parentId: null,
        text: Characters.getRandomKasumiPost(),
        timestamp: Date.now(),
        likes: Math.floor(Math.random() * 3),
        retweets: Math.floor(Math.random() * 2),
        replies: 0,
        isUserPost: false, isCharacterPost: true,
        author: { name: '霞', handle: '@kasumi_watch', isCharacter: 'kasumi' }
      };
      Storage.addPost(post);
      Timeline.addPost(post);
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
