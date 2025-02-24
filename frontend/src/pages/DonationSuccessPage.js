// DonationSuccessPage.js
import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Card, Container, Button } from 'react-bootstrap';
import { CheckCircle } from 'lucide-react';
import axiosInstance from '../helper/axiosConfig';

const DonationSuccessPage = () => {
  const [searchParams] = useSearchParams();
  const [donation, setDonation] = useState(null);
  const donationId = searchParams.get('donation_id');

  useEffect(() => {
    const fetchDonationDetails = async () => {
      try {
        const response = await axiosInstance.get(`/api/v1/backers/donations/${donationId}`);
        setDonation(response.data.data);
      } catch (error) {
        console.error('Error fetching donation details:', error);
      }
    };

    if (donationId) {
      fetchDonationDetails();
    }
  }, [donationId]);

  return (
    <Container className="py-5">
      <Card className="text-center shadow-sm">
        <Card.Body className="p-5">
          <CheckCircle className="text-success mb-4" size={64} />
          <h1 className="mb-4">Thank You for Your Support!</h1>
          {donation && (
            <>
              <p className="lead mb-4">
                You have successfully backed this project with ${donation.amount}
              </p>
              <p className="text-muted">
                A confirmation email has been sent to your registered email address.
              </p>
            </>
          )}
          <Button 
            variant="primary" 
            href={`/projects/${donation?.project_id}`}
            className="mt-4"
          >
            Return to Project
          </Button>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default DonationSuccessPage;