import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { walletService } from '../services/api';
import type { Wallet as WalletType, Transaction } from '../types';
import '../styles/Wallet.css';

const Wallet: React.FC = () => {
  const [wallet, setWallet] = useState<WalletType | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [payoutAmount, setPayoutAmount] = useState('');
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const navigate = useNavigate();


  useEffect(() => {
    loadWalletData();
  }, []);

  const loadWalletData = async () => {
    try {
      const [walletData, transactionData] = await Promise.all([
        walletService.getWallet(),
        walletService.getTransactions(),
      ]);
      setWallet(walletData);
      setTransactions(transactionData);
    } catch (error) {
      console.error('Failed to load wallet:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestPayout = async () => {
    const amount = parseFloat(payoutAmount);

    if (isNaN(amount) || amount <= 0) {
      toast.warning('Please enter a valid amount');
      return;
    }

    if (amount > (wallet?.balance || 0)) {
      toast.error('Insufficient balance');
      return;
    }

    if (amount < 1000) {
      toast.warning('Minimum payout amount is ₦1,000');
      return;
    }

    try {
      await walletService.requestPayout(amount);
      toast.success('Payout requested successfully!');
      setShowPayoutModal(false);
      setPayoutAmount('');
      loadWalletData();
    } catch (error) {
      console.error('Payout failed:', error);
      toast.error('Payout request failed. Please try again.');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-NG', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'BOOKING_PAYMENT':
        return '💰';
      case 'DRIVER_PAYOUT':
        return '📤';
      case 'REFUND':
        return '↩️';
      default:
        return '💳';
    }
  };

  const getTransactionClass = (type: string) => {
    switch (type) {
      case 'BOOKING_PAYMENT':
        return 'transaction-in';
      case 'DRIVER_PAYOUT':
      case 'REFUND':
        return 'transaction-out';
      default:
        return '';
    }
  };

  if (loading) {
    return (
      <div className="wallet-page">
        <div className="loading">Loading wallet...</div>
      </div>
    );
  }

  return (
    <div className="wallet-page">
      <header className="page-header">
        <button onClick={() => navigate('/driver')} className="btn-back">
          ← Back
        </button>
        <h1>My Wallet</h1>
      </header>

      <div className="wallet-container">
        <div className="wallet-summary">
          <div className="balance-card main-balance">
            <h2>Available Balance</h2>
            <div className="balance-amount">₦{wallet?.balance.toLocaleString() || '0'}</div>
            <button onClick={() => setShowPayoutModal(true)} className="btn-primary">
              Request Payout
            </button>
          </div>

          <div className="balance-card">
            <h3>Pending Balance</h3>
            <div className="balance-amount small">₦{wallet?.pendingBalance.toLocaleString() || '0'}</div>
            <p className="balance-info">From recent bookings</p>
          </div>

          <div className="balance-card">
            <h3>Total Earnings</h3>
            <div className="balance-amount small">₦{wallet?.totalEarnings.toLocaleString() || '0'}</div>
            <p className="balance-info">All-time earnings</p>
          </div>
        </div>

        <section className="transactions-section">
          <h2>Transaction History</h2>
          {transactions.length === 0 ? (
            <div className="empty-state">No transactions yet</div>
          ) : (
            <div className="transactions-list">
              {transactions.map((transaction) => (
                <div key={transaction.id} className={`transaction-item ${getTransactionClass(transaction.type)}`}>
                  <div className="transaction-icon">{getTransactionIcon(transaction.type)}</div>
                  <div className="transaction-details">
                    <div className="transaction-type">
                      {transaction.type.replace(/_/g, ' ')}
                    </div>
                    <div className="transaction-date">{formatDate(transaction.createdAt)}</div>
                  </div>
                  <div className="transaction-amount">
                    {transaction.type === 'BOOKING_PAYMENT' ? '+' : '-'}₦
                    {transaction.amount.toLocaleString()}
                  </div>
                  <div className={`transaction-status status-${transaction.status?.toLowerCase() || 'pending'}`}>
                    {transaction.status || 'PENDING'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {showPayoutModal && (
        <div className="modal-overlay" onClick={() => setShowPayoutModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Request Payout</h2>
              <button onClick={() => setShowPayoutModal(false)} className="btn-close">
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="payout-info">
                <p>Available Balance: ₦{wallet?.balance.toLocaleString()}</p>
                <p className="helper-text">Minimum payout: ₦1,000</p>
              </div>
              <div className="form-group">
                <label htmlFor="payoutAmount">Amount to withdraw</label>
                <input
                  type="number"
                  id="payoutAmount"
                  value={payoutAmount}
                  onChange={(e) => setPayoutAmount(e.target.value)}
                  placeholder="Enter amount"
                  min="1000"
                  max={wallet?.balance || 0}
                />
              </div>
              <div className="modal-actions">
                <button onClick={() => setShowPayoutModal(false)} className="btn-secondary">
                  Cancel
                </button>
                <button onClick={handleRequestPayout} className="btn-primary">
                  Confirm Payout
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Wallet;
