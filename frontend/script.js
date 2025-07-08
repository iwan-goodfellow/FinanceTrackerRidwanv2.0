// --- KONFIGURASI & VARIABEL GLOBAL ---
const API_URL = 'http://127.0.0.1:5000'; // Pastikan URL backend benar
const form = document.getElementById('transaction-form');
const transactionBody = document.getElementById('transaction-body');
const typeSelect = document.getElementById('type');
const categorySelect = document.getElementById('category');
const dateInput = document.getElementById('date');
const formTitle = document.getElementById('form-title');
const submitButton = document.getElementById('submit-button');
const cancelButton = document.getElementById('cancel-button');

// Variabel baru untuk filter
const yearSelect = document.getElementById('filter-year');
const monthSelect = document.getElementById('filter-month');

let summaryChart, breakdownChart; // Variabel untuk menyimpan objek chart
let currentEditId = null;

const categories = {
    income: ['Gaji', 'Bonus', 'Investasi', 'Lainnya'],
    expense: ['Kuliner', 'Transportasi', 'Kesehatan', 'Pendidikan', 'Rumah', 'Sosial', 'Travel', 'Kantor', 'Lainnya']
};

const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

// --- INISIALISASI & EVENT LISTENERS ---

// Fungsi yang dijalankan saat halaman pertama kali dimuat
document.addEventListener('DOMContentLoaded', async () => {
    populateMonthDropdown();
    await populateYearDropdown(); // Tunggu tahun diisi
    
    // Set filter ke bulan dan tahun saat ini sebagai default
    const now = new Date();
    yearSelect.value = now.getFullYear();
    monthSelect.value = now.getMonth() + 1;

    // Ambil dan render data berdasarkan filter default
    fetchAndRenderData();

    // Setup form
    setDefaultDate();
    updateCategoryOptions();
});

// Event listener untuk filter dan form
yearSelect.addEventListener('change', fetchAndRenderData);
monthSelect.addEventListener('change', fetchAndRenderData);
form.addEventListener('submit', handleFormSubmit);
typeSelect.addEventListener('change', updateCategoryOptions);
cancelButton.addEventListener('click', exitEditMode);


// --- FUNGSI UTAMA PENGAMBILAN & RENDER DATA ---

async function fetchAndRenderData() {
    const year = yearSelect.value;
    const month = monthSelect.value;

    try {
        const response = await fetch(`${API_URL}/transactions?year=${year}&month=${month}`);
        const transactions = await response.json();

        // Proses dan render semua komponen
        renderTransactionList(transactions);
        
        const { totalIncome, totalExpense } = calculateSummary(transactions);
        updateSummary(totalIncome, totalExpense);
        
        renderSummaryChart(totalIncome, totalExpense);
        renderBreakdownChart(transactions);

    } catch (error) {
        console.error('Error fetching and rendering data:', error);
    }
}


// --- FUNGSI-FUNGSI UNTUK RENDER KOMPONEN ---

/**
 * Menggambar chart Pemasukan vs Pengeluaran (Doughnut Chart)
 */
function renderSummaryChart(income, expense) {
    const ctx = document.getElementById('summary-chart').getContext('2d');
    if (summaryChart) summaryChart.destroy();

    summaryChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Pemasukan', 'Pengeluaran'],
            datasets: [{
                data: [income, expense],
                backgroundColor: ['#28a745', '#dc3545'],
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
        }
    });
}

/**
 * Menggambar chart Rincian Pengeluaran (Bar Chart)
 */
function renderBreakdownChart(transactions) {
    const ctx = document.getElementById('breakdown-bar-chart').getContext('2d');
    if (breakdownChart) breakdownChart.destroy();

    // Kelompokkan pengeluaran berdasarkan kategori
    const expenseData = transactions
        .filter(t => t.type === 'expense')
        .reduce((acc, curr) => {
            acc[curr.category] = (acc[curr.category] || 0) + curr.amount;
            return acc;
        }, {});

    const labels = Object.keys(expenseData);
    const data = Object.values(expenseData);

    breakdownChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Pengeluaran',
                data: data,
                backgroundColor: '#007bff',
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true
                }
            },
            plugins: {
                legend: {
                    display: false // Sembunyikan legenda karena sudah jelas
                }
            }
        }
    });
}

/**
 * Mengisi tabel riwayat transaksi
 */
