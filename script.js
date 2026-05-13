const API_URL = 'https://script.google.com/macros/s/AKfycbx9dq3rZ5BQlJXV_id4AkUs_4sXT-NVTvEhs2oSXRjnu6RmV3LSPXLnkPZyjqg8pcwGjA/exec';
let allProducts = [];
let cart = [];
let user = JSON.parse(localStorage.getItem('user')) || null;
let currentCat = 'Semua';
let currentPage = 1;
const perPage = 9;

document.addEventListener('DOMContentLoaded', () => {
    checkUser();
    loadData();
});

function checkUser() {
    if (user) {
        document.getElementById('user-info').innerText = `Hai, ${user.nama}`;
        document.getElementById('login-btn').style.display = 'none';
        document.getElementById('logout-btn').style.display = 'inline';
    }
}

async function loadData() {
    const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'getProducts' }) });
    const json = await res.json();
    allProducts = json.data;
    renderCategories();
    renderGrid();
}

function renderCategories() {
    const cats = ['Semua', ...new Set(allProducts.map(p => p.kategori).filter(c => c))];
    const container = document.getElementById('category-list');
    container.innerHTML = cats.map(c => `<li class="${currentCat===c?'active':''}" onclick="setCat('${c}')">${c}</li>`).join('');
}

function setCat(c) {
    currentCat = c;
    currentPage = 1;
    renderCategories();
    renderGrid();
}

function renderGrid() {
    const filtered = currentCat === 'Semua' ? allProducts : allProducts.filter(p => p.kategori === currentCat);
    const start = (currentPage - 1) * perPage;
    const paginated = filtered.slice(start, start + perPage);
    
    const grid = document.getElementById('product-grid');
    grid.innerHTML = paginated.map(p => `
        <div class="product-card">
            <img src="${p.url_gambar || 'https://via.placeholder.com/150'}">
            <h4>${p.nama_produk}</h4>
            <p>Rp ${Number(p.harga).toLocaleString()}</p>
            <p><small>Stok: ${p.stok_produk}</small></p>
            <button onclick="addToCart('${p.kode_produk}')">Tambah Keranjang</button>
        </div>
    `).join('');
    
    renderPagination(filtered.length);
}

function renderPagination(total) {
    const pages = Math.ceil(total / perPage);
    const container = document.getElementById('pagination');
    container.innerHTML = '';
    if (pages <= 1) return;
    for (let i = 1; i <= pages; i++) {
        container.innerHTML += `<button class="${i===currentPage?'active':''}" onclick="goPage(${i})">${i}</button>`;
    }
}

function goPage(i) { currentPage = i; renderGrid(); window.scrollTo(0,0); }

function addToCart(kode) {
    if (!user) return openLogin();
    const prod = allProducts.find(p => p.kode_produk === kode);
    const exist = cart.find(item => item.kode_produk === kode);
    if (exist) exist.qty++; else cart.push({...prod, qty: 1, total_harga: prod.harga});
    updateCartBtn();
    alert('Berhasil ditambah!');
}

function updateCartBtn() {
    document.getElementById('cart-count').innerText = cart.length;
}

async function doCheckout() {
    if (cart.length === 0) return alert('Keranjang kosong');
    const res = await fetch(API_URL, {
        method: 'POST',
        body: JSON.stringify({ action: 'checkout', payload: { id_user: user.id_user, items: cart } })
    });
    const json = await res.json();
    if (json.status === 'success') {
        alert('Sukses! ID: ' + json.data.id_trx);
        cart = []; updateCartBtn(); closeModals(); loadData();
    }
}

// Modal Helpers
function openLogin() { document.getElementById('login-modal').style.display = 'flex'; }
function openCart() { 
    document.getElementById('cart-modal').style.display = 'flex';
    const list = document.getElementById('cart-items');
    let total = 0;
    list.innerHTML = cart.map(item => {
        total += (item.harga * item.qty);
        return `<div style="display:flex; justify-content:space-between; margin-bottom:10px">
            <span>${item.nama_produk} x${item.qty}</span>
            <span>Rp ${(item.harga * item.qty).toLocaleString()}</span>
        </div>`;
    }).join('');
    document.getElementById('cart-total').innerText = total.toLocaleString();
}
function closeModals() { document.querySelectorAll('.modal').forEach(m => m.style.display = 'none'); }

async function doLogin() {
    const u = document.getElementById('username').value;
    const p = CryptoJS.SHA256(document.getElementById('password').value).toString();
    const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'login', payload: { username: u, password: p } }) });
    const json = await res.json();
    if (json.status === 'success') {
        user = json.data;
        localStorage.setItem('user', JSON.stringify(user));
        location.reload();
    } else alert('Gagal Login');
}
function logout() { localStorage.removeItem('user'); location.reload(); }
