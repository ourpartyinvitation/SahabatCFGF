const API_URL = 'https://script.google.com/macros/s/AKfycbyA3Ko0ylLkwj3VU78z8WG5MUYLt432Cdu6LkrJDbp4ISN5Hx_2nk-MfwI-yMWtAg4Gyg/exec';
let products = [], cart = [], user = JSON.parse(localStorage.getItem('sahabat_user')) || null;
let currentCat = 'Semua', discountVoucher = 0, tempId = null;

const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 2000, timerProgressBar: true });

document.addEventListener('DOMContentLoaded', () => { if (user) showStore(); });

// AUTH LOGIC
function openAuth(type) {
    document.getElementById('modal-auth').style.display = 'flex';
    document.getElementById('form-login').style.display = type === 'login' ? 'block' : 'none';
    document.getElementById('form-reg').style.display = type === 'register' ? 'block' : 'none';
}

async function handleLogin() {
    const payload = { username: document.getElementById('l-user').value, password: CryptoJS.SHA256(document.getElementById('l-pass').value).toString() };
    const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'login', payload }) });
    const data = await res.json();
    if(data.status === 'success') { user = data.data; localStorage.setItem('sahabat_user', JSON.stringify(user)); location.reload(); } else Swal.fire('Error', data.message, 'error');
}

// STORE LOGIC
function showStore() {
    document.getElementById('landing-page').style.display = 'none';
    document.getElementById('main-store').style.display = 'block';
    loadData();
}

async function loadData() {
    const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'getProducts' }) });
    const json = await res.json();
    products = json.data;
    renderGrid();
}

function renderGrid() {
    const grid = document.getElementById('product-grid');
    grid.innerHTML = products.map(p => {
        const pics = p.url_gambar.split(';').map(u => u.trim());
        const isPromo = p.harga_promo && p.harga_promo < p.harga_asli;
        const disc = isPromo ? Math.round((p.harga_asli - p.harga_promo) / p.harga_asli * 100) : 0;
        return `
            <div class="card animate__animated animate__fadeInUp">
                ${isPromo ? `<div class="badge-disc">-${disc}%</div>` : ''}
                <img src="${pics[0]}" onclick="viewDetail('${p.kode_produk}')">
                <h4 style="margin:10px 0">${p.nama_produk}</h4>
                <div style="margin-bottom:10px">
                    ${isPromo ? `<span class="price-old">Rp ${p.harga_asli.toLocaleString()}</span>` : ''}
                    <div class="price-new">Rp ${(isPromo ? p.harga_promo : p.harga_asli).toLocaleString()}</div>
                </div>
                <button class="btn-add-stock" onclick="addToCart('${p.kode_produk}')">
                    <span><i class="fas fa-plus"></i> Keranjang</span>
                    <span class="stock-label">Stok: ${p.stok_produk}</span>
                </button>
            </div>`;
    }).join('');
}

function viewDetail(kode) {
    const p = products.find(i => i.kode_produk === kode);
    const pics = p.url_gambar.split(';').map(u => u.trim());
    let imgs = `<div style="display:flex; gap:10px; overflow-x:auto; padding:10px">`;
    pics.forEach(u => imgs += `<img src="${u}" style="width:150px; height:150px; object-fit:cover; border-radius:10px">`);
    imgs += `</div>`;

    Swal.fire({
        title: p.nama_produk,
        html: `${imgs}<p style="text-align:left; color:#666; margin-top:15px">${p.keterangan_produk}</p>`,
        confirmButtonText: 'Tambah Keranjang'
    }).then(res => { if(res.isConfirmed) addToCart(kode); });
}

function addToCart(kode) {
    const p = products.find(i => i.kode_produk === kode);
    const price = p.harga_promo > 0 ? p.harga_promo : p.harga_asli;
    const exist = cart.find(i => i.kode_produk === kode);
    if(exist) exist.qty++; else cart.push({...p, price, qty: 1});
    updateCartUI();
    Toast.fire({ icon: 'success', title: 'Ditambahkan!' });
}

function updateCartUI() {
    document.getElementById('cart-count').innerText = cart.length;
    let total = 0;
    document.getElementById('cart-list-items').innerHTML = cart.map((item, idx) => {
        const sub = item.price * item.qty;
        total += sub;
        return `<div style="display:flex; justify-content:space-between; margin-bottom:10px">
            <span>${item.nama_produk} (x${item.qty})</span>
            <span>Rp ${sub.toLocaleString()} <i class="fas fa-times" onclick="removeCart(${idx})" style="color:red; cursor:pointer"></i></span>
        </div>`;
    }).join('');
    
    const finalTotal = total - (total * (discountVoucher/100));
    document.getElementById('cart-total').innerText = "Rp " + finalTotal.toLocaleString();
}

async function applyVoucher() {
    const code = document.getElementById('v-code').value;
    const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'checkVoucher', payload: { code } }) });
    const data = await res.json();
    if(data.status === 'success') {
        discountVoucher = data.diskon;
        Swal.fire('Berhasil!', `Voucher ${data.diskon}% aktif`, 'success');
        updateCartUI();
    } else Swal.fire('Gagal', data.message, 'error');
}

async function handleCheckout() {
    const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'checkout', payload: { id_user: user.id_user, items: cart.map(i => ({...i, total_final: i.price * i.qty})) } }) });
    const data = await res.json();
    if(data.status === 'success') {
        const msg = window.encodeURIComponent(`Halo Admin SahabatCFGF!\nSaya ${user.nama_lengkap} sudah checkout ID: ${data.id_trx}.\nTotal: ${document.getElementById('cart-total').innerText}`);
        window.open(`https://wa.me/${user.phone}?text=${msg}`);
        cart = []; updateCartUI(); closeModal('modal-cart');
    }
}

function removeCart(idx) { cart.splice(idx, 1); updateCartUI(); }
function toggleCart() { document.getElementById('modal-cart').style.display = 'flex'; }
function closeModal(id) { document.getElementById(id).style.display = 'none'; }
function doLogout() { localStorage.removeItem('sahabat_user'); location.reload(); }
