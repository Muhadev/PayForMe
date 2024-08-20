import React from 'react';
import { Container, Row, Col, Card, Button } from 'react-bootstrap';
import './LatestNewsSection.css';
import newsImage1 from '../../assets/news1.png';
import newsImage2 from '../../assets/news2.png';
import newsImage3 from '../../assets/news3.png';

const newsItems = [
  {
    title: "Crowdfunding Campaign Raises $1M for Local School",
    description: "A recent crowdfunding campaign has successfully raised over $1 million for the construction of a new school in the community.",
    image: newsImage1,
    link: "/news/crowdfunding-campaign-raises-1m",
  },
  {
    title: "Healthcare Crowdfunding: How It’s Changing Lives",
    description: "Healthcare crowdfunding has become a powerful tool for those in need of medical treatment and support.",
    image: newsImage2,
    link: "/news/healthcare-crowdfunding",
  },
  {
    title: "Top 10 Most Successful Crowdfunding Campaigns of 2024",
    description: "Explore the top 10 most successful crowdfunding campaigns of 2024 and what made them stand out.",
    image: newsImage3,
    link: "/news/top-10-crowdfunding-campaigns",
  },
];

function LatestNewsSection() {
  return (
    <section className="latest-news-section">
      <Container>
        <div className="latest-news-header">
          <h2>Latest News</h2>
          <p>Stay updated with the most recent developments in the world of PayForMe.</p>
        </div>
        <Row>
          {newsItems.map((news, index) => (
            <Col md={4} key={index} className="d-flex align-items-stretch">
              <Card className="news-card">
                <Card.Img variant="top" src={news.image} alt={news.title} />
                <Card.Body>
                  <Card.Title>{news.title}</Card.Title>
                  <Card.Text>{news.description}</Card.Text>
                  <Button variant="primary" href={news.link}>Read More</Button>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      </Container>
    </section>
  );
}

export default LatestNewsSection;
