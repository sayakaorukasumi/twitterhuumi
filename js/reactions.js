const Reactions = {
  isBuzzPost() {
    return Math.random() < 0.05;
  },

  scheduleReactions(postId, isBuzz) {
    const count    = isBuzz ? 15 : 12;
    const maxDelay = isBuzz ? 90000 : 360000;

    for (let i = 0; i < count; i++) {
      const delay = Math.random() * maxDelay + 5000;
      setTimeout(() => {
        const post = Storage.getPost(postId);
        if (!post) return;

        let likeInc, rtInc;
        if (isBuzz) {
          likeInc = Math.floor(Math.random() * 80) + 20;
          rtInc   = Math.floor(Math.random() * 30) + 5;
        } else {
          likeInc = Math.random() < 0.6 ? 1 : 0;
          rtInc   = Math.random() < 0.25 ? 1 : 0;
        }
        if (likeInc === 0 && rtInc === 0) return;

        const updated = Storage.updatePost(postId, {
          likes:    post.likes    + likeInc,
          retweets: post.retweets + rtInc
        });
        if (!updated) return;

        Timeline.updatePostReactions(postId, updated.likes, updated.retweets);

        if (isBuzz && updated.likes > 0 && updated.likes % 50 === 0) {
          Notifications.show(`${updated.likes}件のいいね！🔥`, 'buzz');
        } else if (!isBuzz && likeInc > 0 && updated.likes % 10 === 0 && updated.likes > 0) {
          Notifications.show(`いいねが増えています ✨`, 'reaction');
        }
      }, delay);
    }
  },

  schedulePseudoReplies(postId) {
    const count = Math.floor(Math.random() * 3);
    for (let i = 0; i < count; i++) {
      const delay = 40000 + Math.random() * 200000 + i * 30000;
      setTimeout(() => {
        const post = Storage.getPost(postId);
        if (!post) return;

        const replier = Characters.getRandomPseudoReplier();
        const reply = {
          id:              `reply_${Date.now()}_${Math.random().toString(36).slice(2)}`,
          type:            'reply',
          parentId:        postId,
          author:          replier,
          text:            Characters.getRandomPseudoReply(),
          timestamp:       Date.now(),
          likes: 0, retweets: 0, replies: 0,
          isUserPost:      false,
          isCharacterPost: false
        };

        Storage.addPost(reply);
        Timeline.addReply(reply);

        const updated = Storage.updatePost(postId, { replies: (post.replies || 0) + 1 });
        if (updated) Timeline.updatePostReactions(postId, undefined, undefined, updated.replies);

        Notifications.show(`${replier.name}さんが返信しました`, 'reply');
      }, delay);
    }
  },

  scheduleCharacterInteraction(postId) {
    if (Math.random() < 0.7) {
      setTimeout(() => {
        const post = Storage.getPost(postId);
        if (!post) return;
        const updated = Storage.updatePost(postId, { likes: post.likes + 1 });
        if (updated) {
          Timeline.updatePostReactions(postId, updated.likes);
          Notifications.show('薫がいいねしました 🌸', 'like');
        }
      }, 15000 + Math.random() * 45000);
    }

    if (Math.random() < 0.45) {
      setTimeout(() => {
        const post = Storage.getPost(postId);
        if (!post) return;
        const reply = {
          id:       `kaoru_reply_${Date.now()}`,
          type:     'reply',
          parentId: postId,
          author:   { name: '薫', handle: '@kaoru_here', isCharacter: 'kaoru' },
          text:     Characters.getRandomKaoruReply(),
          timestamp: Date.now(),
          likes: 0, retweets: 0, replies: 0,
          isCharacterPost: true
        };
        Storage.addPost(reply);
        Timeline.addReply(reply);
        const updated = Storage.updatePost(postId, { replies: (post.replies || 0) + 1 });
        if (updated) Timeline.updatePostReactions(postId, undefined, undefined, updated.replies);
        Notifications.show('薫が返信しました 🌸', 'character');
      }, 60000 + Math.random() * 120000);
    }

    if (Math.random() < 0.4) {
      setTimeout(() => {
        const post = Storage.getPost(postId);
        if (!post) return;
        const updated = Storage.updatePost(postId, { likes: post.likes + 1 });
        if (updated) {
          Timeline.updatePostReactions(postId, updated.likes);
          Notifications.show('霞がいいねしました ❄️', 'like');
        }
      }, 60000 + Math.random() * 120000);
    }

    if (Math.random() < 0.25) {
      setTimeout(() => {
        const post = Storage.getPost(postId);
        if (!post) return;
        const reply = {
          id:       `kasumi_reply_${Date.now()}`,
          type:     'reply',
          parentId: postId,
          author:   { name: '霞', handle: '@kasumi_watch', isCharacter: 'kasumi' },
          text:     Characters.getRandomKasumiReply(),
          timestamp: Date.now(),
          likes: 0, retweets: 0, replies: 0,
          isCharacterPost: true
        };
        Storage.addPost(reply);
        Timeline.addReply(reply);
        const updated = Storage.updatePost(postId, { replies: (post.replies || 0) + 1 });
        if (updated) Timeline.updatePostReactions(postId, undefined, undefined, updated.replies);
        Notifications.show('霞が返信しました ❄️', 'character');
      }, 120000 + Math.random() * 180000);
    }
  }
};
