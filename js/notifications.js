const Notifications = {
  container: null,

  init(container) {
    this.container = container;
  },

  show(message, type = 'default') {
    const el = document.createElement('div');
    el.className = `notification notification-${type}`;

    const icons = {
      reaction: '✨',
      reply:    '💬',
      character:'🌸',
      buzz:     '🔥',
      like:     '❤️',
      default:  '🔔'
    };

    el.innerHTML = `
      <span class="notification-icon">${icons[type] || icons.default}</span>
      <span class="notification-text">${message}</span>
    `;

    this.container.appendChild(el);
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('show')));

    setTimeout(() => {
      el.classList.remove('show');
      setTimeout(() => el.remove(), 400);
    }, 3500);
  }
};
