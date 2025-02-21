import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, Alert, Spinner } from 'react-bootstrap';
import axiosInstance from '../helper/axiosConfig';

const EditRewardModal = ({ show, onHide, projectId, reward, onRewardUpdated }) => {
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

  useEffect(() => {
    if (reward) {
      setFormData({
        title: reward.title || '',
        description: reward.description || '',
        minimum_amount: reward.amount?.toString() || '',
        quantity_available: reward.inventory?.toString() || '',
        estimated_delivery_date: reward.estimated_delivery || '',
        shipping_type: reward.is_digital ? 'none' : reward.shipping_type || 'none'
      });
    }
  }, [reward]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const isFormChanged = () => {
    return (
      formData.title !== reward.title ||
      formData.description !== reward.description ||
      parseFloat(formData.minimum_amount) !== reward.amount ||
      parseInt(formData.quantity_available) !== reward.inventory ||
      formData.estimated_delivery_date !== reward.estimated_delivery ||
      (formData.shipping_type === 'none') !== reward.is_digital
    );
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
        title: formData.title,
        description: formData.description,
        minimum_amount: parseFloat(formData.minimum_amount) || 0,
        quantity_available: formData.quantity_available ? parseInt(formData.quantity_available, 10) : null,
        estimated_delivery_date: formData.estimated_delivery_date,
        shipping_type: formData.shipping_type
      };
      
      const response = await axiosInstance.put(
        `/api/v1/rewards/projects/${projectId}/rewards/${reward.id}`, 
        payload
      );
      
      if (response.data?.data) {
        const formattedReward = {
          ...response.data.data,
          amount: response.data.data.minimum_amount,
          inventory: response.data.data.quantity_available,
          is_digital: response.data.data.shipping_type === 'none',
          original_inventory: response.data.data.quantity_available,
          estimated_delivery: response.data.data.estimated_delivery_date
        };
        
        onRewardUpdated(formattedReward);
        onHide();
      }
      
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to update reward';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Modal.Header closeButton>
        <Modal.Title>Edit Reward</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {error && (
          <Alert variant="danger">
            {error}
          </Alert>
        )}
        
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
        <Button 
          type="submit"
          variant="primary"
          onClick={handleSubmit}
          disabled={loading || !isFormChanged()}
        >
          {loading ? (
            <>
              <Spinner animation="border" size="sm" className="me-2" />
              Updating...
            </>
          ) : (
            'Update Reward'
          )}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default EditRewardModal;