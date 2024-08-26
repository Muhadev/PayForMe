import React, { useState } from 'react';
import { Form, Button, Row, Col } from 'react-bootstrap';

function CreateProjectForm() {
  const [formData, setFormData] = useState({
    title: '',
    category: '',
    target: '',
    deadline: '',
    description: '',
    image: null
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevState => ({
      ...prevState,
      [name]: value
    }));
  };

  const handleImageChange = (e) => {
    setFormData(prevState => ({
      ...prevState,
      image: e.target.files[0]
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Here you would typically send the form data to your backend
    console.log(formData);
    // Reset form or redirect user after successful submission
  };

  return (
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
          name="category"
          value={formData.category}
          onChange={handleChange}
          required
        >
          <option value="">Select a category</option>
          <option value="tech">Technology</option>
          <option value="arts">Arts</option>
          <option value="community">Community</option>
          {/* Add more categories as needed */}
        </Form.Control>
      </Form.Group>

      <Row>
        <Col>
          <Form.Group className="mb-3">
            <Form.Label>Funding Target ($)</Form.Label>
            <Form.Control 
              type="number" 
              name="target"
              value={formData.target}
              onChange={handleChange}
              required
            />
          </Form.Group>
        </Col>
        <Col>
          <Form.Group className="mb-3">
            <Form.Label>Deadline</Form.Label>
            <Form.Control 
              type="date" 
              name="deadline"
              value={formData.deadline}
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

      <Form.Group className="mb-3">
        <Form.Label>Project Image</Form.Label>
        <Form.Control 
          type="file" 
          onChange={handleImageChange}
          accept="image/*"
        />
      </Form.Group>

      <Button variant="primary" type="submit" className="w-100">
        Create Project
      </Button>
    </Form>
  );
}

export default CreateProjectForm;