import React from 'react';
import { Spinner } from 'react-bootstrap';

function LoadingSpinner() {
  return (
    <div className="d-flex justify-content-center py-5">
      <Spinner animation="border" role="status" variant="primary">
        <span className="visually-hidden">Loading...</span>
      </Spinner>
    </div>
  );
}

export default LoadingSpinner;