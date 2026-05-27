const Storage = {
  POSTS_KEY:    'twitterhuumi_posts',
  NOTIFS_KEY:   'twitterhuumi_notifs',
  SETTINGS_KEY: 'twitterhuumi_settings',

  getPosts() {
    try { return JSON.parse(localStorage.getItem(this.POSTS_KEY)) || []; }
    catch { return []; }
  },

  savePosts(posts) {
    try { localStorage.setItem(this.POSTS_KEY, JSON.stringify(posts)); }
    catch {
      try { localStorage.setItem(this.POSTS_KEY, JSON.stringify(posts.slice(0, 50))); } catch {}
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
  },

  // ===== Notifications =====
  getNotifications() {
    try { return JSON.parse(localStorage.getItem(this.NOTIFS_KEY)) || []; }
    catch { return []; }
  },

  addNotification(notif) {
    const list = this.getNotifications();
    list.unshift(notif);
    try { localStorage.setItem(this.NOTIFS_KEY, JSON.stringify(list.slice(0, 200))); } catch {}
  },

  // ===== Settings =====
  getUserSettings() {
    try { return JSON.parse(localStorage.getItem(this.SETTINGS_KEY)) || {}; }
    catch { return {}; }
  },

  saveUserSettings(settings) {
    try { localStorage.setItem(this.SETTINGS_KEY, JSON.stringify(settings)); return true; }
    catch { return false; }
  }
};