function renderTransactionList(transactions) {
    transactionBody.innerHTML = '';
    transactions.forEach(t => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${t.date}</td>
            <td>${t.type === 'income' ? 'Pemasukan' : 'Pengeluaran'}</td>
            <td>${t.category}</td>
            <td>${formatRupiah(t.amount)}</td>
            <td class="action-buttons">
                <button class="edit-btn" onclick='enterEditMode(${JSON.stringify(t)})'>Edit</button>
                <button class="delete-btn" onclick="deleteTransaction(${t.id})">Hapus</button>
            </td>
        `;
        transactionBody.appendChild(tr);
    });
}

/**
 * Menghitung dan mengupdate ringkasan total (pemasukan, pengeluaran, saldo)
 */
function calculateSummary(transactions) {
    let totalIncome = 0;
    let totalExpense = 0;
    transactions.forEach(t => {
        if (t.type === 'income') totalIncome += t.amount;
        else totalExpense += t.amount;
    });
    return { totalIncome, totalExpense };
}

function updateSummary(income, expense) {
    const balance = income - expense;
    document.getElementById('total-income').textContent = formatRupiah(income);
    document.getElementById('total-expense').textContent = formatRupiah(expense);
    document.getElementById('balance').textContent = formatRupiah(balance);
}


// --- FUNGSI-FUNGSI HELPER & FORM ---

async function populateYearDropdown() {
    try {
        // Ambil SEMUA transaksi sekali saja untuk mendapatkan daftar tahun
        const response = await fetch(`${API_URL}/transactions`);
        const allTransactions = await response.json();
        
        // Cari tahun-tahun unik dari data
        const years = [...new Set(allTransactions.map(t => t.date.substring(0, 4)))];
        years.sort((a, b) => b - a); // Urutkan dari terbaru
        
        yearSelect.innerHTML = '';
        if (years.length === 0) {
            years.push(new Date().getFullYear()); // Jika tidak ada data, pakai tahun ini
        }
        years.forEach(year => {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            yearSelect.appendChild(option);
        });
    } catch (error) {
        console.error("Could not populate years:", error);
    }
}

function populateMonthDropdown() {
    monthSelect.innerHTML = '';
    monthNames.forEach((name, index) => {
        const option = document.createElement('option');
        option.value = index + 1; // value: 1-12
        option.textContent = name;
        monthSelect.appendChild(option);
    });
}

async function handleFormSubmit(event) {
    event.preventDefault();
    const transactionData = {
        date: dateInput.value,
        type: typeSelect.value,
        category: categorySelect.value,
        amount: document.getElementById('amount').value,
    };
    const method = currentEditId ? 'PUT' : 'POST';
    const url = currentEditId ? `${API_URL}/transactions/${currentEditId}` : `${API_URL}/transactions`;
    try {
        await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(transactionData),
        });
        exitEditMode();
        // Cek apakah tahun dari data yg baru ditambahkan sudah ada di dropdown
        const yearExists = Array.from(yearSelect.options).some(opt => opt.value === transactionData.date.substring(0, 4));
        if (!yearExists) {
            await populateYearDropdown(); // Jika belum ada, refresh daftar tahun
        }
        // Set filter ke tanggal yg baru saja ditambahkan & refresh
        yearSelect.value = transactionData.date.substring(0, 4);
        monthSelect.value = parseInt(transactionData.date.substring(5, 7), 10);
        fetchAndRenderData();
    } catch (error) {
        console.error('Error submitting transaction:', error);
    }
}

// (Fungsi-fungsi lain yang tidak berubah: deleteTransaction, enterEditMode, exitEditMode, dll. salin dari kode sebelumnya)
async function deleteTransaction(id) {
    if (!confirm('Yakin mau hapus transaksi ini?')) return;
    try {
        await fetch(`${API_URL}/transactions/${id}`, { method: 'DELETE' });
        fetchAndRenderData();
    } catch (error) { console.error('Error deleting transaction:', error); }
}
function enterEditMode(transaction) {
    currentEditId = transaction.id;
    formTitle.textContent = 'Edit Transaksi';
    submitButton.textContent = 'Update';
    cancelButton.classList.remove('hidden');
    dateInput.value = transaction.date;
    typeSelect.value = transaction.type;
    updateCategoryOptions();
    categorySelect.value = transaction.category;
    document.getElementById('amount').value = transaction.amount;
    window.scrollTo(0, 0);
}
function exitEditMode() {
    currentEditId = null;
    form.reset();
    formTitle.textContent = 'Tambah Transaksi Baru';
    submitButton.textContent = 'Tambah';
    cancelButton.classList.add('hidden');
    setDefaultDate();
    updateCategoryOptions();
}
function updateCategoryOptions() {
    const currentType = typeSelect.value;
    const options = categories[currentType];
    categorySelect.innerHTML = '';
    options.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat;
        option.textContent = cat;
        categorySelect.appendChild(option);
    });
}
function setDefaultDate() {
    dateInput.value = new Date().toISOString().split('T')[0];
}
function formatRupiah(number) {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(number);
}