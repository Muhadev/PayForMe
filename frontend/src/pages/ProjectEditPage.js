import React, { useState, useEffect } from 'react';
import { Container, Card, Spinner, Alert } from 'react-bootstrap';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import * as projectService from '../services/projectService';
import CreateProjectForm from '../components/projects/CreateProjectForm';

const ProjectEditPage = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProject = async () => {
      try {
        setLoading(true);
        const response = await projectService.fetchProjectForEdit(projectId);
        
        if (response && response.data) {
          console.log('Project data received:', response.data);
          
          // Ensure all required fields exist before setting the state
          const processedData = {
            ...response.data,
            category_id: response.data.category_id || '',
            start_date: response.data.start_date || '',
            end_date: response.data.end_date || '',
            featured: response.data.featured === true
          };
          
          setProject(processedData);
        } else {
          throw new Error('Project data not found');
        }
      } catch (err) {
        console.error('Error fetching project for editing:', err);
        setError('Failed to load project. It may not exist or you may not have permission to edit it.');
        toast.error('Failed to load project details');
      } finally {
        setLoading(false);
      }
    };
  
    if (projectId) {
      fetchProject();
    }
  }, [projectId]);

  if (loading) {
    return (
      <Container className="py-5 text-center">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading project data...</span>
        </Spinner>
        <p className="mt-3">Loading project data...</p>
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="py-5">
        <Alert variant="danger">
          <Alert.Heading>Error Loading Project</Alert.Heading>
          <p>{error}</p>
          <hr />
          <div className="d-flex justify-content-end">
            <button 
              className="btn btn-outline-danger" 
              onClick={() => navigate('/my-projects')}
            >
              Return to My Projects
            </button>
          </div>
        </Alert>
      </Container>
    );
  }

  return (
    <Container className="py-4">
      <Card className="shadow-sm">
        <Card.Body>
          <h1 className="mb-4">Edit Project</h1>
          {project && (
            <CreateProjectForm 
                projectId={projectId} 
                isEdit={true} 
                initialData={project}
            />
          )}
        </Card.Body>
      </Card>
    </Container>
  );
};

export default ProjectEditPage;