const Reactions = {
  isBuzzPost() {
    const r = Math.random();
    if (r < 0.05)  return 'big';   // 5% — 大バズ
    if (r < 0.20)  return 'mini';  // 15% — プチバズ
    return false;
  },

  scheduleReactions(postId, buzzType) {
    const isBig  = buzzType === 'big'  || buzzType === true;
    const isMini = buzzType === 'mini';
    const count    = isBig ? 30 : 25;
    const maxDelay = isBig ? 120000 : (isMini ? 300000 : 600000);

    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        const post = Storage.getPost(postId);
        if (!post) return;
        let likeInc, rtInc;
        if (isBig) {
          likeInc = Math.floor(Math.random() * 60) + 20;
          rtInc   = Math.floor(Math.random() * 20) + 5;
        } else if (isMini) {
          likeInc = Math.floor(Math.random() * 8) + 3;
          rtInc   = Math.random() < 0.5 ? 1 : 0;
        } else {
          const r = Math.random();
          likeInc = r < 0.75 ? 1 : r < 0.90 ? 2 : r < 0.97 ? 3 : 0;
          rtInc   = Math.random() < 0.35 ? 1 : 0;
        }
        if (likeInc === 0 && rtInc === 0) return;

        const updated = Storage.updatePost(postId, { likes: post.likes + likeInc, retweets: post.retweets + rtInc });
        if (!updated) return;
        Timeline.updatePostReactions(postId, updated.likes, updated.retweets);

        if (likeInc > 0 && Math.random() < 0.45) {
          const u = Characters.getRandomPseudoReplier();
          NotifList.add({
            type: 'like', actorName: u.name, isCharacter: null,
            actionText: 'あなたの投稿をいいねしました',
            postPreview: post.text ? post.text.slice(0, 60) : ''
          });
        }

        if (isBig && updated.likes > 0 && updated.likes % 100 === 0) {
          Notifications.show(`${updated.likes}件のいいね！🔥🔥`, 'buzz');
        } else if (isMini && updated.likes > 0 && updated.likes % 30 === 0) {
          Notifications.show(`${updated.likes}件のいいね！🔥`, 'buzz');
        } else if (!isBig && !isMini && updated.likes > 0 && updated.likes % 10 === 0) {
          Notifications.show('いいねが増えています ✨', 'reaction');
        }
      }, Math.random() * maxDelay + 3000);
    }
  },

  schedulePseudoReplies(postId) {
    const count = Math.floor(Math.random() * 3) + 1;
    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        const post = Storage.getPost(postId);
        if (!post) return;
        const replier = Characters.getRandomPseudoReplier();
        const reply = {
          id:        `reply_${Date.now()}_${Math.random().toString(36).slice(2)}`,
          type:      'reply', parentId: postId,
          author:    replier,
          text:      Characters.getRandomPseudoReply(),
          timestamp: Date.now(),
          likes: 0, retweets: 0, replies: 0,
          isUserPost: false, isCharacterPost: false
        };
        Storage.addPost(reply);
        Timeline.addReply(reply);
        const updated = Storage.updatePost(postId, { replies: (post.replies || 0) + 1 });
        if (updated) Timeline.updatePostReactions(postId, undefined, undefined, updated.replies);
        Notifications.show(`${replier.name}さんが返信しました`, 'reply');
        NotifList.add({
          type: 'reply', actorName: replier.name, isCharacter: null,
          actionText: 'あなたの投稿に返信しました',
          postPreview: post.text ? post.text.slice(0, 60) : ''
        });
      }, 10000 + Math.random() * 80000 + i * 20000);
    }
  },

  scheduleCharacterInteraction(postId) {
    if (Math.random() < 0.88) {
      setTimeout(() => {
        const post = Storage.getPost(postId);
        if (!post) return;
        const updated = Storage.updatePost(postId, { likes: post.likes + 1 });
        if (updated) {
          Timeline.updatePostReactions(postId, updated.likes);
          Notifications.show('薫がいいねしました 🌸', 'like');
          NotifList.add({ type: 'like', actorName: '薫', isCharacter: 'kaoru', actionText: 'あなたの投稿をいいねしました', postPreview: post.text ? post.text.slice(0, 60) : '' });
        }
      }, 5000 + Math.random() * 25000);
    }
    if (Math.random() < 0.65) {
      setTimeout(() => {
        const post = Storage.getPost(postId);
        if (!post) return;
        const reply = {
          id: `kaoru_reply_${Date.now()}`, type: 'reply', parentId: postId,
          author: { name: '薫', handle: '@kaoru_here', isCharacter: 'kaoru' },
          text: Characters.getRandomKaoruReply(), timestamp: Date.now(),
          likes: 0, retweets: 0, replies: 0, isCharacterPost: true
        };
        Storage.addPost(reply); Timeline.addReply(reply);
        const updated = Storage.updatePost(postId, { replies: (post.replies || 0) + 1 });
        if (updated) Timeline.updatePostReactions(postId, undefined, undefined, updated.replies);
        Notifications.show('薫が返信しました 🌸', 'character');
        NotifList.add({ type: 'reply', actorName: '薫', isCharacter: 'kaoru', actionText: 'あなたの投稿に返信しました', postPreview: post.text ? post.text.slice(0, 60) : '' });
      }, 20000 + Math.random() * 70000);
    }
    if (Math.random() < 0.65) {
      setTimeout(() => {
        const post = Storage.getPost(postId);
        if (!post) return;
        const updated = Storage.updatePost(postId, { likes: post.likes + 1 });
        if (updated) {
          Timeline.updatePostReactions(postId, updated.likes);
          Notifications.show('霞がいいねしました ❄️', 'like');
          NotifList.add({ type: 'like', actorName: '霞', isCharacter: 'kasumi', actionText: 'あなたの投稿をいいねしました', postPreview: post.text ? post.text.slice(0, 60) : '' });
        }
      }, 30000 + Math.random() * 60000);
    }
    if (Math.random() < 0.40) {
      setTimeout(() => {
        const post = Storage.getPost(postId);
        if (!post) return;
        const reply = {
          id: `kasumi_reply_${Date.now()}`, type: 'reply', parentId: postId,
          author: { name: '霞', handle: '@kasumi_watch', isCharacter: 'kasumi' },
          text: Characters.getRandomKasumiReply(), timestamp: Date.now(),
          likes: 0, retweets: 0, replies: 0, isCharacterPost: true
        };
        Storage.addPost(reply); Timeline.addReply(reply);
        const updated = Storage.updatePost(postId, { replies: (post.replies || 0) + 1 });
        if (updated) Timeline.updatePostReactions(postId, undefined, undefined, updated.replies);
        Notifications.show('霞が返信しました ❄️', 'character');
        NotifList.add({ type: 'reply', actorName: '霞', isCharacter: 'kasumi', actionText: 'あなたの投稿に返信しました', postPreview: post.text ? post.text.slice(0, 60) : '' });
      }, 60000 + Math.random() * 120000);
    }
  }
};
