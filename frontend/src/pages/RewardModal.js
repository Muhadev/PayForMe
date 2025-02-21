import React, { useState } from 'react';
import { Modal, Button, Form, Alert, Spinner } from 'react-bootstrap';
import axiosInstance from '../helper/axiosConfig';
import { toast } from 'react-toastify';

const RewardModal = ({ show, onHide, projectId, onRewardCreated }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    minimum_amount: '',
    quantity_available: '',
    estimated_delivery_date: '',
    shipping_type: 'none'
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [validated, setValidated] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      minimum_amount: '',
      quantity_available: '',
      estimated_delivery_date: '',
      shipping_type: 'none'
    });
    setValidated(false);
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const form = e.currentTarget;
    if (form.checkValidity() === false) {
      e.stopPropagation();
      setValidated(true);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const payload = {
        ...formData,
        minimum_amount: parseFloat(formData.minimum_amount) || 0,
        quantity_available: formData.quantity_available ? parseInt(formData.quantity_available, 10) : null
      };
      
      const response = await axiosInstance.post(
        `/api/v1/rewards/projects/${projectId}/rewards`, 
        payload
      );
      
      // setLoading(false);
      
      if (response.data?.data) {
        // Format the reward data before passing it to the callback
        const formattedReward = {
          ...response.data.data,
          amount: response.data.data.minimum_amount,
          inventory: response.data.data.quantity_available,
          is_digital: response.data.data.shipping_type === 'none',
          original_inventory: response.data.data.quantity_available
        };
        
        onRewardCreated(formattedReward);
        toast.success('Reward created successfully!'); // Use a generic success message
        resetForm();
        onHide();
      }
      
    } catch (error) {
      setLoading(false);
      const errorMessage = error.response?.data?.message || 'Failed to create reward';
      setError(errorMessage);
      toast.error(errorMessage);
    }
  };

  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Modal.Header closeButton>
        <Modal.Title>Create New Reward</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {error && <Alert variant="danger">{error}</Alert>}
        
        <Form noValidate validated={validated} onSubmit={handleSubmit}>
          <Form.Group className="mb-3">
            <Form.Label>Reward Title *</Form.Label>
            <Form.Control
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              maxLength={100}
            />
          </Form.Group>
          
          <Form.Group className="mb-3">
            <Form.Label>Description *</Form.Label>
            <Form.Control
              as="textarea"
              name="description"
              value={formData.description}
              onChange={handleChange}
              required
              rows={4}
              maxLength={500}
            />
          </Form.Group>
          
          <Form.Group className="mb-3">
            <Form.Label>Minimum Pledge Amount (USD) *</Form.Label>
            <Form.Control
              type="number"
              name="minimum_amount"
              value={formData.minimum_amount}
              onChange={handleChange}
              min="1"
              step="0.01"
              required
            />
          </Form.Group>
          
          <Form.Group className="mb-3">
            <Form.Label>Available Quantity</Form.Label>
            <Form.Control
              type="number"
              name="quantity_available"
              value={formData.quantity_available}
              onChange={handleChange}
              min="1"
            />
          </Form.Group>
          
          <Form.Group className="mb-3">
            <Form.Label>Estimated Delivery Date *</Form.Label>
            <Form.Control
              type="date"
              name="estimated_delivery_date"
              value={formData.estimated_delivery_date}
              onChange={handleChange}
              required
              min={new Date().toISOString().split('T')[0]}
            />
          </Form.Group>
          
          <Form.Group className="mb-3">
            <Form.Label>Shipping Type</Form.Label>
            <Form.Select
              name="shipping_type"
              value={formData.shipping_type}
              onChange={handleChange}
            >
              <option value="none">Digital Reward (No Shipping)</option>
              <option value="domestic">Domestic Shipping</option>
              <option value="international">International Shipping</option>
            </Form.Select>
          </Form.Group>
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          Cancel
        </Button>
        <Button variant="primary" onClick={handleSubmit} disabled={loading}>
          {loading ? (
            <>
              <Spinner animation="border" size="sm" className="me-2" />
              Creating...
            </>
          ) : (
            'Create Reward'
          )}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default RewardModal;