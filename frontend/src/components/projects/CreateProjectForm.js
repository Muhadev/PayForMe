import React, { useState } from 'react';
import { Form, Button, Row, Col } from 'react-bootstrap';
import axios from 'axios';
import { toast } from 'react-toastify'; // Only import the toast function
import 'react-toastify/dist/ReactToastify.css';

function CreateProjectForm() {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    goal_amount: '',
    start_date: '',
    end_date: '',
    category_id: '',
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevState => ({
      ...prevState,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
        // eslint-disable-next-line no-unused-vars
      const response = await axios.post('/projects', formData, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      toast.success('Project created successfully!');
      setFormData({
        title: '',
        description: '',
        goal_amount: '',
        start_date: '',
        end_date: '',
        category_id: '',
      });
      // You might want to redirect the user here
      // history.push(`/projects/${response.data.project}`);
    } catch (error) {
      toast.error(error.response?.data?.error || 'An error occurred while creating the project');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Form onSubmit={handleSubmit}>
        <Form.Group className="mb-3">
          <Form.Label>Project Title</Form.Label>
          <Form.Control 
            type="text" 
            name="title"
            value={formData.title}
            onChange={handleChange}
            required
          />
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Category</Form.Label>
          <Form.Control 
            as="select"
            name="category_id"
            value={formData.category_id}
            onChange={handleChange}
            required
          >
            <option value="">Select a category</option>
            <option value="1">Technology</option>
            <option value="2">Arts</option>
            <option value="3">Community</option>
            {/* Add more categories as needed */}
          </Form.Control>
        </Form.Group>

        <Row>
          <Col>
            <Form.Group className="mb-3">
              <Form.Label>Funding Goal ($)</Form.Label>
              <Form.Control 
                type="number" 
                name="goal_amount"
                value={formData.goal_amount}
                onChange={handleChange}
                required
              />
            </Form.Group>
          </Col>
        </Row>

        <Row>
          <Col>
            <Form.Group className="mb-3">
              <Form.Label>Start Date</Form.Label>
              <Form.Control 
                type="date" 
                name="start_date"
                value={formData.start_date}
                onChange={handleChange}
                required
              />
            </Form.Group>
          </Col>
          <Col>
            <Form.Group className="mb-3">
              <Form.Label>End Date</Form.Label>
              <Form.Control 
                type="date" 
                name="end_date"
                value={formData.end_date}
                onChange={handleChange}
                required
              />
            </Form.Group>
          </Col>
        </Row>

        <Form.Group className="mb-3">
          <Form.Label>Project Description</Form.Label>
          <Form.Control 
            as="textarea" 
            rows={3}
            name="description"
            value={formData.description}
            onChange={handleChange}
            required
          />
        </Form.Group>

        <Button variant="primary" type="submit" className="w-100" disabled={isLoading}>
          {isLoading ? 'Creating Project...' : 'Create Project'}
        </Button>
      </Form>
    </>
  );
}

export default CreateProjectForm;