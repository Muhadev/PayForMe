import { Form, Button, Row, Col } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';  // Import useNavigate
import axios from 'axios';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import React, { useState, useEffect } from 'react';

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
  const [categories, setCategories] = useState([]);
  const navigate = useNavigate();  // Initialize navigate

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/categories`);
      setCategories(response.data);
    } catch (error) {
      toast.error('Failed to fetch categories');
    }
  };
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
      const response = await axios.post(`${process.env.REACT_APP_BACKEND_URL}/projects`, formData, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      toast.success('Project created successfully!');
      
      // Redirect to the project detail page using the project ID from the response
      navigate(`/projects/${response.data.project}`);
      
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
            {categories.map(category => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
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
