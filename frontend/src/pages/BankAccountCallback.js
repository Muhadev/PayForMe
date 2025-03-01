import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Container, Card, Alert, Spinner } from 'react-bootstrap';
import { CheckCircle, XCircle, ArrowLeft } from 'lucide-react';
import { getBankAccountStatus } from '../services/payoutService';

const BankAccountCallback = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('processing');
  const [error, setError] = useState(null);

  useEffect(() => {
    // Extract query parameters that Stripe might send back
    const queryParams = new URLSearchParams(location.search);
    const accountId = queryParams.get('account_id');
    
    // Check bank account status
    const checkStatus = async () => {
      try {
        // If we have an account_id parameter, that's a good sign
        if (accountId) {
          // Wait a moment to allow backend to process webhook
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Now check the status
          const result = await getBankAccountStatus();
          
          if (result.error) {
            setStatus('error');
            setError(result.message || 'Failed to verify account status');
          } else if (result.data?.account_connected) {
            setStatus('success');
          } else {
            setStatus('incomplete');
            setError('Bank account connection process was not completed');
          }
        } else {
          setStatus('error');
          setError('No account information was received');
        }
      } catch (error) {
        console.error('Error checking bank status:', error);
        setStatus('error');
        setError('An unexpected error occurred while verifying your bank account');
      } finally {
        setLoading(false);
      }
    };
    
    checkStatus();
  }, [location]);

  const navigateBack = () => {
    navigate('/dashboard/creator'); // Or wherever is appropriate
  };
  
  return (
    <Container className="py-5">
      <Card className="shadow-sm border-0">
        <Card.Body className="p-5 text-center">
          <h2 className="mb-4">Bank Account Connection</h2>
          
          {loading ? (
            <div className="py-5">
              <Spinner animation="border" variant="primary" />
              <p className="mt-3">Verifying your bank account...</p>
            </div>
          ) : (
            <>
              {status === 'success' && (
                <div className="py-4">
                  <div className="mb-4">
                    <CheckCircle size={64} className="text-success" />
                  </div>
                  <h3 className="mb-3">Success!</h3>
                  <p className="lead mb-4">
                    Your bank account has been connected successfully. You can now receive payments from your project's backers.
                  </p>
                  <button className="btn btn-primary btn-lg" onClick={navigateBack}>
                    <ArrowLeft size={18} className="me-2" />
                    Return to Dashboard
                  </button>
                </div>
              )}
              
              {status === 'incomplete' && (
                <div className="py-4">
                  <div className="mb-4">
                    <Alert variant="warning" className="d-inline-block px-4">
                      <h4 className="mb-2">Account Setup Incomplete</h4>
                      <p className="mb-0">Your bank account connection needs additional information.</p>
                    </Alert>
                  </div>
                  <p className="mb-4">
                    Please check your email for instructions from Stripe or return to your dashboard
                    to complete the setup process.
                  </p>
                  <button className="btn btn-primary btn-lg" onClick={navigateBack}>
                    <ArrowLeft size={18} className="me-2" />
                    Return to Dashboard
                  </button>
                </div>
              )}
              
              {status === 'error' && (
                <div className="py-4">
                  <div className="mb-4">
                    <XCircle size={64} className="text-danger" />
                  </div>
                  <h3 className="mb-3">Connection Failed</h3>
                  <Alert variant="danger" className="mb-4">
                    {error || 'An error occurred while connecting your bank account.'}
                  </Alert>
                  <p className="mb-4">
                    Please try again later or contact support if the problem persists.
                  </p>
                  <button className="btn btn-primary btn-lg" onClick={navigateBack}>
                    <ArrowLeft size={18} className="me-2" />
                    Return to Dashboard
                  </button>
                </div>
              )}
            </>
          )}
        </Card.Body>
      </Card>
    </Container>
  );
};

export default BankAccountCallback;