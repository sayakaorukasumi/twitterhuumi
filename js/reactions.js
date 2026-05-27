const Reactions = {
  isBuzzPost() { return Math.random() < 0.05; },

  scheduleReactions(postId, isBuzz) {
    const count    = isBuzz ? 15 : 12;
    const maxDelay = isBuzz ? 90000 : 360000;

    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        const post = Storage.getPost(postId);
        if (!post) return;
        let likeInc = isBuzz ? Math.floor(Math.random() * 80) + 20 : (Math.random() < 0.6 ? 1 : 0);
        let rtInc   = isBuzz ? Math.floor(Math.random() * 30) + 5  : (Math.random() < 0.25 ? 1 : 0);
        if (likeInc === 0 && rtInc === 0) return;

        const updated = Storage.updatePost(postId, { likes: post.likes + likeInc, retweets: post.retweets + rtInc });
        if (!updated) return;
        Timeline.updatePostReactions(postId, updated.likes, updated.retweets);

        // Notification list: occasionally show a random liker
        if (likeInc > 0 && Math.random() < 0.35) {
          const u = Characters.getRandomPseudoReplier();
          NotifList.add({
            type: 'like',
            actorName: u.name,
            isCharacter: null,
            actionText: 'あなたの投稿をいいねしました',
            postPreview: post.text ? post.text.slice(0, 60) : ''
          });
        }

        if (isBuzz && updated.likes > 0 && updated.likes % 50 === 0) {
          Notifications.show(`${updated.likes}件のいいね！🔥`, 'buzz');
        } else if (!isBuzz && likeInc > 0 && updated.likes % 10 === 0 && updated.likes > 0) {
          Notifications.show('いいねが増えています ✨', 'reaction');
        }
      }, Math.random() * maxDelay + 5000);
    }
  },

  schedulePseudoReplies(postId) {
    const count = Math.floor(Math.random() * 3);
    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        const post = Storage.getPost(postId);
        if (!post) return;
        const replier = Characters.getRandomPseudoReplier();
        const reply = {
          id:              `reply_${Date.now()}_${Math.random().toString(36).slice(2)}`,
          type:            'reply', parentId: postId,
          author:          replier,
          text:            Characters.getRandomPseudoReply(),
          timestamp:       Date.now(),
          likes: 0, retweets: 0, replies: 0,
          isUserPost: false, isCharacterPost: false
        };
        Storage.addPost(reply);
        Timeline.addReply(reply);
        const updated = Storage.updatePost(postId, { replies: (post.replies || 0) + 1 });
        if (updated) Timeline.updatePostReactions(postId, undefined, undefined, updated.replies);

        Notifications.show(`${replier.name}さんが返信しました`, 'reply');
        NotifList.add({
          type: 'reply',
          actorName: replier.name,
          isCharacter: null,
          actionText: 'あなたの投稿に返信しました',
          postPreview: post.text ? post.text.slice(0, 60) : ''
        });
      }, 40000 + Math.random() * 200000 + i * 30000);
    }
  },

  scheduleCharacterInteraction(postId) {
    // 薫 — いいね
    if (Math.random() < 0.7) {
      setTimeout(() => {
        const post = Storage.getPost(postId);
        if (!post) return;
        const updated = Storage.updatePost(postId, { likes: post.likes + 1 });
        if (updated) {
          Timeline.updatePostReactions(postId, updated.likes);
          Notifications.show('薫がいいねしました 🌸', 'like');
          NotifList.add({
            type: 'like', actorName: '薫', isCharacter: 'kaoru',
            actionText: 'あなたの投稿をいいねしました',
            postPreview: post.text ? post.text.slice(0, 60) : ''
          });
        }
      }, 15000 + Math.random() * 45000);
    }

    // 薫 — リプライ
    if (Math.random() < 0.45) {
      setTimeout(() => {
        const post = Storage.getPost(postId);
        if (!post) return;
        const reply = {
          id: `kaoru_reply_${Date.now()}`, type: 'reply', parentId: postId,
          author: { name: '薫', handle: '@kaoru_here', isCharacter: 'kaoru' },
          text: Characters.getRandomKaoruReply(), timestamp: Date.now(),
          likes: 0, retweets: 0, replies: 0, isCharacterPost: true
        };
        Storage.addPost(reply);
        Timeline.addReply(reply);
        const updated = Storage.updatePost(postId, { replies: (post.replies || 0) + 1 });
        if (updated) Timeline.updatePostReactions(postId, undefined, undefined, updated.replies);
        Notifications.show('薫が返信しました 🌸', 'character');
        NotifList.add({
          type: 'reply', actorName: '薫', isCharacter: 'kaoru',
          actionText: 'あなたの投稿に返信しました',
          postPreview: post.text ? post.text.slice(0, 60) : ''
        });
      }, 60000 + Math.random() * 120000);
    }

    // 霞 — いいね
    if (Math.random() < 0.4) {
      setTimeout(() => {
        const post = Storage.getPost(postId);
        if (!post) return;
        const updated = Storage.updatePost(postId, { likes: post.likes + 1 });
        if (updated) {
          Timeline.updatePostReactions(postId, updated.likes);
          Notifications.show('霞がいいねしました ❄️', 'like');
          NotifList.add({
            type: 'like', actorName: '霞', isCharacter: 'kasumi',
            actionText: 'あなたの投稿をいいねしました',
            postPreview: post.text ? post.text.slice(0, 60) : ''
          });
        }
      }, 60000 + Math.random() * 120000);
    }

    // 霞 — リプライ
    if (Math.random() < 0.25) {
      setTimeout(() => {
        const post = Storage.getPost(postId);
        if (!post) return;
        const reply = {
          id: `kasumi_reply_${Date.now()}`, type: 'reply', parentId: postId,
          author: { name: '霞', handle: '@kasumi_watch', isCharacter: 'kasumi' },
          text: Characters.getRandomKasumiReply(), timestamp: Date.now(),
          likes: 0, retweets: 0, replies: 0, isCharacterPost: true
        };
        Storage.addPost(reply);
        Timeline.addReply(reply);
        const updated = Storage.updatePost(postId, { replies: (post.replies || 0) + 1 });
        if (updated) Timeline.updatePostReactions(postId, undefined, undefined, updated.replies);
        Notifications.show('霞が返信しました ❄️', 'character');
        NotifList.add({
          type: 'reply', actorName: '霞', isCharacter: 'kasumi',
          actionText: 'あなたの投稿に返信しました',
          postPreview: post.text ? post.text.slice(0, 60) : ''
        });
      }, 120000 + Math.random() * 180000);
    }
  }
};
