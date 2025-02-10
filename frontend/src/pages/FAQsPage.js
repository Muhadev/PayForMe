import React from 'react';
import { Container, Accordion } from 'react-bootstrap';
import Footer from '../components/layout/Footer';
import './FAQs.css';

function FAQsPage() {
  const faqSections = [
    {
      title: 'Getting Started',
      faqs: [
        {
          question: 'What is PayForMe?',
          answer: 'PayForMe is a crowdfunding platform that helps individuals and organizations raise funds for various causes, projects, and personal needs.'
        },
        {
          question: 'How do I start a project?',
          answer: 'Click the "Start Project" button, create an account, fill out project details, set a funding goal, and add compelling images and descriptions.'
        }
      ]
    },
    {
      title: 'Funding & Contributions',
      faqs: [
        {
          question: 'Is there a minimum contribution amount?',
          answer: 'Contributors can donate as little as $1. There\'s no strict minimum, but we recommend a minimum of $5 for meaningful impact.'
        },
        {
          question: 'What payment methods are accepted?',
          answer: 'We accept credit/debit cards, PayPal, and bank transfers. All transactions are secure and encrypted.'
        }
      ]
    },
    {
      title: 'Project Management',
      faqs: [
        {
          question: 'How long can my project fundraising campaign run?',
          answer: 'Campaigns can run for 30-90 days. We recommend keeping it concise and maintaining active engagement.'
        },
        {
          question: 'What happens if I don\'t reach my funding goal?',
          answer: 'We offer flexible funding. You keep the funds raised, but it\'s important to be transparent with your backers about how you\'ll use partial funding.'
        }
      ]
    },
    {
      title: 'Fees & Finances',
      faqs: [
        {
          question: 'What are PayForMe\'s fees?',
          answer: 'We charge a 5% platform fee for successful campaigns, plus payment processing fees of approximately 2.9% + $0.30 per transaction.'
        },
        {
          question: 'How do I withdraw funds?',
          answer: 'Once your campaign is successful, you can withdraw funds to your linked bank account. Withdrawals typically process within 5-7 business days.'
        }
      ]
    }
  ];

  return (
    <div className="faqs-page">
      <Container className="py-5">
        <h1 className="text-center mb-4">Frequently Asked Questions</h1>
        {faqSections.map((section, sectionIndex) => (
          <div key={sectionIndex} className="mb-4">
            <h3 className="mb-3">{section.title}</h3>
            <Accordion>
              {section.faqs.map((faq, faqIndex) => (
                <Accordion.Item 
                  key={faqIndex} 
                  eventKey={`${sectionIndex}-${faqIndex}`}
                >
                  <Accordion.Header>{faq.question}</Accordion.Header>
                  <Accordion.Body>{faq.answer}</Accordion.Body>
                </Accordion.Item>
              ))}
            </Accordion>
          </div>
        ))}
      </Container>
      <Footer />
    </div>
  );
}

export default FAQsPage;