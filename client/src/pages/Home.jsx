import { Link } from 'react-router-dom';
import logo from '../assets/logo.png';
import '../styles/Home.css';

const features = [
  {
    icon: 'PJ',
    title: 'Project Management',
    description:
      'Plan initiatives with clear scope, deadlines, and ownership from kickoff to delivery.',
  },
  {
    icon: 'TC',
    title: 'Team Collaboration',
    description:
      'Organize members into teams and keep communication aligned around shared outcomes.',
  },
  {
    icon: 'TT',
    title: 'Task Tracking',
    description:
      'Break work into actionable tasks, assign responsibilities, and control priorities.',
  },
  {
    icon: 'PM',
    title: 'Progress Monitoring',
    description:
      'Monitor status across projects and tasks to identify blockers and maintain momentum.',
  },
];

const workflowSteps = [
  {
    step: '01',
    title: 'Create Projects',
    description: 'Set up project goals, timelines, and deliverables.',
  },
  {
    step: '02',
    title: 'Add Teams',
    description: 'Group members by responsibility and project ownership.',
  },
  {
    step: '03',
    title: 'Assign Tasks & Track Progress',
    description: 'Distribute work and follow progress to completion.',
  },
];

function Home() {
  return (
    <div className="home">
      <section className="home-hero">
        <div className="hero-brand" aria-hidden>
          <img src={logo} alt="Teams & Tasks" className="hero-logo" />
        </div>
        <div className="hero-content">
          <p className="eyebrow">Teams & Tasks</p>
          <h1>Manage Teams. Track Projects. Deliver Results.</h1>
          <p className="hero-subtitle">
            A unified workspace for planning projects, coordinating teams, and executing work with clarity.
          </p>
          <div className="hero-actions">
            <Link to="/signup" className="btn btn-primary">
              Get Started
            </Link>
            <Link to="/login" className="btn btn-secondary">
              Login
            </Link>
          </div>
        </div>
      </section>

      <section className="features-section">
        <div className="section-header">
          <h2>Core Features</h2>
        </div>
        <div className="features-grid">
          {features.map((feature) => (
            <article className="feature-card" key={feature.title}>
              <div className="feature-icon" aria-hidden>
                {feature.icon}
              </div>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="workflow-section">
        <div className="section-header">
          <h2>How It Works</h2>
        </div>
        <div className="workflow-grid">
          {workflowSteps.map((item) => (
            <article className="workflow-card" key={item.step}>
              <span className="workflow-step">{item.step}</span>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

export default Home;
