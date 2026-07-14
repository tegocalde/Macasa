(function() {
    'use strict';

    // ==========================================
    // CONFIGURACION EmailJS - REEMPLAZAR CON TUS DATOS
    // ==========================================
    const EMAILJS_PUBLIC_KEY = 'TU_PUBLIC_KEY_AQUI';
    const EMAILJS_SERVICE_ID = 'TU_SERVICE_ID_AQUI';
    const EMAILJS_TEMPLATE_ID = 'TU_TEMPLATE_ID_AQUI';
    // ==========================================

    const ITEMS_PER_PAGE = 9;
    let allProducts = [];
    let allCategories = [];
    let cart = JSON.parse(localStorage.getItem('macasa_cart') || '[]');
    let currentPage = 1;

    const $ = (sel, ctx = document) => ctx.querySelector(sel);
    const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

    function formatPrice(num) {
        return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    function escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    // LOAD DATA
    async function loadData() {
        try {
            const localData = localStorage.getItem('macasa_data');
            let data;
            if (localData) {
                data = JSON.parse(localData);
            } else {
                const resp = await fetch('data.json');
                data = await resp.json();
                localStorage.setItem('macasa_data', JSON.stringify(data));
            }
            allCategories = data.categorias;
            allProducts = data.productos;
            renderCategoryFilters();
            renderProducts();
        } catch (e) {
            console.error('Error cargando datos:', e);
        }
    }

    // RENDER CATEGORY FILTERS
    function renderCategoryFilters() {
        const container = $('#categoryFilters');
        container.innerHTML = '<button class="filter-btn active" data-category="0">Todos</button>';
        allCategories.filter(c => c.activo).sort((a, b) => a.orden - b.orden).forEach(cat => {
            const btn = document.createElement('button');
            btn.className = 'filter-btn';
            btn.dataset.category = cat.id;
            btn.textContent = cat.nombre;
            container.appendChild(btn);
        });

        $$('.filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                $$('.filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentPage = 1;
                renderProducts();
            });
        });
    }

    // RENDER PRODUCTS
    function renderProducts() {
        const grid = $('#productsGrid');
        const query = ($('#searchInput').value || '').toLowerCase().trim();
        const activeCat = $('.filter-btn.active')?.dataset.category || '0';

        const visible = allProducts.filter(p => {
            if (!p.activo) return false;
            if (activeCat !== '0' && p.categoria_id != activeCat) return false;
            if (query) {
                const cat = allCategories.find(c => c.id == p.categoria_id);
                const catName = cat ? cat.nombre.toLowerCase() : '';
                if (!p.nombre.toLowerCase().includes(query) && !(p.descripcion || '').toLowerCase().includes(query) && !catName.includes(query)) return false;
            }
            return true;
        });

        const totalPages = Math.max(1, Math.ceil(visible.length / ITEMS_PER_PAGE));
        if (currentPage > totalPages) currentPage = totalPages;
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        const pageItems = visible.slice(start, start + ITEMS_PER_PAGE);

        grid.innerHTML = '';
        pageItems.forEach(p => {
            const cat = allCategories.find(c => c.id == p.categoria_id);
            const catName = cat ? cat.nombre : '';
            const imgSrc = p.imagen || '';

            const card = document.createElement('div');
            card.className = 'product-card';
            card.dataset.category = p.categoria_id;
            card.dataset.id = p.id;
            card.innerHTML = `
                <div class="product-image">
                    ${imgSrc
                        ? `<img src="${escapeHtml(imgSrc)}" alt="${escapeHtml(p.nombre)}" loading="lazy" class="product-img-click" data-src="${escapeHtml(imgSrc)}" data-name="${escapeHtml(p.nombre)}" data-price="$${formatPrice(p.precio)}">`
                        : `<div class="product-placeholder"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><rect x="2" y="2" width="20" height="20" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg></div>`
                    }
                    <span class="product-category-tag">${escapeHtml(catName)}</span>
                </div>
                <div class="product-info">
                    <h3 class="product-name">${escapeHtml(p.nombre)}</h3>
                    <p class="product-desc">${escapeHtml(p.descripcion || '')}</p>
                    <div class="product-bottom">
                        <span class="product-price">$${formatPrice(p.precio)}</span>
                        <div class="quantity-control">
                            <button class="qty-btn qty-minus" data-id="${p.id}">-</button>
                            <span class="qty-value" id="qty-${p.id}">0</span>
                            <button class="qty-btn qty-plus" data-id="${p.id}">+</button>
                        </div>
                    </div>
                    <button class="btn-add-cart" data-id="${p.id}">Agregar al carrito</button>
                </div>
            `;
            grid.appendChild(card);
        });

        $('#noResults').style.display = visible.length === 0 ? 'block' : 'none';
        renderPagination(visible.length, totalPages);
        bindCardEvents();
    }

    // PAGINATION
    function renderPagination(totalItems, totalPages) {
        const el = $('#pagination');
        el.innerHTML = '';
        if (totalPages <= 1) return;

        const prevBtn = document.createElement('button');
        prevBtn.className = 'pagination-btn arrow';
        prevBtn.textContent = '\u2039';
        prevBtn.disabled = currentPage === 1;
        prevBtn.addEventListener('click', () => { currentPage--; renderProducts(); scrollToCatalog(); });
        el.appendChild(prevBtn);

        for (let i = 1; i <= totalPages; i++) {
            if (totalPages > 7 && i > 2 && i < totalPages - 1 && Math.abs(i - currentPage) > 1) {
                if (i === 3 || i === totalPages - 2) {
                    const dots = document.createElement('span');
                    dots.className = 'pagination-btn';
                    dots.textContent = '...';
                    dots.style.cursor = 'default';
                    dots.style.border = 'none';
                    el.appendChild(dots);
                }
                continue;
            }
            const btn = document.createElement('button');
            btn.className = 'pagination-btn' + (i === currentPage ? ' active' : '');
            btn.textContent = i;
            btn.addEventListener('click', () => { currentPage = i; renderProducts(); scrollToCatalog(); });
            el.appendChild(btn);
        }

        const nextBtn = document.createElement('button');
        nextBtn.className = 'pagination-btn arrow';
        nextBtn.textContent = '\u203A';
        nextBtn.disabled = currentPage === totalPages;
        nextBtn.addEventListener('click', () => { currentPage++; renderProducts(); scrollToCatalog(); });
        el.appendChild(nextBtn);
    }

    function scrollToCatalog() {
        document.querySelector('.catalog').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    // BIND CARD EVENTS
    function bindCardEvents() {
        $$('.qty-plus').forEach(btn => {
            btn.addEventListener('click', () => {
                const el = $(`#qty-${btn.dataset.id}`);
                el.textContent = parseInt(el.textContent) + 1;
            });
        });

        $$('.qty-minus').forEach(btn => {
            btn.addEventListener('click', () => {
                const el = $(`#qty-${btn.dataset.id}`);
                el.textContent = Math.max(0, parseInt(el.textContent) - 1);
            });
        });

        $$('.btn-add-cart').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.dataset.id;
                const qty = parseInt($(`#qty-${id}`).textContent) || 1;
                addToCart(id, qty);
                btn.classList.add('added');
                btn.textContent = '\u2713 Agregado';
                setTimeout(() => { btn.classList.remove('added'); btn.textContent = 'Agregar al carrito'; }, 1500);
            });
        });
    }

    // SEARCH
    $('#searchInput').addEventListener('input', () => { currentPage = 1; renderProducts(); });

    // CART
    const cartToggle = $('#cartToggle');
    const cartOverlay = $('#cartOverlay');
    const cartSidebar = $('#cartSidebar');
    const cartClose = $('#cartClose');
    const cartBadge = $('#cartBadge');
    const cartItems = $('#cartItems');
    const cartEmpty = $('#cartEmpty');
    const cartFooter = $('#cartFooter');
    const cartTotal = $('#cartTotal');

    function openCart() { cartSidebar.classList.add('open'); cartOverlay.classList.add('open'); document.body.style.overflow = 'hidden'; }
    function closeCart() { cartSidebar.classList.remove('open'); cartOverlay.classList.remove('open'); document.body.style.overflow = ''; }

    cartToggle.addEventListener('click', openCart);
    cartClose.addEventListener('click', closeCart);
    cartOverlay.addEventListener('click', closeCart);

    function saveCart() {
        localStorage.setItem('macasa_cart', JSON.stringify(cart));
        renderCart();
        updateBadge();
    }

    function updateBadge() {
        const total = cart.reduce((s, i) => s + i.qty, 0);
        cartBadge.textContent = total;
        cartBadge.classList.toggle('visible', total > 0);
    }

    function addToCart(productId, qty) {
        if (qty <= 0) return;
        const product = allProducts.find(p => p.id == productId);
        if (!product) return;
        const existing = cart.find(i => i.id == productId);
        if (existing) { existing.qty += qty; }
        else { cart.push({ id: product.id, nombre: product.nombre, precio: product.precio, imagen: product.imagen, qty }); }
        const qtyEl = $(`#qty-${productId}`);
        if (qtyEl) qtyEl.textContent = '0';
        saveCart();
        showToast(`${product.nombre} agregado al carrito`);
    }

    function removeFromCart(productId) { cart = cart.filter(i => i.id != productId); saveCart(); }
    function updateCartQty(productId, delta) {
        const item = cart.find(i => i.id == productId);
        if (!item) return;
        item.qty += delta;
        if (item.qty <= 0) removeFromCart(productId); else saveCart();
    }

    function renderCart() {
        cartItems.querySelectorAll('.cart-item').forEach(el => el.remove());
        if (cart.length === 0) { cartEmpty.style.display = 'flex'; cartFooter.style.display = 'none'; return; }
        cartEmpty.style.display = 'none'; cartFooter.style.display = 'block';
        let total = 0;
        cart.forEach(item => {
            const subtotal = item.precio * item.qty;
            total += subtotal;
            const el = document.createElement('div');
            el.className = 'cart-item';
            el.innerHTML = `
                <div class="cart-item-img">${item.imagen ? `<img src="${escapeHtml(item.imagen)}" alt="">` : '📦'}</div>
                <div class="cart-item-info">
                    <div class="cart-item-name">${escapeHtml(item.nombre)}</div>
                    <div class="cart-item-price">$${formatPrice(item.precio)} c/u</div>
                    <div class="cart-item-qty">
                        <button class="qty-btn" onclick="window.__cartQty(${item.id}, -1)">-</button>
                        <span class="qty-value">${item.qty}</span>
                        <button class="qty-btn" onclick="window.__cartQty(${item.id}, 1)">+</button>
                    </div>
                </div>
                <button class="cart-item-remove" onclick="window.__cartRemove(${item.id})">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
            `;
            cartItems.appendChild(el);
        });
        cartTotal.textContent = '$' + formatPrice(total);
    }

    window.__cartQty = function(id, d) { updateCartQty(id, d); };
    window.__cartRemove = function(id) { removeFromCart(id); };

    // TOAST
    const toast = $('#toast');
    function showToast(message, type = 'success') {
        toast.textContent = message;
        toast.className = 'toast ' + type + ' show';
        clearTimeout(toast._timeout);
        toast._timeout = setTimeout(() => toast.classList.remove('show'), 3000);
    }

    // SOLICITAR
    $('#btnSolicitar').addEventListener('click', () => {
        const name = $('#clientName').value.trim();
        const phone = $('#clientPhone').value.trim();
        if (!name || !phone) { showToast('Ingresa tu nombre y teléfono', 'error'); return; }
        if (cart.length === 0) { showToast('El carrito está vacío', 'error'); return; }

        let orderText = `SOLICITUD DE PRODUCTOS\nCliente: ${name}\nTeléfono: ${phone}\nFecha: ${new Date().toLocaleString('es-MX')}\n\n--- PRODUCTOS ---\n`;
        let total = 0;
        cart.forEach(item => {
            const subtotal = item.precio * item.qty;
            total += subtotal;
            orderText += `${item.nombre} x${item.qty} = $${formatPrice(subtotal)}\n`;
        });
        orderText += `\nTOTAL: $${formatPrice(total)}`;

        if (typeof emailjs !== 'undefined' && EMAILJS_PUBLIC_KEY !== 'TU_PUBLIC_KEY_AQUI') {
            emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
                client_name: name, client_phone: phone, order_details: orderText, total: '$' + formatPrice(total)
            }).then(() => {
                showToast('¡Solicitud enviada correctamente!');
                cart = []; saveCart(); $('#clientName').value = ''; $('#clientPhone').value = ''; closeCart();
            }).catch(() => sendViaMailto(name, orderText));
        } else {
            sendViaMailto(name, orderText);
        }
    });

    function sendViaMailto(name, orderText) {
        window.open(`mailto:tu-correo@ejemplo.com?subject=${encodeURIComponent('Solicitud de productos - ' + name)}&body=${encodeURIComponent(orderText)}`, '_self');
        showToast('Se abrió tu cliente de correo. Envía la solicitud.');
        cart = []; saveCart(); $('#clientName').value = ''; $('#clientPhone').value = ''; closeCart();
    }

    // LIGHTBOX
    const lightbox = $('#lightbox');
    const lightboxImg = $('#lightboxImg');
    const lightboxName = $('#lightboxName');
    const lightboxPrice = $('#lightboxPrice');
    const lightboxClose = $('#lightboxClose');

    document.addEventListener('click', (e) => {
        const img = e.target.closest('.product-img-click');
        if (!img) return;
        lightboxImg.src = img.dataset.src;
        lightboxName.textContent = img.dataset.name;
        lightboxPrice.textContent = img.dataset.price;
        lightbox.classList.add('open');
        document.body.style.overflow = 'hidden';
    });

    function closeLightbox() { lightbox.classList.remove('open'); document.body.style.overflow = ''; }
    lightboxClose.addEventListener('click', closeLightbox);
    lightbox.addEventListener('click', (e) => { if (e.target === lightbox) closeLightbox(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { closeLightbox(); closeCart(); } });

    // INIT
    loadData();
    renderCart();
    updateBadge();
})();
