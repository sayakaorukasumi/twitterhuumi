const Storage = {
  KEY: 'twitterhuumi_posts',

  getPosts() {
    try {
      return JSON.parse(localStorage.getItem(this.KEY)) || [];
    } catch {
      return [];
    }
  },

  savePosts(posts) {
    try {
      localStorage.setItem(this.KEY, JSON.stringify(posts));
    } catch {
      try {
        localStorage.setItem(this.KEY, JSON.stringify(posts.slice(0, 50)));
      } catch {}
    }
  },

  addPost(post) {
    const posts = this.getPosts();
    posts.unshift(post);
    this.savePosts(posts);
    return post;
  },

  updatePost(postId, updates) {
    const posts = this.getPosts();
    const idx = posts.findIndex(p => p.id === postId);
    if (idx === -1) return null;
    posts[idx] = { ...posts[idx], ...updates };
    this.savePosts(posts);
    return posts[idx];
  },

  getPost(postId) {
    return this.getPosts().find(p => p.id === postId) || null;
  }
};
