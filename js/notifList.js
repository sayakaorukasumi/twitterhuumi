const NotifList = {
  container: null,
  _unread: 0,
  _UNREAD_KEY: 'twitterhuumi_unread',

  init(container) {
    this.container = container;
    this._unread = parseInt(localStorage.getItem(this._UNREAD_KEY) || '0', 10);
    this._render();
    this._updateBadges();
  },

  add(notif) {
    const stored = { ...notif, id: `nf_${Date.now()}_${Math.random().toString(36).slice(2)}`, timestamp: Date.now() };
    Storage.addNotification(stored);
    this._unread++;
    try { localStorage.setItem(this._UNREAD_KEY, String(this._unread)); } catch {}
    this._updateBadges();
    if (!this.container) return;
    const empty = this.container.querySelector('.notif-empty');
    if (empty) empty.remove();
    this.container.insertBefore(this._makeEl(stored), this.container.firstChild);
  },

  clearBadge() {
    this._unread = 0;
    try { localStorage.setItem(this._UNREAD_KEY, '0'); } catch {}
    this._updateBadges();
  },

  // 留守中に溜まった通知をまとめて反映する（各通知は自前のタイムスタンプを持つ）
  refresh(addUnread = 0) {
    if (addUnread > 0) this._unread += addUnread;
    this._render();
    this._updateBadges();
  },

  _updateBadges() {
    ['notif-badge', 'notif-badge-mobile'].forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      if (this._unread > 0) {
        el.textContent = this._unread > 99 ? '99+' : this._unread;
        el.style.display = '';
      } else {
        el.style.display = 'none';
      }
    });
  },

  _render() {
    const notifs = Storage.getNotifications();
    this.container.innerHTML = '';
    if (notifs.length === 0) {
      this.container.innerHTML = '<div class="notif-empty">🔔 通知はまだありません<br><span>投稿すると、いいねや返信が届きます</span></div>';
      return;
    }
    notifs.forEach(n => this.container.appendChild(this._makeEl(n)));
  },

  _makeEl(notif) {
    const el = document.createElement('div');
    el.className = `notif-item notif-type-${notif.type}`;
    const icon = { like: '❤️', reply: '💬', retweet: '🔁' }[notif.type] || '🔔';
    const time = this._time(notif.timestamp);
    const settings = Storage.getUserSettings();
    const avHTML = this._avHTML(notif, settings);
    const preview = notif.postPreview ? `<div class="notif-preview">${_esc(notif.postPreview)}</div>` : '';
    el.innerHTML = `
      <div class="notif-icon-col">${icon}</div>
      <div class="notif-right">
        <div class="notif-av-row">${avHTML}</div>
        <div class="notif-msg">
          <span class="notif-actor">${_esc(notif.actorName)}</span>が${_esc(notif.actionText)}
          <span class="notif-time">· ${time}</span>
        </div>
        ${preview}
      </div>
    `;
    return el;
  },

  _avHTML(notif, settings) {
    if (notif.isCharacter === 'kaoru') {
      return settings.kaoruAvatar
        ? `<img src="${settings.kaoruAvatar}" class="notif-av-img">`
        : `<div class="notif-av kaoru-bg">🌸</div>`;
    }
    if (notif.isCharacter === 'kasumi') {
      return settings.kasumiAvatar
        ? `<img src="${settings.kasumiAvatar}" class="notif-av-img">`
        : `<div class="notif-av kasumi-bg">❄️</div>`;
    }
    return `<div class="notif-av pseudo-av">${_esc((notif.actorName || '?')[0])}</div>`;
  },

  _time(ts) {
    const d = Date.now() - ts;
    if (d < 60000)    return 'たった今';
    if (d < 3600000)  return `${Math.floor(d / 60000)}分`;
    if (d < 86400000) return `${Math.floor(d / 3600000)}時間`;
    return `${Math.floor(d / 86400000)}日`;
  }
};

function _esc(str) {
  const d = document.createElement('div');
  d.appendChild(document.createTextNode(String(str || '')));
  return d.innerHTML;
}
