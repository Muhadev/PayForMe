import React, { useState, useEffect } from 'react';
import { Table, Button, Form, Modal } from 'react-bootstrap';
import axios from 'axios';
import './CategoryManagement.css'; // Create this file if not exists

function CategoryManagement() {
  const [categories, setCategories] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [newCategory, setNewCategory] = useState('');

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    const response = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/categories`);
    setCategories(response.data);
  };

  const handleAddCategory = async () => {
    await axios.post(`${process.env.REACT_APP_BACKEND_URL}/categories`, { name: newCategory });
    setNewCategory('');
    setShowModal(false);
    fetchCategories();
  };

  return (
    <div className="content-wrapper">
      <h2>Category Management</h2>
      <Button onClick={() => setShowModal(true)}>Add New Category</Button>
      <Table striped bordered hover>
        <thead>
          <tr>
            <th>ID</th>
            <th>Name</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {categories.map(category => (
            <tr key={category.id}>
              <td>{category.id}</td>
              <td>{category.name}</td>
              <td>
                <Button variant="info" size="sm">Edit</Button>
                {/* Add delete button if needed */}
              </td>
            </tr>
          ))}
        </tbody>
      </Table>

      <Modal show={showModal} onHide={() => setShowModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Add New Category</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Control
            type="text"
            placeholder="Enter category name"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
          />
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>Close</Button>
          <Button variant="primary" onClick={handleAddCategory}>Add Category</Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

export default CategoryManagement;