// BackersList.js - Create a new component

import React, { useState, useEffect } from 'react';
import { Card, ListGroup, Spinner, Pagination, Badge } from 'react-bootstrap';
import axiosInstance from '../helper/axiosConfig';
import { formatDate, formatCurrency } from '../utils/formatters';

const BackersList = ({ projectId }) => {
  const [backers, setBackers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({ 
    currentPage: 1, 
    totalPages: 1, 
    totalItems: 0 
  });

  useEffect(() => {
    fetchBackers(1);
  }, [projectId]);

  const fetchBackers = async (page) => {
    try {
      setLoading(true);
      const response = await axiosInstance.get(
        `/api/v1/backers/projects/${projectId}/backers?page=${page}&per_page=10`
      );
      
      setBackers(response.data.data);
      setPagination({
        currentPage: page,
        totalPages: response.data.meta.total_pages || 1,
        totalItems: response.data.meta.total_items || 0
      });
    } catch (error) {
      console.error('Error fetching backers:', error);
      setError('Failed to load backers');
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (page) => {
    fetchBackers(page);
  };

  if (loading && backers.length === 0) {
    return (
      <Card className="my-4">
        <Card.Header>
          <h5 className="mb-0">Project Backers</h5>
        </Card.Header>
        <Card.Body className="text-center py-5">
          <Spinner animation="border" variant="primary" />
        </Card.Body>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="my-4">
        <Card.Header>
          <h5 className="mb-0">Project Backers</h5>
        </Card.Header>
        <Card.Body>
          <p className="text-danger">{error}</p>
        </Card.Body>
      </Card>
    );
  }

  return (
    <Card className="my-4">
      <Card.Header className="d-flex justify-content-between align-items-center">
        <h5 className="mb-0">Project Backers</h5>
        <Badge bg="primary" pill>
          {pagination.totalItems} Total
        </Badge>
      </Card.Header>
      {backers.length === 0 ? (
        <Card.Body className="text-center py-4">
          <p className="text-muted mb-0">No backers yet. Be the first to back this project!</p>
        </Card.Body>
      ) : (
        <>
          <ListGroup variant="flush">
            {backers.map(backer => (
              <ListGroup.Item key={backer.id}>
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <h6 className="mb-1">{backer.username || 'Anonymous Backer'}</h6>
                    <small className="text-muted">
                      Backed on {formatDate(backer.backed_date)}
                    </small>
                  </div>
                  <div className="text-end">
                    <div className="fw-bold">{formatCurrency(backer.amount)}</div>
                    {backer.reward && (
                      <small className="text-muted">{backer.reward.title}</small>
                    )}
                  </div>
                </div>
              </ListGroup.Item>
            ))}
          </ListGroup>
          
          {pagination.totalPages > 1 && (
            <Card.Footer>
              <Pagination className="mb-0 justify-content-center">
                <Pagination.First 
                  onClick={() => handlePageChange(1)}
                  disabled={pagination.currentPage === 1}
                />
                <Pagination.Prev 
                  onClick={() => handlePageChange(pagination.currentPage - 1)}
                  disabled={pagination.currentPage === 1}
                />
                
                {[...Array(pagination.totalPages)].map((_, i) => (
                  <Pagination.Item 
                    key={i + 1}
                    active={i + 1 === pagination.currentPage}
                    onClick={() => handlePageChange(i + 1)}
                  >
                    {i + 1}
                  </Pagination.Item>
                ))}
                
                <Pagination.Next 
                  onClick={() => handlePageChange(pagination.currentPage + 1)}
                  disabled={pagination.currentPage === pagination.totalPages}
                />
                <Pagination.Last 
                  onClick={() => handlePageChange(pagination.totalPages)}
                  disabled={pagination.currentPage === pagination.totalPages}
                />
              </Pagination>
            </Card.Footer>
          )}
        </>
      )}
    </Card>
  );
};

export default BackersList;