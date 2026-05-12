const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbx9dq3rZ5BQlJXV_id4AkUs_4sXT-NVTvEhs2oSXRjnu6RmV3LSPXLnkPZyjqg8pcwGjA/exec';

let allProducts = [];
let cart = [];
let currentUser = JSON.parse(localStorage.getItem('shop_user')) || null;
let currentPage = 1;
const productsPerPage = 9;

document.addEventListener('DOMContentLoaded', () => {
    updateUserUI();
    fetchProducts();
});

// --- AUTHENTICATION ---
function showLoginModal() { document.getElementById('login-modal').style.display = 'flex'; }
function closeModals() { document.querySelectorAll('.modal').forEach(m => m.style.display = 'none'); }

async function handleLogin() {
    const user = document.getElementById('login-user').value;
    const pass = document.getElementById('login-pass').value;
    
    // Hash password sesuai permintaan (SHA256)
    const passHash = CryptoJS.SHA256(pass).toString();

    const resp = await fetch(SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify({
            action: 'login',
            payload: { username: user, password: passHash }
        })
    });
    
    const result = await resp.json();
    if (result.status === 'success') {
        currentUser = result.data;
        localStorage.setItem('shop_user', JSON.stringify(currentUser));
        updateUserUI();
        closeModals();
    } else {
        alert("Login Gagal: " + result.message);
    }
}

function logout() {
    localStorage.removeItem('shop_user');
    currentUser = null;
    location.reload();
}

function updateUserUI() {
    if (currentUser) {
        document.getElementById('user-display').innerText = "Halo, " + currentUser.nama;
        document.getElementById('login-nav-btn').style.display = 'none';
        document.getElementById('logout-btn').style.display = 'inline';
    }
}

// --- PRODUCT ENGINE ---
async function fetchProducts() {
    const resp = await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify({ action: 'getProducts' })});
    const result = await resp.json();
    allProducts = result.data;
    renderGrid();
}

function renderGrid() {
    const grid = document.getElementById('product-grid');
    grid.innerHTML = '';
    const start = (currentPage - 1) * productsPerPage;
    const end = start + productsPerPage;
    const items = allProducts.slice(start, end);

    items.forEach(p => {
        grid.innerHTML += `
            <div class="product-card">
                <img src="${p.url_gambar}" onerror="this.src='https://via.placeholder.com/150'">
                <h4>${p.nama_produk}</h4>
                <p>Rp ${Number(p.harga).toLocaleString('id-ID')}</p>
                <p><small>Stok: ${p.stok_produk}</small></p>
                <button onclick="addToCart('${p.kode_produk}')"> + Keranjang</button>
            </div>
        `;
    });
    renderPagination();
}

function renderPagination() {
    const pages = Math.ceil(allProducts.length / productsPerPage);
    const container = document.getElementById('pagination');
    container.innerHTML = '';
    for(let i=1; i<=pages; i++) {
        container.innerHTML += `<button onclick="gotoPage(${i})" ${i==currentPage?'style="background:#333;color:white"':''}>${i}</button>`;
    }
}

function gotoPage(p) { currentPage = p; renderGrid(); }

// --- CART ENGINE ---
function addToCart(kode) {
    if (!currentUser) return showLoginModal();
    const product = allProducts.find(p => p.kode_produk === kode);
    const existing = cart.find(c => c.kode_produk === kode);

    if (existing) {
        existing.qty++;
        existing.total_harga = existing.qty * existing.harga;
    } else {
        cart.push({ ...product, qty: 1, total_harga: product.harga });
    }
    updateCartUI();
}

function updateCartUI() {
    document.getElementById('cart-count').innerText = cart.length;
    const list = document.getElementById('cart-items-list');
    list.innerHTML = '';
    let total = 0;

    cart.forEach((item, index) => {
        total += Number(item.total_harga);
        list.innerHTML += `
            <div class="cart-item">
                <span>${item.nama_produk} (x${item.qty})</span>
                <span>Rp ${item.total_harga.toLocaleString('id-ID')}</span>
                <button onclick="removeFromCart(${index})">❌</button>
            </div>
        `;
    });
    document.getElementById('cart-total-price').innerText = total.toLocaleString('id-ID');
}

function toggleCart() { document.getElementById('cart-modal').style.display = 'flex'; updateCartUI(); }

function removeFromCart(i) { cart.splice(i, 1); updateCartUI(); }

// --- CHECKOUT ENGINE ---
async function processCheckout() {
    if (cart.length === 0) return alert("Keranjang kosong!");
    
    const confirmPay = confirm("Lanjutkan pembayaran?");
    if (!confirmPay) return;

    const payload = {
        id_user: currentUser.id_user,
        items: cart
    };

    const resp = await fetch(SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify({ action: 'checkout', payload: payload })
    });

    const result = await resp.json();
    if (result.status === 'success') {
        alert("Checkout Berhasil! ID Trx: " + result.data.id_trx);
        cart = [];
        updateCartUI();
        closeModals();
        fetchProducts(); // Refresh stok
    } else {
        alert("Gagal Checkout: " + result.message);
    }
}
