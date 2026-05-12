const SCRIPT_URL = 'GANTI_DENGAN_URL_WEB_APP_APPS_SCRIPT_KAMU';

let allProducts = [];
let currentPage = 1;
const productsPerPage = 9; // Grid 3x3
let cart = [];

// Fetch data saat halaman dimuat
document.addEventListener('DOMContentLoaded', () => {
    fetchProducts();
});

async function fetchProducts() {
    const grid = document.getElementById('product-grid');
    grid.innerHTML = '<p>Memuat produk...</p>';

    try {
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'getProducts' })
        });
        const result = await response.json();
        
        if (result.status === 'success') {
            allProducts = result.data;
            renderGrid();
        } else {
            grid.innerHTML = '<p>Gagal memuat data.</p>';
        }
    } catch (error) {
        console.error('Error fetching data:', error);
        // Fallback data statis untuk testing UI jika script URL belum siap
        allProducts = Array.from({length: 12}, (_, i) => ({
            kode_produk: `P0${i+1}`,
            nama_produk: `Produk Demo ${i+1}`,
            harga: 50000 + (i * 5000),
            url_gambar: 'https://via.placeholder.com/150'
        }));
        renderGrid();
    }
}

function renderGrid() {
    const grid = document.getElementById('product-grid');
    grid.innerHTML = '';

    // Logika Paginasi
    const startIndex = (currentPage - 1) * productsPerPage;
    const endIndex = startIndex + productsPerPage;
    const paginatedProducts = allProducts.slice(startIndex, endIndex);

    paginatedProducts.forEach(product => {
        const card = document.createElement('div');
        card.className = 'product-card';
        card.innerHTML = `
            <img src="${product.url_gambar || 'https://via.placeholder.com/150'}" alt="${product.nama_produk}">
            <h4>${product.nama_produk}</h4>
            <p>Rp ${product.harga ? product.harga.toLocaleString('id-ID') : '0'}</p>
            <button onclick="addToCart('${product.kode_produk}')">Masukan Keranjang</button>
        `;
        grid.appendChild(card);
    });

    updatePaginationUI();
}

function changePage(direction) {
    const totalPages = Math.ceil(allProducts.length / productsPerPage);
    currentPage += direction;

    if (currentPage < 1) currentPage = 1;
    if (currentPage > totalPages) currentPage = totalPages;

    renderGrid();
}

function updatePaginationUI() {
    const totalPages = Math.ceil(allProducts.length / productsPerPage);
    document.getElementById('page-info').innerText = `Halaman ${currentPage} dari ${totalPages}`;
    
    document.getElementById('prev-btn').disabled = currentPage === 1;
    document.getElementById('next-btn').disabled = currentPage === totalPages || totalPages === 0;
}

function addToCart(kode_produk) {
    const product = allProducts.find(p => p.kode_produk === kode_produk);
    if (product) {
        cart.push(product);
        document.getElementById('cart-count').innerText = cart.length;
        alert(`${product.nama_produk} ditambahkan ke keranjang!`);
    }
}
