// DonationCancelPage.js
import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, Container, Button } from 'react-bootstrap';
import { XCircle } from 'lucide-react';

const DonationCancelPage = () => {
  const [searchParams] = useSearchParams();
  const donationId = searchParams.get('donation_id');

  return (
    <Container className="py-5">
      <Card className="text-center shadow-sm">
        <Card.Body className="p-5">
          <XCircle className="text-danger mb-4" size={64} />
          <h1 className="mb-4">Payment Cancelled</h1>
          <p className="lead mb-4">
            Your payment process was cancelled. No charges have been made.
          </p>
          <Button 
            variant="primary" 
            href="/projects"
            className="mt-4"
          >
            Return to Projects
          </Button>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default DonationCancelPage;
