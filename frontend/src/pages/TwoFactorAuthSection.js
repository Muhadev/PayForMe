import React, { useState, useEffect } from 'react';
import { Form, Button, Alert, Modal, Image, Card, Container, Row, Col } from 'react-bootstrap';
import { toast } from 'react-toastify';
import axiosInstance from '../helper/axiosConfig';

const TwoFactorAuthSection = () => {
    const [setupState, setSetupState] = useState('loading'); // loading, initial, verifying, qrcode, complete
    const [verificationCode, setVerificationCode] = useState('');
    const [qrCodeData, setQrCodeData] = useState('');
    const [secretKey, setSecretKey] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showQRModal, setShowQRModal] = useState(false);
    const [tfaCode, setTfaCode] = useState('');
    const [is2FAEnabled, setIs2FAEnabled] = useState(false);

    // Check initial 2FA status
    useEffect(() => {
        checkTwoFactorStatus();
    }, []);

    const checkTwoFactorStatus = async () => {
        try {
            const response = await axiosInstance.get('/api/v1/auth/2fa/status');
            const isEnabled = response.data.data?.is_enabled;
            setIs2FAEnabled(isEnabled);
            setSetupState(isEnabled ? 'complete' : 'initial');
        } catch (error) {
            console.error('Error checking 2FA status:', error);
            setSetupState('initial');
            setIs2FAEnabled(false);
        }
    };

    const initiateSetup = async () => {
        setIsLoading(true);
        try {
            const response = await axiosInstance.post('/api/v1/auth/2fa/initiate-setup');
            if (response.data.message.includes('already set up')) {
                setSetupState('complete');
                setIs2FAEnabled(true);
                toast.info('2FA is already enabled');
            } else {
                toast.info(response.data.message || 'Please check your email for the verification code');
                setSetupState('verifying');
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to initiate 2FA setup');
            setSetupState('initial');
        } finally {
            setIsLoading(false);
        }
    };

    const disable2FA = async () => {
        if (window.confirm('Are you sure you want to disable 2FA? This will make your account less secure.')) {
            setIsLoading(true);
            try {
                const response = await axiosInstance.delete('/api/v1/auth/2fa/revoke');
                toast.success(response.data.message || '2FA has been disabled');
                setSetupState('initial');
                setIs2FAEnabled(false);
            } catch (error) {
                toast.error(error.response?.data?.message || 'Failed to disable 2FA');
            } finally {
                setIsLoading(false);
            }
        }
    };

    const verifyEmailCode = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const response = await axiosInstance.post('/api/v1/auth/2fa/complete-setup', {
                verification_code: verificationCode
            });
            
            if (response.data.data?.qr_code) {
                setQrCodeData(response.data.data.qr_code);
                setSecretKey(response.data.data.secret);
                setSetupState('qrcode');
                setShowQRModal(true);
            } else {
                toast.error('Invalid response from server');
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Invalid verification code');
        } finally {
            setIsLoading(false);
        }
    };

    const verifyTfaCode = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const response = await axiosInstance.post('/api/v1/auth/2fa/verify', {
                code: tfaCode
            });
            
            if (response.data.message) {
                setSetupState('complete');
                setIs2FAEnabled(true);
                setShowQRModal(false);
                toast.success(response.data.message);
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Invalid 2FA code');
        } finally {
            setIsLoading(false);
        }
    };

    const renderSetupContent = () => {
        switch (setupState) {
            case 'loading':
                return <div className="text-center">Loading...</div>;

            case 'initial':
                return (
                    <Button 
                        variant="outline-primary"
                        size="sm"
                        className="w-100"
                        onClick={initiateSetup}
                        disabled={isLoading}
                    >
                        {isLoading ? 'Setting up...' : 'Enable Two-Factor Authentication'}
                    </Button>
                );

            case 'verifying':
                return (
                    <div>
                        <Alert variant="info" className="py-2 mb-3">
                            <p className="small mb-0">
                                A verification code has been sent to your email. Please enter it below.
                            </p>
                        </Alert>
                        <Form onSubmit={verifyEmailCode}>
                            <Form.Group className="mb-3">
                                <Form.Label className="small text-muted">Enter verification code from email</Form.Label>
                                <Form.Control
                                    type="text"
                                    value={verificationCode}
                                    onChange={(e) => setVerificationCode(e.target.value)}
                                    required
                                    size="sm"
                                    maxLength={6}
                                    placeholder="Enter 6-digit code"
                                    className="text-center letter-spacing-2"
                                    style={{ maxWidth: '200px', margin: '0 auto' }}
                                />
                            </Form.Group>
                            <div className="d-flex gap-2 justify-content-center">
                                <Button 
                                    variant="secondary" 
                                    size="sm"
                                    onClick={() => setSetupState('initial')}
                                    disabled={isLoading}
                                    style={{ width: '100px' }}
                                >
                                    Cancel
                                </Button>
                                <Button 
                                    variant="primary" 
                                    type="submit" 
                                    size="sm"
                                    disabled={isLoading}
                                    style={{ width: '100px' }}
                                >
                                    {isLoading ? 'Verifying...' : 'Verify'}
                                </Button>
                            </div>
                        </Form>
                    </div>
                );

            case 'complete':
                return (
                    <div className="text-center">
                        <Alert variant="success" className="py-2 mb-3">
                            <p className="small mb-0">
                                <strong>2FA is enabled</strong> - Your account is now more secure
                            </p>
                        </Alert>
                        <Button 
                            variant="outline-danger"
                            size="sm"
                            onClick={disable2FA}
                            disabled={isLoading}
                            style={{ width: '150px' }}
                        >
                            {isLoading ? 'Disabling...' : 'Disable 2FA'}
                        </Button>
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <>
            <Card className="mb-4">
                <Card.Header className="bg-white border-bottom-0 pt-4">
                    <div className="d-flex justify-content-between align-items-center">
                        <Card.Title className="mb-0">Two-Factor Authentication</Card.Title>
                        {is2FAEnabled && (
                            <span className="badge bg-success">Enabled</span>
                        )}
                    </div>
                </Card.Header>
                <Card.Body>
                    <Row className="justify-content-center">
                        <Col md={8}>
                            <p className="text-muted small mb-3">
                                Add an extra layer of security to your account by enabling two-factor authentication.
                            </p>
                            {renderSetupContent()}
                        </Col>
                    </Row>
                </Card.Body>
            </Card>

            <Modal 
                show={showQRModal} 
                onHide={() => setShowQRModal(false)} 
                centered
                size="sm"
            >
                <Modal.Header closeButton className="border-bottom-0 pb-0">
                    <Modal.Title className="fs-6">Scan QR Code</Modal.Title>
                </Modal.Header>
                <Modal.Body className="text-center pt-0">
                    <div className="mb-3">
                        <Image 
                            src={`data:image/png;base64,${qrCodeData}`} 
                            alt="2FA QR Code" 
                            className="mb-3"
                            style={{ width: '200px', height: '200px' }}
                        />
                        <div className="border-top pt-3 mb-3">
                            <p className="small text-muted mb-1">Backup Code:</p>
                            <code className="d-block mb-3 small bg-light p-2 rounded">
                                {secretKey}
                            </code>
                        </div>
                    </div>
                    <Form onSubmit={verifyTfaCode}>
                        <Form.Group className="mb-3">
                            <Form.Control
                                type="text"
                                value={tfaCode}
                                onChange={(e) => setTfaCode(e.target.value)}
                                placeholder="Enter 6-digit code"
                                required
                                maxLength={6}
                                className="text-center letter-spacing-2"
                                style={{ maxWidth: '150px', margin: '0 auto' }}
                            />
                        </Form.Group>
                        <Button 
                            variant="primary" 
                            type="submit"
                            disabled={isLoading}
                            size="sm"
                            className="w-100"
                        >
                            {isLoading ? 'Verifying...' : 'Complete Setup'}
                        </Button>
                    </Form>
                </Modal.Body>
            </Modal>

            <style jsx>{`
                .letter-spacing-2 {
                    letter-spacing: 2px;
                }
            `}</style>
        </>
    );
};

export default TwoFactorAuthSection;