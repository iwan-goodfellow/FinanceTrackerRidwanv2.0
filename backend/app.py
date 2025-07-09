from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from datetime import datetime
from sqlalchemy import extract # Pastikan ini di-import

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

# FUNGSI UNTUK MENAMBAH DATA BARU (POST)
@app.route('/transactions', methods=['POST'])
def add_transaction():
    data = request.get_json()
    transaction_date = datetime.strptime(data['date'], '%Y-%m-%d')
    
    new_transaction = Transaction(
        type=data['type'],
        category=data['category'],
        amount=float(data['amount']),
        date=transaction_date
    )
    db.session.add(new_transaction)
    db.session.commit()
    return jsonify(new_transaction.to_dict()), 201

# FUNGSI UNTUK MENGAMBIL DATA (GET)
@app.route('/transactions', methods=['GET'])
def get_transactions():
    year = request.args.get('year', type=int)
    month = request.args.get('month', type=int)

    query = Transaction.query

    if year:
        query = query.filter(extract('year', Transaction.date) == year)
    
    if month:
        query = query.filter(extract('month', Transaction.date) == month)
    
    transactions = query.order_by(Transaction.date.desc()).all()
    return jsonify([t.to_dict() for t in transactions])

# FUNGSI UNTUK MENGEDIT DATA (PUT)
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

# FUNGSI UNTUK MENGHAPUS DATA (DELETE)
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