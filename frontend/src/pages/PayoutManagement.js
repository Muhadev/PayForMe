import React, { useState, useEffect } from 'react';
import { Card, Button, Alert, Modal, Form, Table, Badge, Spinner, Tabs, Tab } from 'react-bootstrap';
import { CheckCircle, XCircle, DollarSign, Clock, CreditCard, AlertTriangle, ExternalLink } from 'lucide-react';
import { toast } from 'react-toastify';

// Import services
import { 
  checkPayoutEligibility, 
  requestPayout, 
  getPayoutHistory,
  connectBankAccount,
  getBankAccountStatus
} from '../services/payoutService';

const PayoutManagement = ({ projectId, isCreator }) => {
  // States for different aspects of the component
  const [loading, setLoading] = useState(true);
  const [eligibilityData, setEligibilityData] = useState(null);
  const [bankAccountStatus, setBankAccountStatus] = useState(null);
  const [payoutHistory, setPayoutHistory] = useState([]);
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState('');
  const [processingPayout, setProcessingPayout] = useState(false);
  const [processingBankConnection, setProcessingBankConnection] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [payoutError, setPayoutError] = useState(null);
  const [payoutSuccess, setPayoutSuccess] = useState(false);

  // Load initial data
  useEffect(() => {
    if (isCreator && projectId) {
      loadPayoutData();
    }
  }, [projectId, isCreator]);

  const loadPayoutData = async () => {
    setLoading(true);
    try {
      // Check bank account status first
      const bankStatusResult = await getBankAccountStatus();
      setBankAccountStatus(bankStatusResult.data);
      
      // If bank account is connected, check payout eligibility
      if (bankStatusResult.data?.account_connected) {
        const eligibilityResult = await checkPayoutEligibility(projectId);
        setEligibilityData(eligibilityResult.data);
        
        // Fetch payout history
        try {
          const historyResult = await getPayoutHistory(projectId);
          setPayoutHistory(historyResult.data?.payouts || []);
        } catch (historyError) {
          console.error('Failed to load payout history:', historyError);
          // Continue with the rest of the data if history fails
        }
      }
    } catch (error) {
      console.error('Failed to load payout data:', error);
      toast.error('Failed to load payout information');
    } finally {
      setLoading(false);
    }
  };

  const handleBankAccountConnect = async () => {
    setProcessingBankConnection(true);
    try {
      const result = await connectBankAccount();
      if (result.data?.url) {
        // Redirect to Stripe's Connect onboarding flow
        window.location.href = result.data.url;
      } else {
        toast.error('Failed to generate bank connection link');
      }
    } catch (error) {
      console.error('Bank connection error:', error);
      toast.error('Failed to connect bank account');
    } finally {
      setProcessingBankConnection(false);
    }
  };

  const openPayoutModal = () => {
    if (eligibilityData?.eligible) {
      // Reset previous errors
      setPayoutError(null);
      setPayoutSuccess(false);
      // Default to maximum available amount
      setPayoutAmount(eligibilityData.available_amount?.toString() || '');
      setShowPayoutModal(true);
    } else {
      toast.warning('You are not eligible for a payout at this time');
    }
  };

  const handleRequestPayout = async () => {
    if (!payoutAmount || parseFloat(payoutAmount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    setProcessingPayout(true);
    setPayoutError(null);
    try {
      const result = await requestPayout(projectId, parseFloat(payoutAmount));
      
      if (result.error) {
        // Check for specific Stripe insufficient funds error
        if (result.errorMessage && result.errorMessage.includes('insufficient available funds')) {
          setPayoutError("There are insufficient funds in the connected Stripe account. This is often an issue in test mode. Please add funds to your Stripe account using a test card or contact the platform administrator.");
        } else {
          setPayoutError(result.errorMessage || 'Failed to process payout request');
        }
        toast.error(result.errorMessage || 'Failed to process payout request');
      } else {
        setPayoutSuccess(true);
        toast.success('Payout request submitted successfully');
        
        // Add the new payout to history and refresh data
        const newPayout = result.data;
        setPayoutHistory([newPayout, ...payoutHistory]);
        
        // Update available amount
        if (eligibilityData) {
          setEligibilityData({
            ...eligibilityData,
            available_amount: eligibilityData.available_amount - parseFloat(payoutAmount)
          });
        }
        
        // Close modal on success
        setTimeout(() => {
          setShowPayoutModal(false);
        }, 2000);
      }
    } catch (error) {
      console.error('Payout request error:', error);
      const errorMsg = error.response?.data?.message || 'Failed to process payout request';
      setPayoutError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setProcessingPayout(false);
    }
  };

  const loadMoreHistory = async () => {
    if (historyLoading) return;
    
    setHistoryLoading(true);
    try {
      const nextPage = historyPage + 1;
      const result = await getPayoutHistory(projectId, nextPage);
      
      if (result.data?.payouts?.length) {
        setPayoutHistory([...payoutHistory, ...result.data.payouts]);
        setHistoryPage(nextPage);
      } else {
        toast.info('No more payout history to load');
      }
    } catch (error) {
      console.error('Failed to load more history:', error);
      toast.error('Failed to load additional payout history');
    } finally {
      setHistoryLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Render payout status badge
  const renderStatusBadge = (status) => {
    switch (status) {
      case 'COMPLETED':
        return <Badge bg="success">Completed</Badge>;
      case 'PENDING':
        return <Badge bg="warning">Pending</Badge>;
      case 'FAILED':
        return <Badge bg="danger">Failed</Badge>;
      default:
        return <Badge bg="secondary">{status}</Badge>;
    }
  };

  if (!isCreator) {
    return null; // Only project creators can access this component
  }

  if (loading) {
    return (
      <Card className="border-0 shadow-sm mb-4">
        <Card.Body className="text-center py-5">
          <Spinner animation="border" variant="primary" />
          <p className="mt-3 text-muted">Loading payment information...</p>
        </Card.Body>
      </Card>
    );
  }

  // If bank account is not connected yet
  if (!bankAccountStatus?.account_connected) {
    return (
      <Card className="border-0 shadow-sm mb-4">
        <Card.Header as="h5">
          <CreditCard className="me-2" size={18} />
          Payment Setup
        </Card.Header>
        <Card.Body>
          <Alert variant="info">
            <AlertTriangle size={18} className="me-2" />
            You need to connect a bank account to receive payments from your backers.
          </Alert>
          
          <div className="d-grid gap-2 mt-4">
            <Button 
              variant="primary" 
              size="lg" 
              onClick={handleBankAccountConnect}
              disabled={processingBankConnection}
            >
              {processingBankConnection ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  Processing...
                </>
              ) : (
                <>
                  <CreditCard size={18} className="me-2" />
                  Connect Bank Account
                </>
              )}
            </Button>
          </div>
        </Card.Body>
      </Card>
    );
  }

  // Bank account is connected but not fully setup
  if (bankAccountStatus?.account_connected && !bankAccountStatus?.payouts_enabled) {
    return (
      <Card className="border-0 shadow-sm mb-4">
        <Card.Header as="h5">
          <CreditCard className="me-2" size={18} />
          Complete Bank Account Setup
        </Card.Header>
        <Card.Body>
          <Alert variant="warning">
            <AlertTriangle size={18} className="me-2" />
            Your bank account is connected, but you need to complete the setup before you can receive payments.
          </Alert>
          
          {bankAccountStatus?.requirements?.currently_due?.length > 0 && (
            <div className="mb-3">
              <h6>Required information:</h6>
              <ul>
                {bankAccountStatus.requirements.currently_due.map((req, index) => (
                  <li key={index}>{req.replace(/\./g, ' → ')}</li>
                ))}
              </ul>
            </div>
          )}
          
          <div className="d-grid gap-2 mt-4">
            <Button 
              variant="primary" 
              href="/bank-account/dashboard" 
              target="_blank"
            >
              <ExternalLink size={18} className="me-2" />
              Complete Bank Account Setup
            </Button>
          </div>
        </Card.Body>
      </Card>
    );
  }

  // Fully connected bank account, but project not eligible for payouts
  if (bankAccountStatus?.payouts_enabled && eligibilityData && !eligibilityData?.eligible) {
    return (
      <Card className="border-0 shadow-sm mb-4">
        <Card.Header as="h5">
          <DollarSign className="me-2" size={18} />
          Payout Status
        </Card.Header>
        <Card.Body>
          <Alert variant="warning">
            <XCircle size={18} className="me-2" />
            This project is not eligible for payouts.
            {eligibilityData.reason && <div className="mt-2">{eligibilityData.reason}</div>}
          </Alert>
        </Card.Body>
      </Card>
    );
  }

  // Fully connected and eligible for payouts
  return (
    <Card className="border-0 shadow-sm mb-4">
      <Card.Header as="h5">
        <DollarSign className="me-2" size={18} />
        Payment Management
      </Card.Header>
      <Card.Body>
        <Tabs
          activeKey={activeTab}
          onSelect={(k) => setActiveTab(k)}
          className="mb-4"
        >
          <Tab eventKey="overview" title="Overview">
            <div className="border p-4 rounded mb-4">
              <h5 className="mb-3">Funds Summary</h5>
              <div className="row">
                <div className="col-md-6">
                  <div className="mb-3">
                    <label className="text-muted">Total Donations</label>
                    <h4>{formatCurrency(eligibilityData?.funds_info?.total_donations || 0)}</h4>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="mb-3">
                    <label className="text-muted">Available for Withdrawal</label>
                    <h4 className="text-success">{formatCurrency(eligibilityData?.available_amount || 0)}</h4>
                  </div>
                </div>
              </div>
              <div className="row">
                <div className="col-md-6">
                  <div className="mb-3">
                    <label className="text-muted">Platform Fee</label>
                    <h5>{formatCurrency(eligibilityData?.funds_info?.platform_fee || 0)}</h5>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="mb-3">
                    <label className="text-muted">Total Paid Out</label>
                    <h5>{formatCurrency(eligibilityData?.funds_info?.total_paid_out || 0)}</h5>
                  </div>
                </div>
              </div>
            </div>

            <div className="d-grid gap-2 mb-3">
              <Button 
                variant="primary" 
                size="lg" 
                onClick={openPayoutModal}
                disabled={!eligibilityData?.eligible || eligibilityData?.available_amount <= 0}
              >
                <DollarSign size={18} className="me-2" />
                Request Payout
              </Button>
            </div>

            {/* Bank account status information */}
            <div className="d-flex align-items-center justify-content-between mt-4 p-3 bg-light rounded">
              <div>
                <CheckCircle className="text-success me-2" size={18} />
                Bank account connected
              </div>
              <Button 
                variant="outline-secondary" 
                size="sm"
                href="/bank-account/dashboard" 
                target="_blank"
              >
                <ExternalLink size={14} className="me-1" />
                Manage
              </Button>
            </div>
          </Tab>
          
          <Tab eventKey="history" title="Payout History">
            {payoutHistory.length > 0 ? (
              <>
                <Table responsive className="table-hover">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Amount</th>
                      <th>Fee</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payoutHistory.map((payout, index) => (
                      <tr key={index}>
                        <td>{formatDate(payout.created_at)}</td>
                        <td>{formatCurrency(payout.amount)}</td>
                        <td>{formatCurrency(payout.fee_amount)}</td>
                        <td>{renderStatusBadge(payout.status)}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
                
                <div className="text-center mt-3">
                  <Button 
                    variant="outline-primary" 
                    onClick={loadMoreHistory}
                    disabled={historyLoading}
                  >
                    {historyLoading ? (
                      <>
                        <Spinner animation="border" size="sm" className="me-2" />
                        Loading...
                      </>
                    ) : 'Load More'}
                  </Button>
                </div>
              </>
            ) : (
              <Alert variant="info">
                <Clock size={18} className="me-2" />
                No payout history yet. Once you request a payout, it will appear here.
              </Alert>
            )}
          </Tab>
        </Tabs>
      </Card.Body>

      {/* Payout Request Modal */}
      <Modal show={showPayoutModal} onHide={() => setShowPayoutModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Request Payout</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {payoutSuccess ? (
            <Alert variant="success">
              <CheckCircle size={18} className="me-2" />
              Payout request submitted successfully! The funds will be transferred to your bank account.
            </Alert>
          ) : (
            <>
              <Alert variant="info">
                <p className="mb-0">
                  <strong>Available for payout:</strong> {formatCurrency(eligibilityData?.available_amount || 0)}
                </p>
                <small>A small processing fee may be applied to your payout.</small>
              </Alert>
              
              {payoutError && (
                <Alert variant="danger" className="mt-3">
                  <AlertTriangle size={18} className="me-2" />
                  {payoutError}
                </Alert>
              )}
              
              <Form>
                <Form.Group className="mb-3">
                  <Form.Label>Payout Amount</Form.Label>
                  <Form.Control
                    type="number"
                    value={payoutAmount}
                    onChange={(e) => setPayoutAmount(e.target.value)}
                    placeholder="Enter amount"
                    min="1"
                    max={eligibilityData?.available_amount}
                    required
                  />
                </Form.Group>
              </Form>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowPayoutModal(false)}>
            {payoutSuccess ? 'Close' : 'Cancel'}
          </Button>
          {!payoutSuccess && (
            <Button 
              variant="primary" 
              onClick={handleRequestPayout}
              disabled={
                processingPayout || 
                !payoutAmount || 
                parseFloat(payoutAmount) <= 0 || 
                parseFloat(payoutAmount) > eligibilityData?.available_amount
              }
            >
              {processingPayout ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  Processing...
                </>
              ) : 'Request Payout'}
            </Button>
          )}
        </Modal.Footer>
      </Modal>
    </Card>
  );
};

export default PayoutManagement;