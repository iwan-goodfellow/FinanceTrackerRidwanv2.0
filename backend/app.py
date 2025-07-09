from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from datetime import datetime, timedelta

# Inisialisasi Aplikasi Flask
app = Flask(__name__)
CORS(app)

# Konfigurasi Database
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///finance.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

# --- MODEL DATABASE ---
class Transaction(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    type = db.Column(db.String(10), nullable=False)
    category = db.Column(db.String(50), nullable=False)
    amount = db.Column(db.Float, nullable=False)
    # Ubah default date menjadi tidak ada, karena akan diisi dari frontend
    date = db.Column(db.DateTime, nullable=False)

    def to_dict(self):
        return {
            'id': self.id,
            'type': self.type,
            'category': self.category,
            'amount': self.amount,
            'date': self.date.strftime('%Y-%m-%d')
        }

# --- ROUTES / ENDPOINTS ---

# Endpoint untuk menambah transaksi baru (sudah diupdate untuk menerima tanggal)
# ... (kode lain di app.py biarkan sama) ...

# Endpoint untuk mengambil data transaksi (GANTI FUNGSI INI)
@app.route('/transactions', methods=['GET'])
def get_transactions():
    from sqlalchemy import extract # Import fungsi extract

    # Ambil parameter dari URL, contoh: /transactions?year=2024&month=1
    year = request.args.get('year', type=int)
    month = request.args.get('month', type=int)

    query = Transaction.query

    # Filter berdasarkan tahun jika parameter ada
    if year:
        query = query.filter(extract('year', Transaction.date) == year)
    
    # Filter berdasarkan bulan jika parameter ada
    if month:
        query = query.filter(extract('month', Transaction.date) == month)
    
    # Jika tidak ada parameter sama sekali, kembalikan semua data
    # (berguna untuk inisialisasi)
    
    transactions = query.order_by(Transaction.date.desc()).all()
    
    return jsonify([t.to_dict() for t in transactions])

# --- BARU: Endpoint untuk mengedit (update) transaksi ---
@app.route('/transactions/<int:id>', methods=['PUT'])
def update_transaction(id):
    transaction = Transaction.query.get_or_404(id)
    data = request.get_json()

    transaction.type = data.get('type', transaction.type)
    transaction.category = data.get('category', transaction.category)
    transaction.amount = data.get('amount', transaction.amount)
    if 'date' in data:
        transaction.date = datetime.strptime(data['date'], '%Y-%m-%d')

    db.session.commit()
    return jsonify(transaction.to_dict())

# --- BARU: Endpoint untuk menghapus transaksi ---
@app.route('/transactions/<int:id>', methods=['DELETE'])
def delete_transaction(id):
    transaction = Transaction.query.get_or_404(id)
    db.session.delete(transaction)
    db.session.commit()
    return jsonify({'message': 'Transaction deleted'})

# Jalankan server
if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True)