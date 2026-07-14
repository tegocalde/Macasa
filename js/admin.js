(function() {
    'use strict';

    // SEED DATA from data.json into localStorage on first visit
    if (!localStorage.getItem('macasa_data')) {
        fetch('../data.json')
            .then(r => r.json())
            .then(data => localStorage.setItem('macasa_data', JSON.stringify(data)))
            .catch(() => {});
    }

    // SIDEBAR TOGGLE
    const sidebar = document.getElementById('sidebar');
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebarClose = document.getElementById('sidebarClose');
    if (sidebarToggle) sidebarToggle.addEventListener('click', () => sidebar.classList.add('open'));
    if (sidebarClose) sidebarClose.addEventListener('click', () => sidebar.classList.remove('open'));

    // TOAST
    window.showToast = function(message, type) {
        const toast = document.getElementById('toast');
        if (!toast) return;
        toast.textContent = message;
        toast.className = 'toast ' + (type || 'success') + ' show';
        clearTimeout(toast._timeout);
        toast._timeout = setTimeout(() => toast.classList.remove('show'), 3000);
    };
})();
