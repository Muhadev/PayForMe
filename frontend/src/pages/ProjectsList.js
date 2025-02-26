const ProjectsList = ({ projects }) => {
    // Calculate days left for a project
    const calculateDaysLeft = (endDate) => {
      if (!endDate) return 0;
      const end = new Date(endDate);
      const today = new Date();
      const timeLeft = end - today;
      return Math.max(0, Math.ceil(timeLeft / (1000 * 60 * 60 * 24)));
    };
  
    // Calculate percentage funded
    const calculatePercentFunded = (current, goal) => {
      if (!goal || goal === 0) return 0;
      return Math.min(100, ((current || 0) / goal) * 100);
    };
  
    return (
      <Card className="mb-4">
        <Card.Header className="d-flex justify-content-between align-items-center">
          <h5 className="mb-0">My Latest Projects</h5>
          <Link to="/projects/create">
            <Button variant="primary" size="sm">
              <FontAwesomeIcon icon={faPlus} className="me-2" />
              Create New Project
            </Button>
          </Link>
        </Card.Header>
        <Card.Body>
          {projects.length === 0 ? (
            <div className="text-center p-3">
              <p className="mb-3">You haven't created any projects yet.</p>
              <Link to="/projects/create">
                <Button variant="primary">Create Your First Project</Button>
              </Link>
            </div>
          ) : (
            <Row>
              {projects.slice(0, 3).map((project) => {
                const percentFunded = calculatePercentFunded(
                  project.current_amount, 
                  project.goal_amount
                );
                const daysLeft = calculateDaysLeft(project.end_date);
                const status = getProjectStatus(project);
                
                return (
                  <Col md={4} key={project.id}>
                    <Card className="h-100">
                      <Card.Img 
                        variant="top" 
                        src={project.image_url || placeholderImage} 
                        style={{ height: '160px', objectFit: 'cover' }}
                      />
                      <Card.Body>
                        <div className="d-flex justify-content-between align-items-start mb-2">
                          <Card.Title className="h6">{project.title}</Card.Title>
                          <Badge 
                            bg={
                              status === 'active' ? 'success' : 
                              status === 'pending' ? 'warning' : 
                              status === 'draft' ? 'secondary' : 'danger'
                            }
                          >
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                          </Badge>
                        </div>
                        <Card.Text className="small">
                          ${project.current_amount?.toLocaleString() || 0} raised of ${project.goal_amount?.toLocaleString() || 0}
                        </Card.Text>
                        <div className="progress mb-2">
                          <div
                            className="progress-bar"
                            role="progressbar"
                            style={{ width: `${percentFunded}%` }}
                            aria-valuenow={percentFunded}
                            aria-valuemin="0"
                            aria-valuemax="100"
                          />
                        </div>
                        <div className="d-flex justify-content-between small mb-3">
                          <span>{percentFunded.toFixed(1)}% funded</span>
                          {project.status === 'ACTIVE' && (
                            <span>{daysLeft} days left</span>
                          )}
                        </div>
                        <div className="d-flex gap-2">
                          <Link to={`/projects/${project.id}`}>
                            <Button variant="outline-primary" size="sm">View</Button>
                          </Link>
                          <Link to={`/projects/edit/${project.id}`}>
                            <Button variant="outline-secondary" size="sm">Edit</Button>
                          </Link>
                        </div>
                      </Card.Body>
                    </Card>
                  </Col>
                );
              })}
            </Row>
          )}
          {projects.length > 3 && (
            <div className="text-center mt-3">
              <Link to="/projects/my-projects">
                <Button variant="link">View All My Projects</Button>
              </Link>
            </div>
          )}
        </Card.Body>
      </Card>
    );
  };