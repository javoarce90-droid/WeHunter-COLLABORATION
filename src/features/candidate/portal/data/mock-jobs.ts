export interface Job {
  id: string;
  title: string;
  company: string;
  description: string;
  location: string;
  workplaceType: "Remoto" | "Híbrido" | "Presencial";
  salary: string;
  tags: string[];
  defaultStage: "new" | "screening" | "interview" | "offer" | "hired" | "rejected";
}

export const MOCK_JOBS: Job[] = [
  {
    id: "job-1",
    title: "Senior Fullstack Developer (Node.js & React)",
    company: "TechNova Solutions",
    description: "Buscamos un Ingeniero de Software experimentado para liderar el desarrollo de nuestra plataforma de e-learning SaaS. Trabajarás con arquitecturas serverless, optimización de base de datos y UI moderna en React.",
    location: "Palermo, Buenos Aires",
    workplaceType: "Híbrido",
    salary: "$3.500.000 - $4.200.000 ARS",
    tags: ["React", "Node.js", "TypeScript", "AWS"],
    defaultStage: "new",
  },
  {
    id: "job-2",
    title: "Product Designer UI/UX (Mobile Apps)",
    company: "Zetta Digital",
    description: "Buscamos un diseñador apasionado por las micro-interacciones, animaciones fluidas y sistemas de diseño consistentes para nuestras apps de Fintech en iOS y Android.",
    location: "Remoto (Latam)",
    workplaceType: "Remoto",
    salary: "$2.200 - $2.800 USD",
    tags: ["Figma", "UI/UX", "Design Systems", "Prototyping"],
    defaultStage: "screening",
  },
  {
    id: "job-3",
    title: "DevOps Engineer (Kubernetes & Cloud)",
    company: "CloudFlow Inc.",
    description: "Impulsá nuestra infraestructura cloud. Buscamos un especialista en Kubernetes, Terraform e integración continua bajo AWS. Foco en escalabilidad, alta disponibilidad y automatización.",
    location: "Santiago, Chile",
    workplaceType: "Híbrido",
    salary: "$3.800.000 CLP",
    tags: ["Kubernetes", "AWS", "Terraform", "CI/CD"],
    defaultStage: "interview",
  },
  {
    id: "job-4",
    title: "AI Specialist / ML Engineer",
    company: "Cortex Intelligence",
    description: "Unite a nuestro equipo de I+D. Diseñarás y desplegarás modelos de LLMs, procesamiento de lenguaje natural y matching inteligente de candidatos. Experiencia en PyTorch o TensorFlow requerida.",
    location: "Remoto (Argentina)",
    workplaceType: "Remoto",
    salary: "$3.500 - $4.500 USD",
    tags: ["Python", "PyTorch", "LLMs", "NLP"],
    defaultStage: "offer",
  },
  {
    id: "job-5",
    title: "Frontend Developer (Next.js / Tailwind)",
    company: "Kreative Web",
    description: "Buscamos un desarrollador frontend obsesionado con la velocidad de carga, web core vitals y la maquetación accesible. Experiencia en Next.js (App Router) indispensable.",
    location: "San Isidro, Buenos Aires",
    workplaceType: "Presencial",
    salary: "$1.800.000 - $2.200.000 ARS",
    tags: ["Next.js", "React", "Tailwind CSS", "JavaScript"],
    defaultStage: "hired",
  },
  {
    id: "job-6",
    title: "Data Analyst",
    company: "Apex Retail",
    description: "Transformá datos en decisiones estratégicas. Buscamos analistas capaces de estructurar dashboards intuitivos, ejecutar queries SQL avanzadas y contar historias a través de métricas de negocio.",
    location: "Remoto (Uruguay)",
    workplaceType: "Remoto",
    salary: "$2.000 USD",
    tags: ["SQL", "PowerBI", "Python", "Data Viz"],
    defaultStage: "rejected",
  },
];
